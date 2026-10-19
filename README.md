# School Evidence Platform — v3.3 Neon Cloud Preview

This isolated branch packages the v3.2 mobile frontend from `site.zip` and a versioned v3.3 Node backend in `backend-package.b64` (Brotli tarball). No changes to the gold-app repositories or old static school previews.

## Render Node Web Service
Region: Frankfurt · Runtime: Node · Plan: free (preview, subject to limits).
Build command:

```bash
unzip -q -o site.zip -d public && node -e "const fs=require('node:fs');const z=require('node:zlib');fs.writeFileSync('school-backend.tar',z.brotliDecompressSync(Buffer.from(fs.readFileSync('backend-package.b64','utf8').trim(),'base64')))" && tar -xf school-backend.tar && node patch-release.mjs && npm install --no-audit --no-fund && npm run build
```

Start command: `npm start`.

Required secret environment variables (server-only; never expose in browser):
- `DATABASE_URL` — Neon pooled Postgres URI
- `PLATFORM_SETUP_TOKEN` — random one-time setup token, 32+ characters
- `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- `STORAGE_BUCKET=uploads`
- `NODE_ENV=production`

## Data isolation
Activation requires a unique 5–12 digit ministry number. Each evidence file in Neon private object storage is saved under `<ministry-number>/evidence/<uuid>`. The backend authorizes each request with school_id, section role, and current license, and validates the object prefix; no public bucket links.
The ministry number is immutable from the school profile; corrections need an administrator-controlled migration of objects and records.

## Mobile
PWA display is standalone and portrait; mobile viewport is constrained to screen width. Only reports and explicitly scrollable regions can scroll horizontally. Touch and pinch controls try to prevent accidental zoom; operating-system accessibility controls may override.

## Remaining production gates
Run hosted integration tests for account setup, owner login, serial activation/renewal, school isolation, uploads, downloads, export/import; configure backups, audit logs, student data residency approvals, malware scanning and MFA before handling real student data.
