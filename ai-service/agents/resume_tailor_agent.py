
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from typing import List, Dict, Any
import os
from dotenv import load_dotenv

load_dotenv()

# ── LLM setup ─────────────────────────────────────────────────────────────────
# temperature=0.1 — slight creativity for rewrites
# but professional and consistent output
from utils.llm_provider import get_llm
llm = get_llm(temperature=0.1)

# ─────────────────────────────────────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

# Schema for tracking each change made
# Frontend uses this to show diff view
class ResumeChange(BaseModel):
    section: str = Field(
        description="Section name that was changed"
    )
    original_text: str = Field(
        description="Original text before tailoring"
    )
    tailored_text: str = Field(
        description="Rewritten text after tailoring"
    )
    reason: str = Field(
        description="Why this specific change was made"
    )


# Schema for complete tailored output
# Uses dynamic dict — handles any sections from any resume
class TailoredResume(BaseModel):
    tailored_sections: Dict[str, Any] = Field(
        description="""
        Dynamic dictionary matching input sections exactly.
        Key = section name from input.
        Value = tailored content:
          string for paragraph sections (summary, objective)
          list of strings for bullet sections (experience, skills, projects)
        Preserve ALL sections from input — never drop any section.
        Keep placeholders like {{PROJECTS_LINK_0}} exactly as they are.
        Never modify or remove any placeholder.
        """
    )
    changes: List[ResumeChange] = Field(
        description="All changes made with reasons for diff view"
    )
    tailoring_summary: str = Field(
        description="2 sentence summary of what was changed and why"
    )


# ─────────────────────────────────────────────────────────────────────────────
# TAILORING PROMPT
# Most important prompt in entire project
# Defines exactly how 3 layer tailoring works
# ─────────────────────────────────────────────────────────────────────────────
tailor_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an expert resume writer and ATS optimization specialist.

YOUR JOB:
Tailor resume sections for a specific job using 3 layers.
Never fabricate any experience, skills, or achievements.

═══════════════════════════════════════════
LAYER 1 — KEYWORD LAYER
═══════════════════════════════════════════
Replace generic terms with JD-specific terminology.
Inject missing ATS keywords naturally where they fit.

Example:
  Before: "worked on web development projects"
  After:  "developed React applications with REST API integration"

Rules:
  Never stuff keywords awkwardly
  Every keyword must fit the context naturally
  Only inject where genuinely relevant

═══════════════════════════════════════════
LAYER 2 — IMPACT LAYER
═══════════════════════════════════════════
Rewrite weak bullets with strong action verbs.
Mirror exact language patterns from the JD.
Add quantification only if resume hints at scale.

Example:
  Before: "helped with backend tasks"
  After:  "engineered Node.js microservices handling high traffic"

Seniority-based action verbs:
  Junior  → Built, Developed, Implemented, Created
  Mid     → Engineered, Designed, Optimized, Delivered
  Senior  → Architected, Led, Drove, Established

Rules:
  Never invent numbers or metrics
  Only quantify if original has hints of scale
  Match action verb strength to seniority level

═══════════════════════════════════════════
LAYER 3 — CULTURE LAYER
═══════════════════════════════════════════
Adjust tone to match company culture.
Use company's own vocabulary from recent highlights.

Startup  → ownership, speed, shipping, impact
Corporate → process, collaboration, enterprise, scale
Product  → user impact, metrics, growth, iteration

Example (startup):
  Before: "was responsible for payment module"
  After:  "owned and shipped payment feature end to end"

═══════════════════════════════════════════
ABSOLUTE RULES — NEVER VIOLATE:
═══════════════════════════════════════════
1. NEVER invent experience, projects or skills
2. NEVER change company names, job titles or dates
3. NEVER modify or remove link placeholders like {{PROJECTS_LINK_0}}
4. NEVER drop any section — tailor ALL sections provided
5. NEVER change personal information
6. ONLY reframe what already exists using better language
7. Add gap skills to skills section with proficiency level tag"""),

    ("human", """Tailor ALL these resume sections for the following job:

═══════════════════════
RESUME SECTIONS TO TAILOR:
═══════════════════════
{sections_text}

═══════════════════════
JOB DESCRIPTION ANALYSIS:
═══════════════════════
Hard Skills Required: {hard_skills}
ATS Keywords: {ats_keywords}
Seniority Level: {seniority_level}
Role Summary: {role_summary}

═══════════════════════
COMPANY INTELLIGENCE:
═══════════════════════
Company: {company_name}
Culture Tone: {culture_tone}
Recent Highlights: {recent_highlights}
Current Challenges: {current_challenges}

═══════════════════════
SKILLS TO ADD (from skill gap agent):
═══════════════════════
{added_skills}

Apply all 3 layers to every section.
Keep all link placeholders exactly as they are.
Return ALL sections — never drop any.""")
])

# Connect prompt to structured LLM
tailor_chain = tailor_prompt | llm.with_structured_output(TailoredResume)


# ─────────────────────────────────────────────────────────────────────────────
# HELPER — Format sections for prompt
# ─────────────────────────────────────────────────────────────────────────────

def format_sections_for_prompt(sections: dict, section_order: list) -> str:
    """
    Converts sections dict into readable text for LLM prompt
    Preserves original section order
    Makes it clear to LLM what each section contains

    Example output:
      [SUMMARY]
      I am a software engineer...

      [EXPERIENCE]
      - Built web apps using React
      - Led team of 3 developers
    """
    formatted = []

    for section_name in section_order:
        content = sections.get(section_name)
        if not content:
            continue

        formatted.append(f"[{section_name.upper()}]")

        if isinstance(content, str):
            formatted.append(content)
        elif isinstance(content, list):
            for item in content:
                formatted.append(f"- {item}")

        formatted.append("")  # blank line between sections

    return "\n".join(formatted)


# ─────────────────────────────────────────────────────────────────────────────
# MAIN TAILORING FUNCTION
# ─────────────────────────────────────────────────────────────────────────────

def tailor_resume(
    sections: dict,
    section_order: list,
    jd_analysis: dict,
    company_intel: dict,
    added_skills: list
) -> dict:
    """
    Applies 3 layer tailoring to all resume sections.

    Inputs:
      sections      → masked sections from smart extractor
                      (links are placeholders like {{PROJECTS_LINK_0}})
      section_order → original order to preserve
      jd_analysis   → from Agent 1
      company_intel → from Agent 3
      added_skills  → from Agent 2

    Returns:
      tailored_sections → dict with all sections tailored
                          placeholders still intact (restored by Node.js)
      changes           → diff list for frontend
      tailoring_summary → 2 line explanation
    """
    print("Starting 3-layer resume tailoring...")

    # Format sections into readable text for LLM
    sections_text = format_sections_for_prompt(sections, section_order)

    # Format added skills for prompt
    # Shows LLM exactly which skills to add and at what level
    if added_skills:
        added_skills_text = ", ".join([
            f"{s.get('skill_name', '')} ({s.get('proficiency_level', 'Beginner')})"
            for s in added_skills
        ])
    else:
        added_skills_text = "None"

    # Run tailoring chain
    result = tailor_chain.invoke({
        "sections_text": sections_text,
        "hard_skills": ", ".join(jd_analysis.get("hard_skills", [])),
        "ats_keywords": ", ".join(jd_analysis.get("ats_keywords", [])),
        "seniority_level": jd_analysis.get("seniority_level", "Junior"),
        "role_summary": jd_analysis.get("role_summary", ""),
        "company_name": company_intel.get("company_name", ""),
        "culture_tone": company_intel.get("culture_tone", "startup"),
        "recent_highlights": ", ".join(
            company_intel.get("recent_highlights", [])
        ),
        "current_challenges": company_intel.get(
            "current_challenges", ""
        ),
        "added_skills": added_skills_text
    })

    print(f"Tailoring complete. {len(result.changes)} changes made.")
    return result.model_dump()