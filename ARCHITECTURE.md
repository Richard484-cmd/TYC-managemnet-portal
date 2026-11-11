# ChurchConnect — Technical Architecture

**Status:** Source of Truth — Approved baseline. Do not change the fundamental architecture without explicit written approval and a recorded rationale.

**Last updated:** 2026-09-19

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Application Architecture](#2-application-architecture)
3. [Module Architecture](#3-module-architecture)
4. [Database Architecture](#4-database-architecture)
5. [Entity Relationships](#5-entity-relationships)
6. [RBAC Architecture](#6-rbac-architecture)
7. [Route Architecture](#7-route-architecture)
8. [API / Service Architecture](#8-api--service-architecture)
9. [Folder Structure](#9-folder-structure)
10. [Security Architecture](#10-security-architecture)
11. [Automation Architecture](#11-automation-architecture)
12. [Notification Architecture](#12-notification-architecture)
13. [Reporting Architecture](#13-reporting-architecture)
14. [Data Flow Architecture](#14-data-flow-architecture)
15. [Development Roadmap](#15-development-roadmap)

---

## 1. System Architecture

ChurchConnect is a single Next.js application that serves three logical environments through route partitioning and role-based access control. All environments share one Supabase project (Postgres + Auth + Storage + Edge Functions).

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                              │
│  ┌───────────────┐  ┌────────────────┐  ┌──────────────────────────┐ │
│  │ Public Site    │  │ Member Portal   │  │ Admin / CRM Portal       │ │
│  │ (no auth)      │  │ (auth required) │  │ (auth + role required)   │ │
│  └───────┬───────┘  └────────┬───────┘  └────────────┬─────────────┘ │
└──────────┼──────────────────┼──────────────────────┬────────────────┘
           │                  │                      │
           ▼                  ▼                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Next.js (App Router)                              │
│  Server Components · Route Handlers · Middleware (RBAC guard)        │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  Feature Modules (members, events, giving, crm, automations...) ││
│  └─────────────────────────────────────────────────────────────────┘│
└──────────────────────┬──────────────────────────┬───────────────────┘
                       │                          │
        ┌──────────────▼──────────┐  ┌────────────▼───────────────┐
        │  Supabase Postgres       │  │  Supabase Edge Functions  │
        │  (RLS-protected tables)  │  │  (privileged mutations,   │
        │                          │  │   webhooks, automations)  │
        └──────────────┬──────────┘  └────────────┬───────────────┘
                       │                          │
                ┌──────▼──────┐            ┌───────▼───────┐
                │ Supabase    │            │ Supabase      │
                │ Auth (JWT)  │            │ Storage       │
                └─────────────┘            │ (avatars,     │
                                           │  documents)   │
                                           └───────────────┘
```

**Key principle:** The browser talks to Postgres through the Supabase JS client, constrained by Row Level Security (RLS). Edge Functions handle operations that must be privileged (finance mutations, bulk operations, outbound webhooks, automation triggers) and expose SECURITY DEFINER functions for narrow, audited mutations that RLS alone cannot enforce safely.

**Three environments, one codebase:**
- **Public** — anonymous, read-only access to church content. No login.
- **Member** — authenticated member viewing their own data and participating.
- **Admin** — authenticated user with a granted role performing church management and CRM work.

---

## 2. Application Architecture

### 2.1 Rendering model

Next.js App Router with a hybrid rendering strategy:

| Surface | Rendering | Reason |
|--------|----------|--------|
| Public marketing pages | Static + ISR | Fast, cacheable, SEO-friendly |
| Public events / sermons | ISR (revalidate hourly) | Fresh-ish, still cacheable |
| Member portal | Server Components + client islands | Personalized, auth-gated |
| Admin portal | Server Components + client islands | Highly interactive, auth + role gated |
| Auth pages | Server Components | Sensitive, no caching |

### 2.2 Request lifecycle

```
Request → Middleware (session + role guard)
        → Layout (fetch shared data: user, church, notifications)
        → Page Server Component (fetch page data via server-side Supabase client)
        → Client Components (interactions, mutations via browser Supabase client + RLS)
```

### 2.3 Client/server data split

- **Server-side Supabase client** — used in Server Components and Route Handlers. Uses the user's JWT (from the request cookies) so RLS applies the user's identity. Used for initial page loads and reads.
- **Browser Supabase client** — used in Client Components for realtime subscriptions and mutations. Same RLS constraints.
- **Edge Functions** — used when a mutation needs elevated privileges (e.g., recording a verified giving transaction, running an automation) that the user's own JWT must not be able to perform directly.

### 2.4 State management

- **Server state:** fetched per-route, no global store. Realtime updates via Supabase subscriptions where needed (notifications, attendance check-in).
- **Client state:** React `useState` / `useReducer` for local UI. `useMemo` for derived view state. No Redux/Zustand unless a concrete need appears.
- **Forms:** controlled components with `react-hook-form` + `zod` validation shared between client and server.

---

## 3. Module Architecture

Each module is a self-contained vertical slice with a consistent internal structure. Modules communicate only through well-defined boundaries — never by reaching into another module's internals.

### 3.1 Module inventory

| # | Module | Owner role(s) | Primary tables |
|---|--------|---------------|---------------|
| 1 | Authentication | (platform) | `auth.users` (Supabase managed) |
| 2 | Users | Super Admin, Admin | `users`, `role_assignments` |
| 3 | Members | Pastor, Admin | `members`, `member_profiles` |
| 4 | Visitors | Follow-up Manager, Admin | `visitors` |
| 5 | Membership | Pastor, Admin | `membership_statuses`, `membership_history` |
| 6 | Tags | Admin | `tags`, `tag_assignments` |
| 7 | Departments | Admin, Department Leader | `departments`, `department_members` |
| 8 | Ministries | Admin, Department Leader | `ministries`, `ministry_members` |
| 9 | Groups | Admin, Group Leader | `groups`, `group_members` |
| 10 | Attendance | Pastor, Department Leader | `attendance_events`, `attendance_records` |
| 11 | Events | Admin, Pastor | `events`, `event_registrations` |
| 12 | Follow-ups | Follow-up Manager, Pastor | `follow_ups` |
| 13 | CRM | Pastor, Admin | `pipeline_stages`, `contacts`, `contact_movements` |
| 14 | Tasks | (all staff) | `tasks` |
| 15 | Communications | Admin | `messages`, `message_recipients` |
| 16 | Prayer | Member, Pastor | `prayer_requests` |
| 17 | Giving | Finance Officer | `giving_campaigns`, `giving_transactions` |
| 18 | Notifications | (platform) | `notifications` |
| 19 | Automations | Admin | `automations`, `automation_runs` |
| 20 | Reports | Admin, Pastor | (read-only across modules) |
| 21 | Audit Logs | Super Admin | `audit_logs` |
| 22 | Settings | Super Admin | `church_settings` |

### 3.2 Module internal structure (canonical)

Every module follows this shape. A module that does not need a layer simply omits it — but the naming and placement is fixed.

```
modules/<module>/
  ├── components/        # UI components scoped to this module
  ├── actions.ts         # server actions / route-handler logic (privileged ops)
  ├── queries.ts         # typed read functions (server-side)
  ├── schema.ts          # zod schemas + TS types for this module's data
  ├── permissions.ts    # role checks specific to this module
  └── constants.ts       # enums, labels, config
```

### 3.3 Module communication rules

1. **Modules never import another module's tables directly.** Cross-module reads go through the owning module's `queries.ts`; cross-module writes go through `actions.ts`.
2. **Shared types** live in `lib/types` and are imported by any module. Shared types are passive (interfaces/enums), not behavior.
3. **Cross-module side effects** (e.g., "visitor becomes member" touches Visitors + Members + Membership) are orchestrated in an Edge Function or a server action that calls each module's `actions.ts` in sequence within a single logical operation.
4. **Automations** are the only mechanism allowed to trigger cross-module side effects automatically (see §11).

---

## 4. Database Architecture

Supabase Postgres. All tables live in the `public` schema unless noted. Supabase Auth manages `auth.users` — we never write to it directly.

### 4.1 Conventions

- **Primary keys:** `id uuid primary key default gen_random_uuid()`.
- **Foreign keys:** `<singular>_id uuid references <table>(id)`.
- **Timestamps:** `created_at timestamptz default now()`, `updated_at timestamptz default now()` (kept current via trigger).
- **Soft delete:** `deleted_at timestamptz null`. Queries default to `where deleted_at is null`. No hard deletes except by Super Admin tooling.
- **Ownership:** every user-owned row has `user_id uuid references auth.users(id)` where applicable.
- **Audit columns:** `created_by uuid`, `updated_by uuid` on mutable tables, populated by a SECURITY DEFINER helper or the Edge Function performing the write.
- **RLS:** enabled on every table. No exceptions. Policies are per-CRUD-verb, scoped to `authenticated` (or `anon, authenticated` for public reads).
- **Enums:** use Postgres `enum` types for fixed value sets (membership status, attendance type, task priority). Use a `tags` table for open sets.

### 4.2 Table catalog

Grouped by module. Full column-level detail is in the ERD (§5); this section establishes the table set and intent.

**Identity & access**
- `users` — application-level user record (1:1 with `auth.users`). Holds display name, avatar, default role hint, status.
- `role_assignments` — grants a role to a user, optionally scoped to a department/group/ministry.
- `roles` — catalog of role keys (Super Admin, Admin, Pastor, Finance Officer, Follow-up Manager, Department Leader, Group Leader, Member).

**People**
- `members` — a person who is part of the church. Links to `auth.users` if they have a login.
- `member_profiles` — extended, less-frequently-read member data (address, family, occupation, notes).
- `visitors` — a person who has visited but is not yet a member.
- `membership_statuses` — enum-backed current status (Visitor, Regular Attender, Member, Inactive, Transferred).
- `membership_history` — append-only log of status changes with reason and changed_by.

**Organization**
- `tags` — free-form labels.
- `tag_assignments` — polymorphic tag application (member/visitor/event).
- `departments` — top-level organizational units.
- `department_members` — membership in a department, with role.
- `ministries` — ministries belonging to a department.
- `ministry_members` — membership in a ministry.
- `groups` — small groups, fellowships, cells.
- `group_members` — membership in a group.

**Attendance & events**
- `attendance_events` — a scheduled gathering (service, group meeting) with date and type.
- `attendance_records` — per-person attendance for an event (present/absent/late, notes).
- `events` — public/calendar events with capacity, registration, location.
- `event_registrations` — a person registered for an event.

**CRM & follow-up**
- `follow_ups` — a follow-up task assigned to a person for a visitor/new member, with status and due date.
- `pipeline_stages` — ordered stages of the membership/engagement pipeline (First Visit → Engaged → Member → Active → Serving).
- `contacts` — a person in the CRM pipeline (may reference a member or visitor).
- `contact_movements` — append-only log of a contact moving between stages.

**Tasks & communication**
- `tasks` — assignable tasks with assignee, due date, priority, status, linked entity.
- `messages` — outbound communication (email/SMS/in-app) with template and channel.
- `message_recipients` — per-recipient delivery record with status.

**Prayer & giving**
- `prayer_requests` — a prayer request with visibility (public/member/private), status, and assigned pray-ers.
- `giving_campaigns` — a fundraising campaign with goal and dates.
- `giving_transactions` — a verified giving transaction. **Finance-sensitive:** written only via Edge Function.

**Platform**
- `notifications` — in-app notifications for a user.
- `automations` — a trigger + action definition.
- `automation_runs` — append-only execution log of an automation.
- `audit_logs` — append-only security audit trail.
- `church_settings` — key/value church-wide configuration (single-row-ish, keyed by setting key).

### 4.3 RLS strategy summary

- **Public reads:** events, sermons, public prayer requests, church settings (selected keys) → `TO anon, authenticated` with a `WHERE` on a `is_public` flag.
- **Member reads:** own member profile, own giving, own groups, own attendance, public-to-members prayer → `TO authenticated USING (auth.uid() = user_id)` or a membership check.
- **Admin/staff writes:** scoped by role assignment (see §6). Enforced via a helper `has_role(auth.uid(), 'role_key')` SECURITY DEFINER function referenced in policies.
- **Finance writes:** `giving_transactions` is insert-only for the authenticated client via an Edge Function; direct client inserts are denied.

### 4.4 Indexing policy

- Every FK column gets an index.
- Every frequently-filtered column (`status`, `due_date`, `created_at`, `church_id` if multi-tenant later) gets an index.
- Composite indexes on `(entity_type, entity_id)` for polymorphic tables (`tag_assignments`, `audit_logs`).
- Partial indexes on `where deleted_at is null` for soft-deleted tables.

---

## 5. Entity Relationships

Below is the logical ERD. Arrows read as "references". Cardinality is noted where non-obvious.

```
auth.users (Supabase)
  │
  ├─1:1─ users
  │        │
  │        └─1:N─ role_assignments ──N:1─ roles
  │
  └─1:0..1─ members ──1:1─ member_profiles
              │
              ├─1:N─ membership_history ──N:1─ membership_statuses
              ├─1:N─ attendance_records ──N:1─ attendance_events
              ├─1:N─ event_registrations ──N:1─ events
              ├─1:N─ group_members ──N:1─ groups
              ├─1:N─ department_members ──N:1─ departments ──1:N─ ministries ──1:N─ ministry_members
              ├─1:N─ prayer_requests
              ├─1:N─ giving_transactions ──N:1─ giving_campaigns
              └─1:N─ tasks (as assignee)

visitors
  ├─1:N─ follow_ups (as subject) ──N:1─ users (as assignee)
  └─1:1─ contacts (optional) ──1:N─ contact_movements ──N:1─ pipeline_stages

tag_assignments ──N:1─ tags
  (tag_assignments.entity_type, entity_id) → members | visitors | events

messages ──1:N─ message_recipients ──N:1─ users

notifications ──N:1─ users

automations ──1:N─ automation_runs

audit_logs (entity_type, entity_id, actor_id, action, diff, at)
```

**Key relationships explained:**

- **users ↔ members:** A `member` may or may not have a login. A `user` always has exactly one `member` row once they are part of the church. Visitors and pre-membership contacts do not have `users` rows.
- **contacts ↔ members/visitors:** A `contact` is the CRM representation of a person. It may reference a `member` or `visitor` once that person exists, but a contact can exist before either (e.g., an inquiry from the website).
- **departments → ministries → groups:** Departments are the top-level org unit. Ministries belong to a department. Groups are independent small-group units that may optionally associate with a ministry.
- **attendance_events ↔ events:** An `attendance_event` is the operational record used for attendance tracking (a recurring service occurrence). An `event` is the public/calendar-facing event. They may reference each other but serve different surfaces.
- **giving_transactions:** references a member (the giver) and a campaign. It is **never** written by the client directly.

---

## 6. RBAC Architecture

### 6.1 Role catalog

| Role key | Scope | Intent |
|----------|-------|--------|
| `super_admin` | Church | Full control, including users, roles, settings, audit logs. |
| `admin` | Church | Church management: members, events, departments, groups, communications, reports. Cannot manage roles/audit. |
| `pastor` | Church / Department | Spiritual care: members, attendance, follow-ups, prayer, groups, reports (read). |
| `finance_officer` | Church | Giving campaigns, giving transactions (via Edge Function), giving reports. |
| `follow_up_manager` | Church | Visitors, follow-ups, first-time engagement pipeline. |
| `department_leader` | Department | Their department's members, ministries, attendance, events. |
| `group_leader` | Group | Their group's members, attendance, communications. |
| `member` | Self | Own profile, own giving, own groups (read), own attendance (read), prayer participation. |

### 6.2 Role assignment model

Roles are **assigned**, not embedded in the JWT. This keeps role changes instant without re-issuing tokens.

```
role_assignments
  id, user_id, role_key, scope_type, scope_id, granted_by, granted_at, revoked_at
```

- `scope_type` is one of `church`, `department`, `ministry`, `group`.
- `scope_id` is null for `church` scope, else the id of the scoped entity.
- A user may have multiple assignments; the **effective permissions** are the union of all active (non-revoked) assignments.
- `department_leader` and `group_leader` are always scoped; the others are church-scoped.

### 6.3 Permission resolution

A SECURITY DEFINER function `has_role(p_user uuid, p_role text, p_scope_type text default null, p_scope_id uuid default null)` returns boolean. It checks `role_assignments` for a matching, non-revoked row. RLS policies call this function. Client-side permission checks use a cached `permissions` object computed at login and refreshed on role change via realtime.

```
effective_permissions(user_id) =
  UNION over role_assignments(user_id) of permissions(role_key, scope_type, scope_id)
```

### 6.4 Permission matrix (excerpt)

| Capability | Super Admin | Admin | Pastor | Finance | Follow-up Mgr | Dept Leader | Group Leader | Member |
|-----------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Manage users & roles | ✓ | — | — | — | — | — | — | — |
| View audit logs | ✓ | — | — | — | — | — | — | — |
| Manage members | ✓ | ✓ | ✓ | — | — | (own dept) | — | — |
| Manage visitors | ✓ | ✓ | — | — | ✓ | — | — | — |
| Manage follow-ups | ✓ | ✓ | ✓ | — | ✓ | — | — | — |
| Record attendance | ✓ | ✓ | ✓ | — | — | (own dept) | (own group) | — |
| Manage events | ✓ | ✓ | ✓ | — | — | (own dept) | — | — |
| Manage giving | ✓ | — | — | ✓ | — | — | — | — |
| View own giving | — | — | — | — | — | — | — | ✓ |
| Manage automations | ✓ | ✓ | — | — | — | — | — | — |
| Send communications | ✓ | ✓ | — | — | — | (own dept) | (own group) | — |

`(own X)` = scoped to the department/group they lead.

### 6.5 Enforcement layers

1. **Middleware** — coarse route guard: blocks unauthenticated users from `/member/*` and `/admin/*`, and blocks non-admins from `/admin/*`. Does not do fine-grained role checks.
2. **RLS** — the authoritative data-level guard. Every query, server or client, is constrained by it.
3. **Server actions / Edge Functions** — application-level authorization for operations that span multiple rows or need business rules (e.g., "only a finance officer can verify a transaction").
4. **Client UI** — shows/hides actions based on the cached permissions object. **Decorative only** — never a security boundary.

---

## 7. Route Architecture

### 7.1 Route map

**Public (no auth)**
```
/                        Home
/about                   About the church
/leadership              Leadership team
/ministries              Ministries catalog
/events                  Public events calendar
/events/[id]             Event detail + registration
/sermons                 Sermon archive
/sermons/[id]            Sermon detail
/give                    Giving landing (campaigns)
/prayer                  Public prayer wall
/contact                 Contact form
/login                   Sign in
/forgot-password          Password reset request
/reset-password           Password reset
```

**Member (auth required, role: member)**
```
/member/dashboard        Personal dashboard
/member/profile          Edit own profile
/member/attendance       Own attendance history
/member/events           Events I'm registered for
/member/groups           My groups
/member/departments      My departments
/member/giving           My giving history
/member/prayer           My prayer requests + ones I'm praying for
/member/notifications    My notifications
/member/settings         Account settings (password, notifications prefs)
```

**Admin (auth required, role: any staff role)**
```
/admin/dashboard         Church-wide dashboard
/admin/members           Members CRUD + import
/admin/members/[id]      Member detail
/admin/visitors          Visitors CRM
/admin/follow-ups        Follow-up queue
/admin/attendance        Attendance management
/admin/events           Events CRUD
/admin/departments      Departments CRUD
/admin/ministries       Ministries CRUD
/admin/groups           Groups CRUD
/admin/giving           Giving campaigns + transactions (finance)
/admin/communications  Compose & send
/admin/reports          Reports center
/admin/automations      Automation builder
/admin/users            Users management
/admin/roles            Role assignments
/admin/settings         Church settings
/admin/audit-logs       Audit trail
```

### 7.2 Route guards

- **Middleware** matches `/member/*` and `/admin/*` and verifies a Supabase session cookie exists. For `/admin/*` it additionally verifies the user has at least one staff role assignment (via a lightweight lookup). Fine-grained checks happen in RLS and server actions.
- **Layouts** fetch the current user + permissions and pass them through context to child pages, so every page can render role-appropriate UI without re-fetching.

---

## 8. API / Service Architecture

ChurchConnect does not build a separate REST API. The "API" surface is the combination of:

1. **Supabase Postgres + RLS** — the primary data API. The browser client reads and writes directly, constrained by RLS.
2. **Next.js Server Actions** — typed, co-located server functions for mutations that need business logic but not elevated privileges (e.g., create an event, assign a follow-up).
3. **Next.js Route Handlers** — used for webhooks (giving provider, email delivery status) and file upload initiation.
4. **Supabase Edge Functions** — used for privileged mutations and automation execution (see below).

### 8.1 When to use which

| Need | Use |
|------|-----|
| Read data for a page | Server Component + server Supabase client (RLS) |
| Simple create/update by the user themselves | Browser Supabase client (RLS) |
| Mutation with business rules / multi-table | Server Action |
| Mutation requiring elevated privileges | Edge Function (SECURITY DEFINER) |
| External webhook receiver | Route Handler → Edge Function |
| Scheduled job / automation | Edge Function (cron) or automation runner |
| File upload | Storage signed URL via Route Handler, then direct upload |

### 8.2 Edge Functions catalog (planned)

| Slug | Purpose | `verify_jwt` |
|------|---------|:---:|
| `record-giving` | Record + verify a giving transaction (finance only) | true |
| `run-automation` | Execute an automation's action for a triggered event | true |
| `send-communication` | Dispatch a message via email/SMS provider | true |
| `import-members` | Bulk import members from CSV (admin only) | true |
| `generate-report` | Produce a report payload (admin/pastor) | true |
| `giving-webhook` | Inbound webhook from payment provider | false |
| `email-webhook` | Delivery status from email provider | false |

### 8.3 Server Actions contract

- Every server action validates input with a `zod` schema before touching the database.
- Every server action performs an explicit permission check (via `has_role` or a module `permissions.ts` helper) before mutating.
- Every server action returns a discriminated union: `{ ok: true, data } | { ok: false, error }`.
- Side effects that should be audited wrap the mutation in a helper that also writes to `audit_logs`.

---

## 9. Folder Structure

```
churchconnect/
├── app/                              # Next.js App Router
│   ├── (public)/                     # Public site route group
│   │   ├── about/page.tsx
│   │   ├── leadership/page.tsx
│   │   ├── ministries/page.tsx
│   │   ├── events/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── sermons/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── give/page.tsx
│   │   ├── prayer/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── login/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (member)/                     # Member portal route group
│   │   └── member/
│   │       ├── dashboard/page.tsx
│   │       ├── profile/page.tsx
│   │       ├── attendance/page.tsx
│   │       ├── events/page.tsx
│   │       ├── groups/page.tsx
│   │       ├── departments/page.tsx
│   │       ├── giving/page.tsx
│   │       ├── prayer/page.tsx
│   │       ├── notifications/page.tsx
│   │       └── settings/page.tsx
│   ├── (admin)/                      # Admin portal route group
│   │   └── admin/
│   │       ├── dashboard/page.tsx
│   │       ├── members/
│   │       │   ├── page.tsx
│   │       │   └── [id]/page.tsx
│   │       ├── visitors/page.tsx
│   │       ├── follow-ups/page.tsx
│   │       ├── attendance/page.tsx
│   │       ├── events/page.tsx
│   │       ├── departments/page.tsx
│   │       ├── ministries/page.tsx
│   │       ├── groups/page.tsx
│   │       ├── giving/page.tsx
│   │       ├── communications/page.tsx
│   │       ├── reports/page.tsx
│   │       ├── automations/page.tsx
│   │       ├── users/page.tsx
│   │       ├── roles/page.tsx
│   │       ├── settings/page.tsx
│   │       └── audit-logs/page.tsx
│   ├── layout.tsx                    # Root layout (providers, fonts)
│   ├── page.tsx                      # Public home
│   └── globals.css
│
├── modules/                          # Feature modules (vertical slices)
│   ├── auth/
│   ├── users/
│   ├── members/
│   ├── visitors/
│   ├── membership/
│   ├── tags/
│   ├── departments/
│   ├── ministries/
│   ├── groups/
│   ├── attendance/
│   ├── events/
│   ├── follow-ups/
│   ├── crm/
│   ├── tasks/
│   ├── communications/
│   ├── prayer/
│   ├── giving/
│   ├── notifications/
│   ├── automations/
│   ├── reports/
│   ├── audit-logs/
│   └── settings/
│       ├── components/
│       ├── actions.ts
│       ├── queries.ts
│       ├── schema.ts
│       ├── permissions.ts
│       └── constants.ts
│
├── components/
│   ├── ui/                           # shadcn/ui primitives (existing)
│   └── shared/                        # Cross-module shared components
│       ├── app-shell.tsx
│       ├── member-shell.tsx
│       ├── admin-shell.tsx
│       ├── data-table.tsx
│       ├── empty-state.tsx
│       ├── page-header.tsx
│       └── role-badge.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── server.ts                  # Server client factory
│   │   ├── browser.ts                 # Browser client singleton
│   │   └── middleware.ts             # Session refresh helper
│   ├── auth/
│   │   ├── session.ts                 # getCurrentUser()
│   │   ├── permissions.ts            # resolvePermissions(user_id)
│   │   └── rbac.ts                    # hasRole() client helpers
│   ├── types/                         # Shared TS types (DB generated)
│   ├── utils.ts                       # cn() etc (existing)
│   └── constants.ts
│
├── hooks/
│   ├── use-toast.ts                   # (existing)
│   ├── use-permissions.ts
│   ├── use-current-user.ts
│   └── use-realtime.ts
│
├── middleware.ts                     # Auth + coarse RBAC guard
│
├── supabase/
│   ├── migrations/                    # SQL migrations (applied via MCP)
│   ├── functions/                     # Edge Functions source
│   │   ├── record-giving/
│   │   ├── run-automation/
│   │   ├── send-communication/
│   │   ├── import-members/
│   │   ├── generate-report/
│   │   ├── giving-webhook/
│   │   └── email-webhook/
│   └── config.toml
│
├── ARCHITECTURE.md                    # This document
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── components.json
```

**Naming conventions:**
- Routes: `kebab-case` directories.
- Components: `PascalCase` files.
- Modules: `kebab-case` directories.
- Types/interfaces: `PascalCase`.
- DB tables: `snake_case`, plural.
- DB columns: `snake_case`.

---

## 10. Security Architecture

### 10.1 Defense in depth

```
Browser
  │
  ├─ TLS (platform-managed)
  │
  ├─ Middleware: session presence + coarse role gate
  │
  ├─ Server Component / Server Action: business-rule authz + zod validation
  │
  ├─ Supabase RLS: per-row, per-verb data access control  ← authoritative
  │
  └─ Postgres grants: least-privilege on columns where needed
```

RLS is the **authoritative** layer. Everything above it is defense in depth and UX. A bug in the UI that shows an admin button to a member must not leak data because RLS blocks the query.

### 10.2 RLS rules

- Every table: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
- Four policies per table (SELECT, INSERT, UPDATE, DELETE) — never `FOR ALL`.
- `TO authenticated` for member/admin surfaces; `TO anon, authenticated` only for intentionally public reads.
- Ownership via `auth.uid() = user_id` for self-scoped data.
- Staff access via `has_role(auth.uid(), '<role>')` in `USING`/`WITH CHECK`.
- `USING (true)` is allowed **only** for intentionally public data (public events, public prayer wall).
- UPDATE policies always include a `WITH CHECK` at least as strict as the `USING`.

### 10.3 Privileged operations

Operations a user must not perform with their own JWT go through Edge Functions running with the service role key, which:
1. Re-authenticate the caller from the passed JWT.
2. Re-authorize via `has_role`.
3. Validate input.
4. Perform the mutation.
5. Write an `audit_logs` entry.
6. Return a generic success/error (no sensitive detail).

Applies to: giving transaction recording/verification, bulk member import, automation editing/execution, user role changes, church settings changes, audit log reads.

### 10.4 Input validation

- Every server-side entry point (Server Action, Route Handler, Edge Function) validates input with `zod`. The same schema is reused on the client for immediate feedback.
- No client-supplied value is trusted for authorization decisions. Role keys, scope ids, and ownership are always resolved server-side from the authenticated session.

### 10.5 Data safety

- No `DROP`, column `DELETE`, type changes, or table renames in migrations — they lose data.
- Soft delete (`deleted_at`) is the default for user-managed records.
- Financial records (`giving_transactions`) are append-only — no updates/deletes from the app; corrections are new reversing entries.
- Audit logs are append-only and insert-only via RLS (no UPDATE/DELETE policy at all).

### 10.6 Secrets

- Supabase keys and any third-party keys (email/SMS, payment) live in Supabase Edge Function secrets, never in client code or `.env`-derived client bundles.
- The browser only ever sees `SUPABASE_ANON_KEY`.

### 10.7 Rate limiting & abuse

- Public forms (contact, prayer submission, event registration) are rate-limited at the Edge Function / Route Handler layer.
- Auth attempts rely on Supabase Auth built-in protections.
- Automation and communication sending have per-run and per-day caps stored in `church_settings` and enforced by the runner.

### 10.8 Audit

Every privileged mutation writes to `audit_logs`:
```
audit_logs(id, actor_id, action, entity_type, entity_id, diff jsonb, ip, user_agent, at)
```
`diff` stores before/after for updates; the new state for inserts; nothing for deletes (the row is gone). Sensitive fields (giving amounts, passwords) are redacted.

---

## 11. Automation Architecture

Automations let the church define "when X happens, do Y" without code changes.

### 11.1 Model

```
automations
  id, name, trigger_event, trigger_condition (jsonb), action_type, action_config (jsonb),
  enabled, created_by, created_at, updated_at

automation_runs
  id, automation_id, trigger_payload (jsonb), status (running/succeeded/failed),
  error, started_at, finished_at
```

### 11.2 Trigger events

Triggers are domain events emitted by modules:
- `visitor.created`
- `visitor.first_visit`
- `member.created`
- `member.status_changed`
- `follow_up.overdue`
- `event.registration_created`
- `event.reminder_due` (time-based)
- `giving.received`
- `prayer_request.created`
- `birthday` (time-based, daily cron)
- `anniversary` (time-based, daily cron)

### 11.3 Trigger conditions

A simple JSON condition language evaluated by the runner, e.g.:
```json
{ "all": [ { "field": "member.status", "eq": "Visitor" } ] }
```
Conditions are intentionally limited (no arbitrary code). Complex needs fall back to a custom Edge Function.

### 11.4 Actions

- `send_communication` — email/SMS/in-app using a template + recipient resolver.
- `create_task` — assign a follow-up task to a role/user.
- `create_follow_up` — start a follow-up for a visitor/new member.
- `move_contact_stage` — advance a CRM contact.
- `add_tag` — tag an entity.
- `notify` — create an in-app notification.

### 11.5 Execution

- **Event-triggered:** the module's server action, after a successful mutation, enqueues an automation run by inserting into an `automation_queue` table (or calling the `run-automation` Edge Function). The Edge Function evaluates enabled automations matching the event, checks conditions, and executes actions.
- **Time-triggered:** a scheduled Edge Function (Supabase cron) runs daily, emits `birthday`/`anniversary`/`event.reminder_due` events into the same pipeline.
- **Idempotency:** each run is recorded in `automation_runs`. Actions that send messages check a per-(automation, entity, action) dedup window to avoid spamming.
- **Failure handling:** a failed run is logged with the error; a configurable retry count applies. Repeated failures disable the automation and notify Super Admin.

### 11.6 Why not database triggers

Postgres triggers fire on row changes but cannot easily call external services (email/SMS) or enforce business rules across modules. ChurchConnect keeps automation logic in Edge Functions so it is testable, auditable, and able to call external APIs. Postgres triggers are used only for `updated_at` maintenance and audit-log mirroring of privileged writes.

---

## 12. Notification Architecture

### 12.1 Channels

- **In-app** — `notifications` table, realtime-subscribed by the user. Bell icon in member and admin shells.
- **Email** — via an Edge Function calling an email provider (SMTP or API). Used for digests, receipts, follow-up assignments.
- **SMS** — optional, via an Edge Function calling an SMS provider. Used for urgent reminders.
- **Push** — future; the `notifications` table has a `channel` column to extend without schema change.

### 12.2 Notification record

```
notifications
  id, user_id, type, title, body, link, read_at, created_at
```

### 12.3 Delivery flow

```
Event / Action
   │
   ▼
send-communication Edge Function
   │
   ├─ resolve recipients (user, role, group, department, contact list)
   ├─ render template with data
   ├─ create message + message_recipients rows
   ├─ for each channel: dispatch via provider
   ├─ update message_recipients.status on webhook callback
   └─ create in-app notifications for in-app recipients
```

### 12.4 Preferences

`member.settings` stores per-user notification preferences (channels per type). The Edge Function honors preferences before sending. A "critical" flag bypasses preferences for urgent operational alerts (e.g., security).

### 12.5 Realtime

The browser subscribes to `notifications` inserts for the current user. Supabase Realtime delivers them. The subscription is gated by RLS so a user only receives their own notifications.

---

## 13. Reporting Architecture

### 13.1 Approach

Reports are read-only aggregations across modules. They are generated on demand by the `generate-report` Edge Function (for heavy queries) or directly in Server Components (for light queries), never by the browser client.

### 13.2 Report catalog (initial)

| Report | Audience | Source modules |
|--------|----------|----------------|
| Membership growth | Pastor, Admin | Members, Membership |
| Attendance trends | Pastor, Department Leader | Attendance, Events |
| Visitor → Member conversion | Follow-up Mgr, Pastor | Visitors, Follow-ups, Members |
| Follow-up response time | Follow-up Mgr | Follow-ups |
| Giving summary | Finance Officer, Admin | Giving |
| Department/group health | Department Leader, Pastor | Departments, Groups, Attendance |
| Engagement score | Pastor | Members, Attendance, Giving, Groups |

### 13.3 Implementation

- **Light reports:** SQL aggregations in a `modules/reports/queries.ts` function, run with the server Supabase client (RLS applies). Results rendered as tables/charts in the admin UI.
- **Heavy reports / exports:** the `generate-report` Edge Function runs the query with the service role key (after re-authorizing the caller), returns JSON, and optionally stores a CSV/PDF in Storage for download. A row in a `report_exports` table tracks the file and its expiry.
- **Caching:** report results are cached in a `report_cache` table keyed by `(report_key, params_hash, generated_at)` with a TTL. Stale cache is invalidated by relevant module writes via a lightweight invalidation map.
- **No ETL warehouse in v1.** All reports run against the operational Postgres. If volume grows, a materialized-view or read-replica strategy is the first step before a separate warehouse.

### 13.4 Charts

Client-side charting with the existing `components/ui/chart.tsx` (Recharts under the hood). Data is always fetched server-side; the client only renders.

---

## 14. Data Flow Architecture

### 14.1 Read flow (page load)

```
Browser requests /admin/members
  → Middleware verifies session + staff role
  → Admin layout Server Component:
       server Supabase client (user JWT) → fetch current user + permissions
  → /admin/members page Server Component:
       modules/members/queries.listMembers(filters)
         → server Supabase client → select from members (RLS filters by role)
       → returns typed Member[]
  → Page renders as HTML, streamed to browser
  → Client Components hydrate; interactive filters call server actions or re-fetch via router
```

### 14.2 Write flow (user mutation, self-scoped)

```
Member edits own profile
  → Client Component calls browser Supabase client
  → update members set ... where id = <my member id>
  → RLS policy: auth.uid() = user_id → allowed
  → Row updated; updated_at trigger fires
  → (optional) realtime broadcasts the change to the member's own subscription
  → UI optimistically updates, confirms on receipt
```

### 14.3 Write flow (privileged mutation)

```
Finance officer records a giving transaction
  → Client Component calls a Server Action: recordGiving(input)
  → Server Action validates with zod
  → Server Action calls record-giving Edge Function (passes user JWT)
  → Edge Function:
       1. verifies JWT, resolves user
       2. has_role(user, 'finance_officer') → else 403
       3. validates input again
       4. inserts giving_transactions with service role key
       5. inserts audit_logs row
       6. enqueues automations for 'giving.received'
       7. returns { ok: true, transaction_id }
  → Server Action returns result to client
  → UI shows confirmation; notifications/automations proceed async
```

### 14.4 Automation flow

```
Visitor created (via admin UI or public form)
  → Server Action inserts visitor (RLS allows admin/follow-up)
  → Server Action enqueues automation: { event: 'visitor.created', payload }
  → run-automation Edge Function:
       1. loads enabled automations where trigger_event = 'visitor.created'
       2. for each, evaluates trigger_condition against payload
       3. for matching automations, executes action(s)
            e.g., send_communication → welcome email
            e.g., create_follow_up → assign to follow-up manager
       4. records automation_runs
  → Recipients get in-app/email notifications
```

### 14.5 Realtime flow

```
Browser subscribes to notifications where user_id = auth.uid()
  → Supabase Realtime channel (RLS-enforced)
  → When a notification is inserted (by an Edge Function or trigger),
    the browser receives the payload
  → Client updates the bell badge + toast
```

### 14.6 Cross-module operation (visitor → member)

```
Follow-up manager converts a visitor to a member
  → Server Action convertVisitorToMember(visitor_id)
       1. within a single logical operation:
            a. insert members row (from visitor data)
            b. insert membership_history row (status: Member)
            c. update visitor row (converted_at, member_id)
            d. create contact row in CRM (stage: Member)
            e. enqueue 'member.created' automation
       2. all steps via Edge Function (privileged, multi-table, audited)
  → Edge Function performs steps with service role key
  → Returns new member id; UI navigates to member detail
```

---

## 15. Development Roadmap

The roadmap is phased so that each phase delivers a usable slice. No phase depends on unbuilt infrastructure from a later phase.

### Phase 0 — Foundation (prerequisite)
- Supabase project wiring, migrations tooling, RLS baseline.
- Next.js middleware: session refresh, coarse route guard.
- Server + browser Supabase client factories.
- `lib/auth`: `getCurrentUser`, `resolvePermissions`, `hasRole`.
- Shared shells: public, member, admin (navigation + responsive layout).
- Design system: theme tokens, typography, color ramps, base components.
- CI: typecheck + build + lint.

### Phase 1 — Public Website
- Home, About, Leadership, Ministries (static/ISR).
- Events (public list + detail + registration).
- Sermons archive.
- Prayer wall (public).
- Contact form (rate-limited).
- Give landing (campaigns, no processing yet).
- Login + password reset.

### Phase 2 — Auth & Users
- Supabase email/password auth (confirmation off).
- `users` + `role_assignments` + `roles` tables.
- RBAC resolution + middleware role gate.
- Admin: Users list, Roles assignment.
- Audit log writes for user/role changes.

### Phase 3 — Members & Visitors
- Members CRUD + import (admin).
- Member profiles, membership statuses, membership history.
- Visitors CRM (admin/follow-up).
- Tags system.
- Member portal: dashboard, profile, settings.
- Public → member registration flow.

### Phase 4 — Organization & Attendance
- Departments, ministries, groups CRUD.
- Department/ministry/group membership.
- Attendance events + records.
- Member portal: attendance (own), groups, departments.
- Department/group leader scoped views.

### Phase 5 — Follow-ups & CRM
- Follow-up queue + assignment + status.
- CRM pipeline stages, contacts, movements.
- Visitor → member conversion flow.
- Tasks module (assignable, linked to entities).

### Phase 6 — Events & Communications
- Admin events CRUD + registrations management.
- Communications: compose, recipient selection, templates.
- send-communication Edge Function (email provider).
- Email delivery webhook + status tracking.

### Phase 7 — Giving
- Giving campaigns (admin/finance).
- record-giving Edge Function + giving_transactions (append-only).
- Giving webhook (payment provider integration).
- Member portal: own giving history.
- Finance reports.

### Phase 8 — Notifications & Prayer
- In-app notifications + realtime.
- Notification preferences.
- Prayer requests (member submit, pastor moderate, public wall).
- Prayer participation tracking.

### Phase 9 — Automations
- Automation builder UI (trigger + condition + action).
- run-automation Edge Function + automation_runs.
- Time-based triggers (birthdays, anniversaries, event reminders).
- Dedup + retry + failure alerting.

### Phase 10 — Reports & Settings
- Reports center (light + heavy reports).
- report_cache + invalidation.
- Exports (CSV/PDF to Storage).
- Church settings (admin/super-admin).
- Audit log viewer (super-admin).

### Phase 11 — Hardening & Scale
- Performance advisor pass (indexes, query plans).
- Security review pass (RLS, Edge Functions, secrets).
- Rate limiting tuning.
- Backup/restore verification.
- Multi-tenant prep (introduce `church_id` where natural, without breaking single-church use).

---

## Approval

This document is the approved baseline for ChurchConnect. Any change to the fundamental architecture — module boundaries, RBAC model, RLS strategy, the RLS-as-authoritative-layer principle, the Edge-Function-for-privileged-mutations principle, or the automation model — requires explicit approval and an updated rationale recorded in this file.

Architect: ChurchConnect design team
Date: 2026-09-19
