<div align="center">

# 📖 ReadEase

### **Empowering Neurodivergent & Dyslexic Readers through Cognitive-First Assistive Intelligence**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite_5-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![WCAG 2.1 AAA](https://img.shields.io/badge/Accessibility-WCAG_2.1_AAA-success?style=for-the-badge)](https://www.w3.org/WAI/standards-guidelines/wcag/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

<p align="center">
  <a href="#-overview">Overview</a> •
  <a href="#-key-features">Key Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-configuration-and-execution-guide">Configuration & Execution</a> •
  <a href="#-routing--pages">Routing & Pages</a> •
  <a href="#-accessibility--standards">Accessibility</a> •
  <a href="#-license">License</a>
</p>

</div>

---

## 🌟 Overview

**ReadEase** is an enterprise-grade, accessible reading and assistive learning ecosystem. Traditional educational tools and documents often present severe barriers to individuals with dyslexia, ADHD, visual stress, and neurodivergence. ReadEase bridges this gap through real-time cognitive formatting, AI-driven visual saccade fixation guides, customizable reading rulers, bilingual (English & Malayalam) phonemic breakdowns, and role-centric educational workspaces.

Whether in the classroom, during clinical educational therapy, or at home, ReadEase provides a tactile, low-glare, and empowering reading environment tailored to each reader's unique cognitive profile.

---

## ✨ Key Features

### 👁️ Cognitive Typography & Bionic Fixation

- **Dynamic Bionic Reading**: Intelligently bolds initial phonemes and syllables to accelerate saccadic eye movement and prevent unintended word skips.
- **Dyslexia-Optimized Fonts**: Integrated support for research-backed typefaces including **Lexend**, **Atkinson Hyperlegible**, and **OpenDyslexic**.
- **Adjustable Fixation Intensity**: Fine-tune bolding strength (from 30% to 70%) to match individual reading pace.

### 📏 Visual Focus Guides & Reading Rulers

- **Interactive Reading Ruler**: On-screen horizontal visual guide that anchors eye focus and eliminates line-jumping fatigue.
- **Warm Contrast Canvas**: Soft cream and low-glare dark modes designed to alleviate Meares-Irlen syndrome and visual strain.
- **Micro-Typography Spacing**: Configurable letter-spacing, word-spacing, and line-height controls.

### 🗣️ Bilingual AI Speech & Phonemic Analysis

- **Phonemic Syllabification**: Automated syllable segmentation and phonetic breakdown for complex vocabulary in both **English** and **Malayalam**.
- **Real-Time Synchronized TTS**: Highlighting speech playback synchronized with document reading position.
- **Fluency Scoring**: Non-diagnostic reading stamina and engagement tracking.

### 👥 5 Tailored Role Portals

1. **Student Workspace**: Daily reading studio, interactive assignments, vocabulary vaults, and stamina badges.
2. **Teacher Dashboard**: Class roster management, reading assignments, and cohort fluency reports.
3. **Special Educator Suite**: Individualized Education Program (IEP) tracking, accommodation presets, and clinical screening notes.
4. **Parent Hub**: Weekly growth charts, home reading milestones, and practice logs.
5. **Admin Console**: System diagnostics, RAG knowledge bases, and AI service pipelines.

### 🎨 Google Stitch Design System & Accessible Component Catalog

- Accessible, tactile UI components with rigorous keyboard focus rings, touch targets (≥44px), and ARIA landmark compliance.
- Interactive **UI Component Catalog** available at `/catalog` demonstrating button variants, cards, and clinical alert banners.

---

## 🏗 Architecture

ReadEase is organized as a high-performance **npm monorepo** with clean service separation:

```
ReadEase/
├── client/                     # React 18 + TypeScript + Vite SPA
│   ├── src/
│   │   ├── components/         # Accessible UI design system & navigation
│   │   │   ├── auth/           # Role-based login and signup modals
│   │   │   ├── navigation/     # Responsive Navbar, Sidebar, TopBar, Footer
│   │   │   └── ui/             # Buttons, Cards, Inputs, Modals, Badges, Disclaimers
│   │   ├── layouts/            # PublicLayout & AuthenticatedLayout
│   │   ├── pages/              # 404 Wayfinder & specialized route views
│   │   ├── styles/             # Tailwind theme & design tokens
│   │   ├── App.tsx             # Declarative React Router v7 routes
│   │   └── main.tsx            # Application entry & BrowserRouter mount
│   ├── index.html
│   ├── tailwind.config.ts
│   └── vite.config.ts
│
├── server/                     # Node.js + Express + TypeScript Backend
│   ├── src/
│   │   ├── config/             # Environment validation with Zod
│   │   ├── controllers/        # REST route handlers
│   │   ├── middleware/         # RBAC, Helmet, CORS, Rate Limiters
│   │   ├── models/             # Mongoose schemas & data models
│   │   └── services/           # Auth, sessions, and analytics services
│   └── tsconfig.json
│
├── ai-service/                 # Python 3.12 + FastAPI Microservice
│   ├── app/
│   │   ├── api/v1/             # Endpoints for TTS, OCR, and analysis
│   │   ├── core/               # FastAPI settings and logging
│   │   └── services/           # Malayalam/English syllabification & TTS
│   ├── tests/                  # Automated pytest test suites
│   └── requirements.txt
│
├── packages/
│   └── shared/                 # Shared TypeScript types, DTOs & contracts
│
├── docs/                       # Architecture diagrams & design system specs
├── docker-compose.yml          # Multi-container local & cloud deployment
└── README.md
```

---

## 💻 Tech Stack

| Layer                   | Technologies                                                                     |
| ----------------------- | -------------------------------------------------------------------------------- |
| **Frontend**            | React 18, TypeScript, Vite 5, React Router v7, Tailwind CSS, Lucide React        |
| **Backend API**         | Node.js, Express, TypeScript, Mongoose, Zod, Helmet, Winston                     |
| **AI & Vision Service** | Python 3.12, FastAPI, Uvicorn, Tesseract OCR, PyTTSx3 / eSpeak                   |
| **Database & Cache**    | MongoDB (Data Storage & Vector Search), Redis (Session Cache)                    |
| **Monorepo & CI/CD**    | npm Workspaces, ESLint, Prettier, Husky, Lint-Staged, Commitlint, GitHub Actions |
| **Containers**          | Docker, Multi-stage Dockerfiles, Docker Compose                                  |

---

## 🚦 Routing & Pages

ReadEase features synchronized URL routing powered by **React Router**:

| Route Path   | View                    | Access        | Description                                                                     |
| :----------- | :---------------------- | :------------ | :------------------------------------------------------------------------------ |
| `/`          | Landing Page            | Public        | Interactive Bionic reader demo, feature highlights, and role explorer           |
| `/dashboard` | Portal Dashboard        | Authenticated | Personalized workspace for Student, Teacher, Educator, Parent, or Admin         |
| `/catalog`   | Design System Catalog   | Public / Dev  | Live showcase of design tokens, accessible buttons, cards, and alerts           |
| `*`          | 404 Not Found Wayfinder | Public        | Google Stitch-styled lost-book illustration, interactive ruler preview & search |

---

## 🚀 Configuration and Execution Guide

Step-by-step instructions to configure, install dependencies, initialize data, and execute the ReadEase application.

---

### 📋 Prerequisites & System Requirements

Before setting up ReadEase, ensure the following software is installed on your workstation:

- **Node.js**: `v20.x` or higher (LTS recommended)
- **npm**: `v10.x` or higher
- **Python**: `v3.11` or `v3.12` (for the AI microservice)
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017`) or a free [MongoDB Atlas Cluster](https://www.mongodb.com/cloud/atlas)
- **Git**: `v2.x`+
- _(Optional)_ **Docker & Docker Compose**: For containerized deployment
- _(Optional)_ **Groq API Key**: Free LLM key from [Groq Console](https://console.groq.com/keys) for real-time text simplification

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/srjofficial/ReadEase.git
cd ReadEase
```

---

### Step 2: Install Node.js Dependencies & Build Shared Packages

ReadEase uses npm workspaces. Installing from the root installs dependencies across the monorepo, client, and server simultaneously.

```bash
# 1. Install root, client, and server dependencies
npm install

# 2. Build the shared TypeScript contract library (@readease/shared)
npm run build:shared
```

---

### Step 3: Configure Python AI Microservice (`ai-service`)

The AI service handles OCR parsing, syllabification, and phonemic assistance via FastAPI.

```bash
# 1. Navigate to the AI service directory
cd ai-service

# 2. Create a virtual environment
python -m venv .venv

# 3. Activate the virtual environment
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On macOS / Linux:
source .venv/bin/activate

# 4. Install required Python packages
pip install -r requirements.txt

# 5. Return to root
cd ..
```

---

### Step 4: Configure Environment Variables

ReadEase provides templates for root, backend, frontend, and AI microservices.

```bash
# Copy root orchestration configuration
cp .env.example .env

# Copy individual service environment files if not already present
cp server/.env.example server/.env
cp client/.env.example client/.env
cp ai-service/.env.example ai-service/.env
```

#### Key Variables to Review:

- **`server/.env`**:
  - `MONGODB_URI`: Set to your local MongoDB (`mongodb://localhost:27017/readease`) or your Atlas URI.
  - `JWT_SECRET` / `JWT_REFRESH_SECRET`: Secure secret strings (default provided for development).
  - `LLM_API_KEY`: Groq API key (`gsk_...`) for cognitive text processing.
  - `SMTP_*`: _(Optional)_ Email credentials for OTP delivery. If omitted in development, OTPs are logged directly to the server terminal.
- **`client/.env`**:
  - `VITE_API_URL`: Points to backend (`http://localhost:5000/api/v1`).
  - `VITE_AI_SERVICE_URL`: Points to Python microservice (`http://localhost:8000`).
- **`ai-service/.env`**:
  - `AI_PORT`: `8000`
  - `ALLOWED_ORIGINS`: `http://localhost:5173,http://localhost:5000`

---

### Step 5: Verify Database Connection & Seed Test Accounts

Ensure your MongoDB instance is running, verify the connection, and pre-populate demo accounts for all 5 roles:

```bash
# Verify MongoDB connection
npm run db:test --workspace=server

# Seed pre-configured demo accounts (Student, Teacher, Special Educator, Parent, Admin)
npm run seed:accounts --workspace=server
```

---

### Step 6: Execute the Application

#### Option A: Local Development (Recommended)

Run the full stack across two terminal windows:

**Terminal 1 (Root): Start Frontend & Backend Concurrently**

```bash
npm run dev
```

> Starts Vite Client on `http://localhost:5173` and Express API on `http://localhost:5000`.

**Terminal 2: Start Python AI Microservice**

```bash
cd ai-service
# Windows:
.venv\Scripts\Activate.ps1
# macOS/Linux:
source .venv/bin/activate

uvicorn app.main:app --reload --port 8000
```

> Starts FastAPI service on `http://localhost:8000` with Swagger UI at `http://localhost:8000/docs`.

#### Option B: Full Containerized Execution via Docker Compose

```bash
docker-compose up --build
```

---

### Step 7: Application URLs & Test Credentials

Once running, access the services:

- **Frontend Application**: [http://localhost:5173](http://localhost:5173)
- **Backend API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)
- **AI Service Interactive Swagger API**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **UI Design System Catalog**: [http://localhost:5173/catalog](http://localhost:5173/catalog)

#### Pre-Configured Test Accounts (Default Password: `Password123!`):

| Role                 | Email                   | Password       | Landing Portal        | Key Capabilities                                         |
| :------------------- | :---------------------- | :------------- | :-------------------- | :------------------------------------------------------- |
| **Student**          | `student@readease.com`  | `Password123!` | `/student/dashboard`  | Bionic reading, TTS, ruler, gaze tracking, streak badges |
| **Teacher**          | `teacher@readease.com`  | `Password123!` | `/teacher/dashboard`  | Cohort rosters, assignment manager, WPM fluency logs     |
| **Special Educator** | `educator@readease.com` | `Password123!` | `/educator/dashboard` | IEP accommodation profiles, phonological screening       |
| **Parent**           | `parent@readease.com`   | `Password123!` | `/parent/dashboard`   | Home reading logs, stamina metrics, progress reports     |
| **Admin**            | `admin@readease.com`    | `Password123!` | `/admin/dashboard`    | System diagnostics, OCR pipeline logs, user audits       |

---

## 🧪 Available Scripts

| Command                | Description                                                     |
| ---------------------- | --------------------------------------------------------------- |
| `npm run dev`          | Start client and server concurrently                            |
| `npm run dev:client`   | Launch frontend development server (`localhost:5173`)           |
| `npm run dev:server`   | Launch Express API server (`localhost:5000`)                    |
| `npm run build`        | Build all workspace packages for production                     |
| `npm run build:client` | Produce optimized Vite production bundle                        |
| `npm run typecheck`    | Run strict TypeScript compiler verification across all packages |
| `npm run lint`         | Run ESLint across monorepo                                      |
| `npm run test`         | Run automated test suites                                       |
| `npm run validate`     | Complete pre-flight check (`format + lint + typecheck + test`)  |

---

## 🛡️ Accessibility & Ethical AI Notice

- **Accessibility**: ReadEase is built following **WCAG 2.1 Level AA and AAA** guidelines, featuring contrast ratios exceeding 7:1 for text, full keyboard navigation with visible focus rings, and screen-reader landmark annotations.
- **Screening Notice**: ReadEase provides assistive reading accommodations and preliminary reading assessments designed to support learners and educators. It is an assistive educational tool and **not a clinical or diagnostic medical instrument**.

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Built with ❤️ for accessible, barrier-free reading.</sub>
</div>
