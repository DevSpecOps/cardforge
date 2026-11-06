from fastapi import WebSocket

active_connections: dict[str, WebSocket] = {}

async def send_log(client_id: str | None, message: str):
    if client_id and client_id in active_connections:
        try:
            await active_connections[client_id].send_text(message)
        except Exception:
            pass