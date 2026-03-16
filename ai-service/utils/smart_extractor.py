import re

from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from typing import List, Any
import os
from dotenv import load_dotenv

load_dotenv()

# ── LLM setup ─────────────────────────────────────────────────────────────────
# temperature=0 — extraction must be precise every time
# no creativity needed here — just accurate parsing
from utils.llm_provider import get_llm
llm = get_llm(temperature=0)

# ── URL pattern ───────────────────────────────────────────────────────────────
# Matches all common URL formats found in resumes
# Handles: http/https, www, github, linkedin, custom domains
URL_PATTERN = re.compile(
    r'(https?://[^\s]+|www\.[^\s]+|github\.com/[^\s]+'
    r'|linkedin\.com/[^\s]+|[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}/[^\s]*)',
    re.IGNORECASE
)

# ─────────────────────────────────────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

# Schema 1 — Personal Info
# These fields are LOCKED — never sent to LLM for tailoring
# Placed at top of final PDF exactly as extracted
class PersonalInfo(BaseModel):
    full_name: str = Field(
        description="Full name of candidate. Empty string if not found"
    )
    email: str = Field(
        description="Email address. Empty string if not found"
    )
    phone: str = Field(
        description="Phone number with country code. Empty string if not found"
    )
    location: str = Field(
        description="City, state or full address. Empty string if not found"
    )
    linkedin: str = Field(
        description="LinkedIn URL or username. Empty string if not found"
    )
    github: str = Field(
        description="GitHub URL or username. Empty string if not found"
    )
    portfolio: str = Field(
        description="Portfolio or personal website URL. Empty string if not found"
    )


# Schema 2 — One resume section
# Dynamically detected — whatever THIS resume has
class ResumeSection(BaseModel):
    section_name: str = Field(
        description="Exact section name as it appears in resume"
    )
    content: Any = Field(
        description="""
        String for paragraph sections like summary or objective.
        List of strings for bullet sections like experience,
        skills, projects, education, certifications.
        Extract content EXACTLY as written — never modify or summarize.
        """
    )


# Schema 3 — Complete extracted resume
class ExtractedResume(BaseModel):
    personal_info: PersonalInfo = Field(
        description="All personal contact information found in resume"
    )
    sections: List[ResumeSection] = Field(
        description="All resume sections in exact order they appear"
    )
    section_order: List[str] = Field(
        description="Section names in exact order they appear in resume"
    )


# ─────────────────────────────────────────────────────────────────────────────
# EXTRACTION PROMPT
# ─────────────────────────────────────────────────────────────────────────────
extraction_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are a precise resume parser.

YOUR JOB:
Extract and structure resume content with 100% accuracy.

STRICT RULES:
1. Extract personal info separately
   name, email, phone, location, linkedin, github, portfolio
2. Detect ALL sections dynamically
   Only extract sections that actually exist in this resume
   Never assume or add sections that are not present
3. Preserve section order exactly as in original
4. For paragraph sections (summary, objective) return as string
5. For list sections (experience, skills, projects,
   education, certifications, achievements) return as list of strings
6. Keep each bullet point as one complete string
7. Extract content EXACTLY as written
   Never modify, summarize or paraphrase anything
8. Never include personal info URLs inside sections
9. Never include the section heading text in the content"""),

    ("human", """Parse this resume completely and accurately:

{resume_text}

Extract all personal info and all sections exactly as they appear.""")
])

# Connect prompt to structured LLM output
extraction_chain = extraction_prompt | llm.with_structured_output(ExtractedResume)


# ─────────────────────────────────────────────────────────────────────────────
# LINK TAGGING SYSTEM
# Tags every URL with which section it belongs to
# ─────────────────────────────────────────────────────────────────────────────

def tag_and_mask_links(sections: List[ResumeSection]) -> tuple:
    """
    Scans every section for URLs
    Tags each URL with its section name
    Replaces URL with placeholder in content

    Example:
      projects section: "CareerPilot github.com/rahul/cp"
      becomes:          "CareerPilot {{PROJECTS_LINK_0}}"

      registry: {
        "{{PROJECTS_LINK_0}}": {
          "url": "github.com/rahul/cp",
          "section": "projects",
          "index": 0
        }
      }
    """
    link_registry = {}
    masked_sections = []
    counter = 0

    for section in sections:
        section_name = section.section_name
        content = section.content

        if isinstance(content, str):
            # Paragraph section — mask links in the full string
            masked_content, counter = _mask_text(
                content, section_name, link_registry, counter
            )
            masked_sections.append({
                "section_name": section_name,
                "content": masked_content
            })

        elif isinstance(content, list):
            # List section — mask links in each bullet individually
            masked_list = []
            for item in content:
                if isinstance(item, str):
                    masked_item, counter = _mask_text(
                        item, section_name, link_registry, counter
                    )
                    masked_list.append(masked_item)
                else:
                    masked_list.append(item)
            masked_sections.append({
                "section_name": section_name,
                "content": masked_list
            })

        else:
            # Unknown type — keep as is
            masked_sections.append({
                "section_name": section_name,
                "content": content
            })

    return masked_sections, link_registry


def _mask_text(
    text: str,
    section_name: str,
    link_registry: dict,
    counter: int
) -> tuple:
    """
    Internal helper
    Masks all URLs in a single string
    Creates section-aware placeholder tags

    Example:
      section_name = "projects", counter = 0
      URL → {{PROJECTS_LINK_0}}

      section_name = "certifications", counter = 1
      URL → {{CERTIFICATIONS_LINK_1}}
    """
    def replace_url(match):
        nonlocal counter
        url = match.group(0)

        # Tag uses UPPERCASE section name + index
        # Makes placeholder clearly visible and traceable
        section_tag = section_name.upper().replace(" ", "_")
        placeholder = f"{{{{{section_tag}_LINK_{counter}}}}}"

        # Store full context so we know exactly where this link came from
        link_registry[placeholder] = {
            "url": url,
            "section": section_name,
            "index": counter
        }
        counter += 1
        return placeholder

    masked = URL_PATTERN.sub(replace_url, text)
    return masked, counter


# ─────────────────────────────────────────────────────────────────────────────
# LINK RESTORATION
# Restores all placeholders back to real URLs after tailoring
# ─────────────────────────────────────────────────────────────────────────────

def restore_links(tailored_sections: dict, link_registry: dict) -> dict:
    """
    Replaces all placeholders with original URLs
    Called after Agent 4 tailoring completes
    Works on both string and list sections

    Example:
      "CareerPilot {{PROJECTS_LINK_0}}"
      becomes:
      "CareerPilot github.com/rahul/careerpilot"
    """
    if not link_registry:
        # No links in this resume — return as is
        return tailored_sections

    restored = {}

    for section_name, content in tailored_sections.items():

        if isinstance(content, str):
            # Restore links in paragraph section
            restored_text = content
            for placeholder, link_data in link_registry.items():
                restored_text = restored_text.replace(
                    placeholder,
                    link_data["url"]
                )
            restored[section_name] = restored_text

        elif isinstance(content, list):
            # Restore links in each bullet point
            restored_list = []
            for item in content:
                if isinstance(item, str):
                    restored_item = item
                    for placeholder, link_data in link_registry.items():
                        restored_item = restored_item.replace(
                            placeholder,
                            link_data["url"]
                        )
                    restored_list.append(restored_item)
                else:
                    restored_list.append(item)
            restored[section_name] = restored_list

        else:
            restored[section_name] = content

    return restored


# ─────────────────────────────────────────────────────────────────────────────
# MAIN FUNCTION
# Entry point called by FastAPI route
# ─────────────────────────────────────────────────────────────────────────────

def structure_from_text(raw_text: str) -> dict:
    """
    Takes raw resume text already extracted from PDF
    Runs LLM to detect and structure all sections dynamically
    Tags and masks all URLs with section-aware placeholders

    Called when user starts tailoring pipeline
    Not called on every upload — only when needed

    Returns:
    {
      personal_info: {...},       locked — never tailored
      sections: {...},            tailorable — links masked
      section_order: [...],       original order preserved
      link_registry: {...}        locked — restored after tailoring
    }
    """

    # Step 1 — LLM detects all sections dynamically
    print("Detecting sections from raw text...")
    extracted = extraction_chain.invoke({"resume_text": raw_text})
    print(f"Detected {len(extracted.sections)} sections: {extracted.section_order}")

    # Step 2 — Tag and mask all links with section context
    print("Tagging and masking links by section...")
    masked_sections, link_registry = tag_and_mask_links(extracted.sections)
    print(f"Tagged {len(link_registry)} links")

    # Build clean sections dict
    # Key = section name, Value = masked content
    sections_dict = {}
    for section in masked_sections:
        sections_dict[section["section_name"]] = section["content"]

    print("Smart extraction complete")

    return {
        "personal_info": extracted.personal_info.model_dump(),
        "sections": sections_dict,
        "section_order": extracted.section_order,
        "link_registry": link_registry
    }