# Deployments
<!-- pdlc-template-version: 1.0.0 -->
<!-- Canonical register of deployment environments for this project.
     Maintained by Pulse during the Ship and Verify sub-phases; read by the
     team on every ship to understand the current deployment surface.

     This file answers: where do we deploy, how, with what secrets, how do we
     roll back, and how is each environment identified in our cloud/catalog?

     Claude never writes secret *values* here — only variable names. Real
     values live in your secret store (Vault, AWS Secrets Manager, etc.). -->

**Project:** Kept
**Last updated:** 2026-04-22

---

## Environments

<!-- No environments provisioned yet. Pulse will populate this file during the
     first /pdlc ship by cloning the block below for each target
     (home-network, staging, production, preview, etc.). -->

### Environment: <!-- e.g. production -->

**Purpose:** <!-- One sentence on what this environment is for -->
**URL:** <!-- https://... -->
**Status:** planned

#### Deploy

- **Method:** <!-- GitHub Actions | npm script | Makefile | manual | custom -->
- **Command:** <!-- e.g. `gh workflow run deploy.yml --ref main -f env=prod` -->
- **Workflow file:** <!-- e.g. .github/workflows/deploy.yml -->
- **Custom deploy artifact:** none — default pipeline
- **Latest Deployment Review MOM:** n/a
- **Triggered by:** <!-- who/what is allowed to deploy -->
- **Typical duration:** <!-- e.g. 6 minutes -->

#### Verification

- **Smoke test URL:** <!-- e.g. https://app.example.com/health -->
- **Required smoke checks:** <!-- list what "healthy" means for this env -->

#### Rollback

- **Method:** <!-- automated via workflow | tag revert | manual steps -->
- **Command:** <!-- e.g. `gh workflow run rollback.yml --ref main -f version=v1.2.3` -->
- **Reversibility window:** <!-- e.g. "up to 30 days; blob storage retains old artifacts" -->
- **Last successful rollback:** <!-- date + version, if any -->

#### Required secrets / env vars

| Name | Purpose | Source |
|------|---------|--------|
| DATABASE_URL | postgres (prod) / sqlite file path (dev) | env file / managed-db dashboard |
| S3_ENDPOINT | object storage API endpoint | env file / cloud console |
| S3_REGION | object storage region | env file |
| S3_ACCESS_KEY | object storage access key | secret store |
| S3_SECRET_KEY | object storage secret | secret store |
| S3_BUCKET | bucket name for item images | env file |

#### Tags

| Key | Value | Notes |
|-----|-------|-------|
| app-id | <!-- e.g. kept-prod --> | <!-- assigned by platform team --> |
| cloud-provider | <!-- e.g. Vercel | Fly.io | home-NAS --> | <!-- --> |
| region | <!-- e.g. us-east-1 --> | <!-- primary region --> |
| data-classification | personal-household | <!-- no PII beyond owner-self in v1 --> |
| owner-team | <!-- @owner --> | <!-- on-call / escalation --> |

#### Deployment History

| Date | Version | Deployed by | Episode | Notes |
|------|---------|-------------|---------|-------|
<!-- No deploys yet. -->

#### Notes

<!-- Free-form. Expected first target: home-network single-host (SQLite on NAS/Pi),
     with a migration to managed Postgres (Neon/Supabase/Railway) when going public. -->

---

<!-- ═══════════════════════════════════════════════════════════════════
     END OF ENVIRONMENT BLOCK — clone above for every environment you run.
     ═══════════════════════════════════════════════════════════════════ -->

## Cross-environment references

- **Promotion path:** <!-- TBD — likely dev → staging → production once staging exists -->
- **Shared infrastructure:** <!-- none -->
- **Data migration policy:** <!-- all Drizzle migrations tested on dev DB before applying to staging/prod -->
- **Smoke test dependencies:** <!-- TBD -->

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-04-22 | File scaffolded during `/pdlc init` | PDLC |
