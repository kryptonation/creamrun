# app/dtr/pdf_generator.py - PRODUCTION GRADE

"""
Production-Grade DTR PDF Generator using WeasyPrint
Exact match to Figma screens with all details
"""

from decimal import Decimal
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import date, datetime

from app.utils.logger import get_logger

from jinja2 import Environment, FileSystemLoader, select_autoescape

try:
    from weasyprint import HTML, CSS
except ImportError as e:
    raise ImportError(
        "WeasyPrint is required but not installed. "
        "Install it with: pip install weasyprint"
    ) from e

from app.dtr.exceptions import DTRExportError
from app.dtr.models import DTR

logger = get_logger(__name__)


class DTRPDFGenerator:
    """
    Production-Grade DTR PDF Generator
    
    Generates PDFs that exactly match Figma screens with:
    - Main DTR page with all primary driver information
    - DTR Details pages (1/2 and 2/2)
    - Alerts page
    - Additional Driver Details pages (if applicable)
    """
    
    def __init__(self, template_dir: Optional[Path] = None):
        """
        Initialize PDF generator
        
        Args:
            template_dir: Path to templates directory. If None, uses default.
        """
        if template_dir is None:
            self.template_dir = Path(__file__).parent / "templates"
        else:
            self.template_dir = Path(template_dir)
        
        # Ensure templates directory exists
        if not self.template_dir.exists():
            self.template_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Created templates directory: {self.template_dir}")
        
        # Setup Jinja2 environment
        self.env = Environment(
            loader=FileSystemLoader(str(self.template_dir)),
            autoescape=select_autoescape(["html", "xml"]),
            trim_blocks=True,
            lstrip_blocks=True
        )
        
        # Add custom filters
        self.env.filters["currency"] = self._format_currency
        self.env.filters["date_format"] = self._format_date
        self.env.filters["datetime_format"] = self._format_datetime
        self.env.filters["date_long"] = self._format_date_long
        
        logger.info(f"DTRPDFGenerator initialized with template dir: {self.template_dir}")
    
    def _format_currency(self, amount) -> str:
        """Format currency with $ sign and 2 decimal places"""
        if amount is None or amount == "":
            return "$0.00"
        
        try:
            if isinstance(amount, str):
                amount = amount.replace("$", "").replace(",", "").strip()
                if not amount or amount == "-":
                    return "$0.00"
            
            amount_decimal = Decimal(str(amount))
            return f"${amount_decimal:,.2f}"
        except (ValueError, TypeError, Exception) as e:
            logger.warning(f"Failed to format currency: {amount}, error: {e}")
            return "$0.00"
    
    def _format_date(self, date_obj) -> str:
        """Format date as MM/DD/YYYY"""
        if not date_obj:
            return ""
        
        if isinstance(date_obj, str):
            try:
                date_obj = datetime.fromisoformat(date_obj).date()
            except:
                return date_obj
        
        if isinstance(date_obj, datetime):
            date_obj = date_obj.date()
        
        return date_obj.strftime("%m/%d/%Y")
    
    def _format_datetime(self, datetime_obj) -> str:
        """Format datetime as MM/DD/YYYY HH:MM AM/PM"""
        if not datetime_obj:
            return ""
        
        if isinstance(datetime_obj, str):
            try:
                datetime_obj = datetime.fromisoformat(datetime_obj)
            except:
                return datetime_obj
        
        return datetime_obj.strftime("%m/%d/%Y %I:%M %p")
    
    def _format_date_long(self, date_obj) -> str:
        """Format date as August-10-2025"""
        if not date_obj:
            return ""
        
        if isinstance(date_obj, str):
            try:
                date_obj = datetime.fromisoformat(date_obj).date()
            except:
                return date_obj
        
        if isinstance(date_obj, datetime):
            date_obj = date_obj.date()
        
        return date_obj.strftime("%B-%d-%Y")
    
    def generate_pdf(self, dtr: DTR) -> bytes:
        """
        Generate PDF for a DTR
        
        Args:
            dtr: DTR model instance with all relationships loaded
            
        Returns:
            bytes: PDF file content
            
        Raises:
            DTRExportError: If PDF generation fails
        """
        try:
            logger.info(f"Generating PDF for DTR: {dtr.dtr_number}")
            
            # Prepare template data
            template_data = self._prepare_template_data(dtr)
            
            # Load and render template
            template = self.env.get_template("dtr_template.html")
            html_content = template.render(**template_data)
            
            # Convert HTML to PDF using WeasyPrint
            pdf_file = BytesIO()
            HTML(string=html_content).write_pdf(
                pdf_file,
                stylesheets=[CSS(string=self._get_print_css())]
            )
            pdf_bytes = pdf_file.getvalue()
            
            logger.info(
                f"Successfully generated PDF for DTR: {dtr.dtr_number} "
                f"({len(pdf_bytes)} bytes)"
            )
            
            return pdf_bytes
            
        except Exception as e:
            logger.error(
                f"Error generating PDF for DTR {dtr.dtr_number}: {str(e)}",
                exc_info=True
            )
            raise DTRExportError(f"Failed to generate PDF: {str(e)}") from e
    
    def _get_print_css(self) -> str:
        """Get additional CSS for print optimization"""
        return """
        @page {
            size: Letter;
            margin: 0.5in;
        }
        
        body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        """
    
    def _prepare_template_data(self, dtr: DTR) -> Dict[str, Any]:
        """
        Prepare comprehensive data dictionary for template
        
        Args:
            dtr: DTR model instance
            
        Returns:
            Dictionary with all template variables
        """
        try:
            # Basic DTR Information
            data = {
                "dtr_number": dtr.dtr_number,
                "receipt_number": dtr.receipt_number,
                "receipt_date": self._format_date(dtr.generation_date),
                "period_start": self._format_date(dtr.period_start_date),
                "period_end": self._format_date(dtr.period_end_date),
            }
            
            # Lease and Entity Information
            data["lease_id"] = dtr.lease.lease_id if dtr.lease else "N/A"
            data["medallion_number"] = (
                dtr.medallion.medallion_number if dtr.medallion else "N/A"
            )
            data["driver_name"] = self._get_driver_name(dtr.driver)
            data["tlc_license"] = (
                dtr.driver.tlc_license.tlc_license_number 
                if dtr.driver and dtr.driver.tlc_license 
                else "N/A"
            )
            
            # Financial Summary (use formatted values)
            data["gross_cc_earnings"] = self._format_currency(dtr.gross_cc_earnings)
            data["gross_cash_earnings"] = self._format_currency(dtr.gross_cash_earnings)
            data["total_gross_earnings"] = self._format_currency(dtr.total_gross_earnings)
            
            # Deductions
            data["lease_amount"] = self._format_currency(dtr.lease_amount)
            data["mta_tif_fees"] = self._format_currency(dtr.mta_tif_fees)
            data["ezpass_tolls"] = self._format_currency(dtr.ezpass_tolls)
            data["violation_tickets"] = self._format_currency(dtr.violation_tickets)
            data["tlc_tickets"] = self._format_currency(dtr.tlc_tickets)
            data["repairs"] = self._format_currency(dtr.repairs)
            data["driver_loans"] = self._format_currency(dtr.driver_loans)
            data["misc_charges"] = self._format_currency(dtr.misc_charges)
            
            # Calculated Totals
            data["subtotal_deductions"] = self._format_currency(dtr.subtotal_deductions)
            data["prior_balance"] = self._format_currency(dtr.prior_balance)
            data["net_earnings"] = self._format_currency(dtr.net_earnings)
            data["total_due_to_driver"] = self._format_currency(dtr.total_due_to_driver)
            
            # Payment Information
            data["payment_method"] = self._get_payment_method_display(dtr.payment_method)
            data["ach_batch_number"] = dtr.ach_batch_number or "–"
            data["account_number_masked"] = dtr.account_number_masked or "–"
            
            # Detailed Breakdowns
            data["tax_breakdown"] = self._format_tax_breakdown(dtr.tax_breakdown)
            data["ezpass_detail"] = self._format_ezpass_detail(dtr.ezpass_detail)
            data["pvb_detail"] = self._format_pvb_detail(dtr.pvb_detail)
            data["tlc_detail"] = self._format_tlc_detail(dtr.tlc_detail)
            data["repair_detail"] = self._format_repair_detail(dtr.repair_detail)
            data["loan_detail"] = self._format_loan_detail(dtr.loan_detail)
            data["trip_log"] = self._format_trip_log(dtr.trip_log)
            data["misc_detail"] = self._format_misc_detail(dtr)
            
            # Alerts
            data["alerts"] = self._format_alerts(dtr.alerts)
            
            # Additional Drivers Detail
            data["additional_drivers_detail"] = self._format_additional_drivers(
                dtr.additional_drivers_detail
            )
            
            return data
            
        except Exception as e:
            logger.error(f"Error preparing template data: {str(e)}", exc_info=True)
            raise DTRExportError(f"Failed to prepare template data: {str(e)}") from e
    
    def _get_driver_name(self, driver) -> str:
        """Get formatted driver name"""
        if not driver:
            return "N/A"
        
        name_parts = []
        if driver.first_name:
            name_parts.append(driver.first_name)
        if driver.last_name:
            name_parts.append(driver.last_name)
        
        return " ".join(name_parts).upper() if name_parts else "N/A"
    
    def _get_payment_method_display(self, payment_method) -> str:
        """Get display name for payment method"""
        if not payment_method:
            return "Direct Deposit"
        
        method_map = {
            "ACH": "Direct Deposit",
            "DIRECT_DEPOSIT": "Direct Deposit",
            "CHECK": "Check",
            "CASH": "Cash"
        }
        
        return method_map.get(str(payment_method).upper(), "Direct Deposit")
    
    def _format_tax_breakdown(self, tax_breakdown: Optional[Dict]) -> List[Dict]:
        """Format tax breakdown for template"""
        if not tax_breakdown:
            return []
        
        # Handle both dict and list formats
        if isinstance(tax_breakdown, list):
            return [
                {
                    "charge_type": tax.get("charge_type", ""),
                    "amount": self._format_currency(tax.get("amount", 0)),
                    "total_trips": tax.get("total_trips", 0),
                    "cash_trips": tax.get("cash_trips", 0),
                    "cc_trips": tax.get("cc_trips", 0)
                }
                for tax in tax_breakdown
            ]
        
        return []
    
    def _format_ezpass_detail(self, ezpass_detail: Optional[Dict]) -> List[Dict]:
        """Format EZPass detail for template"""
        if not ezpass_detail:
            return []
        
        transactions = []
        if isinstance(ezpass_detail, dict) and "transactions" in ezpass_detail:
            transactions = ezpass_detail["transactions"]
        elif isinstance(ezpass_detail, list):
            transactions = ezpass_detail
        
        return [
            {
                "transaction_date": self._format_datetime(t.get("transaction_date", "")),
                "tlc_license": t.get("tlc_license", ""),
                "plate_no": t.get("plate_no", ""),
                "agency": t.get("agency", ""),
                "entry": t.get("entry", "–"),
                "exit_lane": t.get("exit_lane", ""),
                "toll": self._format_currency(t.get("toll", 0))
            }
            for t in transactions
        ]
    
    def _format_pvb_detail(self, pvb_detail: Optional[Dict]) -> List[Dict]:
        """Format PVB detail for template"""
        if not pvb_detail:
            return []
        
        violations = []
        if isinstance(pvb_detail, dict) and "violations" in pvb_detail:
            violations = pvb_detail["violations"]
        elif isinstance(pvb_detail, list):
            violations = pvb_detail
        
        return [
            {
                "date_time": self._format_datetime(v.get("date_time", "")),
                "ticket_no": v.get("ticket_no", ""),
                "tlc_license": v.get("tlc_license", ""),
                "note": v.get("note", ""),
                "fine": self._format_currency(v.get("fine", 0)),
                "charge": self._format_currency(v.get("charge", 0)),
                "total": self._format_currency(v.get("total", 0))
            }
            for v in violations
        ]
    
    def _format_tlc_detail(self, tlc_detail: Optional[Dict]) -> List[Dict]:
        """Format TLC detail for template"""
        if not tlc_detail:
            return []
        
        tickets = []
        if isinstance(tlc_detail, dict) and "tickets" in tlc_detail:
            tickets = tlc_detail["tickets"]
        elif isinstance(tlc_detail, list):
            tickets = tlc_detail
        
        return [
            {
                "date_time": self._format_datetime(t.get("date_time", "")),
                "ticket_no": t.get("ticket_no", ""),
                "tlc_license": t.get("tlc_license", ""),
                "medallion": t.get("medallion", ""),
                "note": t.get("note", ""),
                "fine": self._format_currency(t.get("fine", 0)),
                "payment": self._format_currency(t.get("payment", 0))
            }
            for t in tickets
        ]
    
    def _format_repair_detail(self, repair_detail: Optional[Dict]) -> Dict:
        """Format repair detail for template"""
        if not repair_detail:
            return {"invoices": [], "installments": []}
        
        invoices = repair_detail.get("invoices", [])
        installments = repair_detail.get("installments", [])
        
        return {
            "invoices": [
                {
                    "repair_id": inv.get("repair_id", ""),
                    "invoice_no": inv.get("invoice_no", ""),
                    "invoice_date": self._format_date(inv.get("invoice_date", "")),
                    "workshop": inv.get("workshop", ""),
                    "invoice_amount": self._format_currency(inv.get("invoice_amount", 0)),
                    "amount_paid": self._format_currency(inv.get("amount_paid", 0)),
                    "balance": self._format_currency(inv.get("balance", 0))
                }
                for inv in invoices
            ],
            "installments": [
                {
                    "installment_id": inst.get("installment_id", ""),
                    "due_date": self._format_date(inst.get("due_date", "")),
                    "amount_due": self._format_currency(inst.get("amount_due", 0)),
                    "amount_payable": self._format_currency(inst.get("amount_payable", 0)),
                    "payment": self._format_currency(inst.get("payment", 0)),
                    "balance": self._format_currency(inst.get("balance", 0))
                }
                for inst in installments
            ]
        }
    
    def _format_loan_detail(self, loan_detail: Optional[Dict]) -> Dict:
        """Format loan detail for template"""
        if not loan_detail:
            return {"loans": [], "installments": []}
        
        loans = loan_detail.get("loans", [])
        installments = loan_detail.get("installments", [])
        
        return {
            "loans": [
                {
                    "loan_id": loan.get("loan_id", ""),
                    "loan_date": self._format_date(loan.get("loan_date", "")),
                    "loan_amount": self._format_currency(loan.get("loan_amount", 0)),
                    "interest_rate": f"{loan.get('interest_rate', 0):.2f}",
                    "total_due": self._format_currency(loan.get("total_due", 0)),
                    "amount_paid": self._format_currency(loan.get("amount_paid", 0)),
                    "balance": self._format_currency(loan.get("balance", 0))
                }
                for loan in loans
            ],
            "installments": [
                {
                    "installment_id": inst.get("installment_id", ""),
                    "due_date": self._format_date(inst.get("due_date", "")),
                    "principal": self._format_currency(inst.get("principal", 0)),
                    "interest": self._format_currency(inst.get("interest", 0)),
                    "total_due": self._format_currency(inst.get("total_due", 0)),
                    "total_payable": self._format_currency(inst.get("total_payable", 0)),
                    "payment": self._format_currency(inst.get("payment", 0)),
                    "balance": self._format_currency(inst.get("balance", 0))
                }
                for inst in installments
            ]
        }
    
    def _format_trip_log(self, trip_log: Optional[Dict]) -> Dict:
        """Format trip log for template"""
        if not trip_log:
            return {"total_trips": 0, "trips": []}
        
        trips = trip_log.get("trips", [])
        
        return {
            "total_trips": len(trips),
            "trips": [
                {
                    "trip_date": self._format_date(trip.get("trip_date", "")),
                    "tlc_license": trip.get("tlc_license", ""),
                    "trip_number": trip.get("trip_number", ""),
                    "amount": self._format_currency(trip.get("amount", 0))
                }
                for trip in trips
            ]
        }
    
    def _format_misc_detail(self, dtr: DTR) -> List[Dict]:
        """Format miscellaneous charges for template"""
        # This would come from a dedicated misc_charges field or table
        # For now, return empty list if no charges
        return []
    
    def _format_alerts(self, alerts: Optional[Dict]) -> Dict:
        """Format alerts for template"""
        if not alerts:
            return {"vehicle": [], "drivers": []}
        
        vehicle_alerts = alerts.get("vehicle", [])
        driver_alerts = alerts.get("drivers", [])
        
        return {
            "vehicle": [
                {
                    "type": alert.get("type", ""),
                    "expiry_date": self._format_date_long(alert.get("expiry_date", ""))
                }
                for alert in vehicle_alerts
            ],
            "drivers": [
                {
                    "driver_role": driver.get("driver_role", "Driver"),
                    "tlc_expiry": self._format_date_long(
                        next(
                            (a.get("expiry_date") for a in driver.get("alerts", []) 
                             if a.get("type") == "TLC License"),
                            ""
                        )
                    ),
                    "dmv_expiry": self._format_date_long(
                        next(
                            (a.get("expiry_date") for a in driver.get("alerts", []) 
                             if a.get("type") == "DMV License"),
                            ""
                        )
                    ),
                    "has_second_tlc": False,
                    "tlc2_expiry": ""
                }
                for driver in driver_alerts
            ]
        }
    
    def _format_additional_drivers(
        self, additional_drivers_detail: Optional[List[Dict]]
    ) -> List[Dict]:
        """Format additional drivers detail for template"""
        if not additional_drivers_detail:
            return []
        
        formatted_drivers = []
        
        for driver in additional_drivers_detail:
            formatted_driver = {
                "driver_id": driver.get("driver_id", ""),
                "driver_name": driver.get("driver_name", ""),
                "tlc_license": driver.get("tlc_license", ""),
                "cc_earnings": self._format_currency(driver.get("cc_earnings", 0)),
                "charges": {
                    "mta_tif_fees": self._format_currency(
                        driver.get("charges", {}).get("mta_tif_fees", 0)
                    ),
                    "ezpass_tolls": self._format_currency(
                        driver.get("charges", {}).get("ezpass_tolls", 0)
                    ),
                    "violation_tickets": self._format_currency(
                        driver.get("charges", {}).get("violation_tickets", 0)
                    )
                },
                "subtotal": self._format_currency(driver.get("subtotal", 0)),
                "net_earnings": self._format_currency(driver.get("net_earnings", 0)),
                "tax_breakdown": self._format_tax_breakdown(driver.get("tax_breakdown")),
                "ezpass_detail": self._format_ezpass_detail(driver.get("ezpass_detail")),
                "pvb_detail": self._format_pvb_detail(driver.get("pvb_detail")),
                "trip_log": driver.get("trip_log", []),
                "alerts": [
                    {
                        "type": alert.get("type", ""),
                        "expiry_date": self._format_date_long(alert.get("expiry_date", ""))
                    }
                    for alert in driver.get("alerts", [])
                ]
            }
            
            formatted_drivers.append(formatted_driver)
        
        return formatted_drivers
    
    def save_pdf_to_file(self, dtr: DTR, output_path: str) -> None:
        """
        Generate PDF and save to file
        
        Args:
            dtr: DTR model instance
            output_path: Path where PDF should be saved
        """
        try:
            pdf_bytes = self.generate_pdf(dtr)
            
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_file, 'wb') as f:
                f.write(pdf_bytes)
            
            logger.info(f"PDF saved to: {output_path}")
            
        except Exception as e:
            logger.error(f"Error saving PDF to file: {str(e)}", exc_info=True)
            raise DTRExportError(f"Failed to save PDF: {str(e)}") from e


# Export the generator class
__all__ = ["DTRPDFGenerator"]