import re
from .models import ProductCard

def get_care_rule(material: str) -> str:
    mat = material.lower()
    if "silk" in mat: return "Dry clean only, do not bleach, iron low."
    if "wool" in mat: return "Dry clean or hand wash cold, do not tumble dry."
    if "cotton" in mat: return "Machine wash cold, tumble dry low, iron medium."
    if "polyester" in mat: return "Machine wash warm, tumble dry low, do not iron."
    if "leather" in mat: return "Professional leather clean only."
    if "velvet" in mat: return "Dry clean only."
    return "Unknown"

def clean_marketing_fluff(text: str) -> str:
    banned = ["luxurious", "luxury", "elegant", "high-quality", "premium"]
    for word in banned:
        text = re.sub(r'(?i)\b' + word + r'\b\s*', '', text)
    return text.strip()

def enforce_material_consistency(card: ProductCard) -> ProductCard:
    if card.material == "Unknown":
        return card
    target_mat = card.material.lower()
    all_materials = ["silk", "velvet", "wool", "polyester", "leather", "linen", "denim", "cotton", "spandex", "nylon", "rayon"]
    def replace_wrong_materials(text: str) -> str:
        for mat in all_materials:
            if mat != target_mat:
                text = re.sub(r'(?i)\b' + mat + r'\b', card.material, text)
        return text
    card.title = replace_wrong_materials(card.title)
    card.description = replace_wrong_materials(card.description)
    card.bullets = [replace_wrong_materials(b) for b in card.bullets]
    card.tags = [replace_wrong_materials(t) for t in card.tags]
    card.seo_keywords = [replace_wrong_materials(k) for k in card.seo_keywords]
    return card

def clean_people_from_description(text: str) -> str:
    banned_words = ["woman", "man", "model", "person", "girl", "boy", "body", "figure", "posing", "attractive", "beautiful", "breast", "chest", "legs", "arms"]
    if any(word in text.lower() for word in banned_words):
        return ""
    return text

def clean_category(cat: str) -> str:
    # Если нейросеть спарсила хлебные крошки с сайта (Lingerie > Bras > ...), берем последнее
    if ">" in cat:
        return cat.split(">")[-1].strip()
    return cat.strip()

def validate_card(card: ProductCard, user_text: str = "") -> ProductCard:
    card = enforce_material_consistency(card)
    card.title = clean_marketing_fluff(card.title)
    
    # Чистим категорию от знаков ">"
    card.category = clean_category(card.category)
    
    card.tags = [clean_marketing_fluff(t) for t in card.tags if clean_marketing_fluff(t)]
    card.seo_keywords = [clean_marketing_fluff(k) for k in card.seo_keywords if clean_marketing_fluff(k)]
    
    card.description = clean_people_from_description(card.description)
    
    # --- ПИТОН-ФОЛЛБЭК ---
    if not card.description or len(card.description) < 20:
        safe_cat = card.category.lower() if card.category.lower() != "unknown" else "item"
        safe_color = card.color.lower() if card.color.lower() != "unknown" else "stylish"
        safe_mat = card.material.lower() if card.material.lower() != "unknown" else "high-quality"
        card.description = f"Experience the perfect blend of style and comfort with this {safe_color} {safe_mat} {safe_cat}. Designed for a flattering fit, this garment is crafted to provide both functionality and a modern look."

    if not card.bullets:
        card.bullets = ["Comfortable fit", "High-quality design", "Stylish look"]
        
    if not card.tags:
        t_list = [card.category.lower(), card.material.lower(), card.color.lower()]
        card.tags = [t for t in t_list if t and t != "unknown"]
        
    if not card.seo_keywords:
        card.seo_keywords = [f"{card.color} {card.category}".lower(), f"{card.material} {card.category}".lower()]
        
    if card.category.lower() == "unknown" or not card.category:
        card.category = "Clothing"
    if card.color.lower() == "unknown" or not card.color:
        card.color = "Multicolor"
    if card.material.lower() == "unknown" or not card.material:
        card.material = "Cotton"
    if card.gender.lower() == "unknown" or not card.gender:
        card.gender = "Unisex"

    valid_sizes = {
        "International": ["xs", "s", "m", "l", "xl", "xxl", "xxxl", "4xl", "5xl"],
        "RUS": ["40", "42", "44", "46", "48", "50", "52-54", "56-58", "60-62"],
        "EU": ["34", "36", "38", "40", "42", "44", "46", "48", "50"],
        "US": ["2", "4", "6", "8", "10", "12", "14", "16", "18"],
        "UK": ["6", "8", "10", "12", "14", "16", "18", "20", "22"],
        "CN": ["160/84a", "165/88a", "170/92a", "175/96a", "180/100a", "185/104a", "190/108a", "195/112a", "200/116a"]
    }
    system = card.size_system
    if system not in valid_sizes:
        system = "International"
        card.size_system = system
    sz = card.size.lower().strip()
    if sz not in valid_sizes[system] and sz != "unknown":
        card.size = "Unknown"
    else:
        card.size = card.size.upper() if system == "International" else card.size

    allowed_colors = ["red", "blue", "green", "yellow", "orange", "purple", "pink", "black", "white", "grey", "gray", "brown", "cyan", "turquoise", "beige", "gold", "silver", "burgundy", "navy", "teal", "multicolor", "floral"]
    banned_adjectives = ["vibrant", "elegant", "beautiful", "stylish", "fashionable", "bright", "dark", "colorful", "pastel", "neon", "light", "soft"]
    color_str = card.color.lower()
    for bad in banned_adjectives:
        color_str = re.sub(r'\b' + bad + r'\b', '', color_str)
    found_colors = [c.capitalize() for c in allowed_colors if re.search(r'\b' + c + r'\b', color_str)]
    if found_colors:
        seen = set()
        unique = [x for x in found_colors if not (x.lower() in seen or seen.add(x.lower()))]
        card.color = " / ".join(unique)
    else:
        if card.color == "Unknown":
            card.color = "Multicolor"
            
    card.care = get_care_rule(card.material)
    
    if "unknown" in card.title.lower():
        card.title = re.sub(r'(?i)unknown\s*(brand)?\s*[-:]?\s*', '', card.title).strip()
        if not card.title:
            card.title = f"Stylish {card.category}"

    return card