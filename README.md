# Legal Metrology Packaged Commodities Compliance Checker

A working MVP: officers scan packaged-commodity images, an OCR pipeline extracts the
mandatory declarations, and a deterministic rule engine (never an LLM) decides
COMPLIANT / NON_COMPLIANT / NEEDS_HUMAN_REVIEW / ANALYSIS_FAILED. Reviewers confirm
or reject flagged items before a PDF report is generated.

## Stack
- Frontend: React (Vite) + Tailwind CSS + React Router + Recharts
- Backend: Node.js + Express
- DB/ORM: PostgreSQL + Prisma
- Auth: JWT (bcrypt password hashing)
- OCR: Tesseract.js (local, no API key required) behind a swappable interface

## Design principle carried through the code
`services/ocrService.js` only ever produces `{ value, confidence }` — it never
decides compliance. `services/ruleEngine.js` is the only place a verdict is
computed, using plain conditional logic against versioned `Rule` rows. A
declaration that wasn't detected is always routed to `NEEDS_HUMAN_REVIEW`,
never auto-reported as a confirmed violation. See the comments at the top of
both files for the reasoning.

Two rules (`RULE-LM-006`, `RULE-LM-007`) are seeded as `DRAFT` with
`requiresLegalVerification: true` — these are placeholders for the exact MRP
format and font-size requirements from the actual 2011 Rules text, which
weren't provided in the brief. They can't be activated from the UI until an
admin fills in real validation logic.

## Project layout
```
app/
├── backend/     Express API, Prisma schema, OCR + rule engine services
└── frontend/    React + Tailwind UI
```

## Quick start

### 1. Backend
```bash
cd backend
cp .env.example .env        # then fill in DATABASE_URL and JWT_SECRET
npm install
npx prisma migrate dev --name init
npm run seed                 # seeds rules + demo users (see below)
npm run dev                  # http://localhost:4000
```

### 2. Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev                  # http://localhost:5173
```

### Demo accounts (created by `npm run seed`, password for all: `Password123!`)
| Email | Role |
|---|---|
| admin@demo.gov.in | ADMIN |
| officer@demo.gov.in | OFFICER |
| reviewer@demo.gov.in | REVIEWER |

### Demo flow
Log in as **officer** → New Inspection → upload 1-3 package photos → Run OCR
analysis → Evaluate compliance → note the flagged items → log in as
**reviewer** (or use an ADMIN account) → confirm/reject each flagged item →
generate the PDF report → check the Dashboard totals update.

## Known MVP simplifications (documented, not hidden)
- OCR runs synchronously in the request (fine for a handful of demo images;
  a real deployment would queue this).
- `/uploads` is served without auth because a plain `<img>` tag can't send a
  Bearer token — filenames are randomized instead. Swap for signed cloud
  storage URLs in production.
- Field extraction is regex-based over Tesseract's raw text, not a
  cloud vision model — swap `services/ocrService.js`'s provider if you have
  a Gemini/OpenAI/Google Vision API key and want higher OCR accuracy.
- Font-size / physical readability compliance is **not** automatically
  measured (see RULE-LM-007) — this needs either a calibrated capture
  process or manual verification, and is left as a documented gap rather
  than a guessed threshold.
