# Static school PWA v3.7 smoke verification

- Verified at (UTC): 2026-10-20T10:29:45Z
- Public static interface, owner and activation pages: HTTP 200
- API health and database: HTTP 200
- Approved-origin CORS preflight: HTTP 204
- Unauthorized school data and fake bearer: HTTP 401
- Untrusted origin: no CORS access
- Service worker asset version: v3.7.0

School login, uploads and reviewer shares still require end-to-end user-account tests.
