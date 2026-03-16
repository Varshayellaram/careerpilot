
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from tavily import TavilyClient
from typing import List
import os
from dotenv import load_dotenv

load_dotenv()

# ── Initialize clients ────────────────────────────────────────────────────────
# Tavily handles web search optimized for LLM use
# Much better than Google scraping for structured data retrieval
tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

# ── LLM for summarization ─────────────────────────────────────────────────────
from utils.llm_provider import get_llm
llm = get_llm(temperature=0.2)

# ── Schema for structured company intelligence output ─────────────────────────
# Every field here directly feeds into resume tailor and cover letter agents
class CompanyIntelligence(BaseModel):
    company_name: str = Field(description="Official company name")
    company_summary: str = Field(
        description="2-3 sentence overview of what the company does"
    )
    recent_highlights: List[str] = Field(
        description="3-5 recent news items, product launches, or achievements"
    )
    tech_stack: List[str] = Field(
        description="Technologies the company is known to use"
    )
    culture_tone: str = Field(
        description="One of: startup / corporate / product / service"
    )
    current_challenges: str = Field(
        description="Current business challenges or growth areas based on news"
    )
    why_good_place_to_work: str = Field(
        description="One sentence on why this company is attractive to candidates"
    )
    cover_letter_hook: str = Field(
        description="One powerful sentence referencing recent company news that can open a cover letter"
    )

# ── Structured LLM ────────────────────────────────────────────────────────────
structured_llm = llm.with_structured_output(CompanyIntelligence)

# ── Summarization prompt ──────────────────────────────────────────────────────
# Takes raw search results and converts to structured intelligence
summary_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an expert business analyst and career coach.
Analyze the provided search results about a company and extract 
structured intelligence that will help a job applicant:
1. Write a compelling cover letter
2. Tailor their resume to match company culture
3. Prepare for interviews with company knowledge

Always be factual. Only include information found in the search results.
If information is not available, say 'Not available'."""),
    ("human", """Company: {company_name}
Role applying for: {role}

Search Results:
{search_results}

Extract structured company intelligence from these results.""")
])

# ── Main chain ────────────────────────────────────────────────────────────────
intel_chain = summary_prompt | structured_llm


# ── Web search function ───────────────────────────────────────────────────────
# Runs multiple targeted searches to get comprehensive company data
# Each search focuses on a different aspect of the company
def search_company(company_name: str, role: str) -> str:
    """
    Runs 3 targeted searches about the company
    Combines results into one text block for LLM to analyze
    """
    all_results = []

    # Search 1 — Recent news and updates
    # Finds latest developments to reference in cover letter
    news_results = tavily.search(
        query=f"{company_name} latest news 2024 2025",
        max_results=3
    )
    for r in news_results.get("results", []):
        all_results.append(f"NEWS: {r['title']} - {r['content'][:300]}")

    # Search 2 — Tech stack and engineering culture
    # Helps tailor resume with right technical keywords
    tech_results = tavily.search(
        query=f"{company_name} tech stack engineering culture",
        max_results=3
    )
    for r in tech_results.get("results", []):
        all_results.append(f"TECH: {r['title']} - {r['content'][:300]}")

    # Search 3 — Role specific search
    # Finds what skills and experience this company values for this role
    role_results = tavily.search(
        query=f"{company_name} {role} team engineering blog",
        max_results=2
    )
    for r in role_results.get("results", []):
        all_results.append(f"ROLE: {r['title']} - {r['content'][:300]}")

    # Combine all search results into one text block
    return "\n\n".join(all_results)


# ── Main function ─────────────────────────────────────────────────────────────
# Called by FastAPI route — orchestrates search + analysis
def get_company_intelligence(company_name: str, role: str) -> dict:
    """
    Takes company name and role
    Returns comprehensive structured intelligence about the company
    """
    print(f"Searching for: {company_name} - {role}")

    # Step 1 — Search the web for company information
    raw_search_results = search_company(company_name, role)
    print(f"Search complete. Processing {len(raw_search_results)} characters...")

    # Step 2 — LLM analyzes search results and returns structured data
    result = intel_chain.invoke({
        "company_name": company_name,
        "role": role,
        "search_results": raw_search_results
    })

    print(f"Intelligence extracted for {company_name}")
    return result.model_dump()



"""
First — What Does Tavily Return?
When you call tavily.search() it returns a dictionary that looks like this:
python{
  "query": "Google latest news 2024 2025",
  "results": [
    {
      "title": "Google launches Gemini 2.0",
      "url": "https://blog.google/gemini...",
      "content": "Google has launched Gemini 2.0, a powerful AI model that outperforms previous versions in reasoning and coding tasks. The model is available to developers...",
      "score": 0.95
    },
    {
      "title": "Google Cloud revenue grows 28%",
      "url": "https://reuters.com/google...",
      "content": "Google Cloud reported strong quarterly earnings with 28% revenue growth driven by AI services adoption across enterprise customers...",
      "score": 0.87
    },
    {
      "title": "Google acquires AI startup",
      "url": "https://techcrunch.com/...",
      "content": "Google has acquired an AI startup specializing in robotics for an estimated $500 million to strengthen its hardware division...",
      "score": 0.82
    }
  ]
}

Line 1: news_results.get("results", [])
pythonfor r in news_results.get("results", []):
Break this into two parts:
.get("results", [])
This is a safe way to access a dictionary key:
python# Unsafe way
news_results["results"]  
# if "results" key missing → crashes with KeyError ❌

# Safe way
news_results.get("results", [])
# if "results" key missing → returns [] instead ✅
# never crashes
```

The `[]` is the **default value** — if Tavily returns nothing or something unexpected — you get an empty list instead of a crash.

**`for r in ...`**

Loops through each result in the list:
```
Loop 1 → r = first result  (Google Gemini news)
Loop 2 → r = second result (Google Cloud earnings)
Loop 3 → r = third result  (Google acquisition)
Each r is one search result dictionary:
pythonr = {
  "title": "Google launches Gemini 2.0",
  "url": "https://...",
  "content": "Google has launched Gemini 2.0...",
  "score": 0.95
}

Line 2: all_results.append(...)
pythonall_results.append(f"NEWS: {r['title']} - {r['content'][:300]}")
"""