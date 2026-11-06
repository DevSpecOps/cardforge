import base64
import io
import logging
import os
import json

import httpx
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from PIL import Image

from . import db
from .llm import generate_card, enhance_card, OLLAMA_URL, MODEL_VISION
from .models import GenerateResponse, ProductCard
from .rules import validate_card
from .ws_manager import active_connections

logging.basicConfig(level=logging.INFO)
app = FastAPI(title="CardForge API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

MAX_FILE_SIZE = 20 * 1024 * 1024
IMAGE_DIR = os.getenv("IMAGE_DIR", "data/images")
os.makedirs(IMAGE_DIR, exist_ok=True)
app.mount("/api/images", StaticFiles(directory=IMAGE_DIR), name="images")

@app.websocket("/api/ws/logs/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    active_connections[client_id] = websocket
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if client_id in active_connections:
            del active_connections[client_id]

def save_image_file(contents: bytes, filename: str) -> str:
    try:
        img = Image.open(io.BytesIO(contents))
        if img.mode != "RGB":
            img = img.convert("RGB")
        out = io.BytesIO()
        img.save(out, format="JPEG", quality=85, optimize=True)
        with open(os.path.join(IMAGE_DIR, filename), "wb") as f:
            f.write(out.getvalue())
        return filename
    except Exception:
        return ""

@app.on_event("startup")
def _startup() -> None:
    db.init_db()

@app.get("/health")
def health() -> dict:
    return {"status": "ok"}

@app.get("/api/system/status")
async def system_status() -> dict:
    ollama_ok, ollama_error, model_loaded = False, None, False
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(OLLAMA_URL + "/api/tags")
            if r.status_code == 200:
                ollama_ok = True
                models = r.json().get("models", [])
                model_loaded = any(MODEL_VISION in m.get("name", "") for m in models)
    except Exception as e:
        ollama_error = repr(e)
    return {
        "ollama": "connected" if ollama_ok else "disconnected",
        "model": "loaded" if model_loaded else "missing",
        "model_name": MODEL_VISION,
        "error": ollama_error
    }

@app.post("/api/cards/generate", response_model=GenerateResponse)
async def gen(input_text: str = Form(None), image: UploadFile = File(None), gallery: list[UploadFile] = File(None), client_id: str = Form(None)) -> GenerateResponse:
    text = input_text or ""
    if not text.strip() and not image:
        raise HTTPException(status_code=400, detail="Need text or image")
    image_b64 = None
    if image:
        contents = await image.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="Image too large. Max size is 20MB.")
        img = Image.open(io.BytesIO(contents))
        if img.mode != "RGB": img = img.convert("RGB")
        img.thumbnail((512, 512), Image.Resampling.LANCZOS)
        out = io.BytesIO()
        img.save(out, format="JPEG", quality=85, optimize=True)
        image_b64 = base64.b64encode(out.getvalue()).decode("utf-8")
    try:
        card = await generate_card(text, image_b64, client_id)
        card = validate_card(card, text)
    except Exception as e:
        raise HTTPException(status_code=502, detail="LLM error: " + str(e))
    card_id = db.save_card(text, card.model_dump())
    if image:
        save_image_file(contents, f"{card_id}.jpg")
    gallery_files = []
    if gallery:
        for idx, g_file in enumerate(gallery):
            g_contents = await g_file.read()
            g_name = f"gallery_{card_id}_{idx}.jpg"
            if save_image_file(g_contents, g_name):
                gallery_files.append(g_name)
    card.gallery_images = gallery_files
    db.update_card(card_id, card.model_dump())
    return GenerateResponse(id=card_id, card=card)

@app.post("/api/cards/{card_id}/gallery", response_model=ProductCard)
async def upload_gallery(card_id: int, gallery: list[UploadFile] = File(...)):
    card_dict = db.get_card(card_id)
    if not card_dict:
        raise HTTPException(status_code=404, detail="Not found")
    card = ProductCard(**json.loads(card_dict["card_json"]))
    idx = len(card.gallery_images)
    for g_file in gallery:
        g_contents = await g_file.read()
        g_name = f"gallery_{card_id}_{idx}.jpg"
        if save_image_file(g_contents, g_name):
            card.gallery_images.append(g_name)
            idx += 1
    db.update_card(card_id, card.model_dump())
    return card

@app.delete("/api/cards/{card_id}/gallery/{filename}")
def delete_gallery_image(card_id: int, filename: str):
    card_dict = db.get_card(card_id)
    if not card_dict:
        raise HTTPException(status_code=404, detail="Not found")
    card = ProductCard(**json.loads(card_dict["card_json"]))
    if filename in card.gallery_images:
        card.gallery_images.remove(filename)
        db.update_card(card_id, card.model_dump())
        img_path = os.path.join(IMAGE_DIR, filename)
        if os.path.exists(img_path):
            os.remove(img_path)
    return {"status": "deleted"}

@app.post("/api/cards/{card_id}/enhance", response_model=ProductCard)
async def enhance(card_id: int, body: ProductCard, client_id: str = Query(None)) -> ProductCard:
    if not db.get_card(card_id):
        raise HTTPException(status_code=404, detail="Not found")
    try:
        new_card = await enhance_card(body, None, client_id)
        new_card.gallery_images = body.gallery_images
        new_card = validate_card(new_card, body.title)
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
    body = validate_card(body, body.title)
    db.update_card(card_id, body.model_dump())
    return {"status": "updated"}

@app.delete("/api/cards/{card_id}")
def delete_card_endpoint(card_id: int) -> dict:
    if not db.get_card(card_id):
        raise HTTPException(status_code=404, detail="Not found")
    db.delete_card(card_id)
    for f in os.listdir(IMAGE_DIR):
        if f.startswith(f"{card_id}.jpg") or f.startswith(f"gallery_{card_id}_"):
            os.remove(os.path.join(IMAGE_DIR, f))
    return {"status": "deleted"}