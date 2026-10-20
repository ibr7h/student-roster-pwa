-- v3.9 identity staging migration (additive, backward-compatible).
-- Apply ONLY on a test Neon branch before production approval.
-- Does not delete/rename existing tables, members, school objects or licenses.
-- Application rollout must independently enforce pending_activation restrictions.

ALTER TABLE members ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS phone_e164 TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

ALTER TABLE schools ADD COLUMN IF NOT EXISTS activation_status TEXT NOT NULL DEFAULT 'active';

DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='schools_activation_status_allowed') THEN
  ALTER TABLE schools ADD CONSTRAINT schools_activation_status_allowed
    CHECK (activation_status IN ('pending_activation','active','suspended'));
 END IF;
END $$;

-- Abort the transaction if case-insensitive duplicates exist.
-- Existing school-scoped uniqueness continues to apply.
CREATE UNIQUE INDEX IF NOT EXISTS members_username_global_ci_uidx
  ON members (lower(username));
CREATE UNIQUE INDEX IF NOT EXISTS members_verified_email_global_ci_uidx
  ON members (lower(email)) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS school_signup_challenges (
  id TEXT PRIMARY KEY,
  school_name TEXT NOT NULL,
  school_type TEXT NOT NULL CHECK (school_type IN ('boys','girls','early')),
  ministry_code TEXT NOT NULL CHECK (ministry_code ~ '^[0-9]{5,12}$'),
  manager_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_e164 TEXT NOT NULL,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  otp_hmac TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 10),
  expires_at TIMESTAMPTZ NOT NULL,
  resend_after TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS school_signup_challenges_expires_idx
  ON school_signup_challenges (expires_at);
CREATE INDEX IF NOT EXISTS school_signup_challenges_email_lookup_idx
  ON school_signup_challenges (lower(email));
CREATE INDEX IF NOT EXISTS school_signup_challenges_username_lookup_idx
  ON school_signup_challenges (lower(username));

-- Temporary OTP challenges are removed via a scheduled/periodic safe cleanup
-- implemented in the API. Never log or store raw OTP or raw passwords.
