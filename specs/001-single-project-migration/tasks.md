# Tasks: Cairo Airport Photobooth Dashboard Migration & Consolidation

**Feature Directory**: `specs/001-single-project-migration`  
**Plan**: [plan.md](./plan.md)  
**Spec**: [spec.md](./spec.md)  

---

## Phase 1: Setup & Account Provisioning

- [x] T001 Provision new Supabase project instance and retrieve API URL and Anon Key
- [x] T002 Configure Google Cloud Platform (GCP) OAuth 2.0 credentials (Client ID & Client Secret) with authorized redirect URI
- [x] T003 Configure Google Auth provider in Supabase Dashboard with GCP Client ID and Client Secret
- [x] T004 Provision new Cloudinary workspace and configure media upload tags for the Cairo Airport Photobooth project
- [x] T005 Update local environment configuration file [.env.local](file:///d:/5DVR/Projects/Cairo-Airport-Photobooth/Project/Cairo-Airport-Team-Projects/Cairo-Airport-Photobooth-Dashboard/.env.local) with new Supabase and Cloudinary keys

---

## Phase 2: Foundational Database Setup

- [x] T006 Create Supabase database migration DDL schema file [supabase/schema.sql](file:///d:/5DVR/Projects/Cairo-Airport-Photobooth/Project/Cairo-Airport-Team-Projects/Cairo-Airport-Photobooth-Dashboard/supabase/schema.sql) containing `allowed_users`, `profiles`, `projects`, `usage_logs`, and `global_settings` tables, triggers, and RLS policies
- [x] T007 Execute database DDL schema and seed initial Cairo Airport Photobooth project record in Supabase SQL Editor
- [x] T008 [P] Verify Supabase Auth client initialization in [utils/supabase.ts](file:///d:/5DVR/Projects/Cairo-Airport-Photobooth/Project/Cairo-Airport-Team-Projects/Cairo-Airport-Photobooth-Dashboard/utils/supabase.ts)

---

## Phase 3: Auth & Whitelist Management

- [x] T009 [US1] Verify Google OAuth redirect flow and whitelisted profile resolution in [components/AuthContext.tsx](file:///d:/5DVR/Projects/Cairo-Airport-Photobooth/Project/Cairo-Airport-Team-Projects/Cairo-Airport-Photobooth-Dashboard/components/AuthContext.tsx)
- [x] T010 [US1] Ensure login page invite-only messaging and unauthorized error handling work in [app/login/page.tsx](file:///d:/5DVR/Projects/Cairo-Airport-Photobooth/Project/Cairo-Airport-Team-Projects/Cairo-Airport-Photobooth-Dashboard/app/login/page.tsx)
- [x] T010b [US1] Verify email whitelist management interface and auto profile cleanup on revocation in [app/users/page.tsx](file:///d:/5DVR/Projects/Cairo-Airport-Photobooth/Project/Cairo-Airport-Team-Projects/Cairo-Airport-Photobooth-Dashboard/app/users/page.tsx)

---

## Phase 4: Minimizable Layout & Consolidated Console

- [x] T011 Update minimizable sidebar navigation (Dashboard, User Management, Global Settings) in [components/ClientRootLayout.tsx](file:///d:/5DVR/Projects/Cairo-Airport-Photobooth/Project/Cairo-Airport-Team-Projects/Cairo-Airport-Photobooth-Dashboard/components/ClientRootLayout.tsx)
- [x] T012 Consolidate full Cairo Airport AI Photobooth console into main dashboard [app/page.tsx](file:///d:/5DVR/Projects/Cairo-Airport-Photobooth/Project/Cairo-Airport-Team-Projects/Cairo-Airport-Photobooth-Dashboard/app/page.tsx)
- [x] T013 Implement cumulative `total_usage` stat counter and atomic RPC function `increment_project_usage`
- [x] T014 Implement Recharts generation activity chart with 7D, 30D, 90D, and custom date range pickers
- [x] T015 Implement Cloudinary media gallery feed with sorting, selection mode, bulk download, and metadata inspection modal

---

## Phase 5: Verification & Polish

- [x] T016 Run TypeScript type validation `npx tsc --noEmit` — 0 errors
- [x] T017 Remove legacy limits, team member assignment panels, and status pills across frontend and schema
- [x] T018 Execute end-to-end verification of Google OAuth login, whitelist access, and Cloudinary media feed
