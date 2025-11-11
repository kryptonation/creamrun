# app/curb/services.py

import asyncio
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, date, timezone
from decimal import Decimal
from typing import Dict, List, Optional, Tuple, Set

import requests
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.core.celery_app import app
from app.core.config import settings
from app.core.db import get_db, AsyncSessionLocal
from app.curb.exceptions import (
    CurbApiError,
    DataMappingError,
    ReconciliationError,
)
from app.curb.models import CurbTripStatus, PaymentType
from app.curb.repository import CurbRepository
from app.drivers.services import driver_service
from app.leases.services import lease_service
from app.ledger.services import LedgerService
from app.ledger.repository import LedgerRepository
from app.medallions.services import medallion_service
from app.utils.logger import get_logger

logger = get_logger(__name__)


class DriverFetchResult:
    """Data class to hold results from fetching CURB data for a single driver"""
    def __init__(self, tlc_license: str, success: bool, trips_data: List[Dict], error_message: str = None):
        self.tlc_license = tlc_license
        self.success = success
        self.trips_data = trips_data
        self.error_message = error_message


class CurbApiService:
    """
    Handles low-level communication with the CURB SOAP API.
    """

    def __init__(self):
        # self.base_url = (
        #     settings.curb_url
        #     if settings.environment == "production"
        #     else "https://demo.taxitronic.org/vts_service/taxi_service.asmx"
        # )
        self.base_url = settings.curb_url
        self.merchant = settings.curb_merchant
        self.username = settings.curb_username
        self.password = settings.curb_password
        self.headers = {"Content-Type": "text/xml; charset=utf-8"}

    def _make_soap_request(self, soap_action: str, payload: str) -> str:
        """Makes a SOAP request to the CURB API and returns the response XML."""
        try:
            full_action = f"https://www.taxitronic.org/VTS_SERVICE/{soap_action}"
            self.headers["SOAPAction"] = full_action
            response = requests.post(
                self.base_url, data=payload.encode("utf-8"), headers=self.headers, timeout=120
            )
            response.raise_for_status()

            # Extract the string content from within the Result tag
            root = ET.fromstring(response.content)
            namespace = "https://www.taxitronic.org/VTS_SERVICE/"
            result_tag = f"{{{namespace}}}{soap_action}Result"
            result_element = root.find(f".//{result_tag}")

            if result_element is None:
                raise CurbApiError(f"'{soap_action}Result' tag not found in SOAP response.")
            
            return result_element.text

        except requests.exceptions.RequestException as e:
            logger.error("CURB API request failed: %s", e, exc_info=True)
            raise CurbApiError(f"Network error communicating with CURB API: {e}") from e
        except ET.ParseError as e:
            logger.error("Failed to parse CURB API SOAP response: %s", e, exc_info=True)
            raise CurbApiError("Invalid XML response from CURB API.") from e


    def get_trips_log10(self, from_date: str, to_date: str, driver_id: str = "", cab_number: str = "") -> str:
        """
        Fetches trip data from the GET_TRIPS_LOG10 endpoint.
        
        Args:
            from_date: Start date in YYYY-MM-DD format
            to_date: End date in YYYY-MM-DD format
            driver_id: Optional driver ID filter (TLC License)
            cab_number: Optional medallion number filter
        """
        payload = f"""<?xml version="1.0" encoding="utf-8"?>
        <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <GET_TRIPS_LOG10 xmlns="https://www.taxitronic.org/VTS_SERVICE/">
              <UserId>{self.username}</UserId>
              <Password>{self.password}</Password>
              <Merchant>{self.merchant}</Merchant>
              <DRIVERID>{driver_id}</DRIVERID>
              <CABNUMBER>{cab_number}</CABNUMBER>
              <DATE_FROM>{from_date}</DATE_FROM>
              <DATE_TO>{to_date}</DATE_TO>
              <RECON_STAT>-1</RECON_STAT>
            </GET_TRIPS_LOG10>
          </soap:Body>
        </soap:Envelope>"""
        return self._make_soap_request("GET_TRIPS_LOG10", payload)

    def get_trans_by_date_cab12(self, from_date: str, to_date: str, cab_number: str = "") -> str:
        """
        Fetches card transaction data from the Get_Trans_By_Date_Cab12 endpoint.
        
        Args:
            from_date: Start date in YYYY-MM-DD format
            to_date: End date in YYYY-MM-DD format
            cab_number: Optional medallion number filter
        """
        payload = f"""<?xml version="1.0" encoding="utf-8"?>
        <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <Get_Trans_By_Date_Cab12 xmlns="https://www.taxitronic.org/VTS_SERVICE/">
              <UserId>{self.username}</UserId>
              <Password>{self.password}</Password>
              <Merchant>{self.merchant}</Merchant>
              <fromDateTime>{from_date} 00:00:00</fromDateTime>
              <ToDateTime>{to_date} 23:59:59</ToDateTime>
              <CabNumber>{cab_number}</CabNumber>
              <TranType>ALL</TranType>
            </Get_Trans_By_Date_Cab12>
          </soap:Body>
        </soap:Envelope>"""
        return self._make_soap_request("Get_Trans_By_Date_Cab12", payload)

    def reconcile_trips(self, trip_ids: List[str], reconciliation_id: str):
        """Marks a list of trip IDs as reconciled in the CURB system."""
        if not trip_ids:
            return

        # CURB API expects a comma-separated string of IDs
        list_ids = ",".join(trip_ids)
        
        payload = f"""<?xml version="1.0" encoding="utf-8"?>
        <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <Reconciliation_TRIP_LOG xmlns="https://www.taxitronic.org/VTS_SERVICE/">
              <UserId>{self.username}</UserId>
              <Password>{self.password}</Password>
              <Merchant>{self.merchant}</Merchant>
              <RECON_STAT>{reconciliation_id}</RECON_STAT>
              <ListIDs>{list_ids}</ListIDs>
            </Reconciliation_TRIP_LOG>
          </soap:Body>
        </soap:Envelope>"""
        self._make_soap_request("Reconciliation_TRIP_LOG", payload)


class CurbService:
    """
    Main service for orchestrating CURB data import, processing, and reconciliation.
    """

    def __init__(self, db: Session):
        self.db = db
        self.repo = CurbRepository(db)
        self.api_service = CurbApiService()

    def _parse_and_normalize_trips(self, xml_data: str) -> List[Dict]:
        """
        Parses the XML response from CURB and normalizes it into a standard dictionary format.
        Handles both the GET_TRIPS_LOG10 and Get_Trans_By_Date_Cab12 response structures.
        """
        trips = []
        if not xml_data:
            return trips
        
        try:
            root = ET.fromstring(xml_data)
            trip_nodes = root.findall(".//trip") + root.findall(".//tran")
            
            for trip_node in trip_nodes:
                if not isinstance(trip_node, ET.Element):
                    continue
                    
                try:
                    def get_value(element, field_name):
                        """Get value from either attribute or nested element"""
                        # Try attribute first
                        attr_value = element.attrib.get(field_name)
                        if attr_value is not None:
                            return attr_value
                            
                        # Try nested element
                        child_elem = element.find(field_name)
                        if child_elem is not None:
                            return child_elem.text
                            
                        return None

                    # Determine payment type with flexible parsing
                    payment_type_str = get_value(trip_node, "PAYMENT_TYPE") or get_value(trip_node, "CC_TYPE") or ""
                    payment_type_char = payment_type_str[0] if payment_type_str else None
                    
                    if payment_type_char == '$' or 'cash' in (trip_node.findtext('PAYMENT_TYPE') or '').lower():
                        payment_type = PaymentType.CASH
                    elif payment_type_char in ['C', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']:
                        payment_type = PaymentType.CREDIT_CARD
                    elif payment_type_char == 'P':
                        payment_type = PaymentType.PRIVATE
                    else:
                        payment_type = PaymentType.UNKNOWN

                    # Use ROWID for transactions and a composite key for trips
                    trip_id = trip_node.attrib.get("ROWID") or trip_node.attrib.get("RECORD ID")
                    period = trip_node.attrib.get("PERIOD")

                    if not trip_id:
                        continue
                    
                    unique_id = f"{period}-{trip_id}" if period else trip_id

                    # Parse date and time with flexible approach
                    trip_date = get_value(trip_node, "TRIPDATE") or ""
                    trip_time_start = get_value(trip_node, "TRIPTIMESTART") or ""
                    trip_time_end = get_value(trip_node, "TRIPTIMEEND") or ""
                    
                    # Try to get combined datetime first, then fall back to date+time combination
                    start_datetime_str = get_value(trip_node, "START_DATE")
                    end_datetime_str = get_value(trip_node, "END_DATE")
                    
                    # If no combined datetime, construct from separate date and time fields
                    if not start_datetime_str and trip_date and trip_time_start:
                        start_datetime_str = f"{trip_date} {trip_time_start}"
                    if not end_datetime_str and trip_date and trip_time_end:
                        end_datetime_str = f"{trip_date} {trip_time_end}"
                        
                    # Handle alternative datetime format (DATETIME field)
                    if not start_datetime_str:
                        datetime_field = get_value(trip_node, "DATETIME")
                        if datetime_field:
                            start_datetime_str = datetime_field
                            # For single datetime, assume trip duration or use same for both
                            end_datetime_str = end_datetime_str or datetime_field
                    
                    # Clean up the strings
                    start_datetime_str = (start_datetime_str or "").strip()
                    end_datetime_str = (end_datetime_str or "").strip()
                    
                    # Try parsing with seconds first, then without
                    def parse_flexible_datetime(datetime_str: str) -> datetime:
                        """Parse datetime with flexible format handling."""
                        if not datetime_str or datetime_str == " ":
                            raise ValueError("Empty datetime string")
                        
                        # Try with seconds first
                        try:
                            return datetime.strptime(datetime_str, "%m/%d/%Y %H:%M:%S")
                        except ValueError:
                            # If that fails, try without seconds
                            try:
                                return datetime.strptime(datetime_str, "%m/%d/%Y %H:%M")
                            except ValueError:
                                # If both fail, log and re-raise
                                logger.warning(f"Failed to parse datetime: '{datetime_str}'")
                                raise

                    start_time = parse_flexible_datetime(start_datetime_str)
                    end_time = parse_flexible_datetime(end_datetime_str)

                    # Extract CABNUMBER with flexible parsing (attributes or nested elements)
                    cab_number = get_value(trip_node, "CABNUMBER")
                    if not cab_number:
                        # Try alternative attribute names
                        cab_number = get_value(trip_node, "CAB_NUMBER") or get_value(trip_node, "CabNumber")
                        
                    if not cab_number and trip_node.tag == "tran":
                        # Debug: Log when CABNUMBER is missing from transaction records
                        logger.warning(f"Missing CABNUMBER in transaction {unique_id}. Available attributes: {list(trip_node.attrib.keys())}")
                        # Log child elements for debugging
                        child_elements = [child.tag for child in trip_node]
                        logger.warning(f"Available child elements: {child_elements}")
                    elif cab_number:
                        logger.debug(f"Found CABNUMBER: {cab_number} for transaction {unique_id}")

                    trip_data = {
                        "curb_trip_id": unique_id,
                        "curb_period": period,
                        "status": CurbTripStatus.UNRECONCILED,
                        "curb_driver_id": get_value(trip_node, "DRIVER") or get_value(trip_node, "TRIPDRIVERID"),
                        "curb_cab_number": cab_number,
                        "start_time": start_time,
                        "end_time": end_time,
                        "fare": Decimal(get_value(trip_node, "TRIPFARE") or "0.00"),
                        "tips": Decimal(get_value(trip_node, "TRIPTIPS") or get_value(trip_node, "TIPS") or "0.00"),
                        "tolls": Decimal(get_value(trip_node, "TRIPTOLL") or "0.00"),
                        "extras": Decimal(get_value(trip_node, "TRIPEXTRAS") or "0.00"),
                        "total_amount": Decimal(get_value(trip_node, "AMOUNT") or get_value(trip_node, "TOTAL_AMOUNT") or "0.00"),
                        "surcharge": Decimal(get_value(trip_node, "TAX") or "0.00"),
                        "improvement_surcharge": Decimal(get_value(trip_node, "IMPTAX") or "0.00"),
                        "congestion_fee": Decimal(get_value(trip_node, "CongFee") or "0.00"),
                        "airport_fee": Decimal(get_value(trip_node, "airportFee") or "0.00"),
                        "cbdt_fee": Decimal(get_value(trip_node, "cbdt") or "0.00"),
                        "payment_type": payment_type,
                    }
                    logger.info("Parsed trip data: %s", trip_data)
                    trips.append(trip_data)
                except (ValueError, KeyError) as e:
                    logger.warning("Skipping malformed trip record: %s. Error: %s", 
                                ET.tostring(trip_node, 'utf-8'), e)
                    continue

        except ET.ParseError as e:
            logger.error("Failed to parse CURB XML data: %s", e, exc_info=True)
            raise CurbApiError("Invalid XML data received from CURB.") from e
        
        return trips

    def import_and_map_data(self, from_date: date, to_date: date) -> Dict:
        """
        Fetches data from both CURB endpoints, normalizes it, and maps it to internal entities.
        """
        try:
            date_format = "%m/%d/%Y"
            from_date_str = from_date.strftime(date_format)
            to_date_str = to_date.strftime(date_format)

            logger.info(f"Fetching CURB data from {from_date_str} to {to_date_str}.")

            # Fetch from both endpoints
            trips_log_xml = self.api_service.get_trips_log10(from_date_str, to_date_str)
            trans_xml = self.api_service.get_trans_by_date_cab12(from_date_str, to_date_str)
            
            # Parse and combine
            normalized_trips = self._parse_and_normalize_trips(trips_log_xml)
            normalized_trans = self._parse_and_normalize_trips(trans_xml)

            # Combine and deduplicate, giving preference to the more detailed transaction records
            combined_data = {trip['curb_trip_id']: trip for trip in normalized_trips}
            combined_data.update({tran['curb_trip_id']: tran for tran in normalized_trans})
            
            all_trips_data = list(combined_data.values())
            logger.info(f"Fetched and normalized a total of {len(all_trips_data)} unique records from CURB.")

            # Map to internal entities
            mapped_trips = []
            mapping_errors = 0
            for trip_data in all_trips_data:
                try:
                    # Find driver by TLC license (curb_driver_id)
                    logger.info(f"Mapping trip {trip_data['curb_trip_id']} to internal entities.")
                    driver = driver_service.get_drivers(self.db, tlc_license_number=trip_data["curb_driver_id"])
                    if not driver:
                        raise DataMappingError("TLC License", trip_data["curb_driver_id"])
                    
                    # Find medallion by cab number (if available)
                    medallion = None
                    if trip_data.get("curb_cab_number"):
                        medallion = medallion_service.get_medallion(self.db, medallion_number=trip_data["curb_cab_number"])
                        if not medallion:
                            raise DataMappingError("Medallion Number", trip_data["curb_cab_number"])

                    # Find the active lease for this driver and medallion on the trip date
                    active_lease = None
                    logger.info(f"Finding active lease for driver {driver.driver_id} and medallion {trip_data.get('curb_cab_number')}.")
                    if medallion:
                        active_lease = lease_service.get_lease(
                            self.db,
                            driver_id=driver.driver_id,
                            medallion_number=medallion.medallion_number,
                            status= "Active",
                        )
                        if not active_lease:
                            raise DataMappingError("Active Lease", f"Driver: {driver.driver_id}, Medallion: {medallion.medallion_number}")

                    trip_data["driver_id"] = driver.id
                    trip_data["medallion_id"] = medallion.id if medallion else None
                    trip_data["lease_id"] = active_lease.id if active_lease else None
                    trip_data["vehicle_id"] = active_lease.vehicle_id if active_lease else None
                    
                    mapped_trips.append(trip_data)

                except DataMappingError as e:
                    logger.warning(str(e))
                    mapping_errors += 1
                    continue
            
            logger.info(f"Successfully mapped {len(mapped_trips)} trips to internal entities.")

            # Bulk insert/update into the database
            inserted, updated = self.repo.bulk_insert_or_update(mapped_trips)
            self.db.commit()

            return {
                "total_records": len(all_trips_data),
                "mapped_records": len(mapped_trips),
                "mapping_errors": mapping_errors,
                "newly_inserted": inserted,
                "updated": updated,
            }
        except (CurbApiError, SQLAlchemyError) as e:
            self.db.rollback()
            logger.error("Failed during CURB data import and mapping: %s", e, exc_info=True)
            raise

    def import_driver_data(self, driver_id: Optional[str], tlc_license_no: Optional[str], 
                          start_date: date, end_date: date) -> Dict:
        """
        Import CURB data for a specific driver within a date range.
        
        Args:
            driver_id: Internal driver ID (optional)
            tlc_license_no: TLC License Number (optional) - at least one must be provided
            start_date: Start date for import
            end_date: End date for import
        """
        try:
            # Determine which TLC license to use for CURB API
            if tlc_license_no:
                curb_driver_id = tlc_license_no
            elif driver_id:
                # Look up TLC license from internal driver ID
                driver = driver_service.get_drivers(self.db, driver_id=driver_id)
                if not driver or not driver.driver_tlc_license.tlc_license_number:
                    raise ValueError(f"Driver {driver_id} not found or has no TLC license")
                curb_driver_id = driver.driver_tlc_license.tlc_license_number
            else:
                raise ValueError("Either driver_id or tlc_license_no must be provided")

            date_format = "%m/%d/%Y"
            from_date_str = start_date.strftime(date_format)
            to_date_str = end_date.strftime(date_format)

            logger.info(f"Importing CURB data for driver {curb_driver_id} from {from_date_str} to {to_date_str}")

            # Fetch data from CURB API with driver filter
            trips_log_xml = self.api_service.get_trips_log10(from_date_str, to_date_str, driver_id=curb_driver_id)
            trans_xml = self.api_service.get_trans_by_date_cab12(from_date_str, to_date_str)
            
            # Parse and combine (trans data might not support driver filtering, so filter it manually)
            normalized_trips = self._parse_and_normalize_trips(trips_log_xml)
            normalized_trans = self._parse_and_normalize_trips(trans_xml)
            
            # Filter trans data to only include trips for this driver
            filtered_trans = [t for t in normalized_trans if t.get('curb_driver_id') == curb_driver_id]
            
            # Combine and deduplicate
            combined_data = {trip['curb_trip_id']: trip for trip in normalized_trips}
            combined_data.update({tran['curb_trip_id']: tran for tran in filtered_trans})
            
            all_trips_data = list(combined_data.values())
            logger.info(f"Fetched {len(all_trips_data)} records for driver {curb_driver_id}")

            return self._process_and_store_trips(all_trips_data, f"driver {curb_driver_id}")

        except (CurbApiError, SQLAlchemyError, ValueError) as e:
            self.db.rollback()
            logger.error(f"Failed to import data for driver {curb_driver_id}: %s", e, exc_info=True)
            raise

    def import_medallion_data(self, medallion_number: str, start_date: date, end_date: date) -> Dict:
        """
        Import CURB data for a specific medallion within a date range.
        """
        try:
            date_format = "%m/%d/%Y"
            from_date_str = start_date.strftime(date_format)
            to_date_str = end_date.strftime(date_format)

            logger.info(f"Importing CURB data for medallion {medallion_number} from {from_date_str} to {to_date_str}")

            # Fetch data from CURB API with medallion filter
            trips_log_xml = self.api_service.get_trips_log10(from_date_str, to_date_str, cab_number=medallion_number)
            trans_xml = self.api_service.get_trans_by_date_cab12(from_date_str, to_date_str, cab_number=medallion_number)
            
            # Parse and combine
            normalized_trips = self._parse_and_normalize_trips(trips_log_xml)
            normalized_trans = self._parse_and_normalize_trips(trans_xml)
            
            # Combine and deduplicate
            combined_data = {trip['curb_trip_id']: trip for trip in normalized_trips}
            combined_data.update({tran['curb_trip_id']: tran for tran in normalized_trans})
            
            all_trips_data = list(combined_data.values())
            logger.info(f"Fetched {len(all_trips_data)} records for medallion {medallion_number}")

            return self._process_and_store_trips(all_trips_data, f"medallion {medallion_number}")

        except (CurbApiError, SQLAlchemyError) as e:
            self.db.rollback()
            logger.error(f"Failed to import data for medallion {medallion_number}: %s", e, exc_info=True)
            raise

    def import_filtered_data(self, start_date: date, end_date: date, 
                           driver_ids: Optional[List[str]] = None,
                           medallion_numbers: Optional[List[str]] = None) -> Dict:
        """
        Import CURB data for specific date range with optional driver/medallion filters.
        For multiple filters, this fetches all data and filters locally since CURB API
        doesn't support multiple simultaneous filters.
        """
        try:
            date_format = "%m/%d/%Y"
            from_date_str = start_date.strftime(date_format)
            to_date_str = end_date.strftime(date_format)

            filter_desc = f"date range {from_date_str} to {to_date_str}"
            if driver_ids:
                filter_desc += f", drivers: {', '.join(driver_ids)}"
            if medallion_numbers:
                filter_desc += f", medallions: {', '.join(medallion_numbers)}"

            logger.info(f"Importing CURB data for {filter_desc}")

            # For multiple filters, fetch all data and filter locally
            trips_log_xml = self.api_service.get_trips_log10(from_date_str, to_date_str)
            trans_xml = self.api_service.get_trans_by_date_cab12(from_date_str, to_date_str)
            
            # Parse and combine
            normalized_trips = self._parse_and_normalize_trips(trips_log_xml)
            normalized_trans = self._parse_and_normalize_trips(trans_xml)
            
            # Apply local filters
            if driver_ids:
                normalized_trips = [t for t in normalized_trips if t.get('curb_driver_id') in driver_ids]
                normalized_trans = [t for t in normalized_trans if t.get('curb_driver_id') in driver_ids]
            
            if medallion_numbers:
                normalized_trips = [t for t in normalized_trips if t.get('curb_cab_number') in medallion_numbers]
                normalized_trans = [t for t in normalized_trans if t.get('curb_cab_number') in medallion_numbers]
            
            # Combine and deduplicate
            combined_data = {trip['curb_trip_id']: trip for trip in normalized_trips}
            combined_data.update({tran['curb_trip_id']: tran for tran in normalized_trans})
            
            all_trips_data = list(combined_data.values())
            logger.info(f"Fetched {len(all_trips_data)} records matching filters")

            return self._process_and_store_trips(all_trips_data, filter_desc)

        except (CurbApiError, SQLAlchemyError) as e:
            self.db.rollback()
            logger.error("Failed to import filtered data: %s", e, exc_info=True)
            raise

    def _process_and_store_trips(self, trips_data: List[Dict], description: str) -> Dict:
        """
        Common helper method to process and store trip data with entity mapping.
        """
        if not trips_data:
            logger.info(f"No trips data to process for {description}")
            return {
                "total_records": 0,
                "mapped_records": 0,
                "mapping_errors": 0,
                "newly_inserted": 0,
                "updated": 0,
            }

        # Map to internal entities
        mapped_trips = []
        mapping_errors = 0
        
        for trip_data in trips_data:
            try:
                # Find driver by TLC license (curb_driver_id)
                driver = driver_service.get_drivers(self.db, tlc_license_number=trip_data["curb_driver_id"])
                if not driver:
                    raise DataMappingError("TLC License", trip_data["curb_driver_id"])
                
                # Find medallion by cab number (if available)
                medallion = None
                if trip_data.get("curb_cab_number"):
                    medallion = medallion_service.get_medallion(self.db, medallion_number=trip_data["curb_cab_number"])
                    if not medallion:
                        raise DataMappingError("Medallion Number", trip_data["curb_cab_number"])

                # Find the active lease for this driver and medallion on the trip date
                active_lease = None
                if medallion:
                    active_lease = lease_service.get_lease(
                        self.db,
                        driver_id=driver.driver_id,
                        medallion_number=medallion.medallion_number,
                        status="Active",
                    )
                    if not active_lease:
                        raise DataMappingError("Active Lease", f"Driver: {driver.driver_id}, Medallion: {medallion.medallion_number}")

                trip_data["driver_id"] = driver.id
                trip_data["medallion_id"] = medallion.id if medallion else None
                trip_data["lease_id"] = active_lease.id if active_lease else None
                trip_data["vehicle_id"] = active_lease.vehicle_id if active_lease else None
                
                mapped_trips.append(trip_data)

            except DataMappingError as e:
                logger.warning(str(e))
                mapping_errors += 1
                continue
        
        logger.info(f"Successfully mapped {len(mapped_trips)} trips for {description}")

        # Bulk insert/update into the database
        inserted, updated = self.repo.bulk_insert_or_update(mapped_trips)
        self.db.commit()

        return {
            "total_records": len(trips_data),
            "mapped_records": len(mapped_trips),
            "mapping_errors": mapping_errors,
            "newly_inserted": inserted,
            "updated": updated,
        }
        
    def reconcile_unreconciled_trips(self):
        """
        Finds all unreconciled trips in the local DB, sends them to the CURB
        reconciliation endpoint, and updates their local status.
        """
        if settings.environment != "production":
            logger.info("Skipping reconciliation in non-production environment. Marking as RECONCILED locally.")
            unreconciled_trips = self.repo.get_unreconciled_trips()
            for trip in unreconciled_trips:
                self.repo.update_trip_status(trip.id, CurbTripStatus.RECONCILED)
            self.db.commit()
            return {"reconciled_count": len(unreconciled_trips), "reconciliation_id": "local-dev-reco"}

        logger.info("Starting CURB reconciliation process.")
        unreconciled_trips = self.repo.get_unreconciled_trips()

        if not unreconciled_trips:
            logger.info("No unreconciled trips found.")
            return {"reconciled_count": 0, "reconciliation_id": None}

        # Group trips by their original source (record vs tran) to use the correct ID for reconciliation
        trip_ids_to_reconcile = [trip.curb_trip_id.split('-')[-1] for trip in unreconciled_trips]
        
        reconciliation_id = f"BAT-RECO-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

        try:
            self.api_service.reconcile_trips(trip_ids_to_reconcile, reconciliation_id)
            logger.info(f"Successfully sent {len(trip_ids_to_reconcile)} trips for reconciliation with ID: {reconciliation_id}")

            # Update status in local DB
            for trip in unreconciled_trips:
                self.repo.update_trip_status(trip.id, CurbTripStatus.RECONCILED, reconciliation_id)
            
            self.db.commit()
            return {"reconciled_count": len(unreconciled_trips), "reconciliation_id": reconciliation_id}

        except CurbApiError as e:
            self.db.rollback()
            logger.error("Failed to reconcile trips with CURB API: %s", e, exc_info=True)
            raise ReconciliationError(f"CURB API failed during reconciliation: {e}") from e
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error("Database error during reconciliation status update: %s", e, exc_info=True)
            raise ReconciliationError(f"DB error during reconciliation: {e}") from e

    # def post_earnings_to_ledger(self, start_date: date, end_date: date, ledger_service: LedgerService):
    #     """
    #     Finds all reconciled credit card trips for the period and posts them as
    #     earnings to the centralized ledger.
    #     """
    #     logger.info(f"Starting process to post earnings to ledger for period: {start_date} to {end_date}")
    #     trips_to_post = self.repo.get_unposted_credit_card_trips_for_period(start_date, end_date)

    #     if not trips_to_post:
    #         logger.info("No new credit card earnings to post to the ledger.")
    #         return {"posted_count": 0, "total_amount": 0.0}
        
    #     # Group earnings by driver to make one ledger call per driver
    #     earnings_by_driver: Dict[int, Decimal] = {}
    #     lease_id_map: Dict[int, int] = {}

    #     for trip in trips_to_post:
    #         if trip.driver_id is None:
    #             logger.warning(f"Skipping trip {trip.curb_trip_id} as it has no associated driver_id.")
    #             continue
            
    #         # Earnings are net of taxes/surcharges, so we sum the core components
    #         net_earning = trip.fare + trip.tips
            
    #         earnings_by_driver.setdefault(trip.driver_id, Decimal("0.0"))
    #         earnings_by_driver[trip.driver_id] += net_earning
    #         lease_id_map[trip.driver_id] = trip.lease_id

    #     posted_count = 0
    #     total_posted_amount = Decimal("0.0")
        
    #     for driver_id, total_earnings in earnings_by_driver.items():
    #         try:
    #             lease_id = lease_id_map[driver_id]
    #             logger.info(f"Posting total earnings of ${total_earnings} for driver_id {driver_id} to lease {lease_id}.")
                
    #             # This service call will create the CREDIT posting and apply it against open balances
    #             ledger_service.apply_weekly_earnings(
    #                 driver_id=driver_id,
    #                 earnings_amount=total_earnings,
    #                 lease_id=lease_id,
    #             )
                
    #             posted_count += 1
    #             total_posted_amount += total_earnings
    #         except (ValueError, SQLAlchemyError) as e:
    #             logger.error(f"Failed to post earnings for driver {driver_id}: {e}", exc_info=True)
    #             # Continue to other drivers, do not rollback successful postings
        
    #     # After processing all drivers, update the status of the trips that were included
    #     for trip in trips_to_post:
    #         if trip.driver_id in earnings_by_driver:
    #             self.repo.update_trip_status(trip.id, CurbTripStatus.POSTED_TO_LEDGER)

    #     self.db.commit()
    #     logger.info(f"Successfully posted earnings for {posted_count} drivers. Total amount: ${total_posted_amount}")

    #     return {"posted_count": posted_count, "total_amount": float(total_posted_amount)}
    
    def import_and_map_data_for_active_leases(self, start_date: date, end_date: date) -> Dict:
        """
        OPTIMIZED & REFACTORED METHOD with separated fetch and processing phases.
        
        Phase 1: Fetch active leases and build mapping
        Phase 2: Fetch CURB data for all active drivers (with error handling)
        Phase 3: Process and store all fetched trips
        
        Args:
            start_date: Start date for import
            end_date: End date for import
            
        Returns:
            Dictionary with comprehensive import statistics
        """
        try:
            date_format = "%m/%d/%Y"
            from_date_str = start_date.strftime(date_format)
            to_date_str = end_date.strftime(date_format)

            logger.info(f"=== Starting CURB import for active leases: {from_date_str} to {to_date_str} ===")

            # ========================================
            # PHASE 1: Build Active Lease Mapping
            # ========================================
            logger.info("Phase 1: Building active lease mapping...")
            
            tlc_licenses, lease_mapping = self._build_active_lease_mapping()
            
            if not tlc_licenses:
                logger.warning("No drivers with TLC licenses found in active leases")
                return self._empty_result("No TLC licenses found in active leases")

            logger.info(f"Found {len(tlc_licenses)} unique TLC licenses in active leases")
            
            # Log drivers with multiple leases for tracking
            multi_lease_drivers = {tlc: leases for tlc, leases in lease_mapping.items() if len(leases) > 1}
            if multi_lease_drivers:
                logger.info(f"Drivers with multiple leases: {len(multi_lease_drivers)}")
                for tlc, leases in multi_lease_drivers.items():
                    medallions = [l['medallion_number'] for l in leases]
                    logger.info(f"  TLC {tlc}: {len(leases)} leases with medallions {medallions}")

            # ========================================
            # PHASE 2: Fetch CURB Data
            # ========================================
            logger.info(f"Phase 2: Fetching CURB data for {len(tlc_licenses)} drivers...")
            
            fetch_results = self._fetch_curb_data_for_drivers(
                tlc_licenses, 
                from_date_str, 
                to_date_str
            )
            
            # Aggregate and log fetch results
            self._log_fetch_errors(fetch_results)
            
            successful_fetches = sum(1 for r in fetch_results if r.success)
            failed_fetches = len(fetch_results) - successful_fetches
            
            logger.info(f"Fetch complete: {successful_fetches} successful, {failed_fetches} failed")

            # Combine all successfully fetched trip data
            all_trips_data = []
            for result in fetch_results:
                if result.success:
                    all_trips_data.extend(result.trips_data)

            if not all_trips_data:
                logger.warning("No trips data to process after fetch phase")
                return {
                    "total_records": 0,
                    "mapped_records": 0,
                    "mapping_errors": 0,
                    "newly_inserted": 0,
                    "updated": 0,
                    "fetch_successful": successful_fetches,
                    "fetch_failed": failed_fetches,
                    "message": "No trips fetched from CURB"
                }

            # ========================================
            # PHASE 3: Process and Store
            # ========================================
            logger.info(f"Phase 3: Processing {len(all_trips_data)} trips...")
            result = self._process_and_store_trips_optimized(
                all_trips_data, 
                lease_mapping, 
                "daily import for active leases"
            )
            
            # Add fetch statistics to result
            result["fetch_successful"] = successful_fetches
            result["fetch_failed"] = failed_fetches
            result["drivers_processed"] = len(tlc_licenses)
            
            logger.info(f"=== CURB import complete: {result} ===")
            return result

        except Exception as e:
            self.db.rollback()
            logger.error(f"Critical error during CURB import: {e}", exc_info=True)
            raise

    def _build_active_lease_mapping(self) -> Tuple[Set[str], Dict[str, List[Dict]]]:
        """
        Phase 1: Build mapping of TLC licenses to lease information.
        
        CRITICAL: This method supports drivers with MULTIPLE ACTIVE LEASES.
        Each TLC license can map to a list of lease records, allowing the system
        to correctly assign trips based on the medallion number in each trip.
        
        Returns:
            Tuple of (tlc_licenses_set, lease_mapping_dict)
            
        Example lease_mapping structure:
        {
            "5012345": [  # Driver with 2 leases
                {
                    'lease_id': 101,
                    'driver_id': 50,
                    'medallion_number': '1A23',
                    'medallion_id': 10,
                    'vehicle_id': 200,
                    'is_additional_driver': False
                },
                {
                    'lease_id': 102,
                    'driver_id': 50,
                    'medallion_number': '2B45',
                    'medallion_id': 11,
                    'vehicle_id': 201,
                    'is_additional_driver': False
                }
            ]
        }
        """
        logger.debug("Fetching active leases with driver relationships...")
        
        active_leases = lease_service.get_active_leases_with_drivers(self.db)

        if not active_leases:
            return set(), {}

        tlc_licenses = set()
        lease_mapping = {}
        
        driver_count = 0
        additional_driver_count = 0
        
        for lease in active_leases:
            for lease_driver in lease.lease_driver:
                if lease_driver.is_active and lease_driver.driver:
                    driver = lease_driver.driver
                    
                    if not driver.tlc_license or not driver.tlc_license.tlc_license_number:
                        logger.warning(
                            f"Driver {driver.driver_id} in lease {lease.lease_id} "
                            f"has no TLC license number - skipping"
                        )
                        continue
                    
                    tlc_license = driver.tlc_license.tlc_license_number
                    tlc_licenses.add(tlc_license)
                    
                    # Build mapping for O(1) lookup during processing
                    # CRITICAL: Store as a LIST to support multiple leases per driver
                    if tlc_license not in lease_mapping:
                        lease_mapping[tlc_license] = []
                    
                    lease_mapping[tlc_license].append({
                        'lease_id': lease.id,
                        'driver_id': driver.id,
                        'medallion_number': lease.medallion.medallion_number if lease.medallion else None,
                        'medallion_id': lease.medallion.id if lease.medallion else None,
                        'vehicle_id': lease.vehicle_id,
                        'is_additional_driver': lease_driver.is_additional_driver
                    })
                    
                    driver_count += 1
                    if lease_driver.is_additional_driver:
                        additional_driver_count += 1

        logger.info(
            f"Built lease mapping: {len(tlc_licenses)} TLC licenses, "
            f"{driver_count} total driver-lease associations "
            f"({additional_driver_count} additional drivers)"
        )
        
        return tlc_licenses, lease_mapping

    def _fetch_curb_data_for_drivers(
        self, 
        tlc_licenses: Set[str], 
        from_date_str: str, 
        to_date_str: str
    ) -> List[DriverFetchResult]:
        """
        Phase 2: Fetch CURB data for all drivers with comprehensive error handling.
        
        This method fetches data for each driver independently, capturing both
        successes and failures for better observability.
        
        Args:
            tlc_licenses: Set of TLC license numbers to fetch
            from_date_str: Start date in MM/DD/YYYY format
            to_date_str: End date in MM/DD/YYYY format
            
        Returns:
            List of DriverFetchResult objects
        """
        fetch_results = []
        processed = 0
        total = len(tlc_licenses)
        
        for tlc_license in tlc_licenses:
            processed += 1
            
            if processed % 10 == 0 or processed == total:
                logger.info(f"Fetching: {processed}/{total} drivers processed")
            
            try:
                # Fetch data for this specific driver
                trips_log_xml = self.api_service.get_trips_log10(
                    from_date_str, 
                    to_date_str, 
                    tlc_license
                )
                trans_xml = self.api_service.get_trans_by_date_cab12(
                    from_date_str, 
                    to_date_str, 
                    tlc_license
                )
                
                # Parse and combine data
                normalized_trips = self._parse_and_normalize_trips(trips_log_xml)
                normalized_trans = self._parse_and_normalize_trips(trans_xml)
                
                # Deduplicate by curb_trip_id
                combined_data = {trip['curb_trip_id']: trip for trip in normalized_trips}
                combined_data.update({tran['curb_trip_id']: tran for tran in normalized_trans})
                
                trips_data = list(combined_data.values())
                
                fetch_results.append(DriverFetchResult(
                    tlc_license=tlc_license,
                    success=True,
                    trips_data=trips_data
                ))
                
            except CurbApiError as e:
                logger.warning(f"CURB API error for TLC {tlc_license}: {e}")
                fetch_results.append(DriverFetchResult(
                    tlc_license=tlc_license,
                    success=False,
                    trips_data=[],
                    error_message=f"API error: {str(e)}"
                ))
            except Exception as e:
                logger.error(f"Unexpected error fetching data for TLC {tlc_license}: {e}", exc_info=True)
                fetch_results.append(DriverFetchResult(
                    tlc_license=tlc_license,
                    success=False,
                    trips_data=[],
                    error_message=f"Unexpected error: {str(e)}"
                ))
        
        logger.info(f"Fetch phase complete: processed {processed} drivers")
        return fetch_results

    def _log_fetch_errors(self, fetch_results: List[DriverFetchResult]) -> None:
        """Log detailed information about fetch errors"""
        failed_results = [r for r in fetch_results if not r.success]
        
        if not failed_results:
            return
        
        logger.warning(f"=== Fetch Errors Summary ({len(failed_results)} failures) ===")
        
        # Group errors by type
        error_groups = {}
        for result in failed_results:
            error_type = result.error_message.split(':')[0] if result.error_message else "Unknown"
            if error_type not in error_groups:
                error_groups[error_type] = []
            error_groups[error_type].append(result.tlc_license)
        
        for error_type, tlc_list in error_groups.items():
            logger.warning(f"  {error_type}: {len(tlc_list)} drivers")
            if len(tlc_list) <= 5:
                logger.warning(f"    TLC licenses: {', '.join(tlc_list)}")
            else:
                logger.warning(f"    TLC licenses (sample): {', '.join(tlc_list[:5])}...")

    def _process_and_store_trips_optimized(
        self, 
        trips_data: List[Dict], 
        lease_mapping: Dict[str, List[Dict]], 
        description: str
    ) -> Dict:
        """
        Phase 3: Process all fetched trips using pre-built lease mapping.
        
        CRITICAL FIX: This method correctly handles drivers with MULTIPLE LEASES.
        It matches each trip to the correct lease by checking BOTH:
        1. curb_driver_id (TLC license number)
        2. curb_cab_number (medallion number)
        
        This ensures that:
        - driver_id is mapped correctly
        - lease_id is mapped to the CORRECT lease based on the medallion
        - medallion_id is mapped correctly
        - vehicle_id is mapped correctly
        
        Uses pre-fetched lease mapping for O(1) lookups (no database queries per trip).
        
        Args:
            trips_data: List of normalized trip data from CURB
            lease_mapping: Pre-built mapping of TLC licenses to lease info
            description: Description for logging
            
        Returns:
            Dictionary with processing statistics
        """
        if not trips_data:
            logger.warning(f"No trips data to process for {description}")
            return self._empty_result()

        logger.info(f"Processing {len(trips_data)} trips...")

        try:
            mapped_trips = []
            mapping_errors = 0
            error_details = {}
            
            # Track progress for large datasets
            processed = 0
            progress_interval = max(100, len(trips_data) // 10)
            
            for trip_data in trips_data:
                processed += 1
                
                if processed % progress_interval == 0:
                    logger.info(f"Processing progress: {processed}/{len(trips_data)} trips")
                
                try:
                    curb_driver_id = trip_data.get("curb_driver_id")
                    curb_cab_number = trip_data.get("curb_cab_number")
                    
                    # Validation: Both driver and cab number are required
                    if not curb_driver_id or not curb_cab_number:
                        error_key = "Missing driver or cab number"
                        error_details[error_key] = error_details.get(error_key, 0) + 1
                        mapping_errors += 1
                        continue
                    
                    # O(1) lookup in pre-built mapping
                    if curb_driver_id not in lease_mapping:
                        error_key = f"No active lease for TLC: {curb_driver_id}"
                        error_details[error_key] = error_details.get(error_key, 0) + 1
                        mapping_errors += 1
                        continue
                    
                    # CRITICAL: Find matching lease for this specific medallion
                    # A driver may have multiple leases with different medallions
                    lease_info = None
                    for info in lease_mapping[curb_driver_id]:
                        if info['medallion_number'] == curb_cab_number:
                            lease_info = info
                            break
                    
                    if not lease_info:
                        error_key = f"No lease for TLC {curb_driver_id} + Medallion {curb_cab_number}"
                        error_details[error_key] = error_details.get(error_key, 0) + 1
                        mapping_errors += 1
                        continue
                    
                    # Map using pre-fetched information (no DB queries!)
                    # ALL FOUR IDs are now correctly mapped based on the specific lease
                    trip_data["driver_id"] = lease_info['driver_id']
                    trip_data["medallion_id"] = lease_info['medallion_id']
                    trip_data["lease_id"] = lease_info['lease_id']
                    trip_data["vehicle_id"] = lease_info['vehicle_id']
                    
                    mapped_trips.append(trip_data)

                except Exception as e:
                    logger.error(
                        f"Unexpected error mapping trip {trip_data.get('curb_trip_id')}: {e}", 
                        exc_info=True
                    )
                    error_key = "Unexpected mapping error"
                    error_details[error_key] = error_details.get(error_key, 0) + 1
                    mapping_errors += 1
                    continue
            
            # Log mapping error summary
            if error_details:
                logger.warning(f"=== Mapping Error Summary for {description} ===")
                for error_msg, count in sorted(error_details.items(), key=lambda x: x[1], reverse=True):
                    logger.warning(f"  {error_msg}: {count} trips")
            
            success_rate = (len(mapped_trips) / len(trips_data) * 100) if trips_data else 0
            logger.info(
                f"Mapping complete: {len(mapped_trips)}/{len(trips_data)} trips mapped "
                f"({success_rate:.1f}% success rate)"
            )

            # Bulk insert/update into the database
            logger.info("Starting bulk database insert/update...")
            inserted, updated = self.repo.bulk_insert_or_update(mapped_trips)
            self.db.commit()
            logger.info(f"Database operation complete: {inserted} inserted, {updated} updated")

            return {
                "total_records": len(trips_data),
                "mapped_records": len(mapped_trips),
                "mapping_errors": mapping_errors,
                "newly_inserted": inserted,
                "updated": updated,
                "success_rate_percent": round(success_rate, 2)
            }
            
        except (CurbApiError, SQLAlchemyError) as e:
            self.db.rollback()
            logger.error(f"Failed during trip processing for {description}: {e}", exc_info=True)
            raise

    def import_data_by_filters(
        self, 
        start_date: date, 
        end_date: date, 
        driver_ids: Optional[List[str]] = None,
        medallion_numbers: Optional[List[str]] = None
    ) -> Dict:
        """
        UPDATED: Import CURB data with optional filters for specific drivers and/or medallions.
        Now uses the optimized approach with proper multi-lease handling.
        
        For filtered imports, this method:
        1. Builds lease mapping for ALL active leases (to handle multi-lease drivers)
        2. Fetches data from CURB for specified filters
        3. Uses the optimized mapping process to correctly assign trips
        
        Args:
            start_date: Start date for import
            end_date: End date for import
            driver_ids: Optional list of TLC license numbers to import
            medallion_numbers: Optional list of medallion numbers to import
            
        Returns:
            Dictionary with import statistics
        """
        try:
            date_format = "%m/%d/%Y"
            from_date_str = start_date.strftime(date_format)
            to_date_str = end_date.strftime(date_format)

            filter_desc = f"date range {from_date_str} to {to_date_str}"
            if driver_ids:
                filter_desc += f", drivers: {', '.join(driver_ids)}"
            if medallion_numbers:
                filter_desc += f", medallions: {', '.join(medallion_numbers)}"

            logger.info(f"Importing CURB data with filters: {filter_desc}")

            # Build lease mapping for proper multi-lease handling
            _, lease_mapping = self._build_active_lease_mapping()

            # Fetch all data for the date range
            trips_log_xml = self.api_service.get_trips_log10(from_date_str, to_date_str)
            trans_xml = self.api_service.get_trans_by_date_cab12(from_date_str, to_date_str)
            
            # Parse and combine
            normalized_trips = self._parse_and_normalize_trips(trips_log_xml)
            normalized_trans = self._parse_and_normalize_trips(trans_xml)
            
            # Apply local filters
            if driver_ids:
                normalized_trips = [t for t in normalized_trips if t.get('curb_driver_id') in driver_ids]
                normalized_trans = [t for t in normalized_trans if t.get('curb_driver_id') in driver_ids]
            
            if medallion_numbers:
                normalized_trips = [t for t in normalized_trips if t.get('curb_cab_number') in medallion_numbers]
                normalized_trans = [t for t in normalized_trans if t.get('curb_cab_number') in medallion_numbers]
            
            # Combine and deduplicate
            combined_data = {trip['curb_trip_id']: trip for trip in normalized_trips}
            combined_data.update({tran['curb_trip_id']: tran for tran in normalized_trans})
            
            all_trips_data = list(combined_data.values())
            logger.info(f"Fetched {len(all_trips_data)} records matching filters")

            # Use optimized processing with proper lease mapping
            return self._process_and_store_trips_optimized(
                all_trips_data, 
                lease_mapping, 
                f"filtered import: {filter_desc}"
            )

        except (CurbApiError, SQLAlchemyError) as e:
            self.db.rollback()
            logger.error("Failed to import filtered data: %s", e, exc_info=True)
            raise

    def post_earnings_to_ledger(self, start_date: date, end_date: date) -> Dict:
        """
        Post unposted credit card earnings to the ledger for a given period.
        Groups earnings by driver and makes one ledger call per driver.
        
        IMPORTANT: This method uses the correctly mapped lease_id from the trip records
        that were populated by the optimized mapping process.
        """
        logger.info(f"Starting process to post earnings to ledger for period: {start_date} to {end_date}")
        trips_to_post = self.repo.get_unposted_credit_card_trips_for_period(start_date, end_date)

        if not trips_to_post:
            logger.info("No new credit card earnings to post to the ledger.")
            return {"posted_count": 0, "total_amount": 0.0}
        
        # Group earnings by driver AND lease_id
        # This ensures correct posting when a driver has multiple leases
        earnings_by_driver_lease: Dict[tuple, Decimal] = {}

        for trip in trips_to_post:
            if trip.driver_id is None or trip.lease_id is None:
                logger.warning(
                    f"Skipping trip {trip.curb_trip_id} - missing driver_id or lease_id. "
                    f"driver_id={trip.driver_id}, lease_id={trip.lease_id}"
                )
                continue
            
            # Earnings are net of taxes/surcharges
            net_earning = trip.fare + trip.tips
            
            key = (trip.driver_id, trip.lease_id)
            earnings_by_driver_lease.setdefault(key, Decimal("0.0"))
            earnings_by_driver_lease[key] += net_earning

        posted_count = 0
        total_posted_amount = Decimal("0.0")
        
        for (driver_id, lease_id), total_earnings in earnings_by_driver_lease.items():
            try:
                logger.info(
                    f"Posting earnings: ${total_earnings} for driver_id={driver_id}, lease_id={lease_id}"
                )
                
                # Create async ledger service with proper async session
                async def post_earnings_async():
                    async with AsyncSessionLocal() as async_session:
                        ledger_repo = LedgerRepository(async_session)
                        ledger_service = LedgerService(ledger_repo)
                        
                        await ledger_service.apply_weekly_earnings(
                            driver_id=driver_id,
                            earnings_amount=total_earnings,
                            lease_id=lease_id,
                        )
                        
                        await async_session.commit()
                
                # Execute the async ledger operation
                asyncio.run(post_earnings_async())
                
                posted_count += 1
                total_posted_amount += total_earnings
            except (ValueError, SQLAlchemyError) as e:
                logger.error(
                    f"Failed to post earnings for driver {driver_id}, lease {lease_id}: {e}", 
                    exc_info=True
                )
                # Continue to other drivers, do not rollback successful postings
        
        # Update trip statuses
        trip_ids_to_update = [
            trip.id for trip in trips_to_post 
            if trip.driver_id is not None and trip.lease_id is not None
        ]
        
        for trip_id in trip_ids_to_update:
            self.repo.update_trip_status(trip_id, CurbTripStatus.POSTED_TO_LEDGER)

        self.db.commit()
        logger.info(
            f"Successfully posted earnings for {posted_count} driver-lease combinations. "
            f"Total amount: ${total_posted_amount}"
        )

        return {
            "posted_count": posted_count, 
            "total_amount": float(total_posted_amount)
        }

    def _empty_result(self, message: str = "No data to process") -> Dict:
        """Return empty result structure"""
        return {
            "total_records": 0,
            "mapped_records": 0,
            "mapping_errors": 0,
            "newly_inserted": 0,
            "updated": 0,
            "fetch_successful": 0,
            "fetch_failed": 0,
            "drivers_processed": 0,
            "success_rate_percent": 0.0,
            "message": message
        }


# --- Celery Tasks ---

@app.task(name="curb.fetch_and_import_curb_trips")
def fetch_and_import_curb_trips_task():
    """
    Celery task to fetch trip data from CURB ONLY for drivers with active leases.
    This is the optimized version that runs daily.
    """
    logger.info("Executing Celery task: fetch_and_import_curb_trips_task (optimized for active leases)")
    db: Session = next(get_db())
    try:
        curb_service = CurbService(db)
        # Fetch data for the last 1 day to catch any delayed entries
        end_date = datetime.now(timezone.utc).date()
        start_date = end_date - timedelta(days=1)
        
        # Use the optimized method that only fetches for active lease drivers
        result = curb_service.import_and_map_data_for_active_leases(start_date, end_date)
        
        # Follow up with reconciliation
        reco_result = curb_service.reconcile_unreconciled_trips()
        
        result.update(reco_result)
        
        logger.info(f"CURB import task completed: {result}")
        return result
    except Exception as e:
        logger.error(f"CURB import task failed: {e}", exc_info=True)
        raise
    finally:
        db.close()


@app.task(name="curb.post_earnings_to_ledger")
def post_earnings_to_ledger_task():
    """
    Celery task to post all reconciled CURB earnings to the ledger.
    This runs weekly, just before the DTR generation.
    """
    logger.info("Executing Celery task: post_earnings_to_ledger_task")
    db: Session = next(get_db())
    try:
        curb_service = CurbService(db)
        # ledger_service = LedgerService(db)
        
        # This task runs on Sunday morning, so it processes the completed week (previous Sunday to Saturday)
        today = datetime.now(timezone.utc).date()
        # Find the most recent Saturday
        end_date = today
        # Find the Sunday at the start of that week
        start_date = end_date - timedelta(days=6)
        
        return curb_service.post_earnings_to_ledger(start_date, end_date)
    finally:
        db.close()


# Keep existing granular import tasks unchanged
@app.task(name="curb.import_driver_data")
def import_driver_data_task(driver_id: Optional[str], tlc_license_no: Optional[str], 
                           start_date_str: str, end_date_str: str):
    """
    Celery task to import CURB data for a specific driver within a date range.
    """
    logger.info(f"Executing CURB driver import task for driver_id={driver_id}, tlc_license={tlc_license_no}")
    db: Session = next(get_db())
    try:
        curb_service = CurbService(db)
        
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
        
        result = curb_service.import_driver_data(driver_id, tlc_license_no, start_date, end_date)
        
        reco_result = curb_service.reconcile_unreconciled_trips()
        result.update(reco_result)
        
        return result
    finally:
        db.close()


@app.task(name="curb.import_medallion_data")
def import_medallion_data_task(medallion_number: str, start_date_str: str, end_date_str: str):
    """
    Celery task to import CURB data for a specific medallion within a date range.
    
    Args:
        medallion_number: Medallion number to import data for
        start_date_str: Start date in YYYY-MM-DD format
        end_date_str: End date in YYYY-MM-DD format
    """
    logger.info(f"Executing CURB medallion import task for medallion={medallion_number}")
    db: Session = next(get_db())
    try:
        curb_service = CurbService(db)
        
        # Parse date strings
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
        
        result = curb_service.import_medallion_data(medallion_number, start_date, end_date)
        
        # Follow up with reconciliation
        reco_result = curb_service.reconcile_unreconciled_trips()
        result.update(reco_result)
        
        return result
    finally:
        db.close()


@app.task(name="curb.import_filtered_data")
def import_filtered_data_task(start_date_str: str, end_date_str: str,
                             driver_ids: Optional[List[str]] = None,
                             medallion_numbers: Optional[List[str]] = None):
    """
    Celery task to import CURB data for a specific date range with optional filters.
    
    Args:
        start_date_str: Start date in YYYY-MM-DD format
        end_date_str: End date in YYYY-MM-DD format
        driver_ids: Optional list of driver IDs to filter
        medallion_numbers: Optional list of medallion numbers to filter
    """
    logger.info(f"Executing CURB filtered import task for date range {start_date_str} to {end_date_str}")
    db: Session = next(get_db())
    try:
        curb_service = CurbService(db)
        
        # Parse date strings
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
        
        result = curb_service.import_filtered_data(start_date, end_date, driver_ids, medallion_numbers)
        
        # Follow up with reconciliation
        reco_result = curb_service.reconcile_unreconciled_trips()
        result.update(reco_result)
        
        return result
    finally:
        db.close()