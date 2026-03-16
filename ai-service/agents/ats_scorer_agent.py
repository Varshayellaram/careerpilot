
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from typing import List, Dict, Any
import os
import re
from dotenv import load_dotenv

load_dotenv()

# ── LLM setup ─────────────────────────────────────────────────────────────────
# temperature=0 — scoring must be consistent and precise
from utils.llm_provider import get_llm
llm = get_llm(temperature=0)

# ─────────────────────────────────────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

# Schema for individual fix recommendation
class ATSFix(BaseModel):
    issue: str = Field(description="What is missing or weak")
    suggestion: str = Field(description="Exactly how to fix it")
    impact: int = Field(description="How many points this fix would add (1-15)")
    priority: str = Field(description="High / Medium / Low")

# Schema for content quality analysis
# LLM analyzes this — cannot be calculated algorithmically
class ContentQuality(BaseModel):
    action_verb_score: int = Field(
        description="Score 0-15 for strength of action verbs in experience bullets"
    )
    quantification_score: int = Field(
        description="Score 0-10 for presence of numbers, percentages, scale"
    )
    seniority_match_score: int = Field(
        description="Score 0-5 for how well language matches required seniority"
    )
    action_verb_feedback: str = Field(
        description="One line feedback on action verbs"
    )
    quantification_feedback: str = Field(
        description="One line feedback on quantification"
    )
    seniority_feedback: str = Field(
        description="One line feedback on seniority match"
    )

# Schema for complete ATS score output
class ATSScore(BaseModel):
    # Category scores
    keyword_score: int = Field(description="Score out of 40")
    structure_score: int = Field(description="Score out of 30")
    quality_score: int = Field(description="Score out of 30")
    total_score: int = Field(description="Total score out of 100")

    # Keyword breakdown
    hard_skills_found: List[str] = Field(
        description="Hard skills from JD found in resume"
    )
    hard_skills_missing: List[str] = Field(
        description="Hard skills from JD missing from resume"
    )
    ats_keywords_found: List[str] = Field(
        description="ATS keywords from JD found in resume"
    )
    ats_keywords_missing: List[str] = Field(
        description="ATS keywords from JD missing from resume"
    )

    # Structure breakdown
    sections_found: List[str] = Field(
        description="Standard sections detected in resume"
    )
    contact_info_present: bool = Field(
        description="Whether contact info is complete"
    )

    # Content quality
    content_quality: ContentQuality

    # What is working
    strengths: List[str] = Field(
        description="3-5 things the resume does well for this JD"
    )

    # Fix recommendations ranked by impact
    fixes: List[ATSFix] = Field(
        description="Ranked list of fixes to improve score"
    )

    # Summary
    score_summary: str = Field(
        description="2 sentence summary of overall ATS readiness"
    )


# ─────────────────────────────────────────────────────────────────────────────
# ALGORITHMIC SCORING
# These scores are calculated directly — no LLM needed
# Fast, consistent, and explainable
# ─────────────────────────────────────────────────────────────────────────────

def calculate_keyword_score(
    resume_text: str,
    hard_skills: list,
    ats_keywords: list,
    soft_skills: list
) -> dict:
    """
    Calculates keyword match score algorithmically.
    Converts resume text to lowercase for fair comparison.
    Uses word boundary matching to avoid partial matches.
    """
    resume_lower = resume_text.lower()

    # Hard skills scoring (max 20 points)
    hard_found = []
    hard_missing = []
    for skill in hard_skills:
        # Check if skill appears as a word in resume
        if skill.lower() in resume_lower:
            hard_found.append(skill)
        else:
            hard_missing.append(skill)

    hard_score = round(
        (len(hard_found) / len(hard_skills) * 20)
        if hard_skills else 20
    )

    # ATS keywords scoring (max 12 points)
    kw_found = []
    kw_missing = []
    for kw in ats_keywords:
        if kw.lower() in resume_lower:
            kw_found.append(kw)
        else:
            kw_missing.append(kw)

    kw_score = round(
        (len(kw_found) / len(ats_keywords) * 12)
        if ats_keywords else 12
    )

    # Soft skills scoring (max 8 points)
    soft_found = []
    for skill in soft_skills:
        if skill.lower() in resume_lower:
            soft_found.append(skill)

    soft_score = round(
        (len(soft_found) / len(soft_skills) * 8)
        if soft_skills else 4  # give half marks if no soft skills in JD
    )

    total_keyword_score = min(hard_score + kw_score + soft_score, 40)

    return {
        "keyword_score": total_keyword_score,
        "hard_found": hard_found,
        "hard_missing": hard_missing,
        "kw_found": kw_found,
        "kw_missing": kw_missing,
        "soft_found": soft_found
    }


def calculate_structure_score(
    resume_text: str,
    sections_detected: list,
    personal_info: dict,
    seniority_level: str
) -> dict:
    """
    Calculates structure score algorithmically.
    Checks for standard section names and contact info.
    """
    resume_lower = resume_text.lower()
    sections_lower = [s.lower() for s in sections_detected]

    # Standard sections scoring (max 15 points)
    standard_sections = {
        "experience": 5,         # most important
        "work experience": 5,    # alternate name
        "education": 4,          # very important
        "skills": 4,             # very important
        "technical skills": 4,   # alternate name
        "summary": 2,            # good to have
        "objective": 2,          # alternate name
        "projects": 3,           # important for juniors
        "certifications": 2,     # good to have
        "achievements": 2        # good to have
    }

    section_score = 0
    sections_found = []
    counted = set()  # avoid double counting experience/work experience

    for section, points in standard_sections.items():
        if section in sections_lower:
            # Avoid double counting experience and work experience
            base = section.replace("work ", "").replace("technical ", "")
            if base not in counted:
                section_score += points
                sections_found.append(section)
                counted.add(base)

    section_score = min(section_score, 15)

    # Required sections for seniority (max 10 points)
    required_score = 10  # start with full marks
    required_sections = ["experience", "education", "skills"]

    for req in required_sections:
        found = any(req in s for s in sections_lower)
        if not found:
            required_score -= 3  # deduct for missing required section

    required_score = max(required_score, 0)

    # Contact info scoring (max 5 points)
    contact_score = 0
    if personal_info.get("email"):
        contact_score += 2
    if personal_info.get("phone"):
        contact_score += 2
    if personal_info.get("linkedin"):
        contact_score += 1

    total_structure_score = min(
        section_score + required_score + contact_score,
        30
    )

    return {
        "structure_score": total_structure_score,
        "sections_found": sections_found,
        "contact_score": contact_score,
        "contact_complete": contact_score >= 4
    }


# ─────────────────────────────────────────────────────────────────────────────
# LLM SCORING — Content Quality
# Cannot be calculated algorithmically
# Needs language understanding
# ─────────────────────────────────────────────────────────────────────────────

quality_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an expert ATS analyst and resume coach.
Analyze the content quality of this resume for the given job.

Score these 3 dimensions:

1. ACTION VERB STRENGTH (0-15 points)
   15 = Every bullet uses strong verbs (engineered, architected, led)
   10 = Most bullets use decent verbs (built, developed, created)
   5  = Some bullets use weak verbs (helped, worked on, assisted)
   0  = No clear action verbs

2. QUANTIFICATION (0-10 points)
   10 = Multiple achievements with numbers/percentages/scale
   7  = Some quantification present
   3  = Vague scale hints but no real numbers
   0  = No quantification at all

3. SENIORITY MATCH (0-5 points)
   5  = Language perfectly matches required seniority level
   3  = Mostly matches with minor gaps
   0  = Clear mismatch in experience level language

Be strict but fair. Most resumes score 5-8 on quantification."""),

    ("human", """Resume Text:
{resume_text}

Required Seniority: {seniority_level}
Job Summary: {role_summary}

Analyze content quality and provide scores with feedback.""")
])

quality_chain = quality_prompt | llm.with_structured_output(ContentQuality)


# ─────────────────────────────────────────────────────────────────────────────
# FIX RECOMMENDATIONS
# LLM generates specific actionable fixes
# ─────────────────────────────────────────────────────────────────────────────

fixes_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an expert ATS optimization specialist.
Generate specific actionable fixes to improve this resume's ATS score.

Rules:
1. Each fix must be specific — not generic advice
2. Include exact keywords or phrases to add
3. Rank by impact — highest point gains first
4. Maximum 5 fixes
5. Only suggest fixes that are realistic given existing experience"""),

    ("human", """Resume Text:
{resume_text}

Missing Hard Skills: {missing_hard_skills}
Missing ATS Keywords: {missing_keywords}
Current Score Breakdown:
  Keywords: {keyword_score}/40
  Structure: {structure_score}/30
  Quality: {quality_score}/30
  Total: {total_score}/100

Job Description Summary: {role_summary}

Generate ranked fix recommendations.""")
])

class FixList(BaseModel):
    fixes: List[ATSFix]
    strengths: List[str] = Field(
        description="3-5 things resume does well for this specific JD"
    )

fixes_chain = fixes_prompt | llm.with_structured_output(FixList)


# ─────────────────────────────────────────────────────────────────────────────
# MAIN SCORING FUNCTION
# ─────────────────────────────────────────────────────────────────────────────

def score_resume(
    resume_text: str,
    jd_analysis: dict,
    personal_info: dict = None,
    sections_detected: list = None
) -> dict:
    """
    Complete ATS scoring pipeline.

    Step 1 → Algorithmic keyword scoring (fast, consistent)
    Step 2 → Algorithmic structure scoring (fast, consistent)
    Step 3 → LLM content quality scoring (needs language understanding)
    Step 4 → LLM fix recommendations (specific and actionable)
    Step 5 → Combine all scores into final result

    Returns complete ATS analysis with score, breakdown, and fixes.
    """

    print("Starting ATS scoring...")

    # Extract JD data
    hard_skills = jd_analysis.get("hard_skills", [])
    ats_keywords = jd_analysis.get("ats_keywords", [])
    soft_skills = jd_analysis.get("soft_skills", [])
    seniority_level = jd_analysis.get("seniority_level", "Junior")
    role_summary = jd_analysis.get("role_summary", "")

    # Default values
    if personal_info is None:
        personal_info = {}
    if sections_detected is None:
        sections_detected = []

    # ── Step 1: Keyword scoring ───────────────────────────────────────────────
    print("Step 1: Calculating keyword scores...")
    keyword_result = calculate_keyword_score(
        resume_text,
        hard_skills,
        ats_keywords,
        soft_skills
    )

    # ── Step 2: Structure scoring ─────────────────────────────────────────────
    print("Step 2: Calculating structure scores...")
    structure_result = calculate_structure_score(
        resume_text,
        sections_detected,
        personal_info,
        seniority_level
    )

    # ── Step 3: Content quality scoring (LLM) ────────────────────────────────
    print("Step 3: Analyzing content quality...")
    quality_result = quality_chain.invoke({
        "resume_text": resume_text[:3000],  # limit to avoid token overflow
        "seniority_level": seniority_level,
        "role_summary": role_summary
    })

    quality_score = min(
        quality_result.action_verb_score +
        quality_result.quantification_score +
        quality_result.seniority_match_score,
        30
    )

    # ── Step 4: Calculate total score ────────────────────────────────────────
    total_score = min(
        keyword_result["keyword_score"] +
        structure_result["structure_score"] +
        quality_score,
        100
    )

    print(f"Scores — Keywords: {keyword_result['keyword_score']}/40 | "
          f"Structure: {structure_result['structure_score']}/30 | "
          f"Quality: {quality_score}/30 | "
          f"Total: {total_score}/100")

    # ── Step 5: Generate fix recommendations (LLM) ───────────────────────────
    print("Step 4: Generating fix recommendations...")
    fixes_result = fixes_chain.invoke({
        "resume_text": resume_text[:3000],
        "missing_hard_skills": ", ".join(keyword_result["hard_missing"]),
        "missing_keywords": ", ".join(keyword_result["kw_missing"]),
        "keyword_score": keyword_result["keyword_score"],
        "structure_score": structure_result["structure_score"],
        "quality_score": quality_score,
        "total_score": total_score,
        "role_summary": role_summary
    })

    print("ATS scoring complete")

    return {
        # Overall score
        "total_score": total_score,

        # Category scores
        "keyword_score": keyword_result["keyword_score"],
        "structure_score": structure_result["structure_score"],
        "quality_score": quality_score,

        # Keyword breakdown
        "hard_skills_found": keyword_result["hard_found"],
        "hard_skills_missing": keyword_result["hard_missing"],
        "ats_keywords_found": keyword_result["kw_found"],
        "ats_keywords_missing": keyword_result["kw_missing"],

        # Structure breakdown
        "sections_found": structure_result["sections_found"],
        "contact_info_present": structure_result["contact_complete"],

        # Content quality
        "content_quality": quality_result.model_dump(),

        # Strengths and fixes
        "strengths": fixes_result.strengths,
        "fixes": [f.model_dump() for f in fixes_result.fixes],

        # Summary
        "score_summary": f"Your resume scores {total_score}/100 for this role. "
                        f"Keywords: {keyword_result['keyword_score']}/40, "
                        f"Structure: {structure_result['structure_score']}/30, "
                        f"Content Quality: {quality_score}/30."
    }


# ─────────────────────────────────────────────────────────────────────────────
# COMPARISON FUNCTION
# Used after tailoring — scores both original and tailored
# ─────────────────────────────────────────────────────────────────────────────

def score_before_after(
    original_resume_text: str,
    tailored_resume_text: str,
    jd_analysis: dict,
    personal_info: dict,
    sections_detected: list
) -> dict:
    """
    Scores both original and tailored resume.
    Returns before/after comparison.
    Called automatically after Agent 4 completes.
    """
    print("Scoring original resume...")
    original_score = score_resume(
        original_resume_text,
        jd_analysis,
        personal_info,
        sections_detected
    )

    print("Scoring tailored resume...")
    tailored_score = score_resume(
        tailored_resume_text,
        jd_analysis,
        personal_info,
        sections_detected
    )

    improvement = tailored_score["total_score"] - original_score["total_score"]

    return {
        "original": original_score,
        "tailored": tailored_score,
        "improvement": improvement,
        "improved": improvement > 0
    }