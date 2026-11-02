# CardForge

**Multimodal LLM → Structured JSON → Manual Review.** A lightweight fullstack AI service: FastAPI + SQLite + Ollama + React/TS + Docker.

[![Python](https://img.shields.io/badge/python-3.10-blue)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ed)](https://docs.docker.com/compose/)

## Features
- **Backend** — FastAPI, Pydantic v2, SQLite, asynchronous LLM calls via httpx.
- **Multimodal LLM** — structured output using local \llava\ model. Validates JSON schema and retries on failure.
- **Image Preprocessing** — accepts images up to 20MB, converts to optimized JPEG (via Pillow) before sending to LLM.
- **Frontend** — React 18 + TypeScript. Handles image upload, dynamic loading states, inline editing, and interactive history (load/delete).
- **Ops** — Docker Compose, healthcheck, CPU-only inference.

## Architecture

\\\mermaid
graph TD
    A[frontend: React + TS, Vite, nginx] -->|/api| B[api: FastAPI]
    B -->|httpx| C[Ollama LLM: llava, host.docker.internal]
    B -->|sqlite3| D[(SQLite: volume)]
\\\

## Stack

| Layer | Technology |
|---|---|
| API | FastAPI 0.115, Uvicorn, Pydantic v2 |
| LLM | Ollama (llava), structured JSON |
| Image | Pillow, JPEG optimization |
| DB | SQLite |
| Frontend | React 18, TypeScript 5, Vite 5, nginx |
| Runtime | Docker Compose, CPU-only |

## Quick start

Requirements: Docker Desktop, Ollama running locally, ~5 GB RAM for the model.

\\\ash
git clone https://github.com/DevSpecOps/cardforge.git
cd cardforge
docker compose up -d --build
\\\

Before the first run, pull the multimodal model in a separate terminal:

\\\ash
ollama serve
ollama pull llava
\\\

UI: http://localhost:8080
API: http://localhost:8000
OpenAPI: http://localhost:8000/docs

## API

| Method | Path | Purpose |
|---|---|---|
| POST | /api/cards/generate | Accept text/image, return card |
| GET | /api/cards | List generated cards |
| GET | /api/cards/{id} | Get card details |
| PATCH | /api/cards/{id} | Save manual edits |
| DELETE | /api/cards/{id} | Delete card |
| GET | /health | Liveness |

## License

MIT