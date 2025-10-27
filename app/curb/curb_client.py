"""
app/curb/curb_client.py

CURB SOAP API Client
Handles all communication with CURB API endpoints
"""

from datetime import datetime, date
from typing import List, Dict, Optional
from decimal import Decimal

import requests
import xml.etree.ElementTree as ET

from app.core.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


class CurbAPIException(Exception):
    """Custom exception for CURB API errors."""
    pass


class CurbClient:
    """
    Client for interacting with CURB SOAP API
    Supports both production and testing environments
    """

    def __init__(self, is_production: bool = False):
        """
        Initialize CURB client

        Args:
            is_production: If True, use production API, else use testing API
        """
        self.is_production = is_production

        # Credentials from settings
        self.base_url = settings.curb_url
        self.user_id = settings.curb_username
        self.password = settings.curb_password
        self.merchant = settings.curb_merchant

        # === SOAP namespaces ===
        self.namespaces = {
            "soap": "http://schemas.xmlsoap.org/soap/envelope/",
            "vts": "https://www.taxitronic.org/VTS_SERVICE/"
        }

    def _make_soap_request(self, action: str, body: str) -> ET.Element:
        """
        Make a SOAP request to CURB API

        Args:
            action: SOAP action
            body: SOAP body content

        Returns:
            XML Element of response

        Raises:
            CurbAPIException: If API request fails
        """
        # === Build SOAP envelope ===
        envelope = f"""<?xml version="1.0" encoding="utf-8"?>
        <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                        xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
                        xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">

            <soap:Body>
                {body}
            </soap:Body>
        </soap:Envelope>"""

        headers = {
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": f"https://www.taxitronic.org/VTS_SERVICE/{action}"
        }

        try:
            logger.info(f"Making CURB API request: {action}")
            response = requests.post(
                self.base_url,
                data=envelope,
                headers=headers,
                timeout=120  # 2 minute timeout
            )
            
            response.raise_for_status()
            
            # Parse XML response
            root = ET.fromstring(response.content)
            return root
            
        except requests.exceptions.RequestException as e:
            logger.error(f"CURB API request failed: {str(e)}")
            raise CurbAPIException(f"API request failed: {str(e)}") from e
        except ET.ParseError as e:
            logger.error(f"Failed to parse CURB API response: {str(e)}")
            raise CurbAPIException(f"Invalid XML response: {str(e)}") from e
        
    def get_trips_log(
        self, date_from: date, date_to: date,
        driver_id: Optional[str] = None,
        cab_number: Optional[str] = None,
        recon_stat: int = -1
    ) -> List[Dict]:
        """
        Fetch trips from GET_TRIPS_LOG10 endpoint
        
        Args:
            date_from: Start date
            date_to: End date
            driver_id: Optional driver ID filter (blank for all)
            cab_number: Optional cab number filter (blank for all)
            recon_stat: Reconciliation status filter
                       -1: All records
                        0: Not reconciled
                       >0: Reconciled with specific value
        
        Returns:
            List of trip dictionaries
            
        Raises:
            CurbAPIException: If API request fails
        """
        # Format dates as MM/DD/YYYY
        date_from_str = date_from.strftime('%m/%d/%Y')
        date_to_str = date_to.strftime('%m/%d/%Y')
        
        # Build SOAP body
        body = f'''
        <GET_TRIPS_LOG10 xmlns="https://www.taxitronic.org/VTS_SERVICE/">
            <UserId>{self.user_id}</UserId>
            <Password>{self.password}</Password>
            <Merchant>{self.merchant}</Merchant>
            <DRIVERID>{driver_id or ''}</DRIVERID>
            <CABNUMBER>{cab_number or ''}</CABNUMBER>
            <DATE_FROM>{date_from_str}</DATE_FROM>
            <DATE_TO>{date_to_str}</DATE_TO>
            <RECON_STAT>{recon_stat}</RECON_STAT>
        </GET_TRIPS_LOG10>
        '''
        
        try:
            root = self._make_soap_request('GET_TRIPS_LOG10', body)
            
            # Extract trips from response
            trips = []
            
            # Find all RECORD elements
            for record in root.findall('.//RECORD'):
                trip_data = self._parse_trip_record(record)
                if trip_data:
                    trips.append(trip_data)
            
            logger.info(f"Fetched {len(trips)} trips from CURB API")
            return trips
            
        except Exception as e:
            logger.error(f"Error fetching trips: {str(e)}")
            raise CurbAPIException(f"Failed to fetch trips: {str(e)}") from e
        
    def _parse_trip_record(self, record: ET.Element) -> Optional[Dict]:
        """
        Parse a RECORD XML element into trip dictionary
        
        Args:
            record: XML Element containing trip data
            
        Returns:
            Dictionary of trip data or None if parsing fails
        """
        try:
            # Helper function to safely get attribute
            def get_attr(name: str, default: str = '') -> str:
                return record.get(name, default)
            
            def get_decimal(name: str, default: str = '0.0000') -> Decimal:
                try:
                    return Decimal(record.get(name, default))
                except:
                    return Decimal(default)
            
            # Parse payment type
            payment_type_code = get_attr('T', '$')
            payment_type_map = {
                '$': 'CASH',
                'C': 'CREDIT_CARD',
                'P': 'PRIVATE_CARD'
            }
            payment_type = payment_type_map.get(payment_type_code, 'CASH')
            
            # Parse datetime
            start_date_str = get_attr('START_DATE')
            end_date_str = get_attr('END_DATE')
            
            trip_data = {
                'curb_record_id': get_attr('ID'),
                'curb_period': get_attr('PERIOD'),
                'cab_number': get_attr('CABNUMBER'),
                'driver_id_curb': get_attr('DRIVER'),
                'num_service': get_attr('NUM_SERVICE'),
                'start_date_str': start_date_str,
                'end_date_str': end_date_str,
                'trip_fare': get_decimal('TRIP'),
                'tips': get_decimal('TIPS'),
                'extras': get_decimal('EXTRAS'),
                'tolls': get_decimal('TOLLS'),
                'mta_surcharge': get_decimal('TAX'),
                'tif': get_decimal('IMPTAX'),
                'congestion_surcharge': get_decimal('CONGFEE'),
                'cbdt': get_decimal('cbdt'),  # lowercase in CURB response
                'airport_fee': get_decimal('airportFee'),
                'total_amount': get_decimal('TOTAL_AMOUNT'),
                'payment_type': payment_type,
                'cc_last_four': get_attr('CCNUMBER', '')[-4:] if get_attr('CCNUMBER') else None,
                'auth_code': get_attr('AUTHCODE') or None,
                'auth_amount': get_decimal('AUTHAMT') if get_attr('AUTHAMT') else None,
                'passenger_count': int(get_attr('PASSENGER_NUM', '0')) if get_attr('PASSENGER_NUM') else None,
                'distance_service': get_decimal('DIST_SERVCE') if get_attr('DIST_SERVCE') else None,
                'distance_base': get_decimal('DIST_BS') if get_attr('DIST_BS') else None,
                'gps_start_lat': get_decimal('GPS_START_LA') if get_attr('GPS_START_LA') else None,
                'gps_start_lon': get_decimal('GPS_START_LO') if get_attr('GPS_START_LO') else None,
                'gps_end_lat': get_decimal('GPS_END_LA') if get_attr('GPS_END_LA') else None,
                'gps_end_lon': get_decimal('GPS_END_LO') if get_attr('GPS_END_LO') else None,
                'from_address': get_attr('FROM_ADDRESS') or None,
                'to_address': get_attr('TO_ADDRESS') or None,
                'reservation_number': get_attr('RESNUM') or None,
                'ehail_fee': get_decimal('EHAILFEE'),
                'health_fee': get_decimal('HEALTHFEE'),
            }
            
            return trip_data
            
        except Exception as e:
            logger.error(f"Error parsing trip record: {str(e)}")
            return None
    
    def get_transactions_by_date_cab(
        self,
        date_from: datetime,
        date_to: datetime,
        cab_number: str,
        tran_type: str = "ALL"
    ) -> List[Dict]:
        """
        Fetch transactions from GET_TRANS_By_Date_Cab12 endpoint
        
        Args:
            date_from: Start datetime
            date_to: End datetime
            cab_number: Cab number
            tran_type: Transaction type (AP/DC/DUP/ALL)
        
        Returns:
            List of transaction dictionaries
            
        Raises:
            CurbAPIException: If API request fails
        """
        # Format datetimes
        date_from_str = date_from.strftime('%m/%d/%Y %H:%M:%S')
        date_to_str = date_to.strftime('%m/%d/%Y %H:%M:%S')
        
        # Build SOAP body
        body = f'''
        <Get_Trans_By_Date_Cab12 xmlns="https://www.taxitronic.org/VTS_SERVICE/">
            <UserId>{self.user_id}</UserId>
            <Password>{self.password}</Password>
            <Merchant>{self.merchant}</Merchant>
            <fromDateTime>{date_from_str}</fromDateTime>
            <ToDateTime>{date_to_str}</ToDateTime>
            <CabNumber>{cab_number}</CabNumber>
            <TranType>{tran_type}</TranType>
        </Get_Trans_By_Date_Cab12>
        '''
        
        try:
            root = self._make_soap_request('Get_Trans_By_Date_Cab12', body)
            
            # Parse transactions (implementation depends on response structure)
            transactions = []
            
            # Extract transaction data from response
            for tran in root.findall('.//tran'):
                trans_data = self._parse_transaction_record(tran)
                if trans_data:
                    transactions.append(trans_data)
            
            logger.info(f"Fetched {len(transactions)} transactions from CURB API")
            return transactions
            
        except Exception as e:
            logger.error(f"Error fetching transactions: {str(e)}")
            raise CurbAPIException(f"Failed to fetch transactions: {str(e)}") from e
    
    def _parse_transaction_record(self, record: ET.Element) -> Optional[Dict]:
        """Parse transaction XML element"""
        try:
            return {
                'row_id': record.get('ROWID'),
                'transaction_date_str': record.get('TRANSACTION_DATE'),
                'cab_number': record.get('CABNUMBER'),
                'amount': Decimal(record.get('AMOUNT', '0.00')),
                'transaction_type': record.get('TRAN_TYPE', 'ALL'),
                # Add more fields as needed
            }
        except Exception as e:
            logger.error(f"Error parsing transaction record: {str(e)}")
            return None
    
    def reconcile_trip(
        self,
        record_id: str,
        period: str,
        recon_stat: int
    ) -> bool:
        """
        Mark trip as reconciled via Reconciliation_TRIP_LOG endpoint
        
        Args:
            record_id: CURB record ID
            period: CURB period (YYYYMM)
            recon_stat: Reconciliation status value to set
        
        Returns:
            True if successful
            
        Raises:
            CurbAPIException: If API request fails
        """
        body = f'''
        <Reconciliation_TRIP_LOG xmlns="https://www.taxitronic.org/VTS_SERVICE/">
            <UserId>{self.user_id}</UserId>
            <Password>{self.password}</Password>
            <Merchant>{self.merchant}</Merchant>
            <RECORD_ID>{record_id}</RECORD_ID>
            <PERIOD>{period}</PERIOD>
            <RECON_STAT>{recon_stat}</RECON_STAT>
        </Reconciliation_TRIP_LOG>
        '''
        
        try:
            root = self._make_soap_request('Reconciliation_TRIP_LOG', body)
            
            # Check for success in response
            # Implementation depends on actual response structure
            logger.info(f"Reconciled trip {record_id}-{period} with status {recon_stat}")
            return True
            
        except Exception as e:
            logger.error(f"Error reconciling trip: {str(e)}")
            raise CurbAPIException(f"Failed to reconcile trip: {str(e)}") from e

        

