import logging
import os

import httpx

from .models import ProductCard

OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
log = logging.getLogger(__name__)

SYSTEM = (
    "Ты — ассистент по созданию карточек товаров. "
    "Верни СТРОГО валидный JSON без markdown. Схема: "
    '{"title": str, "description": str, "bullets": [str], '
    '"tags": [str], "seo_keywords": [str]}.'
)


async def generate_card(input_text: str) -> ProductCard:
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": input_text},
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