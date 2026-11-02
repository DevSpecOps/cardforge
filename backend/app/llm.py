import logging
import os

import httpx

from .models import ProductCard

OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
MODEL = os.getenv("OLLAMA_MODEL", "llava")
log = logging.getLogger(__name__)

SYSTEM_GENERATE = (
    "You are an expert e-commerce copywriter. "
    "Analyze the image and text. "
    "Return STRICTLY a valid JSON object without markdown. "
    "Schema: "
    '{"title": str, "description": str, "bullets": [str], '
    '"tags": [str], "seo_keywords": [str], '
    '"brand": str, "manufacturer": str, "category": str, "gender": str, '
    '"material": str, "care": str, "country_of_origin": str, '
    '"size": str, "color": str}. '
    "Rules: "
    "1. Write a highly detailed description (AT LEAST 40 WORDS). "
    "2. Short bullets (max 5 words). "
    "3. For 'care', put 'Unknown' (the system will handle it). "
    "4. For 'brand' and 'manufacturer', only use text input. If missing, put 'Unknown'. Do not invent."
)

SYSTEM_ENHANCE = (
    "You are an expert e-commerce editor. "
    "The user provided an existing card JSON with updated attributes (e.g., material). "
    "Your task is to rewrite the CREATIVE fields: title, description, bullets, tags, seo_keywords. "
    "Return the COMPLETE updated JSON card without markdown. "
    "Rules: "
    "1. Update the title to reflect the new material. "
    "2. Rewrite the description (AT LEAST 40 WORDS) to highlight the new attributes. "
    "3. Update bullets, tags, and SEO. "
    "4. DO NOT change brand, manufacturer, category, gender, country_of_origin, size, color, or material. Leave them exactly as they are. "
    "5. DO NOT worry about 'care'. Leave it as it is, the system will handle it."
)

async def generate_card(input_text: str, image_b64: str | None = None) -> ProductCard:
    content = input_text
    if not content.strip() and image_b64:
        content = "Analyze the product in this image and create a perfect e-commerce card for it."

    user_message = {"role": "user", "content": content}
    if image_b64:
        user_message["images"] = [image_b64]

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_GENERATE},
            user_message
        ],
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.3},
    }
    last_err = None
    for attempt in range(2):
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                r = await client.post(OLLAMA_URL + "/api/chat", json=payload)
                r.raise_for_status()
                content = r.json()["message"]["content"]
            return ProductCard.model_validate_json(content)
        except Exception as e:
            last_err = e
            log.warning("LLM attempt %s failed: %s", attempt + 1, e)
    raise RuntimeError("LLM failed after retries: " + str(last_err))


async def enhance_card(card: ProductCard, image_b64: str | None = None) -> ProductCard:
    card_json = card.model_dump_json(indent=2)
    
    user_msg = f"Here is the current card: {card_json}\n\nPlease rewrite the title, description, bullets, tags, and seo_keywords to match the updated attributes."
    
    user_message = {"role": "user", "content": user_msg}
    if image_b64:
        user_message["images"] = [image_b64]

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_ENHANCE},
            user_message
        ],
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.3},
    }
    last_err = None
    for attempt in range(2):
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                r = await client.post(OLLAMA_URL + "/api/chat", json=payload)
                r.raise_for_status()
                content = r.json()["message"]["content"]
            return ProductCard.model_validate_json(content)
        except Exception as e:
            last_err = e
            log.warning("LLM enhance attempt %s failed: %s", attempt + 1, e)
    raise RuntimeError("LLM enhance failed after retries: " + str(last_err))