# ReadEase API Specifications

## Base Endpoints

- **Server API Gateway**: `http://localhost:5000/api/v1`
- **AI Microservice**: `http://localhost:8000`

---

## 1. System Endpoints

### `GET /health`

Returns health check status of the service.

**Response `200 OK`**:

```json
{
  "status": "ok",
  "service": "readease-server",
  "version": "1.0.0",
  "timestamp": "2026-08-16T14:50:00.000Z"
}
```

---

## 2. Authentication & User Profile (`/auth`, `/users`)

- `POST /api/v1/auth/register` — Create a new user account.
- `POST /api/v1/auth/login` — Authenticate and receive JWT access/refresh tokens.
- `GET /api/v1/users/me/preferences` — Retrieve reader accessibility preferences.
- `PUT /api/v1/users/me/preferences` — Update reader font, theme, and bionic parameters.

---

## 3. Documents (`/documents`)

- `POST /api/v1/documents/upload` — Upload text, PDF, docx, or image files.
- `GET /api/v1/documents` — List user's documents.
- `GET /api/v1/documents/:id` — Retrieve document details and parsed content.
- `DELETE /api/v1/documents/:id` — Remove a document.

---

## 4. AI Vision & OCR (`AI Service`)

- `POST /api/v1/ai/ocr` — Extract text and bounding boxes from uploaded images.
- `POST /api/v1/ai/parse-pdf` — Extract structured text and paragraphs from PDF.
- `POST /api/v1/ai/syllables` — Break words into phonetic syllables for assistive reading.
