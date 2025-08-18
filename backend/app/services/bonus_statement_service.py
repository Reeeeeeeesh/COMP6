"""
Bonus Statement Service for generating professional PDF and XLSX statements.
Task 20: Individual bonus statement generator leveraging calculation tape transparency.
"""
import logging
import io
import os
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session

# PDF generation
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import Color, black, darkblue, lightgrey
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

# Excel generation
import xlsxwriter
from xlsxwriter.workbook import Workbook

from ..models import EmployeeData, EmployeeCalculationResult, RunStepResult, PlanRun, BonusPlan
from ..schemas import BonusStatementData, BonusStatementRequest

logger = logging.getLogger(__name__)


class BonusStatementService:
    """Service for generating professional bonus statements in PDF and XLSX formats."""
    
    def __init__(self, db: Session, tenant_id: str):
        self.db = db
        self.tenant_id = tenant_id
    
    def generate_statement(self, run_id: str, employee_ref: str, 
                          request: BonusStatementRequest) -> Dict[str, Any]:
        """
        Generate a bonus statement for an employee from a completed plan run.
        
        Args:
            run_id: Plan run ID containing calculation results
            employee_ref: Employee reference ID
            request: Statement generation request with format and options
            
        Returns:
            Dictionary with generated file data and metadata
        """
        try:
            start_time = datetime.utcnow()
            
            # 1. Gather statement data
            statement_data = self._gather_statement_data(run_id, employee_ref, request)
            
            # 2. Generate file based on format
            if request.format == 'pdf':
                file_bytes, filename = self._generate_pdf_statement(statement_data)
            elif request.format == 'xlsx':
                file_bytes, filename = self._generate_xlsx_statement(statement_data)
            else:
                raise ValueError(f"Unsupported format: {request.format}")
            
            generation_time = (datetime.utcnow() - start_time).total_seconds()
            
            return {
                'success': True,
                'employee_ref': employee_ref,
                'format': request.format,
                'file_bytes': file_bytes,
                'filename': filename,
                'file_size_bytes': len(file_bytes),
                'generation_time_seconds': generation_time,
                'statement_data': statement_data.model_dump()
            }
            
        except Exception as e:
            logger.error(f"Statement generation failed for employee {employee_ref}: {e}")
            generation_time = (datetime.utcnow() - start_time).total_seconds()
            
            return {
                'success': False,
                'employee_ref': employee_ref,
                'format': request.format,
                'error': str(e),
                'generation_time_seconds': generation_time
            }
    
    def _gather_statement_data(self, run_id: str, employee_ref: str, 
                              request: BonusStatementRequest) -> BonusStatementData:
        """Gather comprehensive data for statement generation."""
        
        # Get plan run and verify tenant access
        plan_run = self.db.query(PlanRun).filter(
            PlanRun.id == run_id,
            PlanRun.tenant_id == self.tenant_id
        ).first()
        
        if not plan_run:
            raise ValueError("Plan run not found or access denied")
        
        # Get bonus plan information
        bonus_plan = self.db.query(BonusPlan).filter(
            BonusPlan.id == plan_run.plan_id,
            BonusPlan.tenant_id == self.tenant_id
        ).first()
        
        if not bonus_plan:
            raise ValueError("Bonus plan not found")
        
        # Get employee data from the associated upload
        if not plan_run.upload_id:
            raise ValueError("Plan run has no associated upload data")
        
        employee_data = self.db.query(EmployeeData).filter(
            EmployeeData.batch_upload_id == plan_run.upload_id,
            EmployeeData.employee_id == employee_ref
        ).first()
        
        if not employee_data:
            raise ValueError(f"Employee {employee_ref} not found in upload data")
        
        # Get calculation results
        calc_result = self.db.query(EmployeeCalculationResult).filter(
            EmployeeCalculationResult.employee_data_id == employee_data.id
        ).first()
        
        if not calc_result:
            raise ValueError(f"Calculation results not found for employee {employee_ref}")
        
        # Get calculation steps if requested
        calculation_steps = None
        if request.include_calculation_steps:
            step_results = self.db.query(RunStepResult).filter(
                RunStepResult.run_id == run_id,
                RunStepResult.employee_ref == employee_ref
            ).order_by(RunStepResult.created_at).all()
            
            calculation_steps = []
            for step in step_results:
                calculation_steps.append({
                    'step_name': step.step_name,
                    'value': step.value,
                    'calculated_at': step.created_at.isoformat()
                })
        
        # Create comprehensive statement data
        return BonusStatementData(
            employee_ref=employee_ref,
            first_name=employee_data.first_name or "N/A",
            last_name=employee_data.last_name or "N/A", 
            email=employee_data.email,
            department=employee_data.department,
            position=employee_data.position,
            hire_date=employee_data.hire_date,
            base_salary=calc_result.base_salary,
            bonus_percentage=calc_result.bonus_percentage,
            bonus_amount=calc_result.bonus_amount,
            total_compensation=calc_result.total_compensation,
            plan_name=bonus_plan.name,
            plan_version=bonus_plan.version,
            calculation_date=plan_run.finished_at or plan_run.started_at,
            statement_date=request.statement_date,
            company_name=request.company_name,
            calculation_steps=calculation_steps
        )
    
    def _generate_pdf_statement(self, data: BonusStatementData) -> tuple[bytes, str]:
        """Generate professional PDF bonus statement."""
        buffer = io.BytesIO()
        
        # Create PDF document
        doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch)
        story = []
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=20,
            alignment=TA_CENTER,
            textColor=darkblue
        )
        
        header_style = ParagraphStyle(
            'CustomHeader',
            parent=styles['Heading2'],
            fontSize=14,
            spaceAfter=10,
            textColor=darkblue
        )
        
        # Document Header
        story.append(Paragraph(f"{data.company_name}", title_style))
        story.append(Paragraph("Individual Bonus Statement", styles['Heading2']))
        story.append(Spacer(1, 0.2*inch))
        
        # Statement Date
        story.append(Paragraph(f"Statement Date: {data.statement_date.strftime('%B %d, %Y')}", styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
        
        # Employee Information Section
        story.append(Paragraph("Employee Information", header_style))
        emp_data = [
            ['Name:', f"{data.first_name} {data.last_name}"],
            ['Employee ID:', data.employee_ref],
            ['Email:', data.email or 'N/A'],
            ['Department:', data.department or 'N/A'],
            ['Position:', data.position or 'N/A'],
            ['Hire Date:', data.hire_date.strftime('%B %d, %Y') if data.hire_date else 'N/A']
        ]
        
        emp_table = Table(emp_data, colWidths=[1.5*inch, 4*inch])
        emp_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, lightgrey),
            ('BACKGROUND', (0, 0), (0, -1), Color(0.9, 0.9, 0.9))
        ]))
        story.append(emp_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Compensation Summary Section
        story.append(Paragraph("Compensation Summary", header_style))
        comp_data = [
            ['Base Salary:', f"${data.base_salary:,.2f}"],
            ['Bonus Percentage:', f"{data.bonus_percentage:.2%}"],
            ['Bonus Amount:', f"${data.bonus_amount:,.2f}"],
            ['Total Compensation:', f"${data.total_compensation:,.2f}"]
        ]
        
        comp_table = Table(comp_data, colWidths=[1.5*inch, 4*inch])
        comp_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, lightgrey),
            ('BACKGROUND', (0, 0), (0, -1), Color(0.9, 0.9, 0.9)),
            ('BACKGROUND', (0, -1), (-1, -1), Color(0.8, 0.8, 0.8)),  # Highlight total
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold')
        ]))
        story.append(comp_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Plan Information Section
        story.append(Paragraph("Plan Information", header_style))
        plan_data = [
            ['Plan Name:', data.plan_name],
            ['Plan Version:', str(data.plan_version)],
            ['Calculation Date:', data.calculation_date.strftime('%B %d, %Y')]
        ]
        
        plan_table = Table(plan_data, colWidths=[1.5*inch, 4*inch])
        plan_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, lightgrey),
            ('BACKGROUND', (0, 0), (0, -1), Color(0.9, 0.9, 0.9))
        ]))
        story.append(plan_table)
        
        # Calculation Steps Section (if included)
        if data.calculation_steps:
            story.append(Spacer(1, 0.3*inch))
            story.append(Paragraph("Calculation Breakdown", header_style))
            
            steps_data = [['Step Name', 'Calculated Value', 'Type']]
            for step in data.calculation_steps:
                value_info = step['value']
                formatted_value = self._format_step_value(value_info)
                steps_data.append([
                    step['step_name'],
                    formatted_value,
                    value_info.get('type', 'unknown')
                ])
            
            steps_table = Table(steps_data, colWidths=[2*inch, 1.5*inch, 1*inch])
            steps_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 0.5, lightgrey),
                ('BACKGROUND', (0, 0), (-1, 0), Color(0.8, 0.8, 0.8))
            ]))
            story.append(steps_table)
        
        # Footer
        story.append(Spacer(1, 0.5*inch))
        footer_text = f"This statement was generated on {datetime.utcnow().strftime('%B %d, %Y at %I:%M %p')} and reflects calculations performed using {data.plan_name} v{data.plan_version}."
        story.append(Paragraph(footer_text, styles['Normal']))
        
        # Build PDF
        doc.build(story)
        
        # Get file bytes
        file_bytes = buffer.getvalue()
        buffer.close()
        
        # Generate filename
        filename = f"bonus_statement_{data.employee_ref}_{data.statement_date.strftime('%Y%m%d')}.pdf"
        
        return file_bytes, filename
    
    def _generate_xlsx_statement(self, data: BonusStatementData) -> tuple[bytes, str]:
        """Generate professional XLSX bonus statement."""
        buffer = io.BytesIO()
        
        # Create workbook and worksheet
        workbook = xlsxwriter.Workbook(buffer, {'in_memory': True})
        worksheet = workbook.add_worksheet('Bonus Statement')
        
        # Define formats
        title_format = workbook.add_format({
            'bold': True,
            'font_size': 16,
            'align': 'center',
            'bg_color': '#E8F4FD',
            'font_color': '#1B365D'
        })
        
        header_format = workbook.add_format({
            'bold': True,
            'font_size': 12,
            'bg_color': '#D6EAF8',
            'font_color': '#1B365D'
        })
        
        label_format = workbook.add_format({
            'bold': True,
            'bg_color': '#F8F9FA'
        })
        
        currency_format = workbook.add_format({
            'num_format': '$#,##0.00'
        })
        
        percentage_format = workbook.add_format({
            'num_format': '0.00%'
        })
        
        # Set column widths
        worksheet.set_column('A:A', 20)
        worksheet.set_column('B:B', 25)
        worksheet.set_column('C:C', 15)
        
        row = 0
        
        # Document Header
        worksheet.merge_range(f'A{row+1}:C{row+1}', data.company_name, title_format)
        row += 1
        worksheet.merge_range(f'A{row+1}:C{row+1}', 'Individual Bonus Statement', header_format)
        row += 2
        
        worksheet.write(row, 0, 'Statement Date:', label_format)
        worksheet.write(row, 1, data.statement_date.strftime('%B %d, %Y'))
        row += 2
        
        # Employee Information Section
        worksheet.merge_range(f'A{row+1}:C{row+1}', 'Employee Information', header_format)
        row += 1
        
        emp_info = [
            ('Name:', f"{data.first_name} {data.last_name}"),
            ('Employee ID:', data.employee_ref),
            ('Email:', data.email or 'N/A'),
            ('Department:', data.department or 'N/A'),
            ('Position:', data.position or 'N/A'),
            ('Hire Date:', data.hire_date.strftime('%B %d, %Y') if data.hire_date else 'N/A')
        ]
        
        for label, value in emp_info:
            worksheet.write(row, 0, label, label_format)
            worksheet.write(row, 1, value)
            row += 1
        
        row += 1
        
        # Compensation Summary Section
        worksheet.merge_range(f'A{row+1}:C{row+1}', 'Compensation Summary', header_format)
        row += 1
        
        worksheet.write(row, 0, 'Base Salary:', label_format)
        worksheet.write(row, 1, data.base_salary, currency_format)
        row += 1
        
        worksheet.write(row, 0, 'Bonus Percentage:', label_format)
        worksheet.write(row, 1, data.bonus_percentage / 100, percentage_format)
        row += 1
        
        worksheet.write(row, 0, 'Bonus Amount:', label_format)
        worksheet.write(row, 1, data.bonus_amount, currency_format)
        row += 1
        
        worksheet.write(row, 0, 'Total Compensation:', label_format)
        worksheet.write(row, 1, data.total_compensation, currency_format)
        row += 2
        
        # Plan Information Section
        worksheet.merge_range(f'A{row+1}:C{row+1}', 'Plan Information', header_format)
        row += 1
        
        plan_info = [
            ('Plan Name:', data.plan_name),
            ('Plan Version:', str(data.plan_version)),
            ('Calculation Date:', data.calculation_date.strftime('%B %d, %Y'))
        ]
        
        for label, value in plan_info:
            worksheet.write(row, 0, label, label_format)
            worksheet.write(row, 1, value)
            row += 1
        
        # Calculation Steps Section (if included)
        if data.calculation_steps:
            row += 1
            worksheet.merge_range(f'A{row+1}:C{row+1}', 'Calculation Breakdown', header_format)
            row += 1
            
            # Headers
            worksheet.write(row, 0, 'Step Name', label_format)
            worksheet.write(row, 1, 'Calculated Value', label_format)
            worksheet.write(row, 2, 'Type', label_format)
            row += 1
            
            # Step data
            for step in data.calculation_steps:
                worksheet.write(row, 0, step['step_name'])
                
                value_info = step['value']
                if value_info.get('type') == 'numeric':
                    try:
                        numeric_value = float(value_info['value'])
                        worksheet.write(row, 1, numeric_value, currency_format)
                    except (ValueError, TypeError):
                        worksheet.write(row, 1, str(value_info['value']))
                else:
                    worksheet.write(row, 1, str(value_info['value']))
                
                worksheet.write(row, 2, value_info.get('type', 'unknown'))
                row += 1
        
        # Footer
        row += 2
        footer_text = f"Generated on {datetime.utcnow().strftime('%B %d, %Y at %I:%M %p')} using {data.plan_name} v{data.plan_version}"
        worksheet.merge_range(f'A{row+1}:C{row+1}', footer_text)
        
        # Close workbook and get bytes
        workbook.close()
        file_bytes = buffer.getvalue()
        buffer.close()
        
        # Generate filename
        filename = f"bonus_statement_{data.employee_ref}_{data.statement_date.strftime('%Y%m%d')}.xlsx"
        
        return file_bytes, filename
    
    def _format_step_value(self, value_info: Dict[str, Any]) -> str:
        """Format step values for display in statements."""
        if value_info.get('type') == 'numeric':
            try:
                numeric_value = float(value_info['value'])
                return f"${numeric_value:,.2f}"
            except (ValueError, TypeError):
                return str(value_info['value'])
        else:
            return str(value_info['value'])


def get_bonus_statement_service(db: Session, tenant_id: str) -> BonusStatementService:
    """Factory function to create BonusStatementService."""
    return BonusStatementService(db, tenant_id)