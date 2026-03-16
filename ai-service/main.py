from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Any, List
import base64
import os
import uvicorn

from utils.resume_parser import extract_text_from_pdf
from utils.smart_extractor import structure_from_text, restore_links
from utils.pdf_replicator import generate_replicated_pdf
from utils.plain_text_exporter import export_as_plain_text
from agents.jd_analyzer import analyze_jd
from agents.skill_gap_agent import explain_skill, calculate_match_percentage
from agents.company_intel_agent import get_company_intelligence
from agents.resume_tailor_agent import tailor_resume
from agents.ats_scorer_agent import score_resume, score_before_after

app = FastAPI(title="CareerPilot AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "CareerPilot AI service running ✅"}


# ── Resume upload parser (Week 1 — unchanged) ─────────────────────────────────
# Extracts raw text only — used by agents 1, 2, 3
@app.post("/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        print(f"Received: {file.filename} ({len(contents)} bytes)")
        if len(contents) == 0:
            return {"error": "Empty file received"}
        text = extract_text_from_pdf(contents)
        return {"extracted_text": text}
    except Exception as e:
        print(f"Error: {e}")
        return {"error": str(e)}


# ── Smart structure extractor (Agent 4 only) ──────────────────────────────────
# Called when tailoring pipeline starts
# Takes raw text already stored in DB
# Returns 3 clean blocks: personal info + sections + links
class StructuredExtractRequest(BaseModel):
    raw_text: str

@app.post("/extract-structured")
async def extract_structured(request: StructuredExtractRequest):
    """
    Detects sections dynamically from raw text
    Tags and masks all links with section context
    Returns structured data for Agent 4
    """
    try:
        result = structure_from_text(request.raw_text)
        return result
    except Exception as e:
        print(f"Structured extraction error: {e}")
        return {"error": str(e)}


# ── JD Analyzer (Agent 1 — unchanged) ────────────────────────────────────────
class JDRequest(BaseModel):
    jd_text: str

@app.post("/analyze-jd")
async def analyze_jd_route(request: JDRequest):
    try:
        result = analyze_jd(request.jd_text)
        return result
    except Exception as e:
        print(f"JD Analysis error: {e}")
        return {"error": str(e)}


# ── Skill explanation (Agent 2 — unchanged) ───────────────────────────────────
class SkillExplainRequest(BaseModel):
    skill_name: str
    job_context: str

@app.post("/explain-skill")
async def explain_skill_route(request: SkillExplainRequest):
    try:
        result = explain_skill(request.skill_name, request.job_context)
        return result
    except Exception as e:
        print(f"Skill explanation error: {e}")
        return {"error": str(e)}


# ── Match percentage (Agent 2 — unchanged) ────────────────────────────────────
class MatchPercentageRequest(BaseModel):
    jd_skills: list
    resume_skills: list
    added_skills: list

@app.post("/calculate-match")
async def calculate_match_route(request: MatchPercentageRequest):
    try:
        result = calculate_match_percentage(
            request.jd_skills,
            request.resume_skills,
            request.added_skills
        )
        return result
    except Exception as e:
        print(f"Match calculation error: {e}")
        return {"error": str(e)}


# ── Quick skills summary (Agent 2 — unchanged) ────────────────────────────────
class QuickSkillsRequest(BaseModel):
    gap_skills: list
    jd_skills: list
    resume_skills: list

@app.post("/quick-skills-summary")
async def quick_skills_summary(request: QuickSkillsRequest):
    try:
        formatted_skills = []
        for skill in request.gap_skills:
            formatted_skills.append({
                "skill_name": skill,
                "levels": ["Beginner", "Intermediate", "Advanced"],
                "selected_level": None,
                "add_to_resume": False
            })
        match_before = calculate_match_percentage(
            request.jd_skills,
            request.resume_skills,
            []
        )
        return {
            "gap_skills": formatted_skills,
            "match_percentage_before": match_before["match_percentage_before"],
            "total_gap_count": len(request.gap_skills)
        }
    except Exception as e:
        print(f"Quick skills summary error: {e}")
        return {"error": str(e)}


# ── Company intel (Agent 3 — unchanged) ───────────────────────────────────────
class CompanyIntelRequest(BaseModel):
    company_name: str
    role: str

@app.post("/company-intel")
async def company_intel_route(request: CompanyIntelRequest):
    try:
        result = get_company_intelligence(request.company_name, request.role)
        return result
    except Exception as e:
        print(f"Company intel error: {e}")
        return {"error": str(e)}


# ── Resume Tailor (Agent 4) ───────────────────────────────────────────────────
# Takes structured resume + all agent outputs
# Returns tailored sections with placeholders intact
class ResumeTailorRequest(BaseModel):
    sections: Any           # masked sections from smart extractor
    section_order: Any      # original order
    jd_analysis: Any        # from Agent 1
    company_intel: Any      # from Agent 3
    added_skills: Any       # from Agent 2

@app.post("/tailor-resume")
async def tailor_resume_route(request: ResumeTailorRequest):
    """
    Applies 3 layer tailoring to all resume sections.
    Never modifies personal info or link placeholders.
    Returns tailored sections ready for PDF or plain text export.
    """
    try:
        result = tailor_resume(
            sections=request.sections,
            section_order=request.section_order,
            jd_analysis=request.jd_analysis,
            company_intel=request.company_intel,
            added_skills=request.added_skills or []
        )
        return result
    except Exception as e:
        print(f"Resume tailor error: {e}")
        return {"error": str(e)}


# ── Generate PDF (Option A) ───────────────────────────────────────────────────
# Replicates original PDF layout with tailored content
class GeneratePDFRequest(BaseModel):
    personal_info: Any
    tailored_sections: Any      # links already restored
    section_order: Any
    original_pdf_base64: str    # original PDF for layout detection

@app.post("/generate-pdf")
async def generate_pdf_route(request: GeneratePDFRequest):
    """
    Generates PDF replicating original layout.
    Links must be restored before calling this.
    Returns base64 encoded PDF.
    """
    try:
        # Decode original PDF bytes for layout detection
        original_pdf_bytes = base64.b64decode(request.original_pdf_base64)

        pdf_bytes = generate_replicated_pdf(
            personal_info=request.personal_info,
            tailored_sections=request.tailored_sections,
            section_order=request.section_order,
            original_pdf_bytes=original_pdf_bytes
        )

        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')

        return {
            "pdf_base64": pdf_base64,
            "size_bytes": len(pdf_bytes)
        }
    except Exception as e:
        print(f"PDF generation error: {e}")
        return {"error": str(e)}


# ── Extract skills from resume text ───────────────────────────────────────────
# Used by JD skill gap calculator
# Extracts all technical skills from raw resume text
class ResumeTextRequest(BaseModel):
    resume_text: str

@app.post("/extract-skills")
async def extract_skills(request: ResumeTextRequest):
    try:
        
        from langchain_core.prompts import ChatPromptTemplate
        from pydantic import BaseModel as PydanticModel, Field
        from typing import List
        from utils.llm_provider import get_llm

        class SkillList(PydanticModel):
            skills: List[str] = Field(
                description="All technical skills found in the resume"
            )

        
        llm = get_llm(temperature=0)

        structured_llm = llm.with_structured_output(SkillList)

        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an expert resume parser. Extract all technical skills from the resume text. Return only skill names, no descriptions."),
            ("human", "Extract all technical skills from this resume:\n\n{resume_text}")
        ])

        chain = prompt | structured_llm
        result = chain.invoke({"resume_text": request.resume_text})
        return result.model_dump()

    except Exception as e:
        print(f"Skill extraction error: {e}")
        return {"error": str(e)}

# ── Generate Plain Text (Option B) ───────────────────────────────────────────
class GenerateTextRequest(BaseModel):
    personal_info: Any
    tailored_sections: Any      # links already restored
    section_order: Any

@app.post("/generate-text")
async def generate_text_route(request: GenerateTextRequest):
    """
    Returns tailored resume as formatted plain text.
    User can copy-paste into any job portal.
    """
    try:
        plain_text = export_as_plain_text(
            personal_info=request.personal_info,
            tailored_sections=request.tailored_sections,
            section_order=request.section_order
        )
        return {"plain_text": plain_text}
    except Exception as e:
        print(f"Plain text export error: {e}")
        return {"error": str(e)}
    

# ── ATS Scorer — Standalone ───────────────────────────────────────────────────
# Entry Point 1 — User uploads resume and pastes JD
# Returns complete ATS analysis without tailoring
class ATSScoreRequest(BaseModel):
    resume_text: str        # raw extracted resume text
    jd_analysis: Any        # from Agent 1 or direct JD analysis
    personal_info: Any      # extracted personal info
    sections_detected: Any  # detected section names

@app.post("/score-resume")
async def score_resume_route(request: ATSScoreRequest):
    """
    Standalone ATS scorer.
    User can check score without going through full pipeline.
    """
    try:
        result = score_resume(
            resume_text=request.resume_text,
            jd_analysis=request.jd_analysis,
            personal_info=request.personal_info or {},
            sections_detected=request.sections_detected or []
        )
        return result
    except Exception as e:
        print(f"ATS scoring error: {e}")
        return {"error": str(e)}


# ── ATS Scorer — Before/After Comparison ─────────────────────────────────────
# Entry Point 2 — Called automatically after Agent 4
# Scores both original and tailored resume
# Shows improvement to user
class ATSCompareRequest(BaseModel):
    original_resume_text: str    # raw text of original resume
    tailored_resume_text: str    # plain text of tailored resume
    jd_analysis: Any             # from Agent 1
    personal_info: Any           # from smart extractor
    sections_detected: Any       # detected sections

@app.post("/score-before-after")
async def score_before_after_route(request: ATSCompareRequest):
    """
    Scores both original and tailored resume.
    Returns before/after comparison with improvement.
    Called automatically at end of tailoring pipeline.
    """
    try:
        result = score_before_after(
            original_resume_text=request.original_resume_text,
            tailored_resume_text=request.tailored_resume_text,
            jd_analysis=request.jd_analysis,
            personal_info=request.personal_info or {},
            sections_detected=request.sections_detected or []
        )
        return result
    except Exception as e:
        print(f"ATS comparison error: {e}")
        return {"error": str(e)}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)