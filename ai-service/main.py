from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from utils.resume_parser import extract_text_from_pdf
from agents.jd_analyzer import analyze_jd
import uvicorn
from agents.skill_gap_agent import explain_skill, calculate_match_percentage
from agents.company_intel_agent import get_company_intelligence
import os

app = FastAPI(title="CareerPilot AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Health check ──────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "CareerPilot AI service running ✅"}

# ── Resume parser ─────────────────────────────────────────
@app.post("/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        print(f"Received file: {file.filename}, size: {len(contents)} bytes")
        if len(contents) == 0:
            return {"error": "Empty file received"}
        text = extract_text_from_pdf(contents)
        return {"extracted_text": text}
    except Exception as e:
        print(f"Error: {e}")
        return {"error": str(e)}

# ── JD Analyzer ───────────────────────────────────────────
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



#skill extractor from resume

class ResumeTextRequest(BaseModel):
    resume_text: str

@app.post("/extract-skills")
async def extract_skills(request: ResumeTextRequest):
    try:
        from langchain_groq import ChatGroq
        from langchain_core.prompts import ChatPromptTemplate
        from pydantic import BaseModel as PydanticModel, Field
        from typing import List

        class SkillList(PydanticModel):
            skills: List[str] = Field(
                description="All technical skills found in the resume"
            )

        llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key= os.getenv("GROQ_API_KEY"),
            temperature=0
        )

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


# ── Quick Skills Addition Route ───────────────────────────────────────────────
# Called when user chooses "Let me add them myself" option
# Shows all gap skills at once with level selector
# No conversation needed — user fills everything in one shot
class QuickSkillsRequest(BaseModel):
    gap_skills: list        # All missing skills from JD
    jd_skills: list         # All JD skills for match calculation
    resume_skills: list     # Skills user already has

@app.post("/quick-skills-summary")
async def quick_skills_summary(request: QuickSkillsRequest):
    """
    Returns gap skills formatted for quick selection UI
    User can select level for each or skip individual skills
    No AI explanation involved — pure speed
    """
    try:
        # Format each gap skill for frontend display
        formatted_skills = []
        for skill in request.gap_skills:
            formatted_skills.append({
                "skill_name": skill,
                "levels": ["Beginner", "Intermediate", "Advanced"],
                "selected_level": None,   # frontend fills this
                "add_to_resume": False    # frontend fills this
            })

        # Calculate current match before any additions
        match_before = calculate_match_percentage(
            request.jd_skills,
            request.resume_skills,
            []  # no added skills yet
        )

        return {
            "gap_skills": formatted_skills,
            "match_percentage_before": match_before["match_percentage_before"],
            "total_gap_count": len(request.gap_skills)
        }

    except Exception as e:
        print(f"Quick skills summary error: {e}")
        return {"error": str(e)}

# ── Match Percentage Route ────────────────────────────────────────────────────
# Called after skill gap conversation completes
# Shows user how much their profile improved
class MatchPercentageRequest(BaseModel):
    jd_skills: list        # Skills required by job
    resume_skills: list    # Skills user originally had
    added_skills: list     # Skills user added during conversation

@app.post("/calculate-match")
async def calculate_match_route(request: MatchPercentageRequest):
    """
    Calculates match percentage before and after skill gap conversation
    Shows improvement to motivate user
    """
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
    

# ── Company Intelligence Route ────────────────────────────────────────────────
# Accepts company name and role
# Runs web searches and returns structured company brief
# Feeds into resume tailor and cover letter agents later
class CompanyIntelRequest(BaseModel):
    company_name: str    # e.g. "Razorpay"
    role: str            # e.g. "Software Engineer"

@app.post("/company-intel")
async def company_intel_route(request: CompanyIntelRequest):
    """
    Researches company using Tavily web search
    Returns structured intelligence for resume tailoring
    """
    try:
        result = get_company_intelligence(request.company_name, request.role)
        return result
    except Exception as e:
        print(f"Company intel error: {e}")
        return {"error": str(e)}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)