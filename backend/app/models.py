from pydantic import BaseModel, Field

class GenerateRequest(BaseModel):
    input_text: str = Field(..., min_length=3, max_length=4000)

class ProductCard(BaseModel):
    title: str
    description: str
    bullets: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    seo_keywords: list[str] = Field(default_factory=list)
    
    brand: str = "Unknown"
    manufacturer: str = "Unknown"
    category: str = "Unknown"
    gender: str = "Unknown"
    material: str = "Unknown"
    care: str = "Unknown"
    country_of_origin: str = "Unknown"
    size: str = "Unknown"
    size_system: str = "International"
    color: str = "Unknown"
    gallery_images: list[str] = Field(default_factory=list)

class GenerateResponse(BaseModel):
    id: int
    card: ProductCard