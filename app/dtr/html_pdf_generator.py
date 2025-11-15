# app/dtr/html_pdf_generator.py

"""
HTML-based PDF Generator for DTR using WeasyPrint
WeasyPrint is a modern PDF generator that works on M1 Macs without external binaries
"""

import os
from datetime import datetime
from decimal import Decimal
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List

from jinja2 import Environment, FileSystemLoader, select_autoescape

# Try to import WeasyPrint
try:
    from weasyprint import CSS, HTML
except ImportError as e:
    raise ImportError(
        "WeasyPrint is required but not installed. Install it with: pip install weasyprint\n"
        "WeasyPrint works great on M1 Macs and doesn't require external binaries."
    ) from e

from app.dtr.exceptions import DTRExportError
from app.dtr.models import DTR
from app.utils.logger import get_logger

logger = get_logger(__name__)


class DTRHTMLPDFGenerator:
    """
    <<<<<<< HEAD
        Generate DTR PDF using HTML template and xhtml2pdf (ReportLab-based)
    =======
        Generate DTR PDF using HTML template and WeasyPrint
    >>>>>>> 7ce93df8 (Corrected pdf generation with weasyprint)
    """

    def __init__(self):
        """Initialize the PDF generator with template environment"""
        # Get templates directory
        self.template_dir = Path(__file__).parent / "templates"

        # Setup Jinja2 environment
        self.env = Environment(
            loader=FileSystemLoader(str(self.template_dir)),
            autoescape=select_autoescape(["html", "xml"]),
        )

        # Add custom filters
        self.env.filters["currency"] = self._format_currency
        self.env.filters["date_format"] = self._format_date
        self.env.filters["datetime_format"] = self._format_datetime

    def _format_currency(self, amount) -> str:
        """Format currency with $ sign and 2 decimal places"""
        if amount is None:
            return "$0.00"

        # Handle various numeric types
        try:
            if isinstance(amount, str):
                amount = float(amount.replace("$", "").replace(",", ""))
            amount = Decimal(str(amount))
            return f"${amount:,.2f}"
        except (ValueError, TypeError, Exception) as e:
            logger.warning(
                f"Failed to format currency for value: {amount} ({type(amount)}), error: {e}"
            )
            return "$0.00"

    def _format_date(self, date_obj) -> str:
        """Format date as MM/DD/YYYY"""
        if not date_obj:
            return ""
        return date_obj.strftime("%m/%d/%Y")

    def _format_datetime(self, datetime_obj) -> str:
        """Format datetime as MM/DD/YYYY HH:MM AM/PM"""
        if not datetime_obj:
            return ""
        return datetime_obj.strftime("%m/%d/%Y %I:%M %p")

    def _prepare_template_data(self, dtr: DTR) -> Dict[str, Any]:
        """
        Prepare data dictionary for template rendering

        Args:
            dtr: DTR model instance with all relationships loaded

        Returns:
            Dictionary containing all template variables
        """
        try:
            # Don't use to_dict() as it contains raw numeric values
            # Instead, build only what the template needs
            data = {}

            # Debug: Log data structure types for troubleshooting
            logger.debug(
                f"DTR data types - tax_breakdown: {type(dtr.tax_breakdown)}, "
                f"ezpass_detail: {type(dtr.ezpass_detail)}, "
                f"pvb_detail: {type(dtr.pvb_detail)}, "
                f"tlc_detail: {type(dtr.tlc_detail)}, "
                f"trip_log: {type(dtr.trip_log)}"
            )

            # Basic DTR information
            data["dtr_number"] = dtr.dtr_number
            data["receipt_number"] = dtr.receipt_number
            data["status"] = (
                dtr.status.value if hasattr(dtr.status, "value") else str(dtr.status)
            )

            # Add company information
            data["company_name"] = "Big Apple Taxi Management LLC"
            data["company_address"] = "50-24 Queens Boulevard, Woodside, NY 11377 4442"
            data["company_phone"] = "(718) 779-5001"
            data["company_website"] = "bigappletaxinyc.com"

            # Add related entity information
            data["driver_name"] = (
                f"{dtr.driver.first_name} {dtr.driver.last_name}"
                if dtr.driver
                else "N/A"
            )
            data["tlc_license"] = (
                dtr.driver.tlc_license.tlc_license_number
                if dtr.driver and dtr.driver.tlc_license
                else ""
            )
            data["medallion"] = dtr.medallion.medallion_number if dtr.medallion else ""
            data["vehicle_plate"] = (
                dtr.vehicle.get_active_plate_number() if dtr.vehicle else ""
            )

            # Format dates
            data["receipt_date"] = self._format_date(dtr.generation_date)
            data["receipt_period"] = (
                f"{self._format_date(dtr.period_start_date)} to "
                f"{self._format_date(dtr.period_end_date)}"
            )

            # Prepare earnings section
            data["earnings"] = [
                {
                    "type": "CURB",
                    "description": "Credit Card Transactions",
                    "amount": self._format_currency(dtr.gross_cc_earnings),
                }
            ]
            data["total_earnings"] = self._format_currency(dtr.total_gross_earnings)

            # Prepare charges section
            data["charges"] = self._prepare_charges(dtr)
            data["total_charges"] = self._format_currency(dtr.subtotal_charges)

            # Account balance section
            data["cc_earnings"] = self._format_currency(dtr.gross_cc_earnings)
            data["total_deductions"] = self._format_currency(dtr.subtotal_charges)
            data["prior_balance"] = self._format_currency(dtr.prior_balance)
            data["net_earnings"] = self._format_currency(dtr.net_earnings)

            # Payment summary
            data["payment_summary"] = self._prepare_payment_summary(dtr)

            # Detailed breakdowns (with error handling for each)
            try:
                data["tax_details"] = self._prepare_tax_details(dtr)
            except Exception as e:
                logger.error(f"Error preparing tax details: {e}", exc_info=True)
                data["tax_details"] = []

            # Tax totals
            try:
                tax_amount_total = sum(
                    float(str(t.get("amount", "0")).replace("$", "").replace(",", ""))
                    for t in data["tax_details"]
                    if isinstance(t, dict)
                )
                data["taxes_total"] = {
                    "amount": self._format_currency(tax_amount_total),
                    "total_trips": "–",
                    "cash_trips": "–",
                    "cc_trips": "–",
                }
            except Exception:
                data["taxes_total"] = {
                    "amount": "$0.00",
                    "total_trips": "–",
                    "cash_trips": "–",
                    "cc_trips": "–",
                }

            try:
                data["ezpass_transactions"] = self._prepare_ezpass_details(dtr)
            except Exception as e:
                logger.error(f"Error preparing ezpass details: {e}", exc_info=True)
                data["ezpass_transactions"] = []

            # EZPass totals
            try:
                ezpass_toll_total = sum(
                    float(str(t.get("toll", "0")).replace("$", "").replace(",", ""))
                    for t in data["ezpass_transactions"]
                    if isinstance(t, dict)
                )
                ezpass_payment_total = sum(
                    float(str(t.get("payment", "0")).replace("$", "").replace(",", ""))
                    for t in data["ezpass_transactions"]
                    if isinstance(t, dict)
                )
                data["ezpass_total"] = {
                    "toll": self._format_currency(ezpass_toll_total),
                    "payment": self._format_currency(ezpass_payment_total),
                }
            except Exception:
                data["ezpass_total"] = {"toll": "$0.00", "payment": "$0.00"}

            try:
                data["pvb_tickets"] = self._prepare_pvb_details(dtr)
            except Exception as e:
                logger.error(f"Error preparing PVB details: {e}", exc_info=True)
                data["pvb_tickets"] = []

            # PVB totals for summary table
            try:
                pvb_total = sum(
                    float(str(t.get("total", "0")).replace("$", "").replace(",", ""))
                    for t in data["pvb_tickets"]
                    if isinstance(t, dict)
                )
                pvb_payment = sum(
                    float(str(t.get("payment", "0")).replace("$", "").replace(",", ""))
                    for t in data["pvb_tickets"]
                    if isinstance(t, dict)
                )
                data["pvb_tickets_total"] = {
                    "total": self._format_currency(pvb_total),
                    "payment": self._format_currency(pvb_payment),
                }
            except Exception:
                data["pvb_tickets_total"] = {"total": "$0.00", "payment": "$0.00"}

            try:
                data["tlc_tickets"] = self._prepare_tlc_details(dtr)
            except Exception as e:
                logger.error(f"Error preparing TLC details: {e}", exc_info=True)
                data["tlc_tickets"] = []

            try:
                data["trip_log"] = self._prepare_trip_log(dtr)
            except Exception as e:
                logger.error(f"Error preparing trip log: {e}", exc_info=True)
                data["trip_log"] = []

            data["additional_trip_log"] = []  # For overflow trips

            # Alerts
            alerts_data = dtr.alerts or {}
            data["alerts"] = alerts_data

            # Prepare vehicle and driver alerts for template
            data["vehicle_alerts"] = []
            data["driver_alerts"] = []
            data["tlc1_license_date"] = ""
            data["tlc2_license_date"] = ""
            data["dmv_license_date"] = ""

            if isinstance(alerts_data, dict):
                # Vehicle alerts
                if "vehicle" in alerts_data and isinstance(
                    alerts_data["vehicle"], list
                ):
                    data["vehicle_alerts"] = alerts_data["vehicle"]

                # Driver alerts - extract specific license dates
                if "driver" in alerts_data and isinstance(alerts_data["driver"], list):
                    data["driver_alerts"] = alerts_data["driver"]

                    # Parse out specific license expiry dates
                    for alert in alerts_data["driver"]:
                        if isinstance(alert, dict):
                            license_type = alert.get("license_type", "")
                            expiry_date = alert.get("expiry_date", "")

                            if "TLC License 1" in license_type:
                                data["tlc1_license_date"] = expiry_date
                            elif "TLC License 2" in license_type:
                                data["tlc2_license_date"] = expiry_date
                            elif "DMV License" in license_type:
                                data["dmv_license_date"] = expiry_date

            # Add empty lists for fields that template might iterate over
            # (to prevent "not iterable" errors)
            data["repairs"] = []  # Template expects a list of repair items
            data["loans"] = []  # Template expects a list of loan items

            # If we have repair_detail or loan_detail, prepare them
            try:
                if dtr.repair_detail:
                    data["repairs"] = self._prepare_repair_details(dtr)
            except Exception as e:
                logger.error(f"Error preparing repair details: {e}", exc_info=True)

            try:
                if dtr.loan_detail:
                    data["loans"] = self._prepare_loan_details(dtr)
            except Exception as e:
                logger.error(f"Error preparing loan details: {e}", exc_info=True)

            data["repairs_total"] = {}
            data["repair_instalments_total"] = {}
            data["driver_loans_total"] = {}
            data["loan_instalments_total"] = {}
            data["misc_charges_total"] = {}
            return data

        except Exception as e:
            logger.error(f"Error preparing template data: {str(e)}", exc_info=True)
            raise DTRExportError(f"Failed to prepare template data: {str(e)}") from e

    def _prepare_charges(self, dtr: DTR) -> List[Dict[str, str]]:
        """Prepare charges list for template"""
        charges = []

        if dtr.lease_amount:
            charges.append(
                {
                    "type": "Lease Amount",
                    "amount": self._format_currency(dtr.lease_amount),
                }
            )

        if dtr.mta_tif_fees:
            charges.append(
                {
                    "type": "MTA/TIF/Congestion Fees",
                    "amount": self._format_currency(dtr.mta_tif_fees),
                }
            )

        if dtr.ezpass_tolls:
            charges.append(
                {
                    "type": "EZPass Tolls",
                    "amount": self._format_currency(dtr.ezpass_tolls),
                }
            )

        if dtr.violation_tickets:
            charges.append(
                {
                    "type": "PVB Violations",
                    "amount": self._format_currency(dtr.violation_tickets),
                }
            )

        if dtr.tlc_tickets:
            charges.append(
                {
                    "type": "TLC Tickets",
                    "amount": self._format_currency(dtr.tlc_tickets),
                }
            )

        if dtr.repairs:
            charges.append(
                {"type": "Repairs", "amount": self._format_currency(dtr.repairs)}
            )

        if dtr.driver_loans:
            charges.append(
                {
                    "type": "Driver Loans",
                    "amount": self._format_currency(dtr.driver_loans),
                }
            )

        if dtr.misc_charges:
            charges.append(
                {
                    "type": "Miscellaneous Charges",
                    "amount": self._format_currency(dtr.misc_charges),
                }
            )

        return charges

    def _prepare_payment_summary(self, dtr: DTR) -> Dict[str, str]:
        """Prepare payment summary data"""
        return {
            "payment_type": dtr.payment_method or "Pending",
            "batch_no": dtr.ach_batch_number or "–",
            "account_no": dtr.account_number_masked or "–",
            "amount": self._format_currency(dtr.total_due_to_driver),
        }

    def _prepare_tax_details(self, dtr: DTR) -> List[Dict[str, Any]]:
        """Prepare tax breakdown details"""
        if not dtr.tax_breakdown:
            return []

        taxes = []
        tax_data = dtr.tax_breakdown

        # Handle different tax_breakdown structures
        for tax_type, details in tax_data.items():
            # If details is just a number (float/int), use it as the amount
            if isinstance(details, (int, float, Decimal)):
                taxes.append(
                    {
                        "type": tax_type,
                        "amount": self._format_currency(details),
                        "total_trips": "–",
                        "cash_trips": "–",
                        "cc_trips": "–",
                    }
                )
            # If details is a list (array of charges)
            elif isinstance(details, list):
                # Sum up the list if it contains numbers
                total = sum(
                    item if isinstance(item, (int, float, Decimal)) else 0
                    for item in details
                )
                taxes.append(
                    {
                        "type": tax_type,
                        "amount": self._format_currency(total),
                        "total_trips": len(details),
                        "cash_trips": "–",
                        "cc_trips": "–",
                    }
                )
            # If details is a dict with breakdown
            elif isinstance(details, dict):
                taxes.append(
                    {
                        "type": tax_type,
                        "amount": self._format_currency(details.get("amount", 0)),
                        "total_trips": details.get("total_trips", "–"),
                        "cash_trips": details.get("cash_trips", "–"),
                        "cc_trips": details.get("cc_trips", "–"),
                    }
                )
            else:
                # Skip unknown formats
                logger.warning(
                    f"Unknown tax_breakdown format for {tax_type}: {type(details)}"
                )
                continue

        return taxes

    def _prepare_ezpass_details(self, dtr: DTR) -> List[Dict[str, str]]:
        """Prepare EZPass transaction details"""
        if not dtr.ezpass_detail:
            return []

        # Handle both list and dict formats
        ezpass_data = dtr.ezpass_detail
        if isinstance(ezpass_data, dict):
            ezpass_data = ezpass_data.get("transactions", [])
        elif not isinstance(ezpass_data, list):
            logger.warning(f"Unknown ezpass_detail format: {type(ezpass_data)}")
            return []

        transactions = []
        for transaction in ezpass_data:
            if not isinstance(transaction, dict):
                continue

            transactions.append(
                {
                    "date": transaction.get("date", ""),
                    "tlc_license": transaction.get("tlc_license", ""),
                    "plate_no": transaction.get("plate_no", ""),
                    "agency": transaction.get("agency", ""),
                    "entry": transaction.get("entry", "–"),
                    "exit_lane": transaction.get("exit_lane", ""),
                    "toll": self._format_currency(transaction.get("toll", 0)),
                    "prior_balance": self._format_currency(
                        transaction.get("prior_balance", 0)
                    )
                    if transaction.get("prior_balance")
                    else "–",
                    "payment": self._format_currency(transaction.get("payment", 0)),
                    "balance": self._format_currency(transaction.get("balance", 0))
                    if transaction.get("balance")
                    else "–",
                }
            )

        return transactions

    def _prepare_pvb_details(self, dtr: DTR) -> List[Dict[str, str]]:
        """Prepare PVB violation details"""
        if not dtr.pvb_detail:
            return []

        # Handle both list and dict formats
        pvb_data = dtr.pvb_detail
        if isinstance(pvb_data, dict):
            pvb_data = pvb_data.get("tickets", [])
        elif not isinstance(pvb_data, list):
            logger.warning(f"Unknown pvb_detail format: {type(pvb_data)}")
            return []

        tickets = []
        for ticket in pvb_data:
            if not isinstance(ticket, dict):
                continue

            tickets.append(
                {
                    "summons": ticket.get("summons", ""),
                    "issue_date": ticket.get("issue_date", ""),
                    "violation": ticket.get("violation", ""),
                    "county": ticket.get("county", ""),
                    "license": ticket.get("license", ""),
                    "note": ticket.get("note", ""),
                    "fine": self._format_currency(ticket.get("fine", 0)),
                    "charge": self._format_currency(ticket.get("charge", 0)),
                    "total": self._format_currency(ticket.get("total", 0)),
                    "prior_balance": self._format_currency(
                        ticket.get("prior_balance", 0)
                    )
                    if ticket.get("prior_balance")
                    else "–",
                    "payment": self._format_currency(ticket.get("payment", 0)),
                    "balance": self._format_currency(ticket.get("balance", 0))
                    if ticket.get("balance")
                    else "–",
                }
            )

        return tickets

    def _prepare_tlc_details(self, dtr: DTR) -> List[Dict[str, str]]:
        """Prepare TLC ticket details"""
        if not dtr.tlc_detail:
            return []

        # Handle both list and dict formats
        tlc_data = dtr.tlc_detail
        if isinstance(tlc_data, dict):
            tlc_data = tlc_data.get("tickets", [])
        elif not isinstance(tlc_data, list):
            logger.warning(f"Unknown tlc_detail format: {type(tlc_data)}")
            return []

        tickets = []
        for ticket in tlc_data:
            if not isinstance(ticket, dict):
                continue

            tickets.append(
                {
                    "summons": ticket.get("summons", ""),
                    "issue_date": ticket.get("issue_date", ""),
                    "violation": ticket.get("violation", ""),
                    "fine": self._format_currency(ticket.get("fine", 0)),
                    "payment": self._format_currency(ticket.get("payment", 0)),
                }
            )

        return tickets

    def _prepare_trip_log(self, dtr: DTR) -> List[Dict[str, str]]:
        """Prepare trip log details"""
        if not dtr.trip_log:
            return []

        # Handle both list and dict formats
        trip_data = dtr.trip_log
        if isinstance(trip_data, dict):
            trip_data = trip_data.get("trips", [])
        elif not isinstance(trip_data, list):
            logger.warning(f"Unknown trip_log format: {type(trip_data)}")
            return []

        trips = []

        # Group trips in pairs for two-column display
        for i in range(0, len(trip_data), 2):
            trip_row = {}

            # First trip
            if i < len(trip_data) and isinstance(trip_data[i], dict):
                trip_row["date1"] = trip_data[i].get("trip_date", "")
                trip_row["license1"] = trip_data[i].get("tlc_license", "")
                trip_row["number1"] = trip_data[i].get("trip_number", "")
                trip_row["amount1"] = self._format_currency(
                    trip_data[i].get("amount", 0)
                )
            else:
                trip_row["date1"] = trip_row["license1"] = trip_row[
                    "number1"
                ] = trip_row["amount1"] = "–"

            # Second trip
            if i + 1 < len(trip_data) and isinstance(trip_data[i + 1], dict):
                trip_row["date2"] = trip_data[i + 1].get("trip_date", "")
                trip_row["license2"] = trip_data[i + 1].get("tlc_license", "")
                trip_row["number2"] = trip_data[i + 1].get("trip_number", "")
                trip_row["amount2"] = self._format_currency(
                    trip_data[i + 1].get("amount", 0)
                )
            else:
                trip_row["date2"] = trip_row["license2"] = trip_row[
                    "number2"
                ] = trip_row["amount2"] = "–"

            trips.append(trip_row)

        return trips

    def _prepare_repair_details(self, dtr: DTR) -> List[Dict[str, str]]:
        """Prepare repair invoice details"""
        if not dtr.repair_detail:
            return []

        # Handle both list and dict formats
        repair_data = dtr.repair_detail
        if isinstance(repair_data, dict):
            repair_data = repair_data.get("repairs", [])
        elif not isinstance(repair_data, list):
            logger.warning(f"Unknown repair_detail format: {type(repair_data)}")
            return []

        repairs = []
        for repair in repair_data:
            if not isinstance(repair, dict):
                continue

            repairs.append(
                {
                    "invoice_number": repair.get("invoice_number", ""),
                    "date": repair.get("date", ""),
                    "description": repair.get("description", ""),
                    "amount": self._format_currency(repair.get("amount", 0)),
                    "status": repair.get("status", ""),
                }
            )

        return repairs

    def _prepare_loan_details(self, dtr: DTR) -> List[Dict[str, str]]:
        """Prepare loan installment details"""
        if not dtr.loan_detail:
            return []

        # Handle both list and dict formats
        loan_data = dtr.loan_detail
        if isinstance(loan_data, dict):
            loan_data = loan_data.get("loans", [])
        elif not isinstance(loan_data, list):
            logger.warning(f"Unknown loan_detail format: {type(loan_data)}")
            return []

        loans = []
        for loan in loan_data:
            if not isinstance(loan, dict):
                continue

            loans.append(
                {
                    "loan_id": loan.get("loan_id", ""),
                    "description": loan.get("description", ""),
                    "installment_amount": self._format_currency(
                        loan.get("installment_amount", 0)
                    ),
                    "balance": self._format_currency(loan.get("balance", 0)),
                    "due_date": loan.get("due_date", ""),
                }
            )

        return loans

    def generate_pdf(self, dtr: DTR) -> bytes:
        """
        Generate complete PDF for DTR using HTML template and WeasyPrint.
        Returns PDF as bytes for download or storage.

        Args:
            dtr: DTR model instance with all relationships loaded

        Returns:
            bytes: PDF file content

        Raises:
            DTRExportError: If PDF generation fails
        """
        try:
            logger.info(f"Generating HTML-based PDF for DTR: {dtr.dtr_number}")

            # Prepare template data
            template_data = self._prepare_template_data(dtr)

            # Load and render template
            template = self.env.get_template("dtr_format_one.html")
            html_content = template.render(**template_data)

            # Convert HTML to PDF using WeasyPrint
            pdf_file = BytesIO()
            HTML(string=html_content).write_pdf(pdf_file)
            pdf_bytes = pdf_file.getvalue()

            logger.info(
                f"Successfully generated HTML-based PDF for DTR: {dtr.dtr_number} "
                f"({len(pdf_bytes)} bytes)"
            )

            return pdf_bytes
        except Exception as e:
            logger.error(
                f"Error generating HTML-based PDF for DTR {dtr.dtr_number}: {str(e)}",
                exc_info=True,
            )
            raise DTRExportError(f"Failed to generate PDF: {str(e)}") from e


# Export the generator class
__all__ = ["DTRHTMLPDFGenerator"]
