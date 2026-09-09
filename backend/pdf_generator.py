import os
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def generate_prescription_pdf(case: dict, patient: dict) -> BytesIO:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=32,
        bottomMargin=32
    )
    elements = []
    styles = getSampleStyleSheet()

    # Brand Colors
    c_purple = colors.HexColor('#502479')
    c_teal = colors.HexColor('#208396')
    c_gold = colors.HexColor('#D4AF37')
    c_slate_dark = colors.HexColor('#1e293b')
    c_slate_light = colors.HexColor('#64748b')

    # Custom Paragraph Styles
    style_clinic_title = ParagraphStyle(
        'ClinicBrandTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=c_purple,
        spaceAfter=2
    )
    style_contact = ParagraphStyle(
        'ClinicContact',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7,
        leading=9.5,
        textColor=c_slate_light
    )
    style_doctor = ParagraphStyle(
        'DoctorDetails',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=c_slate_dark
    )

    # 1. Resolve Clinic Logo
    logo_candidates = [
        os.path.join(os.path.dirname(__file__), "..", "frontend-web", "public", "logo.png"),
        os.path.join(os.path.dirname(__file__), "logo.png"),
        os.path.join(os.path.dirname(__file__), "public", "logo.png"),
        "logo.png"
    ]
    logo_flowable = None
    for path in logo_candidates:
        if os.path.exists(path):
            try:
                logo_flowable = Image(path, width=65, height=65)
                break
            except Exception:
                pass

    title_paragraph = Paragraph("SANKARA HOMOEOPATHY", style_clinic_title)

    # 2. Clinic Details (Address, Phone, Email & Timings)
    clinic_text = Paragraph(
        "<b>Address:</b> D no 7-5-84A Beside zilla kammavari seva sangham,<br/>"
        "Anjaiah Road, Near Nirmala concept school, Nirmalnagar, Ongole<br/>"
        "<b>Phone:</b> +91 7799794568, +91 9900104401 | <b>Email:</b> sankarahomoeopathy@gmail.com<br/>"
        "<b>Timings:</b> Mon - Sun: 10:00 AM - 2:00 PM | 5:00 PM - 9:00 PM",
        style_contact
    )

    # 3. Doctors List Strip
    doctors_text = Paragraph(
        "<b>CONSULTANT PHYSICIANS</b><br/>"
        "<b>Dr. Jeevesh Paramathmuni</b>, <font size=6 color='#64748b'>BHMS, MD (Hom)</font><br/>"
        "<b>Dr. M Padmashree</b>, <font size=6 color='#64748b'>BHMS, MD (Hom), SCPH (Gold Medalist)</font><br/>"
        "<b>Dr. Dheeraj Paramathmuni</b>, <font size=6 color='#64748b'>BHMS, FFAC</font>",
        style_doctor
    )

    clinic_column = [title_paragraph, clinic_text]

    # Build Header Table Layout
    if logo_flowable:
        header_table = Table(
            [[logo_flowable, clinic_column, doctors_text]],
            colWidths=[70, 280, 190]
        )
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (0, 0), (0, 0), 'CENTER'),
            ('RIGHTPADDING', (0, 0), (0, 0), 4),
            ('LEFTPADDING', (1, 0), (1, 0), 4),
            ('LEFTPADDING', (2, 0), (2, 0), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
    else:
        header_table = Table(
            [[clinic_column, doctors_text]],
            colWidths=[340, 200]
        )
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))

    elements.append(header_table)
    elements.append(Spacer(1, 6))

    # Purple & Gold Horizontal Divider Rule
    elements.append(HRFlowable(width="100%", thickness=2.5, color=c_purple, spaceBefore=2, spaceAfter=2))
    elements.append(HRFlowable(width="100%", thickness=1, color=c_gold, spaceBefore=1, spaceAfter=8))

    # 4. Patient Information Strip
    end_date_str = patient.get('end_date') or 'N/A'
    p_info = [
        [
            f"Patient ID: {patient.get('patient_id')}",
            f"Name: {patient.get('name')}",
            f"Age: {patient.get('age')} Yrs",
            f"Date: {case.get('consultation_date')}"
        ],
        [
            f"Contact: {patient.get('contact')}",
            f"Doctor: {case.get('doctor_name') or 'Consultant'}",
            f"Follow-up: {case.get('followup_date') or 'N/A'}",
            f"End Date: {end_date_str}"
        ]
    ]
    t_p = Table(p_info, colWidths=[130, 150, 125, 135])
    t_p.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FAF7F2')),
        ('TEXTCOLOR', (0, 0), (-1, -1), c_slate_dark),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
    ]))
    elements.append(t_p)
    elements.append(Spacer(1, 8))

    # 5. Clinical Observations
    obs = case.get("clinical_observations")
    if obs:
        elements.append(Paragraph("<font color='#502479'><b>Clinical Observations & Totality Symptoms:</b></font>", styles['Normal']))
        elements.append(Spacer(1, 2))
        elements.append(Paragraph(f"<i>{obs}</i>", styles['Normal']))
        elements.append(Spacer(1, 8))

    # 6. Diagnostic & Examination Findings (Only non-empty fields)
    entered = case.get("entered_data", {})
    non_empty = {k: v for k, v in entered.items() if v and str(v).strip()}
    if non_empty:
        elements.append(Paragraph("<font color='#208396'><b>Diagnostic & Physical Examination Findings:</b></font>", styles['Normal']))
        elements.append(Spacer(1, 3))
        rows = []
        items = list(non_empty.items())
        for i in range(0, len(items), 2):
            k1, v1 = items[i]
            col1 = f"<b>{k1.replace('_', ' ').title()}:</b> {v1}"
            col2 = ""
            if i + 1 < len(items):
                k2, v2 = items[i + 1]
                col2 = f"<b>{k2.replace('_', ' ').title()}:</b> {v2}"
            rows.append([
                Paragraph(col1, styles['Normal']),
                Paragraph(col2, styles['Normal'])
            ])
        t_diag = Table(rows, colWidths=[270, 270])
        t_diag.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
        ]))
        elements.append(t_diag)
        elements.append(Spacer(1, 8))

    # 7. Prescribed Remedies Table
    meds = case.get("medicines", [])
    if meds:
        elements.append(Paragraph("<font size=11 color='#502479'><b>Prescribed Medicines</b></font>", styles['Normal']))
        elements.append(Spacer(1, 4))
        m_rows = [["Remedy Name", "Potency", "Days", "Duration", "Instructions / Progress"]]
        for m in meds:
            m_rows.append([
                str(m.get("medicine", "")),
                str(m.get("potency", "")),
                str(m.get("medicine_days", "")),
                str(m.get("suggested_duration", "")),
                str(m.get("progress", ""))
            ])
        t_meds = Table(m_rows, colWidths=[160, 75, 55, 90, 160])
        t_meds.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), c_purple),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('TOPPADDING', (0, 0), (-1, -1), 3.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ]))
        elements.append(t_meds)

    # 8. Signature & Storage Advice Footer
    elements.append(Spacer(1, 22))
    attending_doc = case.get('doctor_name') or 'Dr. Jeevesh Paramathmuni'

    doctor_qualifications = {
        "Dr. Jeevesh Paramathmuni": "BHMS, MD (Hom)",
        "Dr. Padmashree M": "BHMS, MD (Hom), SCPH (Gold Medalist)",
        "Dr. Dheeraj Paramathmuni": "BHMS, FFAC"
    }
    doc_quals = doctor_qualifications.get(attending_doc, "Consultant Physician")

    sig_filenames = {
        "Dr. Jeevesh Paramathmuni": "dr_jeevesh.png",
        "Dr. Padmashree M": "dr_padmashree.png",
        "Dr. Dheeraj Paramathmuni": "dr_dheeraj.png"
    }
    target_sig_filename = sig_filenames.get(attending_doc, "dr_jeevesh.png")

    frontend_base = os.path.join(os.path.dirname(__file__), "..", "frontend-web", "public")
    sig_candidates = [
        os.path.join(frontend_base, "signatures", target_sig_filename),
        os.path.join(frontend_base, target_sig_filename),
        os.path.join(os.path.dirname(__file__), "signatures", target_sig_filename),
        os.path.join(os.path.dirname(__file__), target_sig_filename),
        target_sig_filename
    ]

    sig_flowable = None
    for p in sig_candidates:
        if os.path.exists(p):
            try:
                # 95pt x 36pt keeps signature proportional and crisp
                sig_flowable = Image(p, width=95, height=36)
                break
            except Exception:
                pass

    # Signature cell: if no image, insert proper blank space for physical signing
    if sig_flowable:
        sig_cell = [sig_flowable]
    else:
        sig_cell = [
            Spacer(1, 34),
            Paragraph("<font size=7 color='#94a3b8'>___________________________</font>", styles['Normal'])
        ]

    # Nested table for the signature box
    right_col_table = Table(
        [
            [Paragraph("<font size=8 color='#502479'><b>For SANKARA HOMOEOPATHY</b></font>", styles['Normal'])],
            [sig_cell],
            [Paragraph(
                f"<font size=8 color='#1e293b'><b>{attending_doc}</b></font><br/>"
                f"<font size=7 color='#64748b'>{doc_quals}</font><br/>"
                f"<font size=6.5 color='#94a3b8'>Authorized Signatory</font>",
                styles['Normal']
            )]
        ],
        colWidths=[170]
    )
    right_col_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))

    # Left Column: Advisory
    left_col = Paragraph(
        "<font size=7 color='#64748b'><b>Sankara Homoeopathy Care Advisory:</b><br/>"
        "• Keep remedies stored in a cool, dry place away from direct sunlight, camphor, and strong perfumes.<br/>"
        "• Avoid consuming coffee, raw onions, or garlic within 30 minutes of taking medication.<br/>"
        "• Valid for dispensing as per OPD consultation record above.</font>",
        styles['Normal']
    )

    # Outer 2-column footer table with right-margin padding
    footer_data = [[left_col, right_col_table]]
    t_foot = Table(footer_data, colWidths=[350, 190])
    t_foot.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (1, 0), (1, 0), 18),  # Insets from the right edge
        ('LEFTPADDING', (0, 0), (0, 0), 0),
    ]))
    elements.append(t_foot)

    doc.build(elements)
    buffer.seek(0)
    return buffer