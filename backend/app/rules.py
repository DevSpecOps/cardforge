import re
from .models import ProductCard

def get_care_rule(material: str) -> str:
    mat = material.lower()
    if "silk" in mat: return "Dry clean only, do not bleach, iron low."
    if "wool" in mat or "fleece" in mat: return "Dry clean or hand wash cold, do not tumble dry."
    if "cotton" in mat: return "Machine wash cold, tumble dry low, iron medium."
    if "polyester" in mat or "synthetic" in mat: return "Machine wash warm, tumble dry low, do not iron."
    if "leather" in mat: return "Professional leather clean only."
    if "velvet" in mat: return "Dry clean only."
    if "nylon" in mat or "spandex" in mat or "latex" in mat or "mesh" in mat: return "Hand wash cold, do not bleach, line dry."
    return "Unknown"

def clean_marketing_fluff(text: str) -> str:
    banned = ["luxurious", "luxury", "elegant", "high-quality", "premium", "unleash", "elevate", "discover", "embrace", "timeless"]
    for word in banned:
        text = re.sub(r'(?i)\b' + word + r'\b\s*', '', text)
    return text.strip()

def enforce_material_consistency(card: ProductCard) -> ProductCard:
    if card.material == "Unknown":
        return card
    target_mat = card.material.lower()
    all_materials = ["silk", "velvet", "wool", "polyester", "leather", "linen", "denim", "cotton", "spandex", "nylon", "rayon", "latex", "mesh", "fleece", "synthetic"]
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
    if ">" in cat:
        return cat.split(">")[-1].strip()
    return cat.strip()

def remove_repetitions(text: str) -> str:
    sentences = re.split(r'(?<=[.!?]) +', text)
    seen = set()
    unique = []
    for s in sentences:
        clean_s = s.strip().lower()
        if clean_s and clean_s not in seen:
            seen.add(clean_s)
            unique.append(s.strip())
    return " ".join(unique)

def validate_card(card: ProductCard, user_text: str = "") -> ProductCard:
    # 1. Защита от None
    card.title = card.title if card.title else ""
    card.description = card.description if card.description else ""
    card.bullets = card.bullets if card.bullets else []
    card.tags = card.tags if card.tags else []
    card.seo_keywords = card.seo_keywords if card.seo_keywords else []

    # 2. Чистим заголовок
    card.title = card.title.split('\n')[0]
    card.title = re.sub(r'\b[A-Z]{4,}\b\s*[-:]?\s*', '', card.title)
    card.title = re.sub(r'#[0-9a-fA-F]{3,6}', '', card.title)
    card.title = re.sub(r'\s+(by|with|in|for|and|or)\s*$', '', card.title, flags=re.IGNORECASE).strip()
    
    bad_starts = ["discover", "unleash", "experience", "embrace", "elevate", "step into", "indulge"]
    if any(card.title.lower().startswith(w) for w in bad_starts) or "boutique" in card.title.lower():
        card.title = ""
        
    card.title = clean_marketing_fluff(card.title)
    if len(card.title) > 60:
        card.title = card.title[:60].rsplit(' ', 1)[0] + "..."

    # 3. Чистим категорию и материал
    card.category = clean_category(card.category)
    card.material = card.material.capitalize()
    card = enforce_material_consistency(card)

    # 4. Чистим описание
    card.description = clean_people_from_description(card.description)
    card.description = re.sub(r'#[0-9a-fA-F]{3,6}', '', card.description)
    card.description = remove_repetitions(card.description)
    card.description = clean_marketing_fluff(card.description) # Чистим от "Unleash"

    # 5. ФОЛЛБЭК КАТЕГОРИЙ
    title_lower = card.title.lower()
    if any(w in title_lower for w in ["shoe", "boot", "sneaker", "loafer", "oxford"]):
        card.category = "Shoes"
    elif any(w in title_lower for w in ["hat", "cap", "bag", "belt"]):
        card.category = "Accessories"
    elif any(w in title_lower for w in ["motorcycle", "car", "vehicle", "bike"]):
        card.category = "Other"
    elif any(w in title_lower for w in ["jacket", "coat", "parka", "puffer", "windbreaker", "peacoat", "trench"]):
        card.category = "Outerwear"
    elif any(w in title_lower for w in ["dress", "skirt", "blouse", "gown"]) and "shoe" not in title_lower:
        card.category = "Dresses"
    elif any(w in title_lower for w in ["corset", "lingerie", "bra", "thong", "chemise", "bodysuit"]):
        card.category = "Lingerie"
    elif any(w in title_lower for w in ["bikini", "swimsuit", "monokini", "swimwear"]):
        card.category = "Swimwear"
    elif any(w in title_lower for w in ["legging", "sports bra", "hoodie", "activewear", "track", "gym", "running", "yoga", "fitness"]):
        card.category = "Sportswear"

    # 6. ЖЕСТКИЙ ФОЛЛБЭК ГЕНДЕРА
    if card.category == "Shoes":
        if any(w in title_lower for w in ["men", "man", "male", "oxford", "loafer", "derby"]): card.gender = "Men"
        elif any(w in title_lower for w in ["women", "woman", "female", "heel", "pump", "stiletto"]): card.gender = "Women"
        else: card.gender = "Unisex"
    else:
        if any(w in title_lower for w in ["women", "woman", "female", "for her", "dress", "bikini", "lingerie"]): card.gender = "Women"
        elif any(w in title_lower for w in ["men", "man", "male", "for him", "suit", "tie"]): card.gender = "Men"
        elif card.category == "Other": card.gender = "Unisex"
        elif card.gender.lower() in ["unknown", "unisex", ""]: card.gender = "Unisex"

    if card.category.lower() == "unknown" or not card.category: card.category = "Clothing"
    if card.color.lower() == "unknown" or not card.color: card.color = "Multicolor"

    # 7. ФОЛЛБЭК ОПИСАНИЯ
    if not card.description or len(card.description.strip()) < 20:
        safe_cat = card.category.lower() if card.category != "Unknown" else "item"
        safe_color = card.color.lower() if card.color != "Unknown" else "assorted colors"
        card.description = f"Experience the perfect blend of style and comfort with this {safe_color} {safe_cat} item. Crafted for a flattering fit, this garment is perfect for both everyday wear and special occasions."

    # 8. ЖЕСТКАЯ ПРОВЕРКА БУЛЛЕТОВ
    is_bad_bullets = False
    if not card.bullets or len(card.bullets) < 3:
        is_bad_bullets = True
    else:
        for b in card.bullets:
            if len(b.split()) > 10:
                is_bad_bullets = True
                break
    if is_bad_bullets:
        card.bullets = ["Comfortable fit", "High-quality design", "Stylish look"]

    # 9. СИНХРОНИЗАЦИЯ ТЕГОВ И SEO С ГЕНДЕРОМ
    if card.gender == "Men":
        card.tags = [t for t in card.tags if "women" not in t.lower() and "woman" not in t.lower() and "female" not in t.lower()]
        card.seo_keywords = [k for k in card.seo_keywords if "women" not in k.lower() and "woman" not in k.lower() and "female" not in k.lower()]
    elif card.gender == "Women":
        card.tags = [t for t in card.tags if not (t.lower() == "men" or "men's" in t.lower() or "male" in t.lower())]
        card.seo_keywords = [k for k in card.seo_keywords if not (k.lower() == "men" or "men's" in k.lower() or "male" in k.lower())]

    # 10. СИНХРОНИЗАЦИЯ SEO С ЦВЕТОМ (Убираем navy blue, если цвет Black)
    all_colors = ["red", "blue", "green", "yellow", "orange", "purple", "pink", "black", "white", "grey", "gray", "brown", "cyan", "turquoise", "beige", "gold", "silver", "burgundy", "navy", "teal", "khaki", "olive", "camo", "charcoal", "maroon"]
    
    # Если мы точно знаем цвет (например, Black), вычищаем другие цвета из SEO
    if card.color != "Multicolor" and card.color != "Unknown":
        primary_color = card.color.split(' / ')[0].lower()
        temp_seo = []
        for k in card.seo_keywords:
            has_other_color = False
            for c in all_colors:
                if c != primary_color and c in k.lower():
                    has_other_color = True
                    break
            if not has_other_color:
                temp_seo.append(k)
        card.seo_keywords = temp_seo

    # 11. ФОЛЛБЭК ТЕГОВ (если после чистки стало пусто)
    if not card.tags or len(card.tags) < 3:
        core_tags = [card.category.lower(), card.material.lower(), card.color.lower()]
        if card.category == "Shoes": core_tags.extend(["shoes", "footwear", card.gender.lower()])
        elif card.category == "Swimwear": core_tags.extend(["bikini", "swimwear", "beach"])
        elif card.category == "Lingerie": core_tags.extend(["lingerie", "women", "intimate apparel"])
        else: core_tags.extend([card.gender.lower(), "fashion", card.category.lower()])
            
        all_t = list(set(card.tags + [t for t in core_tags if t != "unknown" and t.strip() != ""]))
        card.tags = all_t[:5]

    # 12. ФОЛЛБЭК SEO (если после чистки стало пусто)
    if not card.seo_keywords or len(card.seo_keywords) == 0:
        cat_str = card.category.lower() if card.category != "Unknown" else "clothing"
        col_str = card.color.lower() if card.color != "Unknown" else "fashion"
        gen_str = card.gender.lower() if card.gender != "Unisex" else ""
        card.seo_keywords = [f"buy {cat_str} online", f"{col_str} {cat_str}", f"{gen_str} {cat_str}".strip()]

    if not card.title or len(card.title.strip()) < 3:
        safe_color = card.color.split(' / ')[0].capitalize() if card.color != "Unknown" else "Stylish"
        safe_cat = card.category.capitalize() if card.category != "Unknown" else "Clothing"
        card.title = f"{safe_color} {safe_cat}"

    # 13. Валидация размеров
    if card.category not in ["Shoes", "Accessories", "Other"]:
        valid_sizes = {
            "International": ["xs", "s", "m", "l", "xl", "xxl", "xxxl", "4xl", "5xl", "unknown"],
            "RUS": ["40", "42", "44", "46", "48", "50", "52-54", "56-58", "60-62", "unknown"],
            "EU": ["34", "36", "38", "40", "42", "44", "46", "48", "50", "unknown"],
            "US": ["2", "4", "6", "8", "10", "12", "14", "16", "18", "unknown"],
            "UK": ["6", "8", "10", "12", "14", "16", "18", "20", "22", "unknown"],
            "CN": ["160/84a", "165/88a", "170/92a", "175/96a", "180/100a", "185/104a", "190/108a", "195/112a", "200/116a", "unknown"]
        }
        system = card.size_system
        if system not in valid_sizes: system = "International"
        sz = card.size.lower().strip()
        if sz not in valid_sizes[system]: card.size = "Unknown"

    # 14. Валидация цвета
    allowed_colors = ["red", "blue", "green", "yellow", "orange", "purple", "pink", "black", "white", "grey", "gray", "brown", "cyan", "turquoise", "beige", "gold", "silver", "burgundy", "navy", "teal", "multicolor", "floral", "khaki", "olive", "neon green", "neon pink", "camo", "charcoal", "maroon", "coral", "rose gold", "mint", "lavender", "peach"]
    banned_adjectives = ["vibrant", "elegant", "beautiful", "stylish", "fashionable", "bright", "dark", "colorful", "pastel", "neon", "light", "soft"]
    color_str = card.color.lower()
    for bad in banned_adjectives: color_str = re.sub(r'\b' + bad + r'\b', '', color_str)
    found_colors = [c.capitalize() for c in allowed_colors if re.search(r'\b' + c + r'\b', color_str)]
    if found_colors:
        seen = set()
        unique = [x for x in found_colors if not (x.lower() in seen or seen.add(x.lower()))]
        card.color = " / ".join(unique)
    elif card.color == "Unknown":
        card.color = "Multicolor"
            
    card.care = get_care_rule(card.material)
    return card