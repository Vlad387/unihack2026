from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# .env lives in the repo root (RULES.md section 5), not in backend/
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

app = FastAPI(title="CityMind API")

app.add_middleware(
    CORSMiddleware,
    # shortcut: open CORS for the hackathon; restrict to the frontend domain after deploy
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
