# School Evidence SaaS — Neon integration status (2026-10-19)

**Neon project:** `school-evidence-platform` (`delicate-dream-25891814`) in AWS Frankfurt.
**Neon branch:** `production`.
**Cloud database:** `neondb`.
**Object bucket:** `uploads`, private.

## Done and verified
- Created the separate Neon project through Neon Console.
- Initialized eight tenant-aware PostgreSQL tables from the existing v3.2 database schema.
- Inspected tables from Neon; all eight exist and are empty.
- Tested a temporary SQL transaction with two simulated school IDs, writes and school-filtered reads; no permanent test rows remain.
- Confirmed that Neon storage bucket `uploads` is configured private.
- Deployed Neon Function `schoolhealth` to the production branch; Neon reports deployment 1 as `completed`. This function only checks runtime configuration, it is NOT the application API.
- Neon SQL smoke test used two temporary school identifiers; filtered select returned only the matching identifier. The database itself remains empty.
- Existing v3.2 backend's 18 Node tests pass locally (not database integration tests).

## Not done
- The v3.2 web frontend is statically hosted on Render; it does **not** have a live app backend.
- The v3.2 server is a Node HTTP listener: it cannot be deployed to Neon Functions as-is.
- File upload routes currently store `BYTEA` in PostgreSQL, not Neon Object Storage.
- No real login or cross-school API integration tests have passed. The Function deployment was confirmed by Neon control plane, but its HTTPS endpoint could not be invoked from this environment.
- No production backup/restore test or security acceptance has been done.
- Do not use real school/student information yet.

## CLI setup on a networked developer computer
Run at a checked-out copy of this branch:

```bash
npm i -g neon@latest
neon login
neon link --project-id delicate-dream-25891814 --branch production
neon deploy
```

`neon.ts` provisions `uploads` and the *infrastructure-only* health function.
Never commit `.env`, `.env.local`, the DB connection string, or S3 credentials.
The actual application API requires a separate deployment from the full v3.2 development source, with secure secrets injected by the host.

All changes were made in this isolated GitHub branch. The Render school preview and all Dhahabk services were left unchanged.
