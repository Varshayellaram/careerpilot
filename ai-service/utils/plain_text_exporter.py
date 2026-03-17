# ── Plain Text Exporter ───────────────────────────────────────────────────────
# Option B — returns tailored content as formatted plain text
# User can copy-paste into any job portal or resume builder
# No library needed — pure Python string formatting

def export_as_plain_text(
    personal_info: dict,
    tailored_sections: dict,
    section_order: list
) -> str:

    print("tailored sections ",tailored_sections)
    print("section_order ",section_order)
    """
    Formats tailored resume as clean plain text.

    Structure:
      NAME
      email | phone | location | linkedin | github
      ─────────────────────────────────────────────
      SECTION NAME
      content here...

      SECTION NAME
      - bullet point
      - bullet point

    Returns formatted string ready for copy-paste
    """

    lines = []

    # ── Personal info header ──────────────────────────────────────────────────
    name = personal_info.get("full_name", "")
    if name:
        lines.append(name.upper())

    # Contact info line
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
        lines.append(" | ".join(contact_parts))

    # Divider
    lines.append("─" * 60)
    lines.append("")
    
    # ── Tailored sections ─────────────────────────────────────────────────────
    # In original order, with clear section headers
    for section_name in section_order:
        content = tailored_sections.get(section_name.upper())
        print("content ",content)
        if not content:
            continue
        
        # Section header in uppercase
        lines.append(section_name.upper())
        lines.append("─" * 30)

        if isinstance(content, str):
            # Paragraph section
            lines.append(content)

        elif isinstance(content, list):
            # List section — each item as bullet
            for item in content:
                if item and isinstance(item, str):
                    lines.append(f"• {item}")

        lines.append("")  # blank line between sections
    print("lines ",lines)
    return "\n".join(lines)