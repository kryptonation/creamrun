import os
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
import pdfkit
from typing import Dict, List, Any


def load_template_data() -> Dict[str, Any]:
    """
    Load sample data for the receipt template.
    Replace this with actual data from your database.
    """
    return {
        # Page 1 - Header and basic info
        "medallion": "1W47",
        "receipt_number": "BAT system generated",
        "driver_name": "ROHIT HANDA",
        "receipt_date": "August-10-2025",
        "tlc_license": "6087912",
        "receipt_period": "August-03-2025 to August-09-2025",

        # Gross Earnings
        "earnings": [
            {
                "type": "CURB",
                "description": "Credit Card Transactions",
                "amount": "$2,168.82"
            }
        ],
        "total_earnings": "$ 2,216.32",

        # Account Balance
        "credit_card_earnings": "$2,168.82",
        "charges": [
            {
                "description": "Lease Amount",
                "amount": "$1100.00",
                "amount_paid": "$1100.00",
                "balance": "–"
            },
            {
                "description": "MTA, TIF, Congestion, CRBT, & Airport Fee",
                "amount": "$269.00",
                "amount_paid": "$269.00",
                "balance": "–"
            },
            {
                "description": "EZ-Pass Tolls",
                "amount": "$27.33",
                "amount_paid": "$27.33",
                "balance": "–"
            },
            {
                "description": "Violation Tickets",
                "amount": "$220.38",
                "amount_paid": "$220.38",
                "balance": "–"
            },
            {
                "description": "TLC Tickets",
                "amount": "–",
                "amount_paid": "–",
                "balance": "–"
            },
            {
                "description": "Repairs",
                "amount": "–",
                "amount_paid": "–",
                "balance": "–"
            },
            {
                "description": "Driver Loans",
                "amount": "–",
                "amount_paid": "–",
                "balance": "–"
            },
            {
                "description": "Miscellaneous Charges and Adjustments",
                "amount": "–",
                "amount_paid": "–",
                "balance": "–"
            }
        ],
        "subtotal_charges": "$1,616.71",
        "subtotal_paid": "$1,616.71",
        "net_earnings": "$552.11",
        "total_due_to_driver": "$552.11",

        # Payment Summary
        "payments": [
            {
                "type": "Direct Deposit",
                "batch_no": "ACH (xxx)",
                "account_no": "xxxxxxxx7896",
                "amount": "$552.11"
            }
        ],

        # Page 2 - Alerts
        "vehicle_alerts": [
            {"name": "TLC Inspection", "date": "December-12-2025"},
            {"name": "Mile Run", "date": "October-7-2025"},
            {"name": "DMV Registration", "date": "December-4-2026"}
        ],
        "driver_alerts": [
            {
                "name": "TLC License Expiry",
                "license1_date": "January-9-2026",
                "license2_date": "January-9-2026"
            },
            {
                "name": "DMV License Expiry",
                "license1_date": "February-7-2028",
                "license2_date": "February-7-2028"
            }
        ],

        # Page 3 - DTR Details
        "trip_log": [
            {
                "date1": "–", "license1": "–", "number1": "–", "amount1": "–",
                "date2": "–", "license2": "–", "number2": "–", "amount2": "–"
            }
        ],
        "repairs": [
            {
                "id": "40177",
                "invoice_no": "Invoice #3457",
                "invoice_date": "09.10.2025",
                "workshop": "External",
                "invoice_amount": "$900.00",
                "amount_paid": "$750.00",
                "balance": "$150"
            }
        ],
        "repairs_total": {
            "invoice_amount": "$900.00",
            "amount_paid": "$750.00",
            "balance": "$150.00"
        },
        "repair_instalments": [
            {
                "id": "DLN-2025-040-02",
                "due_date": "10.28.2025",
                "amount_due": "$200.00",
                "amount_payable": "$150.00",
                "payment": "$150.00",
                "balance": "$0.00"
            },
            {
                "id": "DLN-2025-040-03",
                "due_date": "10.05.2025",
                "amount_due": "$200.00",
                "amount_payable": "$200.00",
                "payment": "$150.00",
                "balance": "$50.00"
            }
        ],
        "repair_instalments_total": {
            "amount_due": "$400.00",
            "amount_payable": "$350.00",
            "payment": "$300.00",
            "balance": "$50.00"
        },
        "driver_loans": [
            {
                "id": "LN40177",
                "date": "10.28.2025",
                "amount": "$ 600.00",
                "interest_rate": "10.00%",
                "total_due": "$660.00",
                "amount_paid": "$553.00",
                "balance": "$107.00"
            }
        ],
        "driver_loans_total": {
            "amount": "$ 600.00",
            "total_due": "$660.00",
            "amount_paid": "$553.00",
            "balance": "$107.00"
        },
        "loan_instalments": [
            {
                "id": "DLN-2025-040-02",
                "due_date": "10.28.2025",
                "principal": "$250.00",
                "interest": "$1.32",
                "total_due": "$251.32",
                "total_payable": "$151.32",
                "payment": "$151.32",
                "balance": "$0.00"
            },
            {
                "id": "DLN-2025-040-03",
                "due_date": "10.05.2025",
                "principal": "$250.00",
                "interest": "$1.32",
                "total_due": "$251.32",
                "total_payable": "$201.32",
                "payment": "$200.00",
                "balance": "$51.32"
            }
        ],
        "loan_instalments_total": {
            "total_due": "$502.64",
            "total_payable": "$302.64",
            "payment": "$351.32",
            "balance": "$51.32"
        },
        "misc_charges": [
            {
                "type": "Car Wash",
                "invoice_no": "INV-2457",
                "amount": "$50.00",
                "prior_balance": "–",
                "payment": "–",
                "balance": "–"
            }
        ],
        "misc_charges_total": {
            "amount": "$136.00"
        },

        # Page 4 - Additional Driver Details (2/2)
        "pvb_tickets": [
            {
                "date_time": "08/01/2025 06:48 PM",
                "ticket_no": "ACT0347803",
                "tlc_license": "6087912",
                "note": "Bus Lane Violation",
                "fine": "$100.00",
                "charge": "$2.50",
                "total": "$102.50",
                "prior_balance": "–",
                "payment": "$102.50",
                "balance": "–"
            },
            {
                "date_time": "08/03/2025 08:08 PM",
                "ticket_no": "9223936381",
                "tlc_license": "6087912",
                "note": "No Stopping",
                "fine": "$115.00",
                "charge": "$2.88",
                "total": "$117.88",
                "prior_balance": "–",
                "payment": "$117.88",
                "balance": "–"
            }
        ],
        "pvb_tickets_total": {
            "total": "$220.38",
            "payment": "–"
        },
        "additional_trip_log": [
            {
                "date1": "–", "license1": "–", "number1": "–", "amount1": "–",
                "date2": "–", "license2": "–", "number2": "–", "amount2": "–"
            }
        ],
        "additional_driver_alerts": [
            {"name": "TLC License Expiry", "date": "January-9-2026"},
            {"name": "DMV License Expiry", "date": "February-7-2028"}
        ],

        # Page 5 - Additional Driver Details (1/2)
        "additional_driver_name": "ROHIT HANDA",
        "additional_tlc_license": "6087912",
        "additional_credit_card_earnings": "$2,168.82",
        "additional_charges": [
            {"description": "MTA, TIF, Congestion, CRBT & Airport Fee", "amount": "$269.00"},
            {"description": "EZ-Pass Tolls", "amount": "$27.33"},
            {"description": "Violation Tickets", "amount": "$220.38"}
        ],
        "additional_subtotal": "$1,616.71",
        "additional_net_earnings": "$552.11",
        "taxes_and_charges": [
            {
                "type": "Airport Access Fee",
                "amount": "$19.25",
                "total_trips": "03",
                "cash_trips": "02",
                "cc_trips": "01"
            },
            {
                "type": "CBDT",
                "amount": "$35.25",
                "total_trips": "04",
                "cash_trips": "02",
                "cc_trips": "02"
            },
            {
                "type": "Congestion Tax - CPS",
                "amount": "$127.50",
                "total_trips": "06",
                "cash_trips": "04",
                "cc_trips": "02"
            },
            {
                "type": "MTA Tax (TLC Rule 54-21)(1) (+1))",
                "amount": "$28.00",
                "total_trips": "01",
                "cash_trips": "01",
                "cc_trips": "00"
            },
            {
                "type": "Improvement Tax - TIF (TLC Rule 54-17(i))",
                "amount": "$59.00",
                "total_trips": "02",
                "cash_trips": "01",
                "cc_trips": "01"
            }
        ],
        "taxes_total": {
            "amount": "$269.00",
            "total_trips": "29",
            "cash_trips": "18",
            "cc_trips": "11"
        },
        "ezpass_tolls": [
            {
                "date": "7/1/2025 04:22 PM",
                "tlc_license": "6087912",
                "plate_no": "NY YDE34DC",
                "agency": "MTA BAT",
                "entry": "–",
                "exit_lane": "MTA BAT",
                "toll": "$9.11",
                "prior_balance": "–",
                "payment": "$9.11",
                "balance": "–"
            },
            {
                "date": "8/1/2025 04:52 PM",
                "tlc_license": "6087912",
                "plate_no": "NY YDE34DC",
                "agency": "MTA BAT",
                "entry": "–",
                "exit_lane": "MTA BAT",
                "toll": "$9.11",
                "prior_balance": "–",
                "payment": "$9.11",
                "balance": "–"
            },
            {
                "date": "8/25/2025 12:24 AM",
                "tlc_license": "6087912",
                "plate_no": "NY YDE34DC",
                "agency": "MTA BAT",
                "entry": "–",
                "exit_lane": "MTA BAT",
                "toll": "$9.11",
                "prior_balance": "–",
                "payment": "$9.11",
                "balance": "–"
            }
        ],
        "ezpass_total": {
            "toll": "$27.33",
            "payment": "$27.33"
        }
    }


def render_html(template_path: str, data: Dict[str, Any]) -> str:
    """
    Render the Jinja2 template with provided data.

    Args:
        template_path: Path to the HTML template file
        data: Dictionary containing template variables

    Returns:
        Rendered HTML string
    """
    template_dir = os.path.dirname(template_path)
    template_name = os.path.basename(template_path)

    env = Environment(loader=FileSystemLoader(template_dir))
    template = env.get_template(template_name)
    return template.render(**data)


def export_to_pdf(html_content: str, output_path: str) -> None:
    """
    Convert HTML content to PDF using wkhtmltopdf.

    Args:
        html_content: Rendered HTML string
        output_path: Path where PDF should be saved

    Requires:
        - wkhtmltopdf installed on system
        - pdfkit Python package
        - On macOS: brew install --cask wkhtmltopdf
        - On Ubuntu/Debian: sudo apt-get install wkhtmltopdf
        - On Windows: Download from https://wkhtmltopdf.org/downloads.html
    """
    options = {
        'page-size': 'Letter',
        'margin-top': '0.5in',
        'margin-right': '0.5in',
        'margin-bottom': '0.5in',
        'margin-left': '0.5in',
        'encoding': "UTF-8",
        'no-outline': None,
        'enable-local-file-access': None,
    }

    pdfkit.from_string(html_content, output_path, options=options)
    print(f"PDF generated successfully: {output_path}")


def export_to_pdf_with_weasyprint(html_content: str, output_path: str) -> None:
    """
    Convert HTML content to PDF using WeasyPrint (alternative method).
    WeasyPrint is more lightweight and doesn't require external binaries.

    Args:
        html_content: Rendered HTML string
        output_path: Path where PDF should be saved

    Requires:
        - WeasyPrint: pip install weasyprint
    """
    try:
        from weasyprint import HTML, CSS
        from io import BytesIO

        HTML(string=html_content).write_pdf(output_path)
        print(f"PDF generated successfully with WeasyPrint: {output_path}")
    except ImportError:
        print("WeasyPrint not installed. Install it with: pip install weasyprint")
        raise


def main():
    """
    Main function to generate receipt PDF.
    """
    # Get the project root directory
    project_root = Path(__file__).parent

    # Template path
    template_path = project_root / "receipt_template.html"

    if not template_path.exists():
        print(f"Error: Template file not found at {template_path}")
        return

    # Output PDF path
    output_pdf = project_root / "output" / "receipt.pdf"
    output_pdf.parent.mkdir(exist_ok=True)

    # Load data
    print("Loading template data...")
    data = load_template_data()

    # Render HTML
    print("Rendering HTML template...")
    html_content = render_html(str(template_path), data)

    # Export to PDF
    print("Generating PDF...")
    try:
        # Try using WeasyPrint first (recommended - no external dependencies)
        export_to_pdf_with_weasyprint(html_content, str(output_pdf))
    except Exception as e:
        print(f"WeasyPrint failed: {e}")
        print("Trying with pdfkit/wkhtmltopdf...")
        try:
            export_to_pdf(html_content, str(output_pdf))
        except Exception as e2:
            print(f"pdfkit also failed: {e2}")
            print("\nTo use pdfkit, install wkhtmltopdf:")
            print("  macOS: brew install --cask wkhtmltopdf")
            print("  Ubuntu/Debian: sudo apt-get install wkhtmltopdf")
            print("  Windows: Download from https://wkhtmltopdf.org/downloads.html")
            print("\nAlternatively, install WeasyPrint: pip install weasyprint")


if __name__ == "__main__":
    main()
