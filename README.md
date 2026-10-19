# School Evidence Cloud V2 — isolated deployment branch

This branch is an **independent cloud edition** of the Arabic school evaluation PWA. The original static site and the student roster `main` are unchanged.

## Source and build
- `site.zip` — original approved PWA assets (v1).
- `cloud-backend.tar.br` — Brotli-compressed TAR of the backend source, API schema, cloud migration UI transformation, and security library. The source is also available in the user-facing source archive.
- Node.js 22 required. Build from the repository root:

```sh
unzip -q -o site.zip -d public
node -e "const fs=require('fs'),z=require('zlib');fs.writeFileSync('backend.tar',z.brotliDecompressSync(fs.readFileSync('cloud-backend.tar.br')))"
tar -xf backend.tar
node backend/apply-patch.mjs
npm install --prefix backend --omit=dev --no-audit --no-fund
node --check backend/server.mjs
```

Start command: `node backend/server.mjs`. Health: `GET /api/health` (503 until an **independent** PostgreSQL is configured). Run no sensitive user workloads until health is 200 and first administrator setup completed.

## Environment (Render Web Service)
- `DATABASE_URL`: a separate, durable PostgreSQL database, NEVER the Dhahabk database.
- `SCHOOL_SETUP_TOKEN`: high-entropy secret at least 24 characters; entered only once for initial admin setup.
- `NODE_VERSION`: 22.

Initial setup is not available until the above are set, DB migrations finish, and first user is created. Passwords: scrypt; cookies: HttpOnly, Secure, SameSite=Strict. Session expiry: 12 hours. Admin grants real server-side permissions. Evidence uploads (6 MB max) are stored as private PostgreSQL BYTEA (suitable for a small pilot, not large archive scale). External backups must be configured separately. Old team PINs are intentionally never migrated.

## Limitations
- The original Render Static Site remains active and local-only; there is no live cloud database yet because the Render account already has the maximum one Free Postgres instance and a second DB incurs a charge. Do not use the existing Gold project database.
- A second Render Free web instance can exhaust the shared 750 monthly free instance hours and affect existing services. Do not create a new Render web service without choosing a resource plan that avoids this risk.
- For large evidence volumes, replace database file storage with a private object storage bucket and signed per-user downloads. This first iteration uses PostgreSQL for both rows and small files.
- UI and API unit checks passed, but end-to-end PostgreSQL and iPhone tests require provisioned infrastructure.
