# app/dtr/pdf_generator.py

from io import BytesIO
from typing import Dict, Any, List
from datetime import datetime
from decimal import Decimal

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, 
    Spacer, PageBreak, Image, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

from app.dtr.models import DTR
from app.dtr.exceptions import DTRExportError
from app.utils.logger import get_logger

logger = get_logger(__name__)


class DTRPDFGenerator:
    """
    Generate PDF documents for Driver Transaction Reports
    """
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
        
        # Company information
        self.company_name = "Big Apple Taxi Management LLC"
        self.company_address = "50-24 Queens Boulevard, Woodside, NY 11377-4642"
        self.company_phone = "718 779 5000"
        self.company_email = "bigappletaxinyc.com"
        
        # Colors
        self.yellow_bg = colors.HexColor("#FFD700")
        self.gray_bg = colors.HexColor("#E8E8E8")
        self.header_color = colors.HexColor("#FFC107")
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        # Check if custom styles already exist to avoid duplicates
        if 'CompanyHeader' not in self.styles:
            self.styles.add(ParagraphStyle(
                name='CompanyHeader',
                fontSize=16,
                textColor=colors.black,
                alignment=TA_LEFT,
                spaceAfter=6,
                fontName='Helvetica-Bold'
            ))
        
        if 'SectionHeader' not in self.styles:
            self.styles.add(ParagraphStyle(
                name='SectionHeader',
                fontSize=12,
                textColor=colors.black,
                alignment=TA_LEFT,
                spaceAfter=6,
                fontName='Helvetica-Bold',
                borderColor=colors.red,
                borderWidth=0,
                borderPadding=5,
                leftIndent=10,
                backColor=colors.white
            ))
        
        if 'TableHeader' not in self.styles:
            self.styles.add(ParagraphStyle(
                name='TableHeader',
                fontSize=9,
                textColor=colors.black,
                alignment=TA_CENTER,
                fontName='Helvetica-Bold'
            ))
        
        # Use 'DTRNormal' instead of 'Normal' to avoid conflict with default styles
        if 'DTRNormal' not in self.styles:
            self.styles.add(ParagraphStyle(
                name='DTRNormal',
                fontSize=8,
                textColor=colors.black,
                alignment=TA_LEFT
            ))
    
    def _format_currency(self, amount: Decimal) -> str:
        """Format decimal as currency"""
        if amount is None:
            return "$0.00"
        return f"${amount:,.2f}"
    
    def _format_date(self, date_obj) -> str:
        """Format date object"""
        if not date_obj:
            return ""
        if isinstance(date_obj, str):
            try:
                date_obj = datetime.fromisoformat(date_obj)
            except:
                return date_obj
        return date_obj.strftime("%B-%d-%Y")
    
    def _format_date_range(self, start_date, end_date) -> str:
        """Format date range"""
        if not start_date or not end_date:
            return ""
        start = self._format_date(start_date)
        end = self._format_date(end_date)
        return f"{start} to {end}"
    
    def _create_header(self, dtr: DTR) -> List:
        """Create PDF header with company info and DTR details"""
        elements = []
        
        # Company header with yellow background
        header_data = [[
            Paragraph(f'<font size="16"><b>{self.company_name}</b></font>', self.styles['DTRNormal']),
        ]]
        
        header_table = Table(header_data, colWidths=[6*inch])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), self.yellow_bg),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 15),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(header_table)
        
        # Company address
        address_para = Paragraph(
            f'{self.company_address} | {self.company_phone} | {self.company_email}',
            self.styles['DTRNormal']
        )
        address_table = Table([[address_para]], colWidths=[6*inch])
        address_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), self.yellow_bg),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        elements.append(address_table)
        
        elements.append(Spacer(1, 0.2*inch))
        
        # DTR identification block
        medallion = dtr.medallion.medallion_number if dtr.medallion else ""
        driver_name = f"{dtr.driver.first_name} {dtr.driver.last_name}" if dtr.driver else ""
        tlc_license = dtr.driver.tlc_license.tlc_license_number if dtr.driver and dtr.driver.tlc_license else ""
        
        receipt_data = [
            ['Medallion:', medallion, 'Receipt number:', dtr.receipt_number],
            ['Driver / Leaseholder:', driver_name, 'Receipt Date:', self._format_date(dtr.generation_date)],
            ['TLC License:', tlc_license, 'Receipt Period:', self._format_date_range(dtr.period_start_date, dtr.period_end_date)]
        ]
        
        receipt_table = Table(receipt_data, colWidths=[1.2*inch, 1.8*inch, 1.2*inch, 1.8*inch])
        receipt_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (2, 0), (2, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(receipt_table)
        elements.append(Spacer(1, 0.2*inch))
        
        return elements
    
    def _create_earnings_section(self, dtr: DTR) -> List:
        """Create Gross Earnings Snapshot section"""
        elements = []
        
        # Section header
        header = Paragraph(
            '<font color="red"><b>Gross Earnings Snapshot for Receipt Period</b></font>',
            self.styles['SectionHeader']
        )
        elements.append(header)
        elements.append(Spacer(1, 0.1*inch))
        
        # Earnings table
        earnings_data = [
            ['Earnings Type', 'Amount'],
            ['CURB', ''],
            ['Credit Card Transactions', self._format_currency(dtr.gross_cc_earnings)],
            ['Total', self._format_currency(dtr.total_gross_earnings)]
        ]
        
        earnings_table = Table(earnings_data, colWidths=[4*inch, 2*inch])
        earnings_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BACKGROUND', (0, 0), (-1, 0), self.gray_bg),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ]))
        elements.append(earnings_table)
        
        return elements
    
    def _create_account_balance_section(self, dtr: DTR) -> List:
        """Create Account Balance for Receipt Period section"""
        elements = []
        
        elements.append(Spacer(1, 0.2*inch))
        
        # Section header
        header = Paragraph(
            '<font color="red"><b>Account Balance for Receipt Period</b></font>',
            self.styles['SectionHeader']
        )
        elements.append(header)
        elements.append(Spacer(1, 0.1*inch))
        
        # Credit card earnings
        cc_data = [
            ['Credit Card Earnings', self._format_currency(dtr.gross_cc_earnings)]
        ]
        cc_table = Table(cc_data, colWidths=[4*inch, 2*inch])
        cc_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(cc_table)
        
        elements.append(Spacer(1, 0.1*inch))
        
        # Charges table
        charges_data = [
            ['Less', 'Charges', 'Amount Paid', 'Balance'],
            ['Lease Amount', self._format_currency(dtr.lease_amount), self._format_currency(dtr.lease_amount), '-'],
            ['MTA, TIF, Congestion, CRBT, & Airport Fee', self._format_currency(dtr.mta_tif_fees), self._format_currency(dtr.mta_tif_fees), '-'],
            ['EZ-Pass Tolls', self._format_currency(dtr.ezpass_tolls), self._format_currency(dtr.ezpass_tolls), '-'],
            ['Violation Tickets', self._format_currency(dtr.violation_tickets), self._format_currency(dtr.violation_tickets), '-'],
            ['TLC Tickets', self._format_currency(dtr.tlc_tickets), self._format_currency(dtr.tlc_tickets), '-'],
            ['Repairs', self._format_currency(dtr.repairs), self._format_currency(dtr.repairs), '-'],
            ['Driver Loans', self._format_currency(dtr.driver_loans), self._format_currency(dtr.driver_loans), '-'],
            ['Miscellaneous Charges and Adjustments', self._format_currency(dtr.misc_charges), self._format_currency(dtr.misc_charges), '-'],
            ['Subtotal', self._format_currency(dtr.subtotal_charges), self._format_currency(dtr.subtotal_charges), '-'],
            ['Prior balance', self._format_currency(dtr.prior_balance), '-', '-'],
        ]
        
        charges_table = Table(charges_data, colWidths=[2.5*inch, 1.2*inch, 1.2*inch, 1.1*inch])
        charges_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('BACKGROUND', (0, 0), (-1, 0), self.gray_bg),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('FONTNAME', (0, -2), (-1, -2), 'Helvetica-Bold'),
        ]))
        elements.append(charges_table)
        
        elements.append(Spacer(1, 0.1*inch))
        
        # Net earnings and total due
        final_data = [
            ['Net Earnings', self._format_currency(dtr.net_earnings), self._format_currency(dtr.net_earnings), '-'],
            ['Total Due to Driver', '', self._format_currency(dtr.total_due_to_driver), '']
        ]
        
        final_table = Table(final_data, colWidths=[2.5*inch, 1.2*inch, 1.2*inch, 1.1*inch])
        final_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BACKGROUND', (0, 0), (0, 0), self.gray_bg),
            ('BACKGROUND', (0, 1), (-1, 1), self.gray_bg),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(final_table)
        
        # Footnotes
        elements.append(Spacer(1, 0.1*inch))
        footnote1 = Paragraph(
            '<font size="7"><i>Note: Includes transactions where the driver is "unknown" - mapped by BATM</i></font>',
            self.styles['DTRNormal']
        )
        footnote2 = Paragraph(
            '<font size="7"><i>Note: Negative Charges (displayed in parentheses) indicate credits or adjustments (e.g., payments received) that reduce the driver\'s outstanding charges</i></font>',
            self.styles['DTRNormal']
        )
        elements.append(footnote1)
        elements.append(footnote2)
        
        return elements
    
    # app/dtr/pdf_generator.py (Part 2) - Additional PDF sections

    def _create_payment_summary(self, dtr: DTR) -> List:
        """Create Payment Summary section"""
        elements = []
        
        elements.append(Spacer(1, 0.2*inch))
        
        # Section header
        header = Paragraph(
            '<font color="red"><b>Payment Summary</b></font>',
            self.styles['SectionHeader']
        )
        elements.append(header)
        elements.append(Spacer(1, 0.1*inch))
        
        # Determine payment details
        payment_type = dtr.payment_method.value if dtr.payment_method else "Direct Deposit"
        batch_no = dtr.ach_batch_number if dtr.ach_batch_number else "ACH (xxx)"
        account_no = dtr.account_number_masked if dtr.account_number_masked else "xxxxxxx7896"
        amount = self._format_currency(dtr.total_due_to_driver) if dtr.total_due_to_driver > 0 else "$0.00"
        
        payment_data = [
            ['Payment Type', 'Batch no.', 'Account no.', 'Amount'],
            [payment_type, batch_no, account_no, amount]
        ]
        
        payment_table = Table(payment_data, colWidths=[1.5*inch, 1.5*inch, 1.5*inch, 1.5*inch])
        payment_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BACKGROUND', (0, 0), (-1, 0), self.gray_bg),
            ('ALIGN', (0, 0), (-1, 0), 'LEFT'),
            ('ALIGN', (0, 1), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(payment_table)
        
        return elements
    
    def _create_alerts_section(self, dtr: DTR) -> List:
        """Create Alerts section"""
        elements = []
        
        if not dtr.alerts:
            return elements
        
        elements.append(PageBreak())
        
        # Create header for page 2
        header_elements = self._create_header(dtr)
        elements.extend(header_elements)
        
        # Section header
        header = Paragraph(
            '<font color="red"><b>Alerts</b></font>',
            self.styles['SectionHeader']
        )
        elements.append(header)
        elements.append(Spacer(1, 0.1*inch))
        
        # Vehicle alerts
        vehicle_alerts = dtr.alerts.get('vehicle', [])
        if vehicle_alerts:
            vehicle_data = [['Vehicle', '']]
            for alert in vehicle_alerts:
                vehicle_data.append([alert.get('type', ''), alert.get('expiry_date', '')])
            
            vehicle_table = Table(vehicle_data, colWidths=[3*inch, 3*inch])
            vehicle_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            elements.append(vehicle_table)
            elements.append(Spacer(1, 0.2*inch))
        
        # Driver alerts
        driver_alerts = dtr.alerts.get('driver', [])
        if driver_alerts:
            driver_data = [['Driver', '(TLC License 1)', '(TLC License 2)']]
            
            # Extract license types
            tlc1 = None
            tlc2 = None
            dmv = None
            
            for alert in driver_alerts:
                if 'TLC License 1' in alert.get('license_type', ''):
                    tlc1 = alert.get('expiry_date', '')
                elif 'TLC License 2' in alert.get('license_type', ''):
                    tlc2 = alert.get('expiry_date', '')
                elif 'DMV License' in alert.get('license_type', ''):
                    dmv = alert.get('expiry_date', '')
            
            driver_data.append(['TLC License Expiry', tlc1 or '', tlc2 or ''])
            driver_data.append(['DMV License Expiry', dmv or '', ''])
            
            driver_table = Table(driver_data, colWidths=[2*inch, 2*inch, 2*inch])
            driver_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            elements.append(driver_table)
        
        return elements
    
    def _create_taxes_section(self, dtr: DTR) -> List:
        """Create Taxes and Charges section"""
        elements = []
        
        if not dtr.tax_breakdown:
            return elements
        
        elements.append(PageBreak())
        
        # Create header
        header_elements = self._create_header(dtr)
        elements.extend(header_elements)
        
        # Section header
        header = Paragraph(
            '<font color="red"><b>Taxes and Charges</b></font>',
            self.styles['SectionHeader']
        )
        elements.append(header)
        elements.append(Spacer(1, 0.1*inch))
        
        # Tax breakdown table
        tax_data = [['Charge Type', 'Amount', 'Total Trips', 'Cash Trips', 'CC Trips']]
        
        for charge in dtr.tax_breakdown.get('charges', []):
            tax_data.append([
                charge.get('charge_type', ''),
                self._format_currency(Decimal(str(charge.get('amount', 0)))),
                str(charge.get('total_trips', 0)),
                str(charge.get('cash_trips', 0)),
                str(charge.get('cc_trips', 0))
            ])
        
        # Add total row
        tax_data.append([
            'Total',
            self._format_currency(Decimal(str(dtr.tax_breakdown.get('total', 0)))),
            str(dtr.tax_breakdown.get('total_all_trips', 0)),
            str(dtr.tax_breakdown.get('total_cash_trips', 0)),
            str(dtr.tax_breakdown.get('total_cc_trips', 0))
        ])
        
        tax_table = Table(tax_data, colWidths=[2.5*inch, 1*inch, 0.8*inch, 0.8*inch, 0.9*inch])
        tax_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('BACKGROUND', (0, 0), (-1, 0), self.gray_bg),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(tax_table)
        
        return elements
    
    def _create_ezpass_section(self, dtr: DTR) -> List:
        """Create EZPass Tolls Detail section"""
        elements = []
        
        if not dtr.ezpass_detail:
            return elements
        
        elements.append(Spacer(1, 0.2*inch))
        
        # Section header
        header = Paragraph(
            '<font color="red"><b>EZPASS Tolls Detail</b></font>',
            self.styles['SectionHeader']
        )
        elements.append(header)
        elements.append(Spacer(1, 0.1*inch))
        
        # EZPass table
        ezpass_data = [['Transaction Date', 'TLC License', 'Plate No', 'Agency', 'Entry', 'Exit Lane', 'Toll', 'Prior Balance', 'Payment', 'Balance']]
        
        for txn in dtr.ezpass_detail[:10]:  # Limit to first 10 for space
            ezpass_data.append([
                txn.get('transaction_date', ''),
                txn.get('tlc_license', ''),
                txn.get('plate_no', ''),
                txn.get('agency', ''),
                txn.get('entry', ''),
                txn.get('exit_lane', ''),
                self._format_currency(Decimal(str(txn.get('toll', 0)))),
                '-',
                self._format_currency(Decimal(str(txn.get('toll', 0)))),
                '-'
            ])
        
        # Add total
        total_toll = sum([Decimal(str(txn.get('toll', 0))) for txn in dtr.ezpass_detail])
        ezpass_data.append([
            'Total', '', '', '', '', '', 
            self._format_currency(total_toll),
            '-',
            self._format_currency(total_toll),
            '-'
        ])
        
        ezpass_table = Table(ezpass_data, colWidths=[0.8*inch]*10)
        ezpass_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 7),
            ('BACKGROUND', (0, 0), (-1, 0), self.gray_bg),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(ezpass_table)
        
        return elements
    
    def generate_pdf(self, dtr: DTR) -> bytes:
        """
        Generate complete PDF for DTR
        Returns PDF as bytes
        """
        try:
            logger.info(f"Generating PDF for DTR: {dtr.dtr_number}")
            
            # Create PDF in memory
            buffer = BytesIO()
            doc = SimpleDocTemplate(
                buffer,
                pagesize=letter,
                rightMargin=0.5*inch,
                leftMargin=0.5*inch,
                topMargin=0.5*inch,
                bottomMargin=0.5*inch
            )
            
            # Build PDF content
            story = []
            
            # Page 1: Header, Earnings, Account Balance, Payment Summary
            story.extend(self._create_header(dtr))
            story.extend(self._create_earnings_section(dtr))
            story.extend(self._create_account_balance_section(dtr))
            story.extend(self._create_payment_summary(dtr))
            
            # Page 2: Alerts
            story.extend(self._create_alerts_section(dtr))
            
            # Additional pages: Taxes, EZPass, etc.
            story.extend(self._create_taxes_section(dtr))
            story.extend(self._create_ezpass_section(dtr))
            
            # Build PDF
            doc.build(story)
            
            # Get PDF bytes
            pdf_bytes = buffer.getvalue()
            buffer.close()
            
            logger.info(f"Successfully generated PDF for DTR: {dtr.dtr_number}")
            return pdf_bytes
            
        except Exception as e:
            logger.error(f"Error generating PDF for DTR {dtr.dtr_number}: {str(e)}")
            raise DTRExportError(f"Failed to generate PDF: {str(e)}") from e