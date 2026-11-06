import logging
import os
import json
import httpx
from .models import ProductCard
from .ws_manager import send_log

OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
MODEL_VISION = os.getenv("OLLAMA_MODEL", "llava-phi3")
MODEL_TEXT = "llama3.2:1b"
log = logging.getLogger(__name__)

SYSTEM_GENERATE = (
    "You are a professional e-commerce copywriter. "
    "Your task is to write a product description for the GARMENT shown in the image. "
    "CRITICAL RULE: DO NOT describe the model, the person, their body parts, face, or pose. ONLY describe the clothing item. "
    "Return STRICTLY a valid JSON object without markdown. "
    "Rules: "
    "1. Focus ONLY on the garment's fabric, cut, style, and color. "
    "2. Write a highly detailed description (AT LEAST 40 WORDS). "
    "3. MANDATORY: You MUST generate at least 3 bullet points, 5 tags, and 5 seo_keywords. "
    "4. CRITICAL COLOR RULE: Use simple base colors. NEVER use adjectives like 'Vibrant' or 'Elegant'. "
    "5. CRITICAL LOGO RULE: IGNORE any text, brand names, watermarks, or logos. "
    "6. BRAND RULE: ONLY set 'brand' if explicitly in user text. If missing, put 'Unknown'. "
    "7. CRITICAL MATERIAL & SIZE RULE: You CANNOT determine fabric or size from an image. "
    "8. MARKETING RULE: DO NOT use the words 'Luxurious', 'Luxury', 'Elegant', or 'High-quality'. "
)

SYSTEM_ENHANCE = (
    "You are an expert e-commerce editor. "
    "You will receive a product card JSON and updated attributes. "
    "Your task is to AGGRESSIVELY REWRITE the creative fields based on the updated attributes. "
    "Return the COMPLETE updated JSON card. "
    "Rules: "
    "1. TITLE: Update to feature the new brand. If brand is 'Unknown', DO NOT write the word 'Unknown' in the title. "
    "2. DESCRIPTION: Rewrite from scratch (AT LEAST 40 WORDS) to highlight the new attributes. Focus ONLY on the garment. "
    "3. BULLETS: You MUST rewrite all bullets from scratch (max 5 words each). DO NOT copy the title into the bullets. "
    "4. MATERIAL: The 'material' field is the absolute truth. "
    "5. COLOR: Ensure the color field contains an objective base color. "
    "6. MARKETING RULE: DO NOT use the words 'Luxurious', 'Luxury', 'Elegant', or 'High-quality'. "
)

async def generate_card(input_text: str, image_b64: str | None = None, client_id: str | None = None) -> ProductCard:
    await send_log(client_id, "Analyzing image with Vision Model...")
    content = input_text
    if not content.strip() and image_b64:
        content = "Analyze the product in this image and create a perfect e-commerce card for it."
    user_message = {"role": "user", "content": content}
    if image_b64:
        user_message["images"] = [image_b64]
    payload = {
        "model": MODEL_VISION,
        "messages": [{"role": "system", "content": SYSTEM_GENERATE}, user_message],
        "stream": False,
        "format": ProductCard.model_json_schema(),
        "options": {"temperature": 0.1, "num_ctx": 2048, "num_predict": 512, "repeat_penalty": 1.2, "repeat_last_n": 64, "keep_alive": "10m"},
    }
    async with httpx.AsyncClient(timeout=300.0) as client:
        r = await client.post(OLLAMA_URL + "/api/chat", json=payload)
        r.raise_for_status()
        content = r.json()["message"]["content"]
    await send_log(client_id, "Parsing JSON output...")
    try:
        return ProductCard.model_validate_json(content)
    except Exception as e:
        log.warning("Failed to parse JSON: %s", e)
        raise RuntimeError("Ollama returned invalid JSON. Please try again.")

async def enhance_card(card: ProductCard, image_b64: str | None = None, client_id: str | None = None) -> ProductCard:
    await send_log(client_id, "Rewriting text with Fast Text Model...")
    card_json = card.model_dump_json(indent=2)
    focus_msg = f"The user updated the brand to '{card.brand}' and material to '{card.material}'. Rewrite the title, description, and ALL bullets from scratch to match these. "
    user_msg = f"Here is the current card: {card_json}\n\n{focus_msg}"
    payload = {
        "model": MODEL_TEXT,
        "messages": [{"role": "system", "content": SYSTEM_ENHANCE}, {"role": "user", "content": user_msg}],
        "stream": False,
        "format": ProductCard.model_json_schema(),
        "options": {"temperature": 0.1, "num_ctx": 2048, "num_predict": 512, "repeat_penalty": 1.2, "repeat_last_n": 64, "keep_alive": "10m"},
    }
    async with httpx.AsyncClient(timeout=300.0) as client:
        r = await client.post(OLLAMA_URL + "/api/chat", json=payload)
        r.raise_for_status()
        content = r.json()["message"]["content"]
    await send_log(client_id, "Parsing JSON output...")
    try:
        new_card = ProductCard.model_validate_json(content)
        new_card.brand = card.brand
        new_card.manufacturer = card.manufacturer
        new_card.category = card.category
        new_card.gender = card.gender
        new_card.material = card.material
        new_card.country_of_origin = card.country_of_origin
        new_card.size = card.size
        new_card.size_system = card.size_system
        new_card.color = card.color
        new_card.gallery_images = card.gallery_images
        return new_card
    except Exception as e:
        log.warning("Failed to parse JSON: %s", e)
        raise RuntimeError("Ollama returned invalid JSON. Please try again.")