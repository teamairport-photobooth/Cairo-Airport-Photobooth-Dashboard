# Feature Specification: Single-Project Dashboard & Backend Migration

**Feature Branch**: `001-single-project-migration`  
**Created**: 2026-08-05  
**Status**: Draft  

**Input**: User description: "now this project is already implemented and hosted on vercel account, google auth is configured and everything we need to migrate it into new accounts, recreating the database on new supabase account so this is the core task for us, rather than that we will be removing the dashboard analytics and simplifying the dashboard as this will be a single project dashboard"

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Backend & Auth Migration to New Provider (Priority: P1)

As an administrator, I want the dashboard to authenticate users and persist project state against our new database instance and Google OAuth configuration so that operational access is fully transferred away from legacy accounts.

**Why this priority**: Core migration dependency. Without connecting to the new database and authentication environment, no operational actions can take place.

**Independent Test**: Can be tested by signing in via Google OAuth on the new environment and verifying that user sessions and database queries resolve successfully against the new database instance.

**Acceptance Scenarios**:

1. **Given** a user navigating to the login page, **When** they click "Sign in with Google", **Then** they are redirected through the new authentication provider and logged into the dashboard with their user profile loaded.
2. **Given** an authenticated user session, **When** the page is reloaded or opened in a new tab, **Then** the session remains active and valid without authentication errors.

---

### User Story 2 - Simplified Single-Project Dashboard View (Priority: P2)

As an operator or administrator, I want a simplified single-project dashboard interface that eliminates multi-project navigation and complex analytics charts so that I can immediately view photobooth status and manage daily limits without visual clutter.

**Why this priority**: High user value. Streamlines the operational UI by focusing strictly on the Cairo Airport Photobooth requirements, reducing interface complexity.

**Independent Test**: Can be tested by navigating the main dashboard and confirming that multi-project selectors, multi-tenant charts, and extraneous analytical widgets are removed in favor of a clear single-project status panel.

**Acceptance Scenarios**:

1. **Given** an authenticated administrator, **When** they view the main dashboard page, **Then** they see a single unified view presenting the active project status, current generation count, and daily limit.
2. **Given** an administrator managing project settings, **When** they update the daily quota or toggle project status, **Then** the change saves directly for the single active photobooth project.

---

### User Story 3 - Single-Project Photobooth Media Feed (Priority: P3)

As a dashboard user, I want to inspect the generated photobooth images and assets for the active airport booth so that I can monitor live media output.

**Why this priority**: Provides core operational visibility into generated photobooth outputs.

**Independent Test**: Can be tested by viewing the photobooth media gallery section and verifying image assets are retrieved and displayed for the configured Cloudinary project tag.

**Acceptance Scenarios**:

1. **Given** photobooth images stored under the project's Cloudinary tag, **When** the user views the photobooth feed, **Then** the latest generated images are displayed with creation timestamps.

---

### Edge Cases

- What happens if the new database contains no initial project record on first login? The system should automatically initialize or default to a single photobooth project instance.
- How does the system handle expired or invalidated Google OAuth tokens? The system gracefully redirects to the login screen with a clear notification.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST connect exclusively to the newly provisioned backend database instance for session, user, and project state.
- **FR-002**: System MUST process Google OAuth sign-in requests using the updated authentication configuration.
- **FR-003**: System MUST display a streamlined single-project dashboard layout, removing multi-project selection mechanisms and complex analytics charts.
- **FR-004**: System MUST allow authorized administrators to view and update the daily generation limit, active status (`active`/`paused`), and media integration settings for the single photobooth project.
- **FR-005**: System MUST display photobooth generated media for the single project with real-time status indicators (active count vs daily limit).
- **FR-006**: System MUST enforce an invite-only whitelisting system (`allowed_users`) so that only authorized emails are granted access to the dashboard upon Google OAuth sign-in.

### Key Entities

- **User / Profile**: Represents an authenticated dashboard operator or administrator with assigned roles (`ADMIN` or `REGULAR`).
- **AllowedUser**: Represents an authorized email whitelisted by an administrator for invite-only system access.
- **Project**: Represents the single Cairo Airport Photobooth configuration, including `dailyLimit`, `currentGenerations`, `status`, and Cloudinary integration properties.
- **Media Asset**: Represents an AI-generated photobooth image fetched from Cloudinary using the project tag.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of user authentication flows succeed against the newly configured authentication and database services.
- **SC-002**: Dashboard initial page load time is reduced by removing heavy charting dependencies and multi-project aggregations.
- **SC-003**: Administrators can view operational status and update daily generation limits in 1 unified dashboard view.

---

## Assumptions

- The new database instance schemas and environment keys are available to be configured in `.env.local` / Vercel project settings.
- Google OAuth credentials and redirect URIs match the new backend provider endpoints.
- The dashboard is dedicated exclusively to managing a single Cairo Airport Photobooth instance.
