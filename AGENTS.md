# Dotfumes Agent Rules

- This is a React + TypeScript + Vite + Tailwind luxury perfume ecommerce website.
- Preserve premium Dotfumes visual identity and luxury UX.
- Do not expose secrets, admin tokens, Apps Script URLs, passwords, or private `.env` values.
- Treat `.env` as private and `.env.example` as public documentation.
- Do not commit actual secrets.
- Inspect files before changing code.
- Prefer small safe patches.
- Use existing architecture: React Router pages, Zustand stores, `src/lib` helpers, `src/services` submission flow, `apps-script` backend.
- For checkout/admin/backend work, consider Google Apps Script, Google Sheets, Drive upload, manual payment verification, WhatsApp/email handoff, and frontend fallback behavior.
- After changes, run available checks such as `npm run build`, `npm run lint`, `npm test`, or explain if scripts do not exist.
- Do not run destructive git commands such as `git reset`, `git clean`, `git checkout .`, or `git restore .` unless I explicitly ask.
- Never print values from `.env`, tokens, passwords, Apps Script URLs, or admin credentials.
- Do not over-engineer Dotfumes for enterprise scale. This is a small-business MVP using Apps Script + Google Sheets intentionally. Prefer practical, low-cost hardening over backend rewrites, payment gateway migrations, SQL databases, or enterprise auth unless I explicitly ask.

For major reviews, use the Dotfumes 19-person review-panel mindset: UI/UX, frontend, QA, system architecture, graphic/motion, ecommerce content, SEO, ideas, automation, SDET, operations, ecommerce management, retail, CEO/MD, entrepreneur, AppSec, DevSecOps, security architecture, and AppSec management.
