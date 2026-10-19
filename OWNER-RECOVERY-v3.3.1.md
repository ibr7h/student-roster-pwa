# School Evidence v3.3.1 — Owner recovery

This changes **only** the school-evidence staging application.

Owner password recovery is available at `/owner-recover.html`. The owner must supply the existing 32+ character `PLATFORM_SETUP_TOKEN` configured in the school Render service, their existing owner username, and a new 12+ character password. The backend checks the token using a timing-safe comparison. A token can be redeemed for recovery only once (hashed fingerprint in `owner_recovery_uses`). All previous owner sessions are invalidated on success. Rotate `PLATFORM_SETUP_TOKEN` in Render after recovering to enable future emergency recovery.

No user accounts, schools, evidence objects, database passwords or school license records are deleted.

Build and automated tests run in the isolated branch's GitHub Actions workflow before the updated backend archive is committed. Do not disclose the token, password, or database connection string in tickets or chats.

Deployment target: school-evidence-v33-cloud-preview.onrender.com. Archive upgrade creates `owner_recovery_uses` on startup.
