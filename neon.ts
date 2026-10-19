import { defineConfig } from "@neon/config/v1";

/**
 * School Evidence SaaS: isolated Neon project.
 * Project: delicate-dream-25891814
 * Branch: production
 *
 * This configuration provisions shared backend primitives only.
 * The existing Express-style Node HTTP server is not a Neon Function
 * and needs a migration or a separate Node hosting runtime.
 */
export default defineConfig({
  auth: false,
  dataApi: false,
  buckets: { uploads: {} }, // Private evidence bucket.
  functions: {
    schoolhealth: {
      name: "School Evidence Neon health check",
      source: "./functions/schoolhealth.mjs",
    },
  },
});
