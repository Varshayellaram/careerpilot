import os
from dotenv import load_dotenv

load_dotenv()

def get_llm(temperature=0):
    """
    Returns LLM based on environment settings.
    USE_GEMINI=false → Groq (fastest)
    USE_GEMINI=true  → Gemini (unlimited tokens)
    
    Switch providers by changing USE_GEMINI in .env
    No code changes needed anywhere else
    """
    use_gemini = os.getenv("USE_GEMINI", "false").lower() == "true"
    groq_key = os.getenv("GROQ_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")

    if not use_gemini and groq_key:
        from langchain_groq import ChatGroq
        print(f"Using Groq LLM (temperature={temperature})")
        return ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=groq_key,
            temperature=temperature
        )

    if gemini_key:
        from langchain_google_genai import ChatGoogleGenerativeAI
        print(f"Using Gemini LLM (temperature={temperature})")
        return ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=gemini_key,
            temperature=temperature
        )

    raise Exception(
        "No LLM available. Set GROQ_API_KEY or GEMINI_API_KEY in .env"
    )
