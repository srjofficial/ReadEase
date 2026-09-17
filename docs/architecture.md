# ReadEase System Architecture

## Overview

ReadEase is designed as a distributed, high-performance, accessible micro-service architecture optimized for real-time document transformation and AI assistance.

```mermaid
graph TD
    Client["React Frontend (Vite + TS)"]
    Server["Express API Gateway (Node.js + TS)"]
    AIService["AI & OCR Service (FastAPI + Python)"]
    DB[(PostgreSQL)]
    Cache[(Redis Cache)]

    Client -->|HTTP/REST & WebSockets| Server
    Client -.->|Direct AI Vision Requests (Optional)| AIService
    Server -->|Internal RPC / REST| AIService
    Server --> DB
    Server --> Cache
```

## Service Responsibilities

### 1. `client/`

- **Role**: Accessible UI for readers, educators, and admins.
- **Key Features**: Bionic Reading Engine, Dyslexia Font Stacks, High-Contrast Color Themes, TTS Audio Player & Word Synchronizer.
- **Tech Stack**: React 18, TypeScript, Vite.

### 2. `server/`

- **Role**: Authentication, document persistence, user profile customization, rate limiting, and business logic.
- **Tech Stack**: Node.js, Express, TypeScript, Prisma/PostgreSQL, Redis.

### 3. `ai-service/`

- **Role**: Heavy compute document ingestion (OCR from scanned pages, PDF text extraction, syllable segmentation, NLP summarization).
- **Tech Stack**: Python 3.12, FastAPI, Uvicorn, Tesseract OCR, PyPDF.

### 4. `packages/shared/`

- **Role**: Shared TypeScript types, data contracts, and cross-cutting constants ensuring zero type drift between client and backend.
