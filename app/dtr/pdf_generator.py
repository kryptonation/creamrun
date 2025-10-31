"""
app/dtr/pdf_generator.py

PDF generation for DTR using ReportLab with exact layout matching screenshots
"""


from io import BytesIO
from decimal import Decimal
from typing import Optional, Dict, List, Tuple

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
    PageBreak
)
from reportlab.lib.enums import TA_CENTER
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from app.dtr.models import DTR
from app.leases.models import Lease
from app.drivers.models import Driver
from app.vehicles.models import Vehicle
from app.medallions.models import Medallion
from app.curb.models import CurbTrip
from app.ezpass.models import EZPassTransaction
from app.pvb.models import PVBViolation
from app.tlc_violations.models import TLCViolation
from app.repairs.models import RepairInstallment
from app.driver_loans.models import LoanSchedule
from app.miscellaneous.models import MiscellaneousCharge
from app.ledger.models import LedgerBalance, PostingCategory

from app.utils.logger import get_logger

logger = get_logger(__name__)


class DTRPDFGenerator:
    """Generate DTR PDF with exact layout matching screenshots"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        # Header style
        self.styles.add(ParagraphStyle(
            name='DTRHeader',
            parent=self.styles['Heading1'],
            fontSize=16,
            textColor=colors.HexColor('#2F5597'),
            alignment=TA_CENTER,
            spaceAfter=12
        ))
        
        # Company name style
        self.styles.add(ParagraphStyle(
            name='CompanyName',
            parent=self.styles['Normal'],
            fontSize=14,
            textColor=colors.HexColor('#2F5597'),
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        # Section header
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=11,
            textColor=colors.HexColor('#2F5597'),
            fontName='Helvetica-Bold',
            spaceBefore=6,
            spaceAfter=6,
            backgroundColor=colors.HexColor('#E8EAF6')
        ))
        
        # Table text
        self.styles.add(ParagraphStyle(
            name='TableText',
            parent=self.styles['Normal'],
            fontSize=9,
            leading=11
        ))
    
    def generate(
        self,
        dtr: DTR,
        lease: Lease,
        driver: Driver,
        vehicle: Optional[Vehicle],
        medallion: Optional[Medallion],
        financial_data: Dict[str, Decimal],
        db: Session
    ) -> bytes:
        """
        Generate complete DTR PDF
        
        Returns: PDF bytes
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            topMargin=0.5*inch,
            bottomMargin=0.5*inch,
            leftMargin=0.5*inch,
            rightMargin=0.5*inch
        )
        
        story = []
        
        # Page 1: Header and Summary
        story.extend(self._build_header(dtr, lease, driver, medallion, vehicle))
        story.append(Spacer(1, 0.2*inch))
        
        story.extend(self._build_gross_earnings_section(dtr))
        story.append(Spacer(1, 0.15*inch))
        
        story.extend(self._build_account_balance_section(dtr))
        story.append(Spacer(1, 0.15*inch))
        
        story.extend(self._build_leasing_charges_section(dtr))
        story.append(PageBreak())
        
        # Page 2: Taxes and Charges
        story.extend(self._build_taxes_section(dtr, db))
        story.append(Spacer(1, 0.15*inch))
        
        story.extend(self._build_ezpass_section(dtr, db))
        story.append(PageBreak())
        
        # Page 3: PVB Violations
        story.extend(self._build_pvb_section(dtr, db))
        story.append(PageBreak())
        
        # Page 4: TLC Tickets
        story.extend(self._build_tlc_section(dtr, db))
        story.append(PageBreak())
        
        # Page 5: Trip Log
        story.extend(self._build_trip_log_section(dtr, db))
        story.append(PageBreak())
        
        # Page 6: Repairs and Loans
        story.extend(self._build_repairs_section(dtr, db))
        story.append(Spacer(1, 0.15*inch))
        
        story.extend(self._build_loans_section(dtr, db))
        story.append(Spacer(1, 0.15*inch))
        
        story.extend(self._build_misc_charges_section(dtr, db))
        story.append(Spacer(1, 0.15*inch))
        
        # Alerts section
        story.extend(self._build_alerts_section(driver, vehicle))
        
        # Build PDF
        doc.build(story)
        
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        logger.info(f"Generated PDF for DTR {dtr.dtr_id}, size: {len(pdf_bytes)} bytes")
        
        return pdf_bytes
    
    def _build_header(
        self,
        dtr: DTR,
        lease: Lease,
        driver: Driver,
        medallion: Optional[Medallion],
        vehicle: Optional[Vehicle]
    ) -> List:
        """Build DTR header section"""
        elements = []
        
        # Company logo and name
        elements.append(Paragraph(
            "Big Apple Taxi Management LLC",
            self.styles['CompanyName']
        ))
        elements.append(Paragraph(
            "99-24 Queens Boulevard, Woodside, NY 11377-4642<br/>718 779 5000 | bigappletaximgt.com",
            ParagraphStyle('Address', parent=self.styles['Normal'], fontSize=9, alignment=TA_CENTER)
        ))
        elements.append(Spacer(1, 0.2*inch))
        
        # DTR Title
        elements.append(Paragraph(
            "Driver Transaction Receipt (DTR)",
            self.styles['DTRHeader']
        ))
        elements.append(Spacer(1, 0.15*inch))
        
        # Identification Block
        medallion_number = medallion.medallion_number if medallion else "N/A"
        tlc_license = driver.tlc_license_number if hasattr(driver, 'tlc_license_number') else "N/A"
        
        id_data = [
            ['Medallion:', medallion_number, 'Receipt Number:', dtr.receipt_number],
            ['Driver / Leaseholder:', driver.first_name + ' ' + driver.last_name, 'Receipt Date:', dtr.receipt_date.strftime('%B %d, %Y')],
            ['TLC License:', tlc_license, 'Receipt Period:', f"{dtr.period_start.strftime('%B %d, %Y')} to {dtr.period_end.strftime('%B %d, %Y')}"]
        ]
        
        id_table = Table(id_data, colWidths=[1.5*inch, 2*inch, 1.5*inch, 2*inch])
        id_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#333333')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        
        elements.append(id_table)
        
        return elements
    
    def _build_gross_earnings_section(self, dtr: DTR) -> List:
        """Build Gross Earnings Snapshot section"""
        elements = []
        
        elements.append(Paragraph(
            "Gross Earnings Snapshot for Payment Period",
            self.styles['SectionHeader']
        ))
        
        data = [
            ['Source', 'Amount'],
            ['Credit Card Transactions', f"${dtr.cc_earnings:,.2f}"],
            ['Cash Transactions', f"${dtr.cash_earnings:,.2f}"],
            ['Total Gross Earnings', f"${dtr.total_earnings:,.2f}"]
        ]
        
        table = Table(data, colWidths=[4*inch, 2*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2F5597')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, 3), (-1, 3), colors.HexColor('#E8EAF6')),
            ('FONTNAME', (0, 3), (-1, 3), 'Helvetica-Bold'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        elements.append(table)
        
        return elements
    
    def _build_account_balance_section(self, dtr: DTR) -> List:
        """Build Account Balance for Payment Period section"""
        elements = []
        
        elements.append(Paragraph(
            "Account Balance for Payment Period",
            self.styles['SectionHeader']
        ))
        
        data = [
            ['Item', 'Amount'],
            ['Credit Card Earnings', f"${dtr.cc_earnings:,.2f}"],
            ['Taxes (MTA, TIF, Congestion, etc.)', f"-${dtr.taxes_amount:,.2f}"],
            ['EZ-Pass Tolls', f"-${dtr.ezpass_amount:,.2f}"],
            ['Lease Amount', f"-${dtr.lease_amount:,.2f}"],
            ['PVB Violations', f"-${dtr.pvb_amount:,.2f}"],
            ['TLC Tickets', f"-${dtr.tlc_amount:,.2f}"],
            ['Repairs (WTD Due)', f"-${dtr.repairs_amount:,.2f}"],
            ['Driver Loans (WTD Due)', f"-${dtr.loans_amount:,.2f}"],
            ['Miscellaneous Charges', f"-${dtr.misc_amount:,.2f}"],
            ['Prior Balance', f"${dtr.prior_balance:,.2f}" if dtr.prior_balance >= 0 else f"-${abs(dtr.prior_balance):,.2f}"],
            ['Net Earnings', f"${dtr.net_earnings:,.2f}"],
            ['Total Due', f"${dtr.total_due:,.2f}"]
        ]
        
        table = Table(data, colWidths=[4*inch, 2*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2F5597')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, 11), (-1, 11), colors.HexColor('#E8EAF6')),
            ('FONTNAME', (0, 11), (-1, 11), 'Helvetica-Bold'),
            ('BACKGROUND', (0, 12), (-1, 12), colors.HexColor('#FFE082')),
            ('FONTNAME', (0, 12), (-1, 12), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 12), (-1, 12), 11),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        elements.append(table)
        
        return elements
    
    def _build_leasing_charges_section(self, dtr: DTR) -> List:
        """Build Leasing Charges section"""
        elements = []
        
        elements.append(Paragraph(
            "Leasing Charges",
            self.styles['SectionHeader']
        ))
        
        # Calculate balances
        amount_paid = dtr.lease_amount
        balance = Decimal('0.00') if amount_paid >= dtr.lease_amount else dtr.lease_amount - amount_paid
        
        data = [
            ['Lease ID', 'Lease Amount', 'Prior Balance', 'Amount Paid', 'Balance'],
            [str(dtr.lease_id), f"${dtr.lease_amount:,.2f}", '-', f"${amount_paid:,.2f}", f"${balance:,.2f}"]
        ]
        
        table = Table(data, colWidths=[1.2*inch, 1.2*inch, 1.2*inch, 1.2*inch, 1.2*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2F5597')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        elements.append(table)
        
        return elements
    
    def _build_taxes_section(self, dtr: DTR, db: Session) -> List:
        """Build Taxes and Charges section"""
        elements = []
        
        elements.append(Paragraph(
            "DTR Details - Taxes and Charges",
            self.styles['SectionHeader']
        ))
        
        # Get tax breakdown from CURB trips
        tax_data = self._get_tax_breakdown(dtr, db)
        
        data = [
            ['Charge Type', 'Amount', 'Total Trips', 'Cash Trips', 'CC Trips']
        ]
        
        for charge_type, amount, total_trips, cash_trips, cc_trips in tax_data:
            data.append([
                charge_type,
                f"${amount:,.2f}",
                str(total_trips),
                str(cash_trips),
                str(cc_trips)
            ])
        
        # Add total row
        data.append([
            'Total',
            f"${dtr.taxes_amount:,.2f}",
            '',
            '',
            ''
        ])
        
        table = Table(data, colWidths=[2*inch, 1.2*inch, 1.2*inch, 1.2*inch, 1.2*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2F5597')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#E8EAF6')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        elements.append(table)
        
        return elements
    
    def _build_ezpass_section(self, dtr: DTR, db: Session) -> List:
        """Build EZPass Tolls Details section"""
        elements = []
        
        elements.append(Paragraph(
            "DTR Details - EZPass Tolls",
            self.styles['SectionHeader']
        ))
        
        # Get EZPass transactions
        ezpass_txns = db.query(EZPassTransaction).filter(
            and_(
                EZPassTransaction.driver_id == dtr.driver_id,
                EZPassTransaction.transaction_date >= dtr.period_start,
                EZPassTransaction.transaction_date <= dtr.period_end,
                EZPassTransaction.posted_to_ledger == 1
            )
        ).order_by(EZPassTransaction.transaction_date).all()
        
        if not ezpass_txns:
            elements.append(Paragraph(
                "No EZPass transactions for this period.",
                self.styles['Normal']
            ))
            return elements
        
        data = [
            ['Transaction Date', 'TLC License', 'Plate No', 'Agency', 'Entry', 'Exit Lane', 'Toll', 'Prior Balance', 'Payment', 'Balance']
        ]
        
        cumulative_balance = Decimal('0.00')
        
        for txn in ezpass_txns:
            prior_balance = cumulative_balance
            payment = txn.toll_amount
            balance = prior_balance + txn.toll_amount - payment
            cumulative_balance = balance
            
            data.append([
                txn.transaction_date.strftime('%m/%d/%Y\n%I:%M %p'),
                txn.tlc_license or '-',
                txn.plate_number or '-',
                txn.agency or '-',
                txn.entry_lane or '-',
                txn.exit_lane or '-',
                f"${txn.toll_amount:,.2f}",
                f"${prior_balance:,.2f}",
                f"${payment:,.2f}",
                f"${balance:,.2f}"
            ])
        
        # Add total row
        total_tolls = sum(txn.toll_amount for txn in ezpass_txns)
        data.append([
            'Total', '', '', '', '', '',
            f"${total_tolls:,.2f}",
            '-',
            f"${total_tolls:,.2f}",
            '-'
        ])
        
        table = Table(data, colWidths=[
            0.8*inch, 0.8*inch, 0.7*inch, 0.6*inch, 0.6*inch, 0.6*inch,
            0.6*inch, 0.7*inch, 0.6*inch, 0.6*inch
        ])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2F5597')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#E8EAF6')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        
        elements.append(table)
        
        return elements
    
    def _build_pvb_section(self, dtr: DTR, db: Session) -> List:
        """Build PVB Violations Details section"""
        elements = []
        
        elements.append(Paragraph(
            "DTR Details - PVB Violations",
            self.styles['SectionHeader']
        ))
        
        # Get PVB violations
        violations = db.query(PVBViolation).filter(
            and_(
                PVBViolation.driver_id == dtr.driver_id,
                PVBViolation.issue_date <= dtr.period_end,
                PVBViolation.posted_to_ledger == 1
            )
        ).order_by(PVBViolation.issue_date).all()
        
        # Filter to show only outstanding violations
        outstanding_violations = [v for v in violations if v.ledger_balance_id]
        
        if not outstanding_violations:
            elements.append(Paragraph(
                "No outstanding PVB violations for this period.",
                self.styles['Normal']
            ))
            return elements
        
        data = [
            ['Date & Time', 'Summons', 'TLC License', 'Plate', 'Violation', 'Fine', 'Prior Balance', 'Payment', 'Balance']
        ]
        
        for violation in outstanding_violations:
            # Get balance info from ledger
            balance_info = self._get_violation_balance(violation.ledger_balance_id, db)
            
            data.append([
                violation.issue_date.strftime('%m/%d/%Y'),
                violation.summons_number,
                violation.tlc_license or '-',
                violation.plate_number or '-',
                violation.violation_description[:20] if violation.violation_description else '-',
                f"${violation.fine_amount:,.2f}",
                f"${balance_info['prior_balance']:,.2f}",
                f"${balance_info['payment']:,.2f}",
                f"${balance_info['balance']:,.2f}"
            ])
        
        # Add total row
        total_fines = sum(v.fine_amount for v in outstanding_violations)
        data.append([
            'Total', '', '', '', '',
            f"${total_fines:,.2f}",
            '-',
            '-',
            '-'
        ])
        
        table = Table(data, colWidths=[
            0.8*inch, 0.9*inch, 0.8*inch, 0.7*inch, 1.2*inch,
            0.7*inch, 0.8*inch, 0.7*inch, 0.7*inch
        ])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2F5597')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#E8EAF6')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        
        elements.append(table)
        
        return elements
    
    def _build_tlc_section(self, dtr: DTR, db: Session) -> List:
        """Build TLC Tickets Details section"""
        elements = []
        
        elements.append(Paragraph(
            "DTR Details - TLC Tickets",
            self.styles['SectionHeader']
        ))
        
        # Get TLC violations
        violations = db.query(TLCViolation).filter(
            and_(
                or_(
                    TLCViolation.driver_id == dtr.driver_id,
                    TLCViolation.medallion_id == dtr.medallion_id
                ),
                TLCViolation.violation_date <= dtr.period_end,
                TLCViolation.posted_to_ledger == 1
            )
        ).order_by(TLCViolation.violation_date).all()
        
        # Filter outstanding
        outstanding_violations = [v for v in violations if v.ledger_balance_id]
        
        if not outstanding_violations:
            elements.append(Paragraph(
                "No outstanding TLC tickets for this period.",
                self.styles['Normal']
            ))
            return elements
        
        data = [
            ['Date & Time', 'Ticket #', 'TLC License', 'Medallion', 'Note', 'Fine', 'Prior Balance', 'Payment', 'Balance']
        ]
        
        for violation in outstanding_violations:
            balance_info = self._get_violation_balance(violation.ledger_balance_id, db)
            
            data.append([
                violation.violation_date.strftime('%m/%d/%Y'),
                violation.ticket_number,
                violation.tlc_license or '-',
                violation.medallion_number or '-',
                violation.violation_description[:15] if violation.violation_description else '-',
                f"${violation.fine_amount:,.2f}",
                f"${balance_info['prior_balance']:,.2f}",
                f"${balance_info['payment']:,.2f}",
                f"${balance_info['balance']:,.2f}"
            ])
        
        # Add total row
        total_fines = sum(v.fine_amount for v in outstanding_violations)
        data.append([
            'Total', '', '', '', '',
            f"${total_fines:,.2f}",
            '-',
            '-',
            '-'
        ])
        
        table = Table(data, colWidths=[
            0.7*inch, 0.8*inch, 0.8*inch, 0.8*inch, 1.0*inch,
            0.7*inch, 0.8*inch, 0.7*inch, 0.7*inch
        ])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2F5597')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#E8EAF6')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        
        elements.append(table)
        
        return elements
    
    def _build_trip_log_section(self, dtr: DTR, db: Session) -> List:
        """Build Trip Log (Credit Card Trips Only) section"""
        elements = []
        
        elements.append(Paragraph(
            "DTR Details - Trip Log (Credit Card Trips Only)",
            self.styles['SectionHeader']
        ))
        
        # Get CURB trips
        trips = db.query(CurbTrip).filter(
            and_(
                CurbTrip.driver_id == dtr.driver_id,
                CurbTrip.trip_date >= dtr.period_start,
                CurbTrip.trip_date <= dtr.period_end,
                CurbTrip.posted_to_ledger == 1
            )
        ).order_by(CurbTrip.trip_date).all()
        
        if not trips:
            elements.append(Paragraph(
                "No credit card trips for this period.",
                self.styles['Normal']
            ))
            return elements
        
        # Split trips into 3 columns
        trips_per_column = (len(trips) + 2) // 3
        
        col1_trips = trips[:trips_per_column]
        col2_trips = trips[trips_per_column:2*trips_per_column]
        col3_trips = trips[2*trips_per_column:]
        
        # Build 3 column table
        max_rows = max(len(col1_trips), len(col2_trips), len(col3_trips))
        
        data = [['Trip Date', 'TLC License', 'Trip #', 'Amount'] * 3]
        
        for i in range(max_rows):
            row = []
            
            # Column 1
            if i < len(col1_trips):
                trip = col1_trips[i]
                row.extend([
                    trip.trip_date.strftime('%m/%d/%Y\n%I:%M %p'),
                    trip.tlc_license or '-',
                    trip.trip_number or '-',
                    f"${trip.total_amount:,.2f}"
                ])
            else:
                row.extend(['', '', '', ''])
            
            # Column 2
            if i < len(col2_trips):
                trip = col2_trips[i]
                row.extend([
                    trip.trip_date.strftime('%m/%d/%Y\n%I:%M %p'),
                    trip.tlc_license or '-',
                    trip.trip_number or '-',
                    f"${trip.total_amount:,.2f}"
                ])
            else:
                row.extend(['', '', '', ''])
            
            # Column 3
            if i < len(col3_trips):
                trip = col3_trips[i]
                row.extend([
                    trip.trip_date.strftime('%m/%d/%Y\n%I:%M %p'),
                    trip.tlc_license or '-',
                    trip.trip_number or '-',
                    f"${trip.total_amount:,.2f}"
                ])
            else:
                row.extend(['', '', '', ''])
            
            data.append(row)
        
        table = Table(data, colWidths=[0.7*inch, 0.7*inch, 0.7*inch, 0.6*inch] * 3)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2F5597')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 7),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (3, -1), 0.5, colors.grey),
            ('GRID', (4, 0), (7, -1), 0.5, colors.grey),
            ('GRID', (8, 0), (11, -1), 0.5, colors.grey),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        
        elements.append(table)
        
        return elements
    
    def _build_repairs_section(self, dtr: DTR, db: Session) -> List:
        """Build Repairs Details section"""
        elements = []
        
        elements.append(Paragraph(
            "DTR Details - Repairs",
            self.styles['SectionHeader']
        ))
        
        # Get repair installments for this period
        installments = db.query(RepairInstallment).filter(
            and_(
                RepairInstallment.lease_id == dtr.lease_id,
                RepairInstallment.week_start >= dtr.period_start,
                RepairInstallment.week_start <= dtr.period_end,
                RepairInstallment.posted_to_ledger == 1
            )
        ).all()
        
        if not installments:
            elements.append(Paragraph(
                "No repair installments for this period.",
                self.styles['Normal']
            ))
            return elements
        
        data = [
            ['Repair ID', 'Invoice No.', 'Invoice Date', 'Workshop', 'Invoice Amount', 'Amount Paid', 'Balance']
        ]
        
        # Group by repair
        repairs_dict = {}
        for inst in installments:
            repair = inst.repair
            if repair.repair_id not in repairs_dict:
                repairs_dict[repair.repair_id] = {
                    'repair': repair,
                    'installments': []
                }
            repairs_dict[repair.repair_id]['installments'].append(inst)
        
        for repair_data in repairs_dict.values():
            repair = repair_data['repair']
            total_paid = sum(inst.installment_amount for inst in repair_data['installments'])
            balance = repair.repair_amount - total_paid
            
            data.append([
                repair.repair_id,
                repair.invoice_number,
                repair.invoice_date.strftime('%m/%d/%Y'),
                repair.workshop_type.value,
                f"${repair.repair_amount:,.2f}",
                f"${total_paid:,.2f}",
                f"${balance:,.2f}"
            ])
        
        table = Table(data, colWidths=[1*inch, 1*inch, 0.9*inch, 1*inch, 1*inch, 1*inch, 1*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2F5597')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        
        elements.append(table)
        
        return elements
    
    def _build_loans_section(self, dtr: DTR, db: Session) -> List:
        """Build Driver Loans Details section"""
        elements = []
        
        elements.append(Paragraph(
            "DTR Details - Driver Loans",
            self.styles['SectionHeader']
        ))
        
        # Get loan installments
        installments = db.query(LoanSchedule).filter(
            and_(
                LoanSchedule.driver_id == dtr.driver_id,
                LoanSchedule.due_date >= dtr.period_start,
                LoanSchedule.due_date <= dtr.period_end,
                LoanSchedule.posted_to_ledger == 1
            )
        ).all()
        
        if not installments:
            elements.append(Paragraph(
                "No loan installments for this period.",
                self.styles['Normal']
            ))
            return elements
        
        data = [
            ['Loan ID', 'Original Amount', 'Interest Rate', 'Installment #', 'Amount Due', 'Payment', 'Balance']
        ]
        
        for inst in installments:
            loan = inst.loan
            
            data.append([
                loan.loan_id,
                f"${loan.loan_amount:,.2f}",
                f"{loan.interest_rate:.2f}%",
                f"{inst.installment_number}/{loan.total_installments}",
                f"${inst.installment_amount:,.2f}",
                f"${inst.principal_paid + inst.interest_paid:,.2f}",
                f"${inst.outstanding_balance:,.2f}"
            ])
        
        table = Table(data, colWidths=[1*inch, 1*inch, 0.8*inch, 0.9*inch, 0.9*inch, 0.9*inch, 0.9*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2F5597')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        
        elements.append(table)
        
        return elements
    
    def _build_misc_charges_section(self, dtr: DTR, db: Session) -> List:
        """Build Miscellaneous Charges and Adjustments section"""
        elements = []
        
        elements.append(Paragraph(
            "DTR Details - Miscellaneous Charges and Adjustments",
            self.styles['SectionHeader']
        ))
        
        # Get misc charges
        charges = db.query(MiscellaneousCharge).filter(
            and_(
                MiscellaneousCharge.lease_id == dtr.lease_id,
                MiscellaneousCharge.payment_period_start >= dtr.period_start,
                MiscellaneousCharge.payment_period_end <= dtr.period_end,
                MiscellaneousCharge.posted_to_ledger == 1
            )
        ).all()
        
        if not charges:
            elements.append(Paragraph(
                "No miscellaneous charges for this period.",
                self.styles['Normal']
            ))
            return elements
        
        data = [
            ['Charge Type', 'Note', 'Amount', 'Prior Balance', 'Payment', 'Balance']
        ]
        
        for charge in charges:
            data.append([
                charge.category.value,
                charge.description[:30] if charge.description else '-',
                f"${charge.charge_amount:,.2f}",
                '-',
                f"${charge.charge_amount:,.2f}",
                '-'
            ])
        
        # Add total
        total_misc = sum(c.charge_amount for c in charges)
        data.append([
            'Total', '', f"${total_misc:,.2f}", '', '', ''
        ])
        
        table = Table(data, colWidths=[1.5*inch, 2*inch, 1*inch, 1*inch, 1*inch, 1*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2F5597')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#E8EAF6')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        
        elements.append(table)
        
        return elements
    
    def _build_alerts_section(self, driver: Driver, vehicle: Optional[Vehicle]) -> List:
        """Build Alerts section"""
        elements = []
        
        elements.append(Paragraph(
            "DTR Details - Alerts",
            self.styles['SectionHeader']
        ))
        
        alert_data = []
        
        # Vehicle alerts
        if vehicle:
            alert_data.append(['Vehicle Alerts', ''])
            alert_data.append(['TLC Inspection', vehicle.tlc_inspection_date.strftime('%m/%d/%Y') if hasattr(vehicle, 'tlc_inspection_date') and vehicle.tlc_inspection_date else 'N/A'])
            alert_data.append(['Mile Run', vehicle.mile_run_date.strftime('%m/%d/%Y') if hasattr(vehicle, 'mile_run_date') and vehicle.mile_run_date else 'N/A'])
            alert_data.append(['DMV Registration', vehicle.dmv_registration_expiry.strftime('%m/%d/%Y') if hasattr(vehicle, 'dmv_registration_expiry') and vehicle.dmv_registration_expiry else 'N/A'])
            alert_data.append(['', ''])
        
        # Driver alerts
        alert_data.append(['Driver Alerts', ''])
        alert_data.append(['TLC License Expiry', driver.tlc_license_expiry.strftime('%m/%d/%Y') if hasattr(driver, 'tlc_license_expiry') and driver.tlc_license_expiry else 'N/A'])
        alert_data.append(['DMV License Expiry', driver.dmv_license_expiry.strftime('%m/%d/%Y') if hasattr(driver, 'dmv_license_expiry') and driver.dmv_license_expiry else 'N/A'])
        
        table = Table(alert_data, colWidths=[3*inch, 3*inch])
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E8EAF6')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        
        elements.append(table)
        
        return elements
    
    def _get_tax_breakdown(self, dtr: DTR, db: Session) -> List[Tuple]:
        """Get tax breakdown from CURB trips"""
        # Get aggregated tax data from CURB trips
        result = db.query(
            func.sum(CurbTrip.mta_tax).label('mta'),
            func.sum(CurbTrip.improvement_tax).label('tif'),
            func.sum(CurbTrip.congestion_surcharge).label('congestion'),
            func.sum(CurbTrip.airport_fee).label('airport'),
            func.sum(CurbTrip.black_car_fund).label('cbdt'),
            func.count(CurbTrip.trip_id).label('total_trips')
        ).filter(
            and_(
                CurbTrip.driver_id == dtr.driver_id,
                CurbTrip.trip_date >= dtr.period_start,
                CurbTrip.trip_date <= dtr.period_end,
                CurbTrip.posted_to_ledger == 1
            )
        ).first()
        
        if not result:
            return []
        
        tax_data = []
        
        if result.airport and result.airport > 0:
            tax_data.append(('Airport Access Fee', result.airport, result.total_trips, 0, result.total_trips))
        
        if result.cbdt and result.cbdt > 0:
            tax_data.append(('CBDT', result.cbdt, result.total_trips, 0, result.total_trips))
        
        if result.congestion and result.congestion > 0:
            tax_data.append(('Congestion Tax (CPS)', result.congestion, result.total_trips, 0, result.total_trips))
        
        if result.mta and result.mta > 0:
            tax_data.append(('MTA Tax', result.mta, result.total_trips, 0, result.total_trips))
        
        if result.tif and result.tif > 0:
            tax_data.append(('Improvement Tax - TIF', result.tif, result.total_trips, 0, result.total_trips))
        
        return tax_data
    
    def _get_violation_balance(self, balance_id: str, db: Session) -> Dict[str, Decimal]:
        """Get balance info for a violation"""
        balance = db.query(LedgerBalance).filter(
            LedgerBalance.balance_id == balance_id
        ).first()
        
        if not balance:
            return {
                'prior_balance': Decimal('0.00'),
                'payment': Decimal('0.00'),
                'balance': Decimal('0.00')
            }
        
        return {
            'prior_balance': balance.original_amount - balance.current_balance,
            'payment': Decimal('0.00'),  # Simplified for now
            'balance': balance.current_balance
        }