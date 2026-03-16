
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from typing import List
from utils.llm_provider import get_llm
import os
from dotenv import load_dotenv

load_dotenv()

# ── Structured output schema ──────────────────────────────
class JDAnalysis(BaseModel):
    hard_skills: List[str] = Field(description="Technical skills explicitly mentioned")
    soft_skills: List[str] = Field(description="Soft skills and personality traits")
    ats_keywords: List[str] = Field(description="Important keywords for ATS systems")
    seniority_level: str = Field(description="Junior / Mid / Senior / Lead")
    role_summary: str = Field(description="2 sentence summary of the role")
    experience_required: str = Field(description="Years of experience required")

# ── LLM setup ─────────────────────────────────────────────

llm = get_llm(temperature=0)

structured_llm = llm.with_structured_output(JDAnalysis)

# ── Prompt ────────────────────────────────────────────────
prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an expert technical recruiter with 10 years of experience.
Analyze the given job description and extract structured information accurately.
Be thorough with ATS keywords as they are critical for resume matching."""),
    ("human", "Analyze this job description:\n\n{jd_text}")
])

# ── Agent chain ───────────────────────────────────────────
jd_analyzer_chain = prompt | structured_llm

# ── Main function ─────────────────────────────────────────
def analyze_jd(jd_text: str) -> dict:
    result = jd_analyzer_chain.invoke({"jd_text": jd_text})
    return result.model_dump()