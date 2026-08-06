# Feature Specification: Cairo Airport Photobooth Dashboard Migration & Consolidation

**Feature Branch**: `001-single-project-migration`  
**Created**: 2026-08-05  
**Updated**: 2026-08-06  
**Status**: Completed  

---

## User Scenarios & Testing

### User Story 1 - Backend & Auth Migration to New Provider (Priority: P1)

As an administrator, I want the dashboard to authenticate users via Google OAuth and enforce invite-only whitelisting (`allowed_users`) against our Supabase database instance so that operational access is secured.

**Acceptance Scenarios**:
1. **Given** a user navigating to the login page, **When** they sign in with Google, **Then** the system checks `allowed_users` whitelist and grants access if whitelisted.
2. **Given** an un-whitelisted user attempting sign in, **Then** they see an "Access Unauthorized" message and profile creation is blocked.

---

### User Story 2 - Unified Photobooth Console Dashboard (Priority: P2)

As an operator or administrator, I want a single, consolidated dashboard layout with a minimizable sidebar that presents photobooth overview, cumulative generation counts, generation activity charts, and settings without multi-project clutter.

**Acceptance Scenarios**:
1. **Given** an authenticated user, **When** they view the main dashboard page, **Then** they see total generation counts, generations activity charts (with 7D, 30D, 90D, and custom date pickers), and photobooth configuration.
2. **Given** an administrator, **When** they trigger or simulate generation calls via the API integration tool, **Then** the total usage counter increments atomically and logs event timestamps in real time.

---

### User Story 3 - Photobooth Media Gallery & Asset Inspection (Priority: P3)

As a dashboard user, I want to view generated photobooth images, sort by date, perform bulk downloads, and inspect prompt metadata for assets stored under the photobooth Cloudinary tag.

**Acceptance Scenarios**:
1. **Given** photobooth images uploaded to Cloudinary under the project tag (`cairo-airport-photobooth`), **When** the user opens the Generated Images tab, **Then** assets are rendered with sort options (Newest/Oldest), multi-selection mode, bulk download, and metadata inspection modal.

---

## Requirements

### Functional Requirements

- **FR-001**: Connect exclusively to Supabase backend database for sessions, whitelisted access, and project usage logs.
- **FR-002**: Enforce invite-only Google OAuth authentication using the `allowed_users` table.
- **FR-003**: Provide a minimizable/collapsible sidebar navigation system containing **Dashboard**, **User Management** (Admin), and **Global Settings** (Admin).
- **FR-004**: Track cumulative generation usage (`total_usage`) on the project record with atomic incrementing via PostgreSQL RPC (`increment_project_usage`).
- **FR-005**: Render historical generation activity charts using Recharts with flexible range filtering (7D, 30D, 90D, Custom date picker).
- **FR-006**: Integrate Cloudinary media fetching for the photobooth tag with sorting, multi-select bulk downloads, and detailed metadata inspection.

---

## Key Entities

- **AllowedUser**: Whitelisted email record defining permitted users and roles (`ADMIN` or `REGULAR`).
- **Profile**: Authenticated user profile mapped automatically upon whitelisted Google sign-in.
- **Project**: Mapped configuration for Cairo Airport AI Photobooth containing `total_usage` and Cloudinary settings.
- **UsageLog**: Timestamped log record tracking individual generation events.
