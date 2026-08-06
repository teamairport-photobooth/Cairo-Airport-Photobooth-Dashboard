<!--
Sync Impact Report:
- Version change: Initialized -> v1.0.0
- Modified principles: Initialized core governance principles for Cairo Airport AI Photobooth Dashboard
- Added sections: Core Principles, Technology & Security Constraints, Development & Quality Workflow, Governance
- Removed sections: Template placeholders
- Follow-up TODOs: None
-->

# Cairo Airport AI Photobooth Dashboard Constitution

## Core Principles

### I. Security & Role-Based Access Control (NON-NEGOTIABLE)
All administrative operations—including project quota management, user role assignments, and API key updates—MUST be strictly protected by Supabase Auth Role-Based Access Control (RBAC) checks (`ADMIN` vs `REGULAR` roles). Sensitive secrets (such as Cloudinary API Secrets and Supabase Service Role keys) MUST NEVER be exposed to client-side bundles or public endpoints.

### II. Data Integrity & Quota Reliability
Generation counters (`dailyLimit`, `currentGenerations`), usage logs, and status transitions (`active`, `paused`, `exhausted`) MUST accurately reflect real-world photobooth activity without race conditions or state desynchronization.

### III. Type Safety & API Contract Consistency
Strict TypeScript definitions (`User`, `Project`, `CloudinaryImage`, `UsageLog`, `GlobalSettings`) MUST be enforced across all components, hooks, and services. Field mapping between database schemas (snake_case) and application interfaces (camelCase) MUST be explicitly normalized at service boundaries.

### IV. High-Visual Quality & Modern UX
The interface MUST adhere to high aesthetic standards utilizing Next.js 16 App Router, Tailwind CSS, Lucide icons, and Recharts. All asynchronous operations (authentication loading, media fetching, chart rendering) MUST include clear loading indicators and graceful fallback UI.

### V. Code Quality & Modularity
Business logic, database clients (`supabase`), media services (`cloudinaryService`), and state context (`AuthContext`) MUST remain cleanly decoupled from presentation UI. Code additions must remain focused, reusable, and readable.

## Technology & Security Constraints

- **Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS.
- **Backend & Auth**: Supabase (Google OAuth + PostgreSQL).
- **Media Engine**: Cloudinary API using tag-based asset isolation.
- **Environment**: All API keys and environment variables MUST be validated at startup and managed via `.env.local`.

## Development & Quality Workflow

- **Type Checking**: All code MUST compile without TypeScript errors (`tsc --noEmit`).
- **Code Reviews**: Every PR and code modification MUST be audited against the Core Principles, specifically inspecting security boundaries and RBAC checks.
- **Documentation**: Updates to features or APIs MUST update the corresponding project documentation and type definitions.

## Governance

- This Constitution supersedes all informal or unwritten development practices within the project.
- Any modifications to core principles or security controls require a documented proposal, semantic version bump of this constitution, and team consensus.
- All code reviews MUST explicitly verify compliance with this document.

**Version**: 1.0.0 | **Ratified**: 2026-08-05 | **Last Amended**: 2026-08-05
