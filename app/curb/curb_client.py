"""
app/curb/curb_client.py

SOAP client for CURB API integration
Handles GET_TRIPS_LOG10 and Get_Trans_By_Date_Cab12 endpoints
"""

from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

import requests
from requests.exceptions import RequestException
import xml.etree.ElementTree as ET

from app.core.config import settings
from app.curb.schemas import CurbTripData, CurbTransactionData
from app.curb.models import PaymentType
from app.utils.logger import get_logger

logger = get_logger(__name__)


class CurbAPIClient:
    """
    Client for CURB SOAP API
    Handles authentication and data retrieval
    """
    
    # API URLs
    # PRODUCTION_URL = "https://api.taxitronic.org/vts_service/taxi_service.asmx"
    # TESTING_URL = "https://demo.taxitronic.org/vts_service/taxi_service.asmx"
    
    # SOAP namespaces
    SOAP_NS = "http://schemas.xmlsoap.org/soap/envelope/"
    VTS_NS = "https://www.taxitronic.org/VTS_SERVICE/"
    
    def __init__(self):
        """Initialize CURB API client"""
        # Get credentials from environment
        self.user_id = getattr(settings, 'curb_user_id', None)
        self.password = getattr(settings, 'curb_password', None)
        self.merchant = getattr(settings, 'curb_merchant', None)
        self.is_production = True if settings.environment == "production" else False
        
        # Set API URL
        self.api_url = settings.curb_url
        
        # Validate credentials
        if not all([self.user_id, self.password, self.merchant]):
            logger.warning("CURB API credentials not fully configured")
    
    def _build_soap_envelope(self, method: str, params: dict) -> str:
        """Build SOAP envelope for request"""
        envelope = f'''<?xml version="1.0" encoding="utf-8"?>
            <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                        xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
                        xmlns:soap="{self.SOAP_NS}">
            <soap:Body>
                <{method} xmlns="{self.VTS_NS}">
                <UserId>{self.user_id}</UserId>
                <Password>{self.password}</Password>
                <Merchant>{self.merchant}</Merchant>
            '''
        
        # Add method-specific parameters
        for key, value in params.items():
            if value is not None:
                envelope += f'      <{key}>{value}</{key}>\n'
        
        envelope += f'''    </{method}>
                    </soap:Body>
                </soap:Envelope>'''
        
        return envelope
    
    def _make_soap_request(self, method: str, params: dict) -> str:
        """Make SOAP request to CURB API"""
        try:
            # Build SOAP envelope
            soap_body = self._build_soap_envelope(method, params)
            
            # Set headers
            headers = {
                'Content-Type': 'text/xml; charset=utf-8',
                'SOAPAction': f'"{self.VTS_NS}{method}"'
            }
            
            # Make request
            logger.info(f"Making CURB API request: {method}")
            response = requests.post(
                self.api_url,
                data=soap_body,
                headers=headers,
                timeout=60
            )
            
            # Check response status
            response.raise_for_status()
            
            return response.text
            
        except RequestException as e:
            logger.error(f"CURB API request failed: {str(e)}")
            raise Exception(f"CURB API request failed: {str(e)}") from e
    
    def _parse_payment_type(self, t_value: str) -> PaymentType:
        """Parse payment type from CURB T field"""
        mapping = {
            '$': PaymentType.CASH,
            'C': PaymentType.CREDIT_CARD,
            'P': PaymentType.PRIVATE_CARD
        }
        return mapping.get(t_value, PaymentType.CASH)
    
    def _parse_datetime(self, date_str: str) -> datetime:
        """Parse CURB datetime format (MM/DD/YYYY HH:MM:SS)"""
        try:
            return datetime.strptime(date_str, '%m/%d/%Y %H:%M:%S')
        except ValueError:
            # Try alternative format
            try:
                return datetime.strptime(date_str, '%Y-%m-%d %H:%M:%S')
            except ValueError:
                logger.warning(f"Could not parse datetime: {date_str}")
                return datetime.now()
    
    def _safe_decimal(self, value: str, default: Decimal = Decimal('0')) -> Decimal:
        """Safely convert string to Decimal"""
        try:
            return Decimal(value) if value else default
        except:
            return default
    
    def _safe_int(self, value: str, default: int = 0) -> int:
        """Safely convert string to int"""
        try:
            return int(value) if value else default
        except:
            return default
    
    def get_trips(
        self,
        date_from: date,
        date_to: date,
        driver_id: Optional[str] = None,
        cab_number: Optional[str] = None,
        recon_stat: int = 0
    ) -> List[CurbTripData]:
        """
        Fetch trips from CURB API using GET_TRIPS_LOG10
        
        Args:
            date_from: Start date
            date_to: End date
            driver_id: CURB driver ID (optional, blank for all)
            cab_number: Cab number (optional, blank for all)
            recon_stat: Reconciliation status filter
                < 0: All records
                = 0: Only unreconciled records (default)
                > 0: Only records reconciled with that value
        
        Returns:
            List of CurbTripData objects
        """
        try:
            # Build parameters
            params = {
                'DRIVERID': driver_id or '',
                'CABNUMBER': cab_number or '',
                'DATE_FROM': date_from.strftime('%m/%d/%Y'),
                'DATE_TO': date_to.strftime('%m/%d/%Y'),
                'RECON_STAT': str(recon_stat)
            }
            
            # Make SOAP request
            response_xml = self._make_soap_request('GET_TRIPS_LOG10', params)
            
            # Parse response
            trips = self._parse_trips_response(response_xml)
            
            logger.info(f"Fetched {len(trips)} trips from CURB API")
            return trips
            
        except Exception as e:
            logger.error(f"Failed to fetch trips: {str(e)}")
            raise
    
    def _parse_trips_response(self, response_xml: str) -> List[CurbTripData]:
        """Parse GET_TRIPS_LOG10 response XML"""
        trips = []
        
        try:
            # Parse XML
            root = ET.fromstring(response_xml)
            
            # Find result element
            result = root.find(f'.//{{{self.VTS_NS}}}GET_TRIPS_LOG10Result')
            if result is None or not result.text:
                logger.warning("No trip data in response")
                return trips
            
            # Parse inner XML
            inner_root = ET.fromstring(result.text)
            
            # Find all RECORD elements
            for record in inner_root.findall('.//RECORD'):
                try:
                    trip_data = CurbTripData(
                        record_id=record.get('ID', ''),
                        period=record.get('PERIOD', ''),
                        cab_number=record.get('CABNUMBER', ''),
                        driver_id=record.get('DRIVER', ''),
                        num_service=record.get('NUM_SERVICE'),
                        start_datetime=self._parse_datetime(record.get('START_DATE', '')),
                        end_datetime=self._parse_datetime(record.get('END_DATE', '')),
                        trip_amount=self._safe_decimal(record.get('TRIP', '0')),
                        tips=self._safe_decimal(record.get('TIPS', '0')),
                        extras=self._safe_decimal(record.get('EXTRAS', '0')),
                        tolls=self._safe_decimal(record.get('TOLLS', '0')),
                        tax=self._safe_decimal(record.get('TAX', '0')),
                        imp_tax=self._safe_decimal(record.get('IMPTAX', '0')),
                        total_amount=self._safe_decimal(record.get('TOTAL_AMOUNT', '0')),
                        payment_type=record.get('T', '$'),
                        cc_number=record.get('CCNUMBER') if record.get('CCNUMBER') else None,
                        auth_code=record.get('AUTHCODE') if record.get('AUTHCODE') else None,
                        auth_amount=self._safe_decimal(record.get('AUTHAMT', '0')),
                        ehail_fee=self._safe_decimal(record.get('EHAILFEE', '0')),
                        health_fee=self._safe_decimal(record.get('HEALTHFEE', '0')),
                        congestion_fee=self._safe_decimal(record.get('CONGFEE', '0')),
                        airport_fee=self._safe_decimal(record.get('airportFee', '0')),
                        cbdt_fee=self._safe_decimal(record.get('cbdt', '0')),
                        passenger_count=self._safe_int(record.get('PASSENGER_NUM', '1')),
                        distance_service=self._safe_decimal(record.get('DIST_SERVCE')) if record.get('DIST_SERVCE') else None,
                        distance_bs=self._safe_decimal(record.get('DIST_BS')) if record.get('DIST_BS') else None,
                        reservation_number=record.get('RESNUM') if record.get('RESNUM') != '0' else None,
                        gps_start_lat=self._safe_decimal(record.get('GPS_START_LA')) if record.get('GPS_START_LA') != '0.000000' else None,
                        gps_start_lon=self._safe_decimal(record.get('GPS_START_LO')) if record.get('GPS_START_LO') != '0.000000' else None,
                        gps_end_lat=self._safe_decimal(record.get('GPS_END_LA')) if record.get('GPS_END_LA') != '0.000000' else None,
                        gps_end_lon=self._safe_decimal(record.get('GPS_END_LO')) if record.get('GPS_END_LO') != '0.000000' else None,
                        from_address=record.get('FROM_ADDRESS') if record.get('FROM_ADDRESS') else None,
                        to_address=record.get('TO_ADDRESS') if record.get('TO_ADDRESS') else None
                    )
                    trips.append(trip_data)
                except Exception as e:
                    logger.warning(f"Failed to parse trip record: {str(e)}")
                    continue
            
        except ET.ParseError as e:
            logger.error(f"Failed to parse XML response: {str(e)}")
            raise
        
        return trips
    
    def get_transactions(
        self,
        date_from: date,
        date_to: date,
        cab_number: Optional[str] = None,
        tran_type: str = 'AP'
    ) -> List[CurbTransactionData]:
        """
        Fetch transactions from CURB API using Get_Trans_By_Date_Cab12
        
        Args:
            date_from: Start date
            date_to: End date
            cab_number: Cab number (optional)
            tran_type: Transaction type (AP=approved, DC=failed, DUP=duplicates, ALL=all)
        
        Returns:
            List of CurbTransactionData objects
        """
        try:
            # Build parameters
            params = {
                'fromDateTime': date_from.strftime('%m/%d/%Y'),
                'ToDateTime': date_to.strftime('%m/%d/%Y'),
                'CabNumber': cab_number or '',
                'TranType': tran_type
            }
            
            # Make SOAP request
            response_xml = self._make_soap_request('Get_Trans_By_Date_Cab12', params)
            
            # Parse response
            transactions = self._parse_transactions_response(response_xml)
            
            logger.info(f"Fetched {len(transactions)} transactions from CURB API")
            return transactions
            
        except Exception as e:
            logger.error(f"Failed to fetch transactions: {str(e)}")
            raise
    
    def _parse_transactions_response(self, response_xml: str) -> List[CurbTransactionData]:
        """Parse Get_Trans_By_Date_Cab12 response XML"""
        transactions = []
        
        try:
            # Parse XML (implementation similar to trips)
            root = ET.fromstring(response_xml)
            
            # Find result element
            result = root.find(f'.//{{{self.VTS_NS}}}Get_Trans_By_Date_Cab12Result')
            if result is None or not result.text:
                logger.warning("No transaction data in response")
                return transactions
            
            # Parse inner XML
            inner_root = ET.fromstring(result.text)
            
            # Find all Tran elements
            for tran in inner_root.findall('.//Tran'):
                try:
                    trans_data = CurbTransactionData(
                        row_id=tran.get('ROWID', ''),
                        transaction_date=self._parse_datetime(tran.get('POSTING_DATE', '')),
                        cab_number=tran.get('CABNUMBER', ''),
                        amount=self._safe_decimal(tran.get('AMOUNT', '0')),
                        transaction_type=tran.get('ACTIVITY', ''),
                        card_number=tran.get('TAGPLATE_NUMBER') if tran.get('TAGPLATE_NUMBER') else None,
                        auth_code=tran.get('ENTRY_TIME') if tran.get('ENTRY_TIME') else None
                    )
                    transactions.append(trans_data)
                except Exception as e:
                    logger.warning(f"Failed to parse transaction record: {str(e)}")
                    continue
            
        except ET.ParseError as e:
            logger.error(f"Failed to parse XML response: {str(e)}")
            raise
        
        return transactions
    
    def reconcile_trips(
        self,
        date_from: date,
        recon_stat: int,
        trip_ids: List[str]
    ) -> bool:
        """
        Mark trips as reconciled in CURB system
        
        Args:
            date_from: Date from which trips were fetched
            recon_stat: Reconciliation status ID (positive integer)
            trip_ids: List of trip record IDs to reconcile
        
        Returns:
            True if successful
        """
        try:
            # Build parameters
            params = {
                'DATE_FROM': date_from.strftime('%m/%d/%Y'),
                'RECON_STAT': str(recon_stat),
                'ListIDs': ','.join(trip_ids)
            }
            
            # Make SOAP request
            response_xml = self._make_soap_request('Reconciliation_TRIP_LOG', params)
            
            logger.info(f"Reconciled {len(trip_ids)} trips with CURB")
            return True
            
        except Exception as e:
            logger.error(f"Failed to reconcile trips: {str(e)}")
            return False
    
    def reconcile_transactions(self, transaction_ids: List[str]) -> bool:
        """
        Mark transactions as reconciled in CURB system
        
        Args:
            transaction_ids: List of transaction ROWIDs to reconcile
        
        Returns:
            True if successful
        """
        try:
            # Build parameters
            params = {
                'ListIDs': ','.join(transaction_ids)
            }
            
            # Make SOAP request
            response_xml = self._make_soap_request('Reconciliation', params)
            
            logger.info(f"Reconciled {len(transaction_ids)} transactions with CURB")
            return True
            
        except Exception as e:
            logger.error(f"Failed to reconcile transactions: {str(e)}")
            return False