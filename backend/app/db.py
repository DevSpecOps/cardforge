import json
import os
import sqlite3

DB_PATH = os.getenv("DB_PATH", "cards.db")


def init_db() -> None:
    with sqlite3.connect(DB_PATH) as c:
        c.execute(
            "CREATE TABLE IF NOT EXISTS cards ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "input_text TEXT NOT NULL,"
            "card_json TEXT NOT NULL,"
            "edited INTEGER NOT NULL DEFAULT 0,"
            "created_at TEXT DEFAULT CURRENT_TIMESTAMP"
            ")"
        )


def save_card(input_text: str, card: dict, edited: bool = False) -> int:
    with sqlite3.connect(DB_PATH) as c:
        cur = c.execute(
            "INSERT INTO cards (input_text, card_json, edited) VALUES (?,?,?)",
            (input_text, json.dumps(card, ensure_ascii=False), int(edited)),
        )
        return cur.lastrowid


def list_cards(limit: int = 50) -> list[dict]:
    with sqlite3.connect(DB_PATH) as c:
        c.row_factory = sqlite3.Row
        rows = c.execute(
            "SELECT * FROM cards ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(r) for r in rows]


def get_card(card_id: int) -> dict | None:
    with sqlite3.connect(DB_PATH) as c:
        c.row_factory = sqlite3.Row
        row = c.execute("SELECT * FROM cards WHERE id=?", (card_id,)).fetchone()
        return dict(row) if row else None


def update_card(card_id: int, card: dict) -> None:
    with sqlite3.connect(DB_PATH) as c:
        c.execute(
            "UPDATE cards SET card_json=?, edited=1 WHERE id=?",
            (json.dumps(card, ensure_ascii=False), card_id),
        )