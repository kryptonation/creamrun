# app/dtr/pdf_generator.py

from io import BytesIO
from decimal import Decimal
from typing import List
import logging

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, 
    Spacer, PageBreak
)
from reportlab.lib.enums import TA_CENTER

from app.dtr.models import DTR
from app.dtr.exceptions import DTRExportError

logger = logging.getLogger(__name__)


class DTRPDFGenerator:
    """
    Production-grade DTR PDF generator with accurate data mapping
    and layout matching business requirements.
    """
    
    def __init__(self):
        """Initialize PDF generator with styles and colors"""
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
        
        # Color scheme matching BAT branding
        self.yellow_bg = colors.HexColor('#FFD700')  # Yellow header background
        self.gray_bg = colors.HexColor('#E8E8E8')    # Gray for table headers
        self.red_text = colors.HexColor('#FF0000')   # Red for section headers
        
    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        # Section header style (Red, Bold)
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=11,
            textColor=self.red_text,
            spaceAfter=6,
            fontName='Helvetica-Bold'
        ))
        
        # Company info style (for yellow header)
        self.styles.add(ParagraphStyle(
            name='CompanyInfo',
            parent=self.styles['Normal'],
            fontSize=9,
            alignment=TA_CENTER,
            fontName='Helvetica'
        ))
        
        # Normal DTR text
        self.styles.add(ParagraphStyle(
            name='DTRNormal',
            parent=self.styles['Normal'],
            fontSize=9,
            fontName='Helvetica'
        ))
    
    def _format_currency(self, amount: Decimal) -> str:
        """Format currency with $ sign and 2 decimal places"""
        if amount is None:
            return "$0.00"
        return f"${amount:,.2f}"
    
    def _format_negative_currency(self, amount: Decimal) -> str:
        """Format negative amounts with parentheses as per business rules"""
        if amount is None or amount == 0:
            return "-"
        if amount < 0:
            return f"(${abs(amount):,.2f})"
        return f"${amount:,.2f}"
    
    def _format_date(self, date_obj) -> str:
        """Format date as MM/DD/YYYY"""
        if not date_obj:
            return ""
        return date_obj.strftime('%m/%d/%Y')
    
    def _format_date_range(self, start_date, end_date) -> str:
        """Format date range for receipt period"""
        if not start_date or not end_date:
            return ""
        return f"{self._format_date(start_date)} to {self._format_date(end_date)}"
    
    def _create_header(self, dtr: DTR) -> List:
        """
        Create DTR header with company info and identification block.
        Matches business specification exactly.
        """
        elements = []
        
        # Company name and address in yellow background
        company_info = """
        <b>Big Apple Taxi Management LLC</b><br/>
        90-24 Queens Boulevard, Woodside, NY 11377-4642<br/>
        718 779 5090 | bigappletaxiinc.com
        """
        address_para = Paragraph(company_info, self.styles['CompanyInfo'])
        address_table = Table(
            [[address_para]], 
            colWidths=[6*inch]
        )
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
        
        # DTR Identification Block - Extract accurate data from relationships
        medallion = ""
        driver_name = ""
        tlc_license = ""
        
        # Get medallion number
        if dtr.medallion:
            medallion = str(dtr.medallion.medallion_number)
        
        # Get driver name - properly construct full name
        if dtr.driver:
            first_name = dtr.driver.first_name or ""
            middle_name = dtr.driver.middle_name or ""
            last_name = dtr.driver.last_name or ""
            
            # Construct full name with proper spacing
            name_parts = [first_name, middle_name, last_name]
            driver_name = " ".join(part for part in name_parts if part).strip()
        
        # Get TLC license number
        if dtr.driver and dtr.driver.tlc_license:
            tlc_license = str(dtr.driver.tlc_license.tlc_license_number)
        
        # Build identification table
        receipt_data = [
            ['Medallion:', medallion, 'Receipt number:', dtr.receipt_number or ""],
            ['Driver / Leaseholder:', driver_name, 'Receipt Date:', self._format_date(dtr.generation_date)],
            ['TLC License:', tlc_license or "", 'Receipt Period:', self._format_date_range(dtr.period_start_date, dtr.period_end_date)]
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
        """
        Create Gross Earnings Snapshot section.
        As per spec: Shows pre-deduction earnings from CURB.
        """
        elements = []
        
        # Section header
        header = Paragraph(
            '<font color="red"><b>Gross Earnings Snapshot for Receipt Period</b></font>',
            self.styles['SectionHeader']
        )
        elements.append(header)
        elements.append(Spacer(1, 0.1*inch))
        
        # Earnings table - matches business specification
        earnings_data = [
            ['Earnings Type', 'Amount'],
            ['CURB', ''],
            ['Credit Card Transactions', self._format_currency(dtr.gross_cc_earnings or Decimal('0.00'))],
            ['Total', self._format_currency(dtr.total_gross_earnings or Decimal('0.00'))]
        ]
        
        earnings_table = Table(earnings_data, colWidths=[4*inch, 2*inch])
        earnings_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
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
        ]))
        elements.append(earnings_table)
        
        return elements
    
    def _create_account_balance_section(self, dtr: DTR) -> List:
        """
        Create Account Balance for Receipt Period section.
        Shows earnings vs deductions following payment hierarchy.
        """
        elements = []
        
        elements.append(Spacer(1, 0.2*inch))
        
        # Section header
        header = Paragraph(
            '<font color="red"><b>Account Balance for Receipt Period</b></font>',
            self.styles['SectionHeader']
        )
        elements.append(header)
        elements.append(Spacer(1, 0.1*inch))
        
        # Credit card earnings (bold row)
        cc_data = [
            ['Credit Card Earnings', self._format_currency(dtr.gross_cc_earnings or Decimal('0.00'))]
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
        
        # Charges table following payment hierarchy
        # TAXES → EZPASS → LEASE → PVB → TLC → REPAIRS → LOANS → MISC
        charges_data = [
            ['Charge Type', 'Current Week', 'Prior Balance', 'Total'],
            ['Taxes (MTA, TIF, Congestion, CRBT, Airport)', 
             self._format_currency(dtr.mta_tif_fees or Decimal('0.00')), '-', 
             self._format_currency(dtr.mta_tif_fees or Decimal('0.00'))],
            ['EZPass', 
             self._format_currency(dtr.ezpass_tolls or Decimal('0.00')), '-', 
             self._format_currency(dtr.ezpass_tolls or Decimal('0.00'))],
            ['Lease', 
             self._format_currency(dtr.lease_amount or Decimal('0.00')), '-', 
             self._format_currency(dtr.lease_amount or Decimal('0.00'))],
            ['PVB Violations', 
             self._format_currency(dtr.violation_tickets or Decimal('0.00')), '-', 
             self._format_currency(dtr.violation_tickets or Decimal('0.00'))],
            ['TLC Tickets', 
             self._format_currency(dtr.tlc_tickets or Decimal('0.00')), '-', 
             self._format_currency(dtr.tlc_tickets or Decimal('0.00'))],
            ['Repairs', 
             self._format_currency(dtr.repairs or Decimal('0.00')), '-', 
             self._format_currency(dtr.repairs or Decimal('0.00'))],
            ['Driver Loans', 
             self._format_currency(dtr.driver_loans or Decimal('0.00')), '-', 
             self._format_currency(dtr.driver_loans or Decimal('0.00'))],
            ['Misc Charges', 
             self._format_currency(dtr.misc_charges or Decimal('0.00')), '-', 
             self._format_currency(dtr.misc_charges or Decimal('0.00'))],
        ]
        
        charges_table = Table(charges_data, colWidths=[2.5*inch, 1.2*inch, 1.2*inch, 1.1*inch])
        charges_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BACKGROUND', (0, 0), (-1, 0), self.gray_bg),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(charges_table)
        
        elements.append(Spacer(1, 0.1*inch))
        
        # Final calculations table
        final_data = [
            ['', 'Current Week', 'Prior Balance', 'Total'],
            ['Subtotal', 
             self._format_currency(dtr.subtotal_charges or Decimal('0.00')),
             self._format_currency(dtr.prior_balance or Decimal('0.00')),
             self._format_currency((dtr.subtotal_charges or Decimal('0.00')) + (dtr.prior_balance or Decimal('0.00')))],
        ]
        
        # Add Net Earnings and Total Due rows
        final_data.append(['Net Earnings', '', '', self._format_currency(dtr.net_earnings or Decimal('0.00'))])
        final_data.append(['Total Due to Driver', '', '', self._format_currency(dtr.total_due_to_driver or Decimal('0.00'))])
        
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
        
        # Footnotes as per business specification
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
    
    def _create_payment_summary(self, dtr: DTR) -> List:
        """
        Create Payment Summary section - PRODUCTION GRADE WITH NO PLACEHOLDERS.
        All values are dynamically fetched from database relationships.
        
        Business Rules:
        1. Payment Type: From driver preference (ACH or Check)
        2. Batch Number: ACH [###] or CHK [###], or "-" if unpaid/zero amount
        3. Account Number: Last 4 digits masked, or "-" if not applicable
        4. Amount: Total Due to Driver, or $0.00 if zero/negative
        """
        elements = []
        
        elements.append(Spacer(1, 0.2*inch))
        
        # Section header
        header = Paragraph(
            '<font color="red"><b>Payment Summary</b></font>',
            self.styles['SectionHeader']
        )
        elements.append(header)
        elements.append(Spacer(1, 0.1*inch))
        
        # ===== PAYMENT TYPE =====
        # Source: driver.pay_to_mode or dtr.payment_method
        if dtr.payment_method:
            payment_type = dtr.payment_method.value
        elif dtr.driver and dtr.driver.pay_to_mode:
            payment_type = dtr.driver.pay_to_mode
        else:
            payment_type = "ACH"  # Default as per business rules
        
        # ===== BATCH NUMBER =====
        # Business Rule: If Total Due to Driver = 0, display "-"
        # Otherwise show ACH [###] or CHK [###] if paid, or "-" if unpaid
        if dtr.total_due_to_driver == 0:
            batch_no = "-"
        elif dtr.ach_batch_number:
            # Payment processed via ACH batch
            batch_no = f"ACH {dtr.ach_batch_number}"
        elif dtr.check_number:
            # Payment processed via Check
            batch_no = f"CHK {dtr.check_number}"
        else:
            # Unpaid DTR - no batch assigned yet
            batch_no = "-"
        
        # ===== ACCOUNT NUMBER =====
        # Business Rule: Display only last 4 digits for compliance and privacy
        # Source: dtr.account_number_masked (already masked) or driver.driver_bank_account
        account_no = "-"
        
        if dtr.account_number_masked:
            # DTR has masked account already stored
            account_no = dtr.account_number_masked
        elif dtr.driver and dtr.driver.driver_bank_account:
            # Get bank account from driver relationship
            bank_account = dtr.driver.driver_bank_account
            if bank_account.bank_account_number:
                # Mask account number on the fly - show only last 4 digits
                account_num_str = str(bank_account.bank_account_number)
                if len(account_num_str) >= 4:
                    account_no = "x" * (len(account_num_str) - 4) + account_num_str[-4:]
                else:
                    # Account number too short, mask everything
                    account_no = "x" * len(account_num_str)
        
        # For Check payments, account number is not applicable
        if payment_type == "Check" or payment_type == "CHECK":
            account_no = "-"
        
        # ===== AMOUNT =====
        # Business Rule: Total Due to Driver if positive, $0.00 if zero/negative
        if dtr.total_due_to_driver and dtr.total_due_to_driver > 0:
            amount = self._format_currency(dtr.total_due_to_driver)
        else:
            amount = "$0.00"
        
        # Build payment summary table
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
        """
        Create Alerts section for vehicle and driver license expiry dates.
        """
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
                vehicle_data.append([
                    alert.get('type', ''), 
                    alert.get('expiry_date', '')
                ])
            
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
            tlc1 = ""
            tlc2 = ""
            dmv = ""
            
            for alert in driver_alerts:
                license_type = alert.get('license_type', '')
                if 'TLC License 1' in license_type:
                    tlc1 = alert.get('expiry_date', '')
                elif 'TLC License 2' in license_type:
                    tlc2 = alert.get('expiry_date', '')
                elif 'DMV License' in license_type:
                    dmv = alert.get('expiry_date', '')
            
            driver_data.append(['TLC License Expiry', tlc1, tlc2])
            driver_data.append(['DMV License Expiry', dmv or "-", ''])
            
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
        """
        Create Taxes and Charges detail section.
        Shows breakdown by charge type with trip counts.
        """
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
        
        charges = dtr.tax_breakdown.get('charges', [])
        for charge in charges:
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
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(tax_table)
        
        return elements
    
    def _create_ezpass_section(self, dtr: DTR) -> List:
        """
        Create EZPass Tolls detail section.
        Shows transaction-level toll details.
        """
        elements = []
        
        if not dtr.ezpass_detail:
            return elements
        
        elements.append(PageBreak())
        
        # Create header
        header_elements = self._create_header(dtr)
        elements.extend(header_elements)
        
        # Section header
        header = Paragraph(
            '<font color="red"><b>EZPass Tolls</b></font>',
            self.styles['SectionHeader']
        )
        elements.append(header)
        elements.append(Spacer(1, 0.1*inch))
        
        # EZPass transaction table
        ezpass_data = [[
            'Date', 'TLC Lic', 'Plate', 'Agency', 'Entry', 
            'Exit', 'Toll', 'Prior Bal', 'Payment', 'Balance'
        ]]
        
        total_toll = Decimal('0.00')
        ezpass_items = dtr.ezpass_detail if isinstance(dtr.ezpass_detail, list) else []
        
        for item in ezpass_items:
            toll_amount = Decimal(str(item.get('toll', 0)))
            total_toll += toll_amount
            
            ezpass_data.append([
                item.get('transaction_date', '-'),
                item.get('tlc_license', '-'),
                item.get('plate_number', '-'),
                item.get('agency', '-'),
                item.get('entry_lane', '-'),
                item.get('exit_lane', '-'),
                self._format_currency(toll_amount),
                self._format_negative_currency(Decimal(str(item.get('prior_balance', 0)))),
                self._format_currency(Decimal(str(item.get('payment', 0)))),
                self._format_negative_currency(Decimal(str(item.get('balance', 0))))
            ])
        
        # Add total row
        ezpass_data.append([
            'Total', '-', '-', '-', '-', '-',
            self._format_currency(total_toll),
            '-', '-', '-'
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
        Generate complete PDF for DTR.
        Returns PDF as bytes for download or storage.
        
        Args:
            dtr: DTR model instance with all relationships loaded
            
        Returns:
            bytes: PDF file content
            
        Raises:
            DTRExportError: If PDF generation fails
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
            
            # Build PDF content in order
            story = []
            
            # Page 1: Header, Earnings, Account Balance, Payment Summary
            story.extend(self._create_header(dtr))
            story.extend(self._create_earnings_section(dtr))
            story.extend(self._create_account_balance_section(dtr))
            story.extend(self._create_payment_summary(dtr))
            
            # Page 2+: Alerts, Taxes, EZPass details
            story.extend(self._create_alerts_section(dtr))
            story.extend(self._create_taxes_section(dtr))
            story.extend(self._create_ezpass_section(dtr))
            
            # Build PDF
            doc.build(story)
            
            # Get PDF bytes
            pdf_bytes = buffer.getvalue()
            buffer.close()
            
            logger.info(f"Successfully generated PDF for DTR: {dtr.dtr_number} ({len(pdf_bytes)} bytes)")
            return pdf_bytes
            
        except Exception as e:
            logger.error(f"Error generating PDF for DTR {dtr.dtr_number}: {str(e)}", exc_info=True)
            raise DTRExportError(f"Failed to generate PDF: {str(e)}") from e


# Export the generator class
__all__ = ['DTRPDFGenerator']