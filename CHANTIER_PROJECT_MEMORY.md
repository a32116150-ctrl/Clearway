# 🏗️ Chantier — Project Memory & Complete Guide

> **Last updated:** 2026-05-01 — Phase 9: Manual Furniture Library & Placement  
> **Purpose:** Living memory of the Chantier project. Every architectural decision, feature built, file, API, and evolution from day one. Single source of truth.

> ⚠️ **Maintenance rule:** After every feature or fix, update this file AND `README.md` before finishing.
> 
> ## 🔴 CRITICAL NEXT STEPS (DO THIS FIRST)
> 1. **Database Setup**: Create a **Neon.tech** PostgreSQL database.
> 2. **Environment Variables**: Update `.env` (local) and Vercel dashboard with the new `DATABASE_URL` and `JWT_SECRET`.
> 3. **Sync Schema**: Run `npx prisma db push` from the `backend/` folder to initialize the new database.
> 4. **Test Connection**: Run the app locally with the new DB to verify account creation works and persists.
> 5. **Vercel Deploy**: Import the repo to Vercel and check that the build succeeds.

---

## 📌 What Is Chantier?

**Chantier** (French for "construction site") is a **mobile-first SaaS web application** for construction project managers in Tunisia. It centralizes budget tracking, contractor management, expense logging, document storage, and 3D floor plan visualization in one bilingual (FR/AR) tool.

### The Problem It Solves
Small construction businesses in North Africa manage budgets, contractors, and documents through WhatsApp, paper notebooks, or spreadsheets. Chantier replaces all of that.

### Core Purpose
- Track multiple construction **projects** with budgets (TND)
- Log **expenses** per project and per contractor
- Manage **contractors** and their payment history
- Store **documents** (permits, plans, contracts)
- Visualize **floor plans in 3D** from the browser
- Work in **French** and **Arabic (RTL)**
- Run on **mobile** (job site) and **desktop** (office)

---

## 🧱 Technology Stack

### Frontend
| Technology | Version | Role |
|------------|---------|------|
| React | 18.x | UI framework |
| Vite | 5.x | Build tool & dev server |
| React Router DOM | 6.x | Client-side routing |
| Axios | 1.x | HTTP client |
| i18next + react-i18next | latest | FR/AR internationalization |
| Lucide React | latest | Icon library |
| Three.js | latest | 3D floor plan viewer |
| Vanilla CSS | — | All styling (no Tailwind/UI libs) |

### Backend
| Technology | Version | Role |
|------------|---------|------|
| Node.js | 18+ | Runtime |
| Express | 5.x | HTTP server |
| Prisma ORM | 6.4.1 | Database abstraction |
| SQLite | — | Database (file: dev.db) |
| bcryptjs | 3.x | Password hashing |
| jsonwebtoken | 9.x | JWT auth |
| multer | 2.x | File upload handling |
| dotenv | 17.x | Environment variables |
| cors | 2.x | Cross-origin requests |
| nodemon | 3.x | Dev auto-restart |

---

## 📁 Full File Structure

```
chantier/
├── run.sh                          # One-command launcher (backend + frontend)
├── README.md
├── CHANTIER_PROJECT_MEMORY.md      # This file
│
├── backend/
│   ├── index.js                    # Express app entry point
│   ├── prismaClient.js             # Shared Prisma client singleton
│   ├── .env                        # PORT, JWT_SECRET, DATABASE_URL
│   ├── dev.db                      # SQLite database (auto-created)
│   ├── middleware/
│   │   └── auth.js                 # JWT verification middleware
│   ├── routes/
│   │   ├── auth.js                 # POST /register, POST /login
│   │   ├── projects.js             # CRUD: projects, expenses, contractors
│   │   └── documents.js            # File upload and delete
│   ├── uploads/                    # Uploaded files stored locally here
│   └── prisma/
│       ├── schema.prisma           # Database schema
│       └── migrations/             # SQL migration history
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx                # React entry point
        ├── App.jsx                 # Router + Header + Auth guard
        ├── index.css               # Complete design system (all CSS)
        ├── i18n.js                 # i18next configuration
        ├── context/
        │   └── AuthContext.jsx     # user, token, login, logout state
        ├── locales/
        │   ├── fr/translation.json # ~55 French keys
        │   └── ar/translation.json # ~55 Arabic keys
        ├── components/
        │   └── FloorViewer3D.jsx   # Three.js 3D viewer component
        └── pages/
            ├── Login.jsx
            ├── Register.jsx
            ├── Dashboard.jsx       # Main dashboard
            └── ProjectDetails.jsx  # Per-project page
```

---

## 🗄️ Database Schema

```
User
  id, name, email (unique), password (hashed), createdAt
  → has many Projects

Project
  id, name, description?, budget, location?, startDate?, userId (FK), createdAt
  → has many Expenses, Contractors, Documents

Expense
  id, amount, category (default: مواد), note?, date, projectId (FK), contractorId? (FK), createdAt

Contractor
  id, name, phone?, specialty?, teamSize, totalBudget, advancePaid, suppliesDetails?, projectId (FK), createdAt
  → has many Expenses (linked payments), Documents (paperwork)

Document
  id, name, url (file path), projectId (FK), contractorId? (FK), createdAt
```

**Cascade rules:** Deleting a Project deletes all Expenses, Contractors, Documents.

---

## 🔌 API Reference

**Base URL:** `http://localhost:5001`  
**Auth:** All routes except `/api/auth/*` require `Authorization: Bearer <token>`

### Auth
| Method | Endpoint | Body |
|--------|----------|------|
| POST | `/api/auth/register` | `{name, email, password}` |
| POST | `/api/auth/login` | `{email, password}` |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | All user projects (includes relations) |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Single project with all relations |
| DELETE | `/api/projects/:id` | Delete project + cascade |
| POST | `/api/projects/:id/expenses` | Add expense |
| DELETE | `/api/projects/:id/expenses/:expenseId` | Delete expense |
| POST | `/api/projects/:id/contractors` | Add contractor (name, specialty, phone, teamSize, totalBudget, advancePaid, supplies) |
| PUT | `/api/projects/:id/contractors/:contractorId` | Edit contractor details |
| DELETE | `/api/projects/:id/contractors/:contractorId` | Delete contractor |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/documents/:projectId` | Upload file (multipart, field: `file`, optional: `name`, `contractorId`) |
| DELETE | `/api/documents/:id` | Delete document + file from disk |

---

## 🔐 Authentication Flow

1. Register → password bcrypt-hashed → JWT (7d) returned
2. Token stored in `localStorage` via `AuthContext`
3. Axios interceptor adds `Authorization: Bearer <token>` to every request
4. Backend middleware decodes token → sets `req.user.id`
5. All queries scoped to `req.user.id` (users only see own data)

---

## 🎨 Design System

All CSS in `src/index.css`. Key tokens:

```css
--primary:       #10b981  (Emerald green — brand)
--accent:        #6366f1  (Indigo — secondary)
--warning:       #f59e0b  (Amber — caution)
--danger:        #ef4444  (Red — delete/over-budget)
--bg-color:      #f0f4f8  (Light mode)
--card-bg:       #ffffff
--radius-lg:     18px
--radius-xl:     24px
```

Dark mode: `[data-theme="dark"]` selector, toggled via Moon/Sun button.  
RTL: `document.documentElement.dir = 'rtl'` on Arabic switch.

---

## 📱 Features by Page

### Dashboard
1. Global hero banner (Total Budget / Spent / Remaining across all projects)
2. 4 KPI stat cards with icons
3. Category breakdown chart (horizontal bars)
4. Project grid (1→2→3 columns responsive) with:
   - Budget/Spent/Remaining row
   - Color-coded spend bar (green→yellow→red)
   - "Over budget" badge
5. Recent expenses activity feed (last 6)
6. Add project modal (bottom-sheet on mobile)
7. Success toast after creating project

### ProjectDetails
**Hero card:** Name, location, start date, financial summary, spend bar

**Tabs:**
- **Expenses:** Category mini-chart + expense grid cards + Add modal (amount, date, category, contractor link, note)
- **Contractors:** Cards with avatar, team size, budget usage progress, and total paid. Clicking a card navigates to the **Contractor Dashboard**.
- **Documents:** Project-wide file grid.

### FloorViewer3D (Component)
Triggered by clicking "3D" on an image document.

- Floor plan image → WebGL texture on a 12×12 floor plane
- 4 auto-generated white walls (3 units tall) with green trim
- Ambient + directional lighting, fog, grid overlay
- **Orbit mode:** drag to rotate, scroll/pinch to zoom
- **Walk mode:** WASD + mouse (pointer lock first-person)
- Toolbar: mode toggle, zoom, reset, close
- Runs at 60fps, zero backend processing required

---

## ▶️ Running the App

```bash
cd /Users/anoircherif/Desktop/BAZZ/chantier
chmod +x run.sh
./run.sh
```

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:5001

> Port 5001 used because macOS reserves 5000 for AirPlay.

---

## ⚙️ Environment Variables (`backend/.env`)

```
PORT=5001
JWT_SECRET=your_secret_key_here
DATABASE_URL="file:./dev.db"
```

---

## 🔄 Development History

### Phase 1 — MVP Foundation
- Express + Prisma + SQLite backend
- User/Project/Expense models
- JWT auth (register/login)
- Basic React frontend

### Phase 2 — Features
- Contractor model + API + UI
- Document upload (multer) + API + UI
- Dashboard budget stats

### Phase 3 — Infrastructure Fixes
- Auth bug fixed (body-parser ordering)
- Port 5000 → 5001 (macOS conflict)
- Prisma 6.4.1 stability fix

### Phase 4 — Internationalization
- i18next setup, FR/AR translation files
- RTL layout support
- Fixed nested key bug (flattened all keys)
- All UI strings use `t('key')`

### Phase 5 — Responsiveness
- Removed 480px max-width cap
- Fluid 1→2→3 column grid
- Desktop centered card container
- Mobile full-width edge-to-edge

### Phase 6 — Major UI/UX Overhaul
- Design system rewritten (new tokens, components, animations)
- Dashboard: hero banner, KPI cards, category chart, activity feed, modal forms
- ProjectDetails: hero header, category chart, grid cards, modal forms, back nav
- All forms moved into modal overlays

### Phase 7 — 3D Floor Plan Viewer
- Installed Three.js
- Built FloorViewer3D component (pure WebGL, no AI)
- Orbit + Walk (first-person) modes
- Integrated in Documents tab as "3D" button on image files

---

## 🐛 Known Limitations

| Issue | Notes |
|-------|-------|
| No file size validation | Large uploads accepted silently |
| SQLite single-writer | Fine for MVP; use PostgreSQL for production |
| JWT in localStorage | Acceptable for MVP; httpOnly cookies safer |
| No expense editing | Delete + re-add workaround |
| Uploads not auth-protected | `/uploads/*` is public static |
| 3D walls are generic | No wall detection from floor plan pixels |
| No search/filter | Future feature |

---

## 🚀 Roadmap Ideas

1. Project status field (Planning / In Progress / Done)
2. Expense editing (not just delete/re-add)
3. PDF export (project financial report)
4. Photo gallery view for image documents
5. Budget alert (notify at 80% spend)
6. Multi-user / team collaboration with roles
7. Project templates (pre-set budget categories)
8. Cost forecasting based on burn rate
9. PostgreSQL migration for scalability
10. PWA / offline mode for job sites
11. ~~Floor plan wall auto-detection~~ ✅ Done (Phase 8)
12. Contractor payment schedule / calendar

---

## 🔄 Phase 8 — Intelligent 3D Wall Detection (2026-05-01)

**Problem:** The first version of FloorViewer3D placed 4 generic box walls around the perimeter of the room, completely ignoring the actual floor plan layout.

**Solution:** Canvas pixel analysis — no AI, no backend, pure browser math.

### How It Works

```
Floor plan image (any JPG/PNG)
        ↓
Draw onto an offscreen 90×90 canvas (downsampled)
        ↓
Read every pixel's brightness via getImageData()
  brightness = R×0.299 + G×0.587 + B×0.114  (perceptual luma)
        ↓
bright < 85   → solid wall cell   (structural walls are dark)
85 – 160      → window/opening    (thin lines, medium gray)
> 160         → open space        (white rooms, corridors)
        ↓
Each wall cell → BoxGeometry at the correct (x, z) world position
All cells      → Three.js InstancedMesh (single GPU draw call)
```

### Key Constants (top of FloorViewer3D.jsx)

| Constant | Value | Meaning |
|----------|-------|---------|
| `GRID` | 90 | Analysis resolution (90×90 = 8100 cells max) |
| `WORLD` | 14 | Scene size in Three.js world units |
| `WALL_H` | 2.8 | Wall height in world units |
| `WALL_THRESH` | 85 | Below = solid wall (darkness) |
| `WIN_THRESH` | 160 | Below WALL_THRESH threshold = window sill |
| `CELL` | WORLD/GRID | Cell size in world units |

### Visual Result
- **Solid white/gray walls** appear where the dark wall lines are in the floor plan
- **Short transparent blue sills** appear at window/door openings (medium gray areas)
- Floor plan image remains as the floor texture
- Walk mode lets you navigate through actual room layout
- `InstancedMesh` keeps performance at 60fps regardless of wall count

### Limitations
- Resolution is 90×90 — very thin wall lines (<1% of image width) may be missed
- Relies on contrast; colored floor plans may need threshold tuning
- No structural understanding (can't distinguish door openings from walls automatically)
- Thresholds `WALL_THRESH` and `WIN_THRESH` are adjustable at the top of the file

---

## 🔄 Phase 8b — 3D Viewer Fixes: Aspect Ratio + Furniture Filter (2026-05-01)

**Problems identified from user screenshot:**

1. **Squished plan** — floor plane was always square (14×14 world units) regardless of image shape
2. **Furniture poles** — toilet outlines, sofas, kitchen items are thin dark lines that passed the darkness threshold
3. **No window gaps** — window/door sills approach was creating extra geometry, not helping

**Fixes applied:**

### Fix 1 — Aspect ratio preserved
```
naturalWidth / naturalHeight = aspect ratio
if portrait (ratio < 1): gridW = GRID * ratio, gridH = GRID
if landscape (ratio > 1): gridW = GRID, gridH = GRID / ratio
worldW = WORLD * ratio (or WORLD for the longer dimension)
worldD = WORLD / ratio (or WORLD for the longer dimension)
Floor plane = PlaneGeometry(worldW, worldD) — matches image exactly
```

### Fix 2 — Thickness filter removes furniture
```
For every dark cell, count dark neighbours in 3×3 kernel (8 max)
Only mark as WALL if neighbours >= MIN_NEIGH (= 3)

Why it works:
  Structural walls = 3-5 cells thick → interior cells have 6-8 dark neighbours ✅
  Furniture lines  = 1 cell thin     → cells have 1-2 neighbours along line  ❌ filtered out
  Dimension lines  = 1 cell thin     → same as furniture                      ❌ filtered out
```

### Fix 3 — Removed window sill geometry
Dropped the medium-gray "window" sill approach entirely. It was producing random
transparent poles at furniture positions. Window/door openings in floor plans are simply
gaps (white cells) inside wall lines — they show up naturally as holes in the wall geometry.

### Updated constants
| Constant | Value | Notes |
|----------|-------|-------|
| `GRID` | 100 | Increased from 90 for better resolution |
| `DARK` | 110 | Renamed from WALL_THRESH, slightly higher to catch mid-gray walls |
| `MIN_NEIGH` | 3 | New: minimum dark neighbours for thickness filter |
| `WALL_H` | 2.8 | Unchanged |
| `WORLD` | 14 | Unchanged (applied to longer dimension) |

---

## 🏗️ Architecture

```
Browser
  ├── Auth Pages (Login / Register)
  ├── Dashboard (Stats + Project Grid + Expense Feed)
  ├── ProjectDetails (Expenses | Contractors | Documents)
  └── FloorViewer3D (Three.js WebGL — fullscreen)
         │
         │ HTTP (axios) + Authorization: Bearer <JWT>
         ▼
Express Backend :5001
  ├── /api/auth      → auth.js
  ├── /api/projects  → projects.js (+ expenses, contractors)
  ├── /api/documents → documents.js
  └── /uploads/*     → static file serving
         │
         │ Prisma ORM
         ▼
SQLite (dev.db)
  User → Project → Expense
                 → Contractor
                 → Document
                       │
                       ▼
              backend/uploads/ (local files)
```

---

*Update this file every time a significant feature is added or a major decision is made.*

---

## 🛋️ Phase 9 — Manual Furniture Library & Placement (2026-05-01)

**User Objective:** Add doors, windows, and furniture manually to the 3D model.

### Key Innovations
1. **Interactive Furniture Catalogue:** A retractable sidebar featuring 14 custom-built 3D items across 5 categories (Structure, Sièges, Tables, Chambres, Sanitaire, Déco).
2. **Raycasting Placement System:** 
   - Uses `THREE.Raycaster` to project mouse coordinates onto the 3D floor plane.
   - **Ghost Preview:** Shows a semi-transparent version of the object following the cursor before placement.
   - **One-Click Placement:** Clicking on the floor instantiates the full 3D group at that coordinate.
3. **Object Manipulation:**
   - **Selection:** Clicking on a placed object selects it and opens manipulation tools.
   - **Rotation:** 45-degree incremental rotation (`rotation.y += Math.PI / 4`).
   - **Deletion:** Complete removal from the scene and internal tracking array.

### Technical Implementation (`furniture.js`)
Instead of heavy GLTF models, items are built using optimized Three.js primitives (`BoxGeometry`, `CylinderGeometry`) and `MeshStandardMaterial`. This keeps the app lightweight and ensures high performance even with dozens of items.

| Item Type | Category | Features |
|-----------|----------|----------|
| `door` | Structure | Frame + Panel + Handle |
| `window` | Structure | Frame + Transparent Glass |
| `sofa` | Sièges | 2.0m wide, detailed cushions |
| `bed` | Chambres | 1.6m wide, headboard + pillows |
| `toilet` | Sanitaire | Base + Tank + Lid |

### Interaction Logic
- **`onMouseDown`**: Handles both placement (if `placing` is active) and selection (via raycasting intersects).
- **`onMouseMove`**: Updates ghost preview position and handles camera movement.
- **`placedRef`**: Tracks all instantiated furniture groups for efficient collision/selection checks.

---
---

## 🏗️ Phase 10 — Enhanced Manipulation & Custom Wall Tool (2026-05-01)

**User Objective:** Move objects after placement and manually add structural walls with custom dimensions.

### 🎮 New Interactions
1. **Drag & Move Engine**:
   - Integrated a secondary raycasting state (`draggingRef`) to track object displacement.
   - **How it works**: If an object is already selected, clicking and holding it triggers "Drag Mode". The object's position is mapped in real-time to the floor intersection points.
   - Ensures furniture can be fine-tuned after the initial placement.

2. **Custom Wall System**:
   - Added `wall_custom` item to the catalogue (under **Structure**).
   - Unlike standard furniture, the custom wall features **Independent Axis Scaling**.
   - **Specialized Controls**: The selection panel dynamically switches to 3 sliders (Longueur, Épaisseur, Hauteur) when a wall is selected.
   - **Purpose**: Bridge gaps in auto-detected floor plans or add new partitions and structural columns manually.

### 🛠️ Technical Updates (`FloorViewer3D.jsx`)
- **State Management**: Added `selDim` to track non-uniform scales for walls independently from the global `selScale`.
- **UI Logic**: Implementation of a dynamic selection panel that adjusts based on `selectedId`.
- **Selection Box**: Improved the `selBoxRef` logic to recalculate the wireframe boundary whenever the object is scaled or rotated, providing precise visual feedback.

### 🐛 Fixed 3D Logic
- Removed non-existent `'place'` mode check in event handlers.
- Updated help hint icons (Mouse 🖱️ → Keyboard ⌨️) for WASD movement.
- Implemented `onCloseRef` to handle prop updates without re-initializing the entire WebGL scene.

---

## 🏗️ Phase 11 — 3D Editor Upgrade: Editable Auto-Walls (2026-05-01)

**User Objective:** Modify or delete walls that were automatically detected from the floor plan.

### 🛠️ Rectangular Decomposition
The 3D engine was upgraded from a static `InstancedMesh` (non-editable block) to a **Rectangular Decomposition** pipeline:
1. **Segment Analysis:** The floor plan analysis now groups adjacent wall pixels into logical rectangles.
2. **Selectable Objects:** Each detected segment is instantiated as an individual `wall_custom` object in the `placedRef` array.
3. **Full Granularity:** Users can click on any "automatic" wall and use the 3D sliders to:
   - Change its **Longueur** (to fix gaps or extend rooms).
   - Adjust **Épaisseur** (Thickness) to match real site measurements.
   - **Delete** incorrect segments (e.g., furniture detected as walls).

### 🐛 3D Navigation Fixes
- **Horizon Reset:** Fixed the "sideways tilt" bug by forcing camera Z-rotation to 0 and resetting the Up vector on mode switch.
- **Pitch Control:** Re-enabled vertical look (Pitch) in Walk mode for a fluid first-person experience.

---

## 📊 Phase 12 — Advanced Contractor Dashboards & Paperwork (2026-05-01)

**User Objective:** Deep detailed oversight of entrepreneurs, their budgets, and their official documents.

### 🏠 The Entrepreneur Dashboard (`ContractorProfile.jsx`)
Moved from a simple modal to a dedicated **full-page professional command center**:
1. **Financial Intelligence**:
   - Tracking of **Total Budget**, **Advance Payments** (Avances), and **Total Paid**.
   - **Budget Health Bar**: Visual progress indicator (turns red if exceeding budget).
   - **Math Stability**: Fixed `NaN` errors with proper default value handling.
2. **Team & Logistics**:
   - **Team Size Tracking**: Record how many persons are working under each contractor.
   - **Supplies Vault**: Dedicated notes section for tracking materials/supplies at their charge.
3. **Paperwork Vault (EDM)**:
   - **Direct Linking**: Documents can now be linked directly to a contractor (Factures, Devis, Bons de commande).
   - **Profile-Specific Feed**: Contractors have their own document list, separate from the general project files.
4. **CRUD Enhancements**:
   - Implemented a full **Edit Contractor** workflow.
   - Updated DB schema and API routes to support the expanded profile fields.

---

## 🚀 Phase 13 — Production Readiness & Vercel Migration (2026-05-01)

**User Objective:** Move from a local development environment (SQLite) to a persistent, production-grade cloud hosting (Vercel + PostgreSQL).

### Key Architectural Changes
1. **Prisma Provider Swap**: Migrated from `sqlite` to `postgresql` in `schema.prisma`. This allows the app to use a persistent cloud database like **Neon**, since Vercel's filesystem is read-only/stateless.
2. **Serverless Backend**: Updated `backend/index.js` to export the `app` instance, allowing Vercel to treat the Express server as a **Vercel Function**.
3. **Monorepo Orchestration**: Created `vercel.json` in the root to handle routing:
   - `/api/(.*)` → Routes to the Express backend.
   - `/(.*)` → Routes to the Vite frontend.
4. **Environment Fluidity**:
   - Frontend updated to use relative paths (`/api`) for API calls.
   - `vite.config.js` updated with a `server.proxy` to maintain local development functionality (mapping `/api` to `localhost:5001`).

### Deployment Checklist
1. **Neon Database**: Provides the persistent storage.
2. **Vercel Projects**: Handles the hosting of both frontend and backend.
3. **Prisma DB Push**: Required to sync the local schema with the cloud DB (`npx prisma db push`).
