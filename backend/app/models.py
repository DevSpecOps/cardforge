from pydantic import BaseModel, Field


class GenerateRequest(BaseModel):
    input_text: str = Field(..., min_length=3, max_length=4000)


class ProductCard(BaseModel):
    title: str
    description: str
    bullets: list[str]
    tags: list[str]
    seo_keywords: list[str]


class GenerateResponse(BaseModel):
    id: int
    card: ProductCard