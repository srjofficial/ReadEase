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
  <a href="#-getting-started">Getting Started</a> •
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

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher
- **Python**: `v3.11+` or `v3.12+` (for `ai-service`)
- **Docker & Docker Compose** (optional)

---

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/srjofficial/ReadEase.git
cd ReadEase

# Install all JavaScript/TypeScript dependencies across workspaces
npm install

# Build shared types package
npm run build:shared
```

---

### 2. Set Up AI Microservice (Python)

```bash
cd ai-service
python -m venv .venv

# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
cd ..
```

---

### 3. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

---

### 4. Run the Development Environment

#### Option A: Running Services Locally

```bash
# Terminal 1: Start Client (Vite) and Server (Express) concurrently
npm run dev

# Terminal 2: Start Python FastAPI AI Service
cd ai-service
uvicorn app.main:app --reload --port 8000
```

- **Frontend Client**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`
- **AI Microservice & Docs**: `http://localhost:8000/docs`

#### Option B: Docker Compose

```bash
docker-compose up --build
```

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
