from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from utils.resume_parser import extract_text_from_pdf
from agents.jd_analyzer import analyze_jd
import uvicorn
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



if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)