from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
import os
from dotenv import load_dotenv

load_dotenv()

# ── LLM Setup ─────────────────────────────────────────────────────────────────
# Using temperature=0.3 for slight creativity in analogies
# but still keeping explanations accurate and consistent
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.3
)

# ── Schema for skill explanation output ───────────────────────────────────────
# Pydantic ensures LLM always returns data in exact format we need
class SkillExplanation(BaseModel):
    skill_name: str = Field(description="Name of the skill being explained")
    simple_explanation: str = Field(
        description="Simple 3-4 line explanation for a beginner"
    )
    real_world_analogy: str = Field(
        description="A relatable real world analogy specific to Indian context"
    )
    why_job_needs_it: str = Field(
        description="One line explaining why this specific job requires this skill"
    )
    simpler_explanation: str = Field(
        description="Even simpler 2 line fallback explanation if user is still confused"
    )

# ── Structured LLM that always returns SkillExplanation format ────────────────
structured_llm = llm.with_structured_output(SkillExplanation)

# ── Prompt template for skill explanation ─────────────────────────────────────
# System prompt sets the persona and context
# Human prompt passes the actual skill and job context
explanation_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are a friendly tech mentor explaining skills to a 
fresh engineering student in India. 
Your explanations are:
- Simple enough for a non-technical person to understand
- Use relatable Indian daily life analogies (Swiggy, UPI, IRCTC, etc.)
- Never use jargon without explaining it first
- Encouraging and positive in tone"""),
    ("human", """Explain this skill to a student who has never used it:
Skill: {skill_name}
Job Context: {job_context}

Make the analogy very relatable to Indian students.""")
])

# ── Chain: connects prompt → LLM → structured output ─────────────────────────
explanation_chain = explanation_prompt | structured_llm

# ── Main function to explain a skill ─────────────────────────────────────────
# Called once per gap skill in the conversation loop
def explain_skill(skill_name: str, job_context: str) -> dict:
    """
    Takes a skill name and job context
    Returns a structured explanation with analogy
    """
    result = explanation_chain.invoke({
        "skill_name": skill_name,
        "job_context": job_context
    })
    return result.model_dump()

# ── Match percentage calculator ───────────────────────────────────────────────
# Calculates how well resume matches JD after skill gap conversation
def calculate_match_percentage(
    jd_skills: list,
    resume_skills: list,
    added_skills: list
) -> dict:
    """
    jd_skills: skills required by job
    resume_skills: skills user already had
    added_skills: skills user added during conversation
    Returns before and after match percentages
    """

    # Convert all to lowercase for fair comparison
    jd_lower = [s.lower() for s in jd_skills]
    resume_lower = [s.lower() for s in resume_skills]
    added_lower = [s.lower() for s in added_skills]

    # Skills user had before this conversation
    matching_before = [s for s in jd_lower if s in resume_lower]

    # Skills user now has after conversation (original + newly added)
    all_skills_after = resume_lower + added_lower
    matching_after = [s for s in jd_lower if s in all_skills_after]

    # Calculate percentages
    total = len(jd_lower)
    percentage_before = round((len(matching_before) / total) * 100) if total > 0 else 0
    percentage_after = round((len(matching_after) / total) * 100) if total > 0 else 0

    return {
        "match_percentage_before": percentage_before,
        "match_percentage_after": percentage_after,
        "improvement": percentage_after - percentage_before
    }

