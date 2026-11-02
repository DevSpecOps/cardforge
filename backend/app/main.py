import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import db
from .llm import generate_card
from .models import GenerateRequest, GenerateResponse, ProductCard

logging.basicConfig(level=logging.INFO)
app = FastAPI(title="CardForge API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    db.init_db()


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/cards/generate", response_model=GenerateResponse)
async def gen(req: GenerateRequest) -> GenerateResponse:
    try:
        card = await generate_card(req.input_text)
    except Exception as e:
        raise HTTPException(status_code=502, detail="LLM error: " + str(e))
    card_id = db.save_card(req.input_text, card.model_dump())
    return GenerateResponse(id=card_id, card=card)


@app.get("/api/cards")
def cards() -> list[dict]:
    return db.list_cards()


@app.get("/api/cards/{card_id}")
def card_detail(card_id: int) -> dict:
    card = db.get_card(card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Not found")
    return card


@app.patch("/api/cards/{card_id}")
def patch_card(card_id: int, body: ProductCard) -> dict:
    if not db.get_card(card_id):
        raise HTTPException(status_code=404, detail="Not found")
    db.update_card(card_id, body.model_dump())
    return {"status": "updated"}