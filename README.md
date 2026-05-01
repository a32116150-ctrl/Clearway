# Chantier — Construction SaaS

> A mobile-first, bilingual (French / Arabic RTL) SaaS for managing construction projects in Tunisia.  
> Built with React + Vite (frontend) · Node.js + Express (backend) · SQLite + Prisma (database).

---

## 🚀 Quick Start

```bash
cd /Users/anoircherif/Desktop/BAZZ/chantier
chmod +x run.sh
./run.sh
```

- **Frontend:** http://localhost:5173  
- **Backend API:** http://localhost:5001

> Port 5001 is used because macOS reserves 5000 for AirPlay.

### Manual Start

```bash
# Terminal 1 — Backend
cd backend && npm install && npx prisma generate && npx prisma migrate dev --name init && node index.js

# Terminal 2 — Frontend
cd frontend && npm install && npm run dev
```

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router 6, Axios, i18next, Lucide icons, Three.js |
| Backend | Node.js, Express 5, Prisma ORM 6.4.1, SQLite |
| Auth | bcryptjs (hashing) + jsonwebtoken (JWT, 7d) |
| File uploads | multer → `backend/uploads/` |
| Styling | Vanilla CSS (custom design system, no Tailwind) |
| 3D | Three.js WebGL + canvas pixel analysis |

---

## 📁 Directory Structure

```
chantier/
├── run.sh                        # Boot both servers at once
├── CHANTIER_PROJECT_MEMORY.md    # Full project documentation (source of truth)
│
├── backend/
│   ├── index.js                  # Express entry point (:5001)
│   ├── prismaClient.js           # Shared Prisma singleton
│   ├── .env                      # PORT, JWT_SECRET, DATABASE_URL
│   ├── dev.db                    # SQLite database (auto-created)
│   ├── middleware/auth.js        # JWT verification
│   ├── routes/
│   │   ├── auth.js               # POST /register, POST /login
│   │   ├── projects.js           # Projects + Expenses + Contractors CRUD
│   │   └── documents.js          # File upload / delete
│   ├── uploads/                  # Uploaded files (served as static)
│   └── prisma/
│       ├── schema.prisma         # DB schema (User, Project, Expense, Contractor, Document)
│       └── migrations/           # Migration history
│
└── frontend/src/
    ├── App.jsx                   # Router, Header (theme/lang toggle, logout)
    ├── index.css                 # Full design system (tokens, components, animations)
    ├── i18n.js                   # i18next config
    ├── context/AuthContext.jsx   # JWT storage + axios interceptor
    ├── locales/
    │   ├── fr/translation.json   # French labels
    │   └── ar/translation.json   # Arabic labels (RTL)
    ├── components/
    │   └── FloorViewer3D.jsx     # Three.js 3D floor plan viewer
    └── pages/
        ├── Login.jsx / Register.jsx
        ├── Dashboard.jsx         # Global stats + project grid + expense feed
        └── ProjectDetails.jsx    # Expenses | Contractors | Documents tabs
```

---

## ✨ Features

### Dashboard
- Global financial summary (budget / spent / remaining across all projects)
- 4 KPI stat cards with icons
- Category spend breakdown chart
- Responsive project grid (1 → 2 → 3 columns) with spend progress bars, over-budget badge
- Recent expenses activity feed
- Add project via modal (bottom-sheet on mobile)
- Success toast notifications

### Project Details (3 tabs)
- **Expenses** — Log expenses with amount, category, date, contractor link, note. Per-project category chart.
- **Contractors** — Manage subcontractors with avatar initials, team size, budget usage progress, and total paid. Clicking a card navigates to their **Full-Page Dashboard**.
- **Documents** — Project-wide document vault. View/download. Image files get a **3D** button.

### 🏢 Advanced Contractor Dashboard
- **Financial Intelligence**: Detailed view of **Total Budget**, **Advances (Avances)**, and actual spend.
- **Budget Health**: Visual real-time indicator of budget consumption.
- **Team Management**: Track the number of persons working under each entrepreneur.
- **Paperwork Vault (EDM)**: Link invoices (factures), quotes (devis), and orders (bons) directly to a contractor's profile.
- **History**: Chronological payment feed per contractor.

### 3D Floor Plan Viewer
- Click **3D** on any uploaded image document
- **Canvas pixel analysis** with **Rectangular Decomposition**:
  - Automatically detects walls from the floor plan and creates **Editable Wall Segments**.
  - **Editable Walls:** Click any auto-detected wall to adjust its **Length, Thickness, and Height**, or delete it.
- **Manual Furniture Library:** 
  - Retractable sidebar with 15+ items (Doors, Windows, Furniture, Sanitaire, Déco)
  - Interactive **Ghost Preview** for placement
  - **Drag & Move:** Click and hold any placed object (furniture or walls) to move it in real-time.
  - **Custom Structural Tools:** Manually add structural walls and columns with precision scaling.
  - Select, **Rotate**, and **Delete** placed objects
- Uses Three.js `InstancedMesh` for walls + optimized primitives for furniture
- **Orbit mode:** drag to rotate, scroll/pinch to zoom
- **Walk mode:** WASD + mouse navigation (pointer lock)
- No AI, no backend, pure browser WebGL + Canvas API

### Internationalization
- French 🇫🇷 (default) / Arabic 🇸🇦 toggle in header
- Full RTL layout on Arabic (`dir="rtl"` on `<html>`)
- All strings use `t('key')` — zero hardcoded labels

### Auth
- Register / Login with JWT (7 days)
- All data scoped to authenticated user
- Dark mode toggle persists via CSS custom properties

---

## 🗄️ Database Schema (Prisma)

```
User        → id, name, email (unique), password (bcrypt), createdAt
Project     → id, name, budget, location?, startDate?, userId(FK), createdAt
Expense     → id, amount, category, note?, date, projectId(FK), contractorId?(FK), createdAt
Contractor  → id, name, phone?, specialty?, teamSize, totalBudget, advancePaid, suppliesDetails?, projectId(FK), createdAt
Document    → id, name, url, projectId(FK), contractorId?(FK), createdAt
```

Cascade: deleting a Project removes all its Expenses, Contractors, Documents.

---

## 🔌 API Endpoints

```
POST   /api/auth/register
POST   /api/auth/login

GET    /api/projects                          (all user projects)
POST   /api/projects                          (create)
GET    /api/projects/:id                      (single with relations)
DELETE /api/projects/:id

POST   /api/projects/:id/expenses
DELETE /api/projects/:id/expenses/:expenseId

POST   /api/projects/:id/contractors         (create)
PUT    /api/projects/:id/contractors/:cId    (update profile)
DELETE /api/projects/:id/contractors/:cId

POST   /api/documents/:projectId             (multipart, field: file, optional: contractorId)
DELETE /api/documents/:id
```

All routes except `/api/auth/*` require `Authorization: Bearer <token>`.

---

## ⚙️ Environment Variables (`backend/.env`)

```
PORT=5001
JWT_SECRET=your_secret_key_here
DATABASE_URL="file:./dev.db"
```

---

## 📋 Development History (Summary)

| Phase | What Was Built |
|-------|---------------|
| 1 | MVP: Express + Prisma + JWT auth + basic React UI |
| 2 | Contractors, document upload (multer), dashboard budget stats |
| 3 | Auth bug fix, port 5000→5001, Prisma 6.4.1 stability |
| 4 | i18next FR/AR translations, RTL layout, all strings translated |
| 5 | Responsive design: fluid 1→2→3 col grid, desktop container |
| 6 | Full UI/UX overhaul: design system, KPI cards, modals, animations |
| 7 | Three.js 3D viewer: floor as texture, generic perimeter walls, orbit+walk |
| 8 | Canvas pixel analysis: walls detected from floor plan image, InstancedMesh |
| 9 | Manual Furniture Library: Sidebar catalog, ghost preview, raycasting placement |
| 10 | Advanced 3D Tools: Drag & Move, Custom Wall Tool with axis scaling |
| 11 | Editable Auto-Walls: Rectangular decomposition, horizon/pitch fixes |
| 12 | Advanced Contractor Dashboards: Financial health, team size, EDM document vault |

> See `CHANTIER_PROJECT_MEMORY.md` for full detail on every phase.

---

## 🔮 Roadmap

- [ ] Project status field (Planning / In Progress / Done)
- [ ] Expense editing (not just delete/re-add)
- [ ] PDF export (financial report)
- [ ] Budget alert at 80% spend
- [ ] Multi-user / team roles
- [ ] PostgreSQL for production scalability
- [ ] PWA / offline mode
- [ ] Contractor payment schedule
