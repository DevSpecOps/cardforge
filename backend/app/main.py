import base64
import io
import logging
import os

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from PIL import Image

from . import db
from .llm import generate_card, enhance_card
from .models import GenerateResponse, ProductCard

logging.basicConfig(level=logging.INFO)
app = FastAPI(title="CardForge API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FILE_SIZE = 20 * 1024 * 1024
IMAGE_DIR = os.getenv("IMAGE_DIR", "data/images")
os.makedirs(IMAGE_DIR, exist_ok=True)
app.mount("/api/images", StaticFiles(directory=IMAGE_DIR), name="images")

def enforce_business_rules(card: ProductCard, user_text: str = "") -> ProductCard:
    mat = card.material.lower()
    if "silk" in mat:
        card.care = "Dry clean only, do not bleach, iron low."
    elif "wool" in mat:
        card.care = "Dry clean or hand wash cold, do not tumble dry."
    elif "cotton" in mat:
        card.care = "Machine wash cold, tumble dry low, iron medium."
    elif "polyester" in mat:
        card.care = "Machine wash warm, tumble dry low, do not iron."
    elif "leather" in mat:
        card.care = "Professional leather clean only."
    elif "velvet" in mat:
        card.care = "Dry clean only."
    else:
        if not card.care or card.care == "Unknown":
            card.care = "Unknown"

    if not user_text.strip():
        card.brand = "Unknown"
        card.manufacturer = "Unknown"
        
    return card

@app.on_event("startup")
def _startup() -> None:
    db.init_db()

@app.get("/health")
def health() -> dict:
    return {"status": "ok"}

@app.post("/api/cards/generate", response_model=GenerateResponse)
async def gen(input_text: str = Form(None), image: UploadFile = File(None)) -> GenerateResponse:
    text = input_text or ""
    if not text.strip() and not image:
        raise HTTPException(status_code=400, detail="Need text or image")

    image_b64 = None
    img_bytes = None
    if image:
        contents = await image.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="Image too large. Max size is 20MB.")
        try:
            img = Image.open(io.BytesIO(contents))
            if img.mode != "RGB":
                img = img.convert("RGB")
            out = io.BytesIO()
            img.save(out, format="JPEG", quality=85, optimize=True)
            img_bytes = out.getvalue()
            image_b64 = base64.b64encode(img_bytes).decode("utf-8")
        except Exception as e:
            raise HTTPException(status_code=400, detail="Invalid image file. " + str(e))

    try:
        card = await generate_card(text, image_b64)
        card = enforce_business_rules(card, text)
    except Exception as e:
        raise HTTPException(status_code=502, detail="LLM error: " + str(e))
        
    card_id = db.save_card(text, card.model_dump())
    
    if img_bytes:
        with open(os.path.join(IMAGE_DIR, f"{card_id}.jpg"), "wb") as f:
            f.write(img_bytes)

    return GenerateResponse(id=card_id, card=card)

@app.post("/api/cards/{card_id}/enhance", response_model=ProductCard)
async def enhance(card_id: int, body: ProductCard) -> ProductCard:
    if not db.get_card(card_id):
        raise HTTPException(status_code=404, detail="Not found")
    
    image_b64 = None
    img_path = os.path.join(IMAGE_DIR, f"{card_id}.jpg")
    if os.path.exists(img_path):
        with open(img_path, "rb") as f:
            image_b64 = base64.b64encode(f.read()).decode("utf-8")

    try:
        new_card = await enhance_card(body, image_b64)
        new_card = enforce_business_rules(new_card, body.title)
    except Exception as e:
        raise HTTPException(status_code=502, detail="LLM error: " + str(e))
        
    db.update_card(card_id, new_card.model_dump())
    return new_card

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

@app.delete("/api/cards/{card_id}")
def delete_card_endpoint(card_id: int) -> dict:
    if not db.get_card(card_id):
        raise HTTPException(status_code=404, detail="Not found")
    db.delete_card(card_id)
    img_path = os.path.join(IMAGE_DIR, f"{card_id}.jpg")
    if os.path.exists(img_path):
        os.remove(img_path)
    return {"status": "deleted"}