# CardForge

**Multimodal LLM → Structured JSON → Manual Review.** A lightweight, self-hosted fullstack AI service for generating e-commerce product cards.

[![Python](https://img.shields.io/badge/python-3.10-blue)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ed)](https://docs.docker.com/compose/)

![CardForge UI](docs/screenshot.png)

## Features

- **Backend** — FastAPI, Pydantic v2, SQLite, asynchronous LLM calls via httpx.
- **Hybrid AI Architecture** — Uses a Vision model (`llava-phi3`) for image analysis and a fast Text model (`llama3.2:1b`) for text rewriting, running inside Docker.
- **Neuro-Symbolic Guardrails** — Python strict rules validate the LLM output. It prevents hallucinations (e.g., blocking body descriptions, replacing unknown brands, and enforcing color/material consistency).
- **Structured Output** — Enforces strict JSON schema via Ollama `format` parameter and Pydantic validation.
- **Image Preprocessing** — Resizes and optimizes images (up to 20MB) via Pillow before sending them to the Vision model.
- **Frontend** — React 18 + TypeScript. Drag & drop upload, dynamic UI states, manual edits, and a PDF export feature.
- **Ops** — Fully containerized with Docker Compose. CPU-only inference, healthchecks included.

## Architecture

```mermaid
graph TD
    A[frontend: React + TS, Vite, nginx] -->|/api| B[api: FastAPI]
    B -->|httpx| C[Ollama: llava-phi3 for Vision]
    B -->|httpx| D[Ollama: llama3.2:1b for Text]
    B -->|sqlite3| E[(SQLite: volume)]
    B -->|python rules| F[Guardrails: Pydantic + Regex]
```

## Stack

| Layer | Technology |
|---|---|
| API | FastAPI 0.115, Uvicorn, Pydantic v2 |
| LLM | Ollama (llava-phi3 + llama3.2:1b) |
| Data | SQLite, Pillow (Image Processing) |
| Frontend | React 18, TypeScript 5, Vite 5, nginx |
| Runtime | Docker Compose, CPU-only |

## Quick start

Requirements: Docker Desktop (WSL 2 backend recommended). No local Ollama installation is required — it runs inside Docker.

```bash
git clone https://github.com/DevSpecOps/cardforge.git
cd cardforge
docker compose up -d --build
```

The first run will automatically download the required models (~4.5 GB) into the Docker volume. Once ready:

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
| POST | /api/cards/{id}/enhance | Rewrite text via AI |
| GET | /health | Liveness |

## License

MIT