"""
AIStoryCast — minimal API (reader seed, no database).

Run from repo root:
  cd backend && uvicorn main:app --reload --host 127.0.0.1 --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AIStoryCast API", version="0.1.0")

# Local Vite dev server + preview; extend when you deploy a staging URL.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)

# Public-domain sample; paragraphs lightly trimmed for a compact API payload.
ALICE_CHAPTER_1_DEMO = {
    "book": {
        "title": "Alice's Adventures in Wonderland",
        "author": "Lewis Carroll",
    },
    "chapter": {
        "id": "chapter-1",
        "title": "Down the Rabbit-Hole",
        "chapterNumberLabel": "Chapter I",
    },
    "paragraphs": [
        (
            "Alice was beginning to get very tired of sitting by her sister on the bank, "
            "and of having nothing to do. She peeped into her sister's book, but it had no "
            'pictures or conversations. "What is the use of a book," thought Alice, '
            '"without pictures or conversations?"'
        ),
        (
            "She wondered whether making a daisy-chain would be worth the trouble of getting "
            "up, when a White Rabbit with pink eyes ran close by her."
        ),
        (
            'The Rabbit muttered, "Oh dear! Oh dear! I shall be late!" then pulled a watch '
            "from its waistcoat-pocket and hurried on. Alice ran after it, burning with curiosity."
        ),
    ],
    "voiceRecommendations": {
        "narrator": (
            "Warm, clear storyteller voice; unhurried pacing with gentle emphasis on "
            "Alice's thoughts."
        ),
        "alice": (
            "Light, curious tone - youthful but not cartoonish; slightly quicker when she "
            "chases the Rabbit."
        ),
        "whiteRabbit": (
            "Tight, anxious energy; clipped consonants; a touch of fussy politeness "
            "under stress."
        ),
    },
    "evolvingFeaturesNote": (
        "Full chapter audio, narrator casting, and synced text highlighting are evolving "
        "features. This payload is static reader copy for integration tests; not yet wired "
        "to playback or timings."
    ),
}


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.get("/api/demo/alice")
def demo_alice() -> dict:
    """Curated Alice Chapter I slice for the first API-driven reader experience."""
    return ALICE_CHAPTER_1_DEMO
