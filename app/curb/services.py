### app/curb/services.py

import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, date, timezone
from decimal import Decimal
from typing import Dict, List, Optional

import requests
from app.core.celery_app import app
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.core.db import get_db
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
from app.medallions.services import medallion_service
from app.utils.logger import get_logger

logger = get_logger(__name__)


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
                    # Determine payment type
                    payment_type_str = trip_node.attrib.get("PAYMENT_TYPE", trip_node.findtext("CC_TYPE", ""))
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

                    # Parse date and time - FIX FOR THE ERROR
                    trip_date = trip_node.findtext("TRIPDATE", "")
                    trip_time_start = trip_node.findtext("TRIPTIMESTART", "")
                    trip_time_end = trip_node.findtext("TRIPTIMEEND", "")
                    
                    # Combine date and time, handling both formats (with and without seconds)
                    start_datetime_str = trip_node.attrib.get("START_DATE", f"{trip_date} {trip_time_start}").strip()
                    end_datetime_str = trip_node.attrib.get("END_DATE", f"{trip_date} {trip_time_end}").strip()
                    
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

                    trip_data = {
                        "curb_trip_id": unique_id,
                        "curb_period": period,
                        "status": CurbTripStatus.UNRECONCILED,
                        "curb_driver_id": trip_node.attrib.get("DRIVER", trip_node.findtext("TRIPDRIVERID")),
                        "curb_cab_number": trip_node.attrib.get("CABNUMBER"),
                        "start_time": start_time,
                        "end_time": end_time,
                        "fare": Decimal(trip_node.attrib.get("TRIPFARE", "0.00")),
                        "tips": Decimal(trip_node.attrib.get("TRIPTIPS", trip_node.attrib.get("TIPS", "0.00"))),
                        "tolls": Decimal(trip_node.attrib.get("TRIPTOLL", "0.00")),
                        "extras": Decimal(trip_node.attrib.get("TRIPEXTRAS", "0.00")),
                        "total_amount": Decimal(trip_node.attrib.get("AMOUNT", trip_node.attrib.get("TOTAL_AMOUNT", "0.00"))),
                        "surcharge": Decimal(trip_node.attrib.get("TAX", "0.00")),
                        "improvement_surcharge": Decimal(trip_node.attrib.get("IMPTAX", "0.00")),
                        "congestion_fee": Decimal(trip_node.attrib.get("CongFee", "0.00")),
                        "airport_fee": Decimal(trip_node.attrib.get("airportFee", "0.00")),
                        "cbdt_fee": Decimal(trip_node.attrib.get("cbdt", "0.00")),
                        "payment_type": payment_type,
                    }
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
                    driver = driver_service.get_drivers(self.db, tlc_license_number=trip_data["curb_driver_id"])
                    if not driver:
                        raise DataMappingError("TLC License", trip_data["curb_driver_id"])
                    
                    # Find medallion by cab number
                    medallion = medallion_service.get_medallion(self.db, medallion_number=trip_data["curb_cab_number"])
                    if not medallion:
                        raise DataMappingError("Medallion Number", trip_data["curb_cab_number"])

                    # Find the active lease for this driver and medallion on the trip date
                    active_lease = lease_service.get_lease(
                        self.db,
                        driver_id=driver.driver_id,
                        medallion_number=medallion.medallion_number,
                        status= "Active",
                    )
                    if not active_lease:
                        raise DataMappingError("Active Lease", f"Driver: {driver.driver_id}, Medallion: {medallion.medallion_number}")

                    trip_data["driver_id"] = driver.id
                    trip_data["medallion_id"] = medallion.id
                    trip_data["lease_id"] = active_lease.id
                    trip_data["vehicle_id"] = active_lease.vehicle_id
                    
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
                if not driver or not driver.tlc_license_number:
                    raise ValueError(f"Driver {driver_id} not found or has no TLC license")
                curb_driver_id = driver.tlc_license_number
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
                
                # Find medallion by cab number
                medallion = medallion_service.get_medallion(self.db, medallion_number=trip_data["curb_cab_number"])
                if not medallion:
                    raise DataMappingError("Medallion Number", trip_data["curb_cab_number"])

                # Find the active lease for this driver and medallion on the trip date
                active_lease = lease_service.get_lease(
                    self.db,
                    driver_id=driver.driver_id,
                    medallion_number=medallion.medallion_number,
                    status="Active",
                )
                if not active_lease:
                    raise DataMappingError("Active Lease", f"Driver: {driver.driver_id}, Medallion: {medallion.medallion_number}")

                trip_data["driver_id"] = driver.id
                trip_data["medallion_id"] = medallion.id
                trip_data["lease_id"] = active_lease.id
                trip_data["vehicle_id"] = active_lease.vehicle_id
                
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

    def post_earnings_to_ledger(self, start_date: date, end_date: date, ledger_service: LedgerService):
        """
        Finds all reconciled credit card trips for the period and posts them as
        earnings to the centralized ledger.
        """
        logger.info(f"Starting process to post earnings to ledger for period: {start_date} to {end_date}")
        trips_to_post = self.repo.get_unposted_credit_card_trips_for_period(start_date, end_date)

        if not trips_to_post:
            logger.info("No new credit card earnings to post to the ledger.")
            return {"posted_count": 0, "total_amount": 0.0}
        
        # Group earnings by driver to make one ledger call per driver
        earnings_by_driver: Dict[int, Decimal] = {}
        lease_id_map: Dict[int, int] = {}

        for trip in trips_to_post:
            if trip.driver_id is None:
                logger.warning(f"Skipping trip {trip.curb_trip_id} as it has no associated driver_id.")
                continue
            
            # Earnings are net of taxes/surcharges, so we sum the core components
            net_earning = trip.fare + trip.tips
            
            earnings_by_driver.setdefault(trip.driver_id, Decimal("0.0"))
            earnings_by_driver[trip.driver_id] += net_earning
            lease_id_map[trip.driver_id] = trip.lease_id

        posted_count = 0
        total_posted_amount = Decimal("0.0")
        
        for driver_id, total_earnings in earnings_by_driver.items():
            try:
                lease_id = lease_id_map[driver_id]
                logger.info(f"Posting total earnings of ${total_earnings} for driver_id {driver_id} to lease {lease_id}.")
                
                # This service call will create the CREDIT posting and apply it against open balances
                ledger_service.apply_weekly_earnings(
                    driver_id=driver_id,
                    earnings_amount=total_earnings,
                    lease_id=lease_id,
                )
                
                posted_count += 1
                total_posted_amount += total_earnings
            except (ValueError, SQLAlchemyError) as e:
                logger.error(f"Failed to post earnings for driver {driver_id}: {e}", exc_info=True)
                # Continue to other drivers, do not rollback successful postings
        
        # After processing all drivers, update the status of the trips that were included
        for trip in trips_to_post:
            if trip.driver_id in earnings_by_driver:
                self.repo.update_trip_status(trip.id, CurbTripStatus.POSTED_TO_LEDGER)

        self.db.commit()
        logger.info(f"Successfully posted earnings for {posted_count} drivers. Total amount: ${total_posted_amount}")

        return {"posted_count": posted_count, "total_amount": float(total_posted_amount)}


# --- Celery Tasks ---

@app.task(name="curb.fetch_and_import_curb_trips")
def fetch_and_import_curb_trips_task():
    """
    Celery task to fetch trip data from CURB, map it to internal entities, and store it.
    This runs daily.
    """
    logger.info("Executing Celery task: fetch_and_import_curb_trips_task")
    db: Session = next(get_db())
    try:
        curb_service = CurbService(db)
        # Fetch data for the last 1 days to catch any delayed entries
        end_date = datetime.now(timezone.utc).date()
        start_date = end_date - timedelta(days=1)
        
        result = curb_service.import_and_map_data(start_date, end_date)
        
        # Follow up with reconciliation
        reco_result = curb_service.reconcile_unreconciled_trips()
        
        result.update(reco_result)
        return result
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
        ledger_service = LedgerService(db)
        
        # This task runs on Sunday morning, so it processes the completed week (previous Sunday to Saturday)
        today = datetime.now(timezone.utc).date()
        # Find the most recent Saturday
        end_date = today - timedelta(days=(today.weekday() + 2) % 7)
        # Find the Sunday at the start of that week
        start_date = end_date - timedelta(days=6)
        
        return curb_service.post_earnings_to_ledger(start_date, end_date, ledger_service)
    finally:
        db.close()


@app.task(name="curb.import_driver_data")
def import_driver_data_task(driver_id: Optional[str], tlc_license_no: Optional[str], 
                           start_date_str: str, end_date_str: str):
    """
    Celery task to import CURB data for a specific driver within a date range.
    
    Args:
        driver_id: Internal driver ID (optional)
        tlc_license_no: TLC License Number (optional)
        start_date_str: Start date in YYYY-MM-DD format
        end_date_str: End date in YYYY-MM-DD format
    """
    logger.info(f"Executing CURB driver import task for driver_id={driver_id}, tlc_license={tlc_license_no}")
    db: Session = next(get_db())
    try:
        curb_service = CurbService(db)
        
        # Parse date strings
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
        
        result = curb_service.import_driver_data(driver_id, tlc_license_no, start_date, end_date)
        
        # Follow up with reconciliation
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