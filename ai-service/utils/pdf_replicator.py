import pdfplumber
import io
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.lib import colors

# ── Section order preference ───────────────────────────────────────────────────
# Defines preferred order for sections in final PDF
PREFERRED_ORDER = [
    "summary", "objective", "skills", "technical skills",
    "experience", "work experience", "projects",
    "education", "certifications", "achievements",
    "awards", "publications", "volunteer",
    "languages", "interests"
]


def get_ordered_sections(section_order: list) -> list:
    """
    Returns sections in preferred order
    Any section not in preferred list goes at end
    Preserves original order for sections at same priority
    """
    ordered = []

    # First pass — add sections matching preferred order
    for preferred in PREFERRED_ORDER:
        for section in section_order:
            if section.lower() == preferred.lower():
                if section not in ordered:
                    ordered.append(section)
                break

    # Second pass — add any remaining sections
    for section in section_order:
        if section not in ordered:
            ordered.append(section)

    return ordered


def detect_layout(original_pdf_bytes: bytes) -> dict:
    """
    Reads original PDF to detect layout properties:
      - Page size
      - Margins
      - Font sizes used
      - Text alignment patterns
      - Color scheme from text colors

    This info is used to recreate similar layout
    in the new PDF with tailored content
    """
    layout = {
        "page_width": 595,    # A4 default
        "page_height": 842,   # A4 default
        "margin_left": 50,
        "margin_right": 50,
        "margin_top": 50,
        "margin_bottom": 50,
        "name_font_size": 20,
        "section_font_size": 12,
        "body_font_size": 10,
        "primary_color": "#000000",
        "secondary_color": "#333333"
    }

    try:
        with pdfplumber.open(io.BytesIO(original_pdf_bytes)) as pdf:
            if pdf.pages:
                page = pdf.pages[0]

                # Detect page dimensions
                layout["page_width"] = float(page.width)
                layout["page_height"] = float(page.height)

                # Analyze text blocks to detect font sizes
                words = page.extract_words(
                    extra_attrs=["size", "fontname", "color"]
                )

                if words:
                    sizes = [
                        float(w.get("size", 10))
                        for w in words
                        if w.get("size")
                    ]

                    if sizes:
                        # Largest font likely used for name
                        layout["name_font_size"] = min(max(sizes), 24)
                        # Medium fonts for section headers
                        layout["section_font_size"] = min(
                            sorted(set(sizes))[-2]
                            if len(set(sizes)) > 1
                            else 12,
                            16
                        )
                        # Most common font size for body
                        layout["body_font_size"] = min(
                            max(set(sizes), key=sizes.count),
                            12
                        )

    except Exception as e:
        print(f"Layout detection error: {e}. Using defaults.")

    return layout


def generate_replicated_pdf(
    personal_info: dict,
    tailored_sections: dict,
    section_order: list,
    original_pdf_bytes: bytes
) -> bytes:
    """
    Generates a new PDF that replicates the style of original.

    Process:
      1. Detect layout properties from original PDF
      2. Build new PDF using detected font sizes and margins
      3. Place personal info at top exactly as extracted
      4. Place tailored sections in original order
      5. All links restored before this function is called

    Returns PDF as bytes for download
    """

    # Step 1 — Detect original layout
    print("Detecting original PDF layout...")
    layout = detect_layout(original_pdf_bytes)
    print(f"Layout detected: {layout}")

    # Step 2 — Build new PDF
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=(layout["page_width"], layout["page_height"]),
        rightMargin=layout["margin_right"],
        leftMargin=layout["margin_left"],
        topMargin=layout["margin_top"],
        bottomMargin=layout["margin_bottom"]
    )

    # ── Define styles matching original layout ────────────────────────────────

    name_style = ParagraphStyle(
        'Name',
        fontSize=layout["name_font_size"],
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
        spaceAfter=4,
        textColor=colors.HexColor(layout["primary_color"])
    )

    contact_style = ParagraphStyle(
        'Contact',
        fontSize=layout["body_font_size"],
        fontName='Helvetica',
        alignment=TA_CENTER,
        spaceAfter=2,
        textColor=colors.HexColor(layout["secondary_color"])
    )

    section_style = ParagraphStyle(
        'Section',
        fontSize=layout["section_font_size"],
        fontName='Helvetica-Bold',
        spaceBefore=10,
        spaceAfter=4,
        textColor=colors.HexColor(layout["primary_color"])
    )

    body_style = ParagraphStyle(
        'Body',
        fontSize=layout["body_font_size"],
        fontName='Helvetica',
        spaceAfter=3,
        leading=layout["body_font_size"] * 1.4
    )

    bullet_style = ParagraphStyle(
        'Bullet',
        fontSize=layout["body_font_size"],
        fontName='Helvetica',
        leftIndent=15,
        spaceAfter=2,
        leading=layout["body_font_size"] * 1.4
    )

    story = []

    # ── Personal Info Section ─────────────────────────────────────────────────
    # Placed at top exactly as extracted
    # Never modified by any agent

    # Name
    name = personal_info.get("full_name", "")
    if name:
        story.append(Paragraph(name, name_style))

    # Contact line — only include fields that exist
    contact_parts = []
    if personal_info.get("email"):
        contact_parts.append(personal_info["email"])
    if personal_info.get("phone"):
        contact_parts.append(personal_info["phone"])
    if personal_info.get("location"):
        contact_parts.append(personal_info["location"])
    if personal_info.get("linkedin"):
        contact_parts.append(personal_info["linkedin"])
    if personal_info.get("github"):
        contact_parts.append(personal_info["github"])
    if personal_info.get("portfolio"):
        contact_parts.append(personal_info["portfolio"])

    if contact_parts:
        story.append(Paragraph(
            "  |  ".join(contact_parts),
            contact_style
        ))

    story.append(Spacer(1, 0.15 * inch))

    # ── Tailored Sections ─────────────────────────────────────────────────────
    # Build case insensitive lookup map of tailored sections
    # Key = lowercase, Value = (original key, content)
    tailored_lookup = {}
    for key, value in tailored_sections.items():
        tailored_lookup[key.lower()] = (key, value)

    # Build ordered list using section_order as preference
    ordered = []
    if section_order:
        # First add sections from section_order that exist in tailored
        for section_name in section_order:
            if section_name.lower() in tailored_lookup:
                ordered.append(section_name)
        # Then add remaining sections from tailored not in section_order
        for key in tailored_sections:
            found = any(s.lower() == key.lower() for s in ordered)
            if not found:
                ordered.append(key)
    else:
        # No section_order — use tailored keys directly
        ordered = list(tailored_sections.keys())

    # Render each section dynamically
    for section_name in ordered:
        lookup_key = section_name.lower()
        if lookup_key not in tailored_lookup:
            continue

        original_key, content = tailored_lookup[lookup_key]

        if not content:
            continue

        # Section header
        story.append(Paragraph(section_name.upper(), section_style))

        if isinstance(content, list):
            # List section
            for item in content:
                if item and isinstance(item, str):
                    clean_item = item.lstrip('- ').strip()
                    if clean_item:
                        story.append(Paragraph(f"• {clean_item}", bullet_style))

        elif isinstance(content, str):
            if '\n' in content:
                # Multiline string — split and render as bullets
                lines = content.split('\n')
                for line in lines:
                    clean_line = line.lstrip('- ').strip()
                    if clean_line:
                        story.append(Paragraph(f"• {clean_line}", bullet_style))
            else:
                # Single paragraph
                story.append(Paragraph(content, body_style))

        story.append(Spacer(1, 0.05 * inch))
    # Build PDF
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    print(f"PDF generated: {len(pdf_bytes)} bytes")
    return pdf_bytes