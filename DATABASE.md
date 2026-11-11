# ChurchConnect — Database Architecture

**Status:** Source of Truth for all database schema. Do not modify without approval.

**Last updated:** 2026-09-20

---

## Overview

ChurchConnect uses Supabase (PostgreSQL) with Row Level Security (RLS) as the authoritative access-control layer. The database contains 27 tables across 8 migrations, with UUID primary keys, soft-delete on user-managed tables, and per-CRUD-verb RLS policies on every table.

**Backend:** Supabase (PostgreSQL + Auth + Storage + Edge Functions)
**Primary keys:** UUID with `gen_random_uuid()`
**Timestamps:** `created_at` and `updated_at` as `timestamptz` (updated_at maintained via trigger)
**Soft delete:** `deleted_at timestamptz` on user-managed tables (members, visitors, events, etc.)
**Security:** RLS enabled on every table; 4 policies per table (SELECT/INSERT/UPDATE/DELETE)

---

## Table of Contents

1. [Complete Schema](#1-complete-schema)
2. [Table Descriptions](#2-table-descriptions)
3. [Relationship Explanation](#3-relationship-explanation)
4. [ERD Description](#4-erd-description)
5. [SQL Migrations](#5-sql-migrations)
6. [Seed Data Strategy](#6-seed-data-strategy)
7. [RLS Policies](#7-rls-policies)
8. [Index Strategy](#8-index-strategy)
9. [Audit Strategy](#9-audit-strategy)

---

## 1. Complete Schema

### Identity & Access (Migration 1)

#### roles
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | DEFAULT gen_random_uuid() |
| role_key | text | UNIQUE, NOT NULL |
| name | text | NOT NULL |
| description | text | |
| is_system | boolean | NOT NULL, DEFAULT false |
| created_at | timestamptz | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |

#### users
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | DEFAULT auth.uid(), FK → auth.users(id) ON DELETE CASCADE |
| email | text | UNIQUE, NOT NULL |
| display_name | text | NOT NULL |
| first_name | text | |
| last_name | text | |
| phone | text | |
| avatar_url | text | |
| status | text | CHECK IN ('active','inactive','suspended'), DEFAULT 'active' |
| last_login_at | timestamptz | |
| created_at | timestamptz | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |
| deleted_at | timestamptz | soft-delete |

#### role_assignments
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | DEFAULT gen_random_uuid() |
| user_id | uuid | FK → users(id) ON DELETE CASCADE, NOT NULL |
| role_key | text | FK → roles(role_key) ON DELETE RESTRICT, NOT NULL |
| scope_type | text | CHECK IN ('church','department','ministry','group'), DEFAULT 'church' |
| scope_id | uuid | NULL for church scope, NOT NULL for others |
| granted_by | uuid | FK → users(id) ON DELETE SET NULL |
| granted_at | timestamptz | NOT NULL, DEFAULT now() |
| revoked_at | timestamptz | soft-revocation |
| revoked_by | uuid | FK → users(id) ON DELETE SET NULL |
| created_at | timestamptz | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |

**Unique:** (user_id, role_key, scope_type, scope_id)
**Check:** scope_type='church' requires scope_id NULL; others require scope_id NOT NULL

#### church_settings
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | DEFAULT gen_random_uuid() |
| key | text | UNIQUE, NOT NULL |
| value | jsonb | NOT NULL, DEFAULT '{}' |
| is_public | boolean | NOT NULL, DEFAULT false |
| created_by | uuid | FK → users(id) ON DELETE SET NULL |
| updated_by | uuid | FK → users(id) ON DELETE SET NULL |
| created_at | timestamptz | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |

#### audit_logs
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | DEFAULT gen_random_uuid() |
| actor_id | uuid | FK → users(id) ON DELETE SET NULL |
| action | text | NOT NULL |
| entity_type | text | NOT NULL |
| entity_id | uuid | |
| diff | jsonb | before/after or new state |
| ip_address | inet | |
| user_agent | text | |
| created_at | timestamptz | NOT NULL, DEFAULT now() |

**Append-only:** No UPDATE or DELETE policies exist.

### People (Migration 2)

#### members
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | DEFAULT gen_random_uuid() |
| user_id | uuid | FK → users(id) ON DELETE SET NULL, UNIQUE |
| status_key | text | FK → membership_statuses(status_key), NOT NULL |
| first_name | text | NOT NULL |
| last_name | text | NOT NULL |
| email | text | |
| phone | text | |
| date_of_birth | date | |
| gender | text | CHECK IN ('male','female','other','prefer_not_to_say') |
| marital_status | text | CHECK IN ('single','married','divorced','widowed','separated','prefer_not_to_say') |
| occupation | text | |
| profile_image | text | |
| join_date | date | |
| pastoral_notes | text | access-restricted |
| is_baptized | boolean | DEFAULT false |
| is_active | boolean | DEFAULT true |
| created_by | uuid | FK → users(id) |
| updated_by | uuid | FK → users(id) |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |
| deleted_at | timestamptz | soft-delete |

#### member_profiles
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | DEFAULT gen_random_uuid() |
| member_id | uuid | FK → members(id) ON DELETE CASCADE, UNIQUE, NOT NULL |
| address_line1 | text | |
| address_line2 | text | |
| city | text | |
| state_province | text | |
| postal_code | text | |
| country | text | |
| emergency_contact_name | text | |
| emergency_contact_phone | text | |
| emergency_contact_relation | text | |
| occupation | text | |
| employer | text | |
| education | text | |
| skills | text[] | |
| spiritual_background | text | |
| conversion_story | text | |
| baptism_date | date | |
| previous_church | text | |
| family_notes | text | |
| medical_notes | text | |
| pastoral_counseling_notes | text | access-restricted |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

#### visitors
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | DEFAULT gen_random_uuid() |
| first_name | text | NOT NULL |
| last_name | text | NOT NULL |
| email | text | |
| phone | text | |
| source | text | CHECK IN ('website','event','walk_in','referral','social_media','other'), DEFAULT 'walk_in' |
| first_visit_date | date | NOT NULL, DEFAULT CURRENT_DATE |
| converted_to_member_id | uuid | FK → members(id) ON DELETE SET NULL |
| converted_at | timestamptz | |
| notes | text | |
| address_line1/2, city, state_province, postal_code, country | text | |
| created_by | uuid | FK → users(id) |
| updated_by | uuid | FK → users(id) |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |
| deleted_at | timestamptz | soft-delete |

#### membership_statuses
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | |
| status_key | text | UNIQUE, NOT NULL |
| name | text | NOT NULL |
| description | text | |
| sort_order | int | NOT NULL, DEFAULT 0 |
| is_system | boolean | DEFAULT false |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

#### membership_history
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | |
| member_id | uuid | FK → members(id) ON DELETE CASCADE, NOT NULL |
| previous_status | text | FK → membership_statuses(status_key) |
| new_status | text | FK → membership_statuses(status_key), NOT NULL |
| reason | text | |
| changed_by | uuid | FK → users(id) |
| changed_at | timestamptz | DEFAULT now() |

**Append-only:** No UPDATE or DELETE policies.

#### tags
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | |
| name | text | NOT NULL |
| slug | text | UNIQUE, NOT NULL |
| description | text | |
| color | text | |
| created_by | uuid | FK → users(id) |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |
| deleted_at | timestamptz | soft-delete |

#### tag_assignments
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | |
| tag_id | uuid | FK → tags(id) ON DELETE CASCADE, NOT NULL |
| entity_type | text | CHECK IN ('member','visitor','event','group','department','ministry'), NOT NULL |
| entity_id | uuid | NOT NULL |
| assigned_by | uuid | FK → users(id) |
| assigned_at | timestamptz | DEFAULT now() |
| created_at | timestamptz | DEFAULT now() |

**Unique:** (tag_id, entity_type, entity_id)

### Organization (Migration 3)

#### departments
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | |
| name | text | NOT NULL |
| description | text | |
| leader_id | uuid | FK → users(id) ON DELETE SET NULL |
| status | text | CHECK IN ('active','inactive'), DEFAULT 'active' |
| display_order | int | DEFAULT 0 |
| created_by, updated_by | uuid | FK → users(id) |
| created_at, updated_at | timestamptz | |
| deleted_at | timestamptz | soft-delete |

#### department_members
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | |
| department_id | uuid | FK → departments(id) ON DELETE CASCADE, NOT NULL |
| member_id | uuid | FK → members(id) ON DELETE CASCADE, NOT NULL |
| role | text | CHECK IN ('leader','assistant_leader','member','volunteer'), DEFAULT 'member' |
| joined_at | date | DEFAULT CURRENT_DATE |
| created_by | uuid | FK → users(id) |
| created_at, updated_at | timestamptz | |

**Unique:** (department_id, member_id)

#### ministries
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | |
| department_id | uuid | FK → departments(id) ON DELETE CASCADE, NOT NULL |
| name | text | NOT NULL |
| description | text | |
| leader_id | uuid | FK → users(id) ON DELETE SET NULL |
| meeting_day | text | CHECK IN weekday names or NULL |
| meeting_time | text | |
| location | text | |
| status | text | CHECK IN ('active','inactive'), DEFAULT 'active' |
| display_order | int | DEFAULT 0 |
| created_by, updated_by | uuid | FK → users(id) |
| created_at, updated_at | timestamptz | |
| deleted_at | timestamptz | soft-delete |

#### ministry_members
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | |
| ministry_id | uuid | FK → ministries(id) ON DELETE CASCADE, NOT NULL |
| member_id | uuid | FK → members(id) ON DELETE CASCADE, NOT NULL |
| role | text | CHECK IN ('leader','assistant_leader','member','volunteer'), DEFAULT 'member' |
| joined_at | date | DEFAULT CURRENT_DATE |
| created_at, updated_at | timestamptz | |

**Unique:** (ministry_id, member_id)

#### groups
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | |
| ministry_id | uuid | FK → ministries(id) ON DELETE SET NULL (nullable) |
| name | text | NOT NULL |
| description | text | |
| leader_id | uuid | FK → users(id) ON DELETE SET NULL |
| group_type | text | CHECK IN ('small_group','cell_group','fellowship','bible_study','prayer_group','youth_group','other'), DEFAULT 'small_group' |
| meeting_day | text | CHECK in weekday names or NULL |
| meeting_time | text | |
| location | text | |
| max_capacity | int | |
| status | text | CHECK IN ('active','inactive','full'), DEFAULT 'active' |
| display_order | int | DEFAULT 0 |
| created_by, updated_by | uuid | FK → users(id) |
| created_at, updated_at | timestamptz | |
| deleted_at | timestamptz | soft-delete |

#### group_members
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | |
| group_id | uuid | FK → groups(id) ON DELETE CASCADE, NOT NULL |
| member_id | uuid | FK → members(id) ON DELETE CASCADE, NOT NULL |
| role | text | CHECK IN ('leader','assistant_leader','member','visitor'), DEFAULT 'member' |
| joined_at | date | DEFAULT CURRENT_DATE |
| created_at, updated_at | timestamptz | |

**Unique:** (group_id, member_id)

### Attendance & Events (Migration 4)

#### attendance_events
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | |
| title | text | NOT NULL |
| event_type | text | CHECK IN ('service','group_meeting','ministry_meeting','special','rehearsal','other'), DEFAULT 'service' |
| event_date | date | NOT NULL |
| start_time | time | |
| end_time | time | |
| department_id | uuid | FK → departments(id) ON DELETE SET NULL |
| group_id | uuid | FK → groups(id) ON DELETE SET NULL |
| location | text | |
| notes | text | |
| status | text | CHECK IN ('scheduled','completed','cancelled'), DEFAULT 'scheduled' |
| created_by, updated_by | uuid | FK → users(id) |
| created_at, updated_at | timestamptz | |
| deleted_at | timestamptz | soft-delete |

#### attendance_records
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | |
| attendance_event_id | uuid | FK → attendance_events(id) ON DELETE CASCADE, NOT NULL |
| member_id | uuid | FK → members(id) ON DELETE CASCADE, NOT NULL |
| status | text | CHECK IN ('present','absent','late','excused','visitor'), DEFAULT 'present' |
| notes | text | |
| recorded_by | uuid | FK → users(id) |
| created_at, updated_at | timestamptz | |

**Unique:** (attendance_event_id, member_id)

#### events
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | |
| title | text | NOT NULL |
| description | text | |
| start_date | timestamptz | NOT NULL |
| end_date | timestamptz | |
| location | text | |
| address | text | |
| image_url | text | |
| capacity | int | |
| is_public | boolean | DEFAULT true |
| requires_registration | boolean | DEFAULT false |
| registration_deadline | timestamptz | |
| organizer_id | uuid | FK → users(id) |
| department_id | uuid | FK → departments(id) |
| status | text | CHECK IN ('upcoming','ongoing','completed','cancelled'), DEFAULT 'upcoming' |
| created_by, updated_by | uuid | FK → users(id) |
| created_at, updated_at | timestamptz | |
| deleted_at | timestamptz | soft-delete |

#### event_registrations
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | |
| event_id | uuid | FK → events(id) ON DELETE CASCADE, NOT NULL |
| member_id | uuid | FK → members(id) ON DELETE CASCADE |
| visitor_id | uuid | FK → visitors(id) ON DELETE SET NULL |
| first_name | text | NOT NULL |
| last_name | text | NOT NULL |
| email | text | |
| phone | text | |
| num_guests | int | CHECK >= 1, DEFAULT 1 |
| status | text | CHECK IN ('registered','confirmed','attended','cancelled','waitlist'), DEFAULT 'registered' |
| registered_by | uuid | FK → users(id) |
| cancelled_at | timestamptz | |
| created_at, updated_at | timestamptz | |

**Check:** At least one of member_id, visitor_id, or first_name+last_name must be present.

### CRM, Follow-ups & Tasks (Migration 5)

#### pipeline_stages
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | |
| stage_key | text | UNIQUE, NOT NULL |
| name | text | NOT NULL |
| description | text | |
| sort_order | int | NOT NULL, DEFAULT 0 |
| is_system | boolean | DEFAULT false |
| color | text | |
| created_at, updated_at | timestamptz | |

#### contacts
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | |
| first_name | text | NOT NULL |
| last_name | text | NOT NULL |
| email | text | |
| phone | text | |
| member_id | uuid | FK → members(id) ON DELETE SET NULL |
| visitor_id | uuid | FK → visitors(id) ON DELETE SET NULL |
| pipeline_stage | text | FK → pipeline_stages(stage_key), NOT NULL |
| source | text | CHECK IN ('website','event','referral','social_media','walk_in','other'), DEFAULT 'website' |
| engagement_level | int | DEFAULT 1 |
| notes | text | |
| assigned_to | uuid | FK → users(id) ON DELETE SET NULL |
| last_contacted_at | timestamptz | |
| created_by, updated_by | uuid | FK → users(id) |
| created_at, updated_at | timestamptz | |
| deleted_at | timestamptz | soft-delete |

#### contact_movements
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | |
| contact_id | uuid | FK → contacts(id) ON DELETE CASCADE, NOT NULL |
| from_stage | text | FK → pipeline_stages(stage_key) |
| to_stage | text | FK → pipeline_stages(stage_key), NOT NULL |
| reason | text | |
| moved_by | uuid | FK → users(id) |
| moved_at | timestamptz | DEFAULT now() |

**Append-only:** No UPDATE or DELETE policies.

#### follow_ups
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | |
| visitor_id | uuid | FK → visitors(id) ON DELETE CASCADE |
| member_id | uuid | FK → members(id) ON DELETE CASCADE |
| contact_id | uuid | FK → contacts(id) ON DELETE CASCADE |
| type | text | CHECK IN ('welcome_call','home_visit','prayer','counseling','invitation','check_in','other'), DEFAULT 'welcome_call' |
| priority | text | CHECK IN ('low','normal','high','urgent'), DEFAULT 'normal' |
| status | text | CHECK IN ('pending','in_progress','completed','overdue','cancelled'), DEFAULT 'pending' |
| due_date | date | |
| completed_at | timestamptz | |
| assigned_to | uuid | FK → users(id) ON DELETE CASCADE, NOT NULL |
| assigned_by | uuid | FK → users(id) |
| notes | text | |
| created_by, updated_by | uuid | FK → users(id) |
| created_at, updated_at | timestamptz | |
| deleted_at | timestamptz | soft-delete |

**Check:** At least one of visitor_id, member_id, contact_id must be NOT NULL.

#### follow_up_activities
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | |
| follow_up_id | uuid | FK → follow_ups(id) ON DELETE CASCADE, NOT NULL |
| activity_type | text | CHECK IN ('call','text','email','visit','meeting','note','status_change','other'), NOT NULL |
| notes | text | |
| performed_by | uuid | FK → users(id) |
| performed_at | timestamptz | DEFAULT now() |
| created_at | timestamptz | DEFAULT now() |

**Append-only:** No UPDATE or DELETE policies.

#### tasks
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | |
| title | text | NOT NULL |
| description | text | |
| entity_type | text | CHECK IN ('member','visitor','event','follow_up','contact','group','department',NULL) |
| entity_id | uuid | |
| assigned_to | uuid | FK → users(id) ON DELETE CASCADE |
| assigned_by | uuid | FK → users(id) |
| priority | text | CHECK IN ('low','normal','high','urgent'), DEFAULT 'normal' |
| status | text | CHECK IN ('pending','in_progress','completed','cancelled'), DEFAULT 'pending' |
| due_date | date | |
| completed_at | timestamptz | |
| created_by, updated_by | uuid | FK → users(id) |
| created_at, updated_at | timestamptz | |
| deleted_at | timestamptz | soft-delete |

### Communications, Prayer & Giving (Migration 6)

#### messages
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | |
| subject | text | NOT NULL |
| body | text | NOT NULL |
| channel | text | CHECK IN ('email','sms','in_app','push'), DEFAULT 'email' |
| template_id | text | |
| sender_id | uuid | FK → users(id) ON DELETE CASCADE, NOT NULL |
| status | text | CHECK IN ('draft','scheduled','sending','sent','failed','cancelled'), DEFAULT 'draft' |
| scheduled_at | timestamptz | |
| sent_at | timestamptz | |
| recipient_count | int | DEFAULT 0 |
| metadata | jsonb | DEFAULT '{}' |
| created_by, updated_by | uuid | FK → users(id) |
| created_at, updated_at | timestamptz | |
| deleted_at | timestamptz | soft-delete |

#### message_recipients
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | |
| message_id | uuid | FK → messages(id) ON DELETE CASCADE, NOT NULL |
| recipient_user_id | uuid | FK → users(id) ON DELETE CASCADE |
| recipient_member_id | uuid | FK → members(id) ON DELETE SET NULL |
| recipient_email | text | |
| recipient_phone | text | |
| recipient_name | text | |
| delivery_status | text | CHECK IN ('pending','queued','sent','delivered','failed','bounced','read'), DEFAULT 'pending' |
| external_message_id | text | |
| error_message | text | |
| sent_at | timestamptz | |
| delivered_at | timestamptz | |
| read_at | timestamptz | |
| created_at, updated_at | timestamptz | |

**Check:** At least one recipient identifier must be present.

#### prayer_requests
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | |
| title | text | NOT NULL |
| body | text | NOT NULL |
| submitted_by | uuid | FK → users(id) ON DELETE SET NULL |
| member_id | uuid | FK → members(id) ON DELETE SET NULL |
| visibility | text | CHECK IN ('public','members_only','pastoral_only','private'), DEFAULT 'members_only' |
| status | text | CHECK IN ('open','in_progress','answered','closed'), DEFAULT 'open' |
| is_anonymous | boolean | DEFAULT false |
| category | text | CHECK IN ('healing','family','financial','spiritual','guidance','salvation','thanksgiving','other',NULL) |
| prayer_count | int | DEFAULT 0 |
| answered_at | timestamptz | |
| answered_description | text | |
| tags | text[] | |
| created_at, updated_at | timestamptz | |
| deleted_at | timestamptz | soft-delete |

#### giving_campaigns
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | |
| name | text | NOT NULL |
| description | text | |
| goal_amount | numeric(12,2) | CHECK >= 0 or NULL |
| raised_amount | numeric(12,2) | CHECK >= 0, DEFAULT 0 |
| currency | text | DEFAULT 'USD' |
| start_date | date | NOT NULL |
| end_date | date | |
| is_public | boolean | DEFAULT true |
| status | text | CHECK IN ('active','paused','completed','cancelled'), DEFAULT 'active' |
| image_url | text | |
| fund_code | text | |
| created_by, updated_by | uuid | FK → users(id) |
| created_at, updated_at | timestamptz | |
| deleted_at | timestamptz | soft-delete |

#### giving_transactions
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | |
| member_id | uuid | FK → members(id) ON DELETE SET NULL |
| campaign_id | uuid | FK → giving_campaigns(id) ON DELETE SET NULL |
| amount | numeric(12,2) | NOT NULL, CHECK != 0 |
| currency | text | DEFAULT 'USD' |
| payment_method | text | CHECK IN ('cash','check','card','bank_transfer','online','mobile','other'), NOT NULL |
| payment_reference | text | |
| transaction_date | timestamptz | DEFAULT now() |
| is_anonymous | boolean | DEFAULT false |
| giver_name | text | |
| giver_email | text | |
| fund_code | text | |
| notes | text | |
| is_reversal | boolean | DEFAULT false |
| reversal_of_id | uuid | FK → giving_transactions(id) ON DELETE SET NULL |
| status | text | CHECK IN ('pending','verified','failed','reversed'), DEFAULT 'verified' |
| verified_by | uuid | FK → users(id) |
| verified_at | timestamptz | |
| created_at | timestamptz | DEFAULT now() |

**No client INSERT/UPDATE/DELETE.** Service role only via Edge Function.

### Notifications & Automations (Migration 7)

#### notifications
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | |
| user_id | uuid | DEFAULT auth.uid(), FK → users(id) ON DELETE CASCADE, NOT NULL |
| type | text | NOT NULL |
| title | text | NOT NULL |
| body | text | |
| link | text | |
| metadata | jsonb | DEFAULT '{}' |
| is_read | boolean | DEFAULT false |
| read_at | timestamptz | |
| created_at | timestamptz | DEFAULT now() |

#### automations
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | |
| name | text | NOT NULL |
| description | text | |
| trigger_event | text | NOT NULL |
| trigger_condition | jsonb | |
| action_type | text | CHECK IN ('send_communication','create_task','create_follow_up','move_contact_stage','add_tag','notify','create_notification'), NOT NULL |
| action_config | jsonb | DEFAULT '{}' |
| is_enabled | boolean | DEFAULT true |
| max_runs_per_day | int | DEFAULT 100 |
| created_by, updated_by | uuid | FK → users(id) |
| created_at, updated_at | timestamptz | |
| deleted_at | timestamptz | soft-delete |

#### automation_runs
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | |
| automation_id | uuid | FK → automations(id) ON DELETE CASCADE, NOT NULL |
| trigger_payload | jsonb | DEFAULT '{}' |
| status | text | CHECK IN ('running','succeeded','failed','skipped'), DEFAULT 'running' |
| error_message | text | |
| started_at | timestamptz | DEFAULT now() |
| finished_at | timestamptz | |
| created_at | timestamptz | DEFAULT now() |

---

## 2. Table Descriptions

### Identity & Access Control

**roles** — System catalog of the 8 ChurchConnect role keys. Seeded and marked `is_system = true`. Referenced by `role_assignments` via `role_key` foreign key.

**users** — Application-level user profile, 1:1 with Supabase's `auth.users`. Holds display name, avatar, phone, and status. The `id` column defaults to `auth.uid()` so a user can self-insert on first login. This is NOT an auth table — credentials live in `auth.users`.

**role_assignments** — Grants a role to a user with optional scoping. Church-scoped roles (super_admin, admin, pastor, finance_officer, follow_up_manager, member) have `scope_type = 'church'` and `scope_id = NULL`. Department and group leaders are scoped to a specific entity. A user may hold multiple active assignments; the `has_role()` function checks for any matching non-revoked assignment.

**church_settings** — Key/value configuration store. Public settings (church name, service times) are readable by anyone including anonymous visitors. Private settings (feature flags, automation caps) are staff-only. Sensitive keys (containing 'secret', 'key', 'credential') are filtered from all non-super-admin reads.

**audit_logs** — Append-only security audit trail. Records who did what, to which entity, with a redacted JSON diff of changes. No UPDATE or DELETE policies exist — entries are permanent once written. Only super_admin can read.

### People

**members** — A person who is part of the church. May optionally link to a `users` row if they have a login (nullable `user_id`). Tracks membership status, contact info, baptism status, and pastoral notes. Soft-deleted via `deleted_at`.

**member_profiles** — Extended member data (1:1 with members): address, emergency contact, education, spiritual background, family/medical/pastoral counseling notes. Stored separately from the hot `members` table to keep the frequently-read member row lean.

**visitors** — A person who has visited but is not yet a member. Tracks source (website, event, walk-in), first visit date, and conversion status. When converted, `converted_to_member_id` links to the new member record.

**membership_statuses** — Enum-like catalog of lifecycle stages: visitor, regular_attender, member, inactive, transferred. Seeded and system-defined.

**membership_history** — Append-only log of a member's status changes. Each row records the previous status, new status, reason, and who made the change. No UPDATE or DELETE — the history is permanent.

**tags** — Free-form labels with a slug, color, and description. Used to categorize members, visitors, events, and other entities.

**tag_assignments** — Polymorphic join table linking tags to any entity via `entity_type` + `entity_id`. A CHECK constraint limits `entity_type` to known values. Unique constraint prevents duplicate tags on the same entity.

### Organization

**departments** — Top-level organizational units (e.g., Worship, Youth, Outreach). Each has an optional leader and a status. Soft-deleted.

**department_members** — Join table linking members to departments with a role (leader, assistant_leader, member, volunteer) and join date. Unique per (department, member).

**ministries** — A ministry within a department (e.g., Choir within Worship). Has meeting day/time, location, and leader. Belongs to exactly one department.

**ministry_members** — Join table linking members to ministries. Same role structure as department_members.

**groups** — Small groups, cells, fellowships. May optionally belong to a ministry (nullable `ministry_id`). Has a type (small_group, cell_group, bible_study, etc.), capacity, and meeting schedule.

**group_members** — Join table linking members to groups. Roles include leader, assistant_leader, member, and visitor (a visitor can attend a group before becoming a member).

### Attendance & Events

**attendance_events** — A scheduled gathering occurrence (Sunday Service, Youth Group Meeting). May be scoped to a department or group, or church-wide (both null). Has a date, time, type, and status.

**attendance_records** — Per-person attendance for an event. Records status (present, absent, late, excused, visitor) and who recorded it. Unique per (event, member) to prevent duplicates. Members can read their own records; staff and scoped leaders can read/record for their scope.

**events** — Public/calendar-facing events with title, description, date/time, location, capacity, and registration settings. `is_public` controls whether the event shows on the public website. May be scoped to a department.

**event_registrations** — A person registered for an event. Can be a member, visitor, or external person (name/email). Tracks registration status and number of guests. Members can self-register; staff can manage all registrations.

### CRM, Follow-ups & Tasks

**pipeline_stages** — Ordered stages of the engagement pipeline: first_visit → engaged → member → active → serving. Seeded and system-defined with colors for UI display.

**contacts** — A person in the CRM pipeline. May reference a member or visitor (both nullable) but can exist before either. Tracks current pipeline stage, source, engagement level, and assigned staff member.

**contact_movements** — Append-only log of a contact moving between pipeline stages. Records who moved the contact, from/to which stage, and why.

**follow_ups** — A follow-up task assigned to a staff member for a visitor, member, or contact. Has a type (welcome call, home visit, prayer, counseling), priority, due date, and status. The assignee can read and update their assigned follow-ups.

**follow_up_activities** — Append-only log of activities performed on a follow-up (called, texted, visited, scheduled meeting). Each activity records the actor, type, notes, and timestamp.

**tasks** — General assignable tasks with priority, status, due date, and optional polymorphic link to any entity. Staff can create tasks; assignees can update their tasks; admin can manage all.

### Communications, Prayer & Giving

**messages** — An outbound communication (email, SMS, in-app). Has subject, body, channel, sender, and status (draft → scheduled → sending → sent). Dispatched by the `send-communication` Edge Function.

**message_recipients** — Per-recipient delivery record. Tracks delivery status (pending → queued → sent → delivered → read), external message ID (from provider), and error messages. Updated by webhook callbacks from the email/SMS provider.

**prayer_requests** — A prayer request with strict visibility controls. Four visibility levels:
- `public` — visible on the public prayer wall (anon + authenticated)
- `members_only` — visible to any logged-in member
- `pastoral_only` — visible to pastors and super_admin ONLY (strictest)
- `private` — visible to the submitter and pastoral staff

Any authenticated user can submit. Only pastor/super_admin can delete.

**giving_campaigns** — A fundraising campaign with goal amount, start/end dates, and status. Public campaigns are readable by anyone. Finance officers and admins can create and manage campaigns.

**giving_transactions** — A verified giving transaction. **The strictest table in the system.** No client INSERT, UPDATE, or DELETE policies exist — all writes go through the `record-giving` Edge Function using the service role key. Only finance_officer and super_admin can SELECT. Corrections are new reversing entries (`is_reversal = true`, `reversal_of_id` points to the original). Append-only in practice.

### Notifications & Automations

**notifications** — In-app notifications for a user. Realtime-subscribed via Supabase Realtime. A user can read and mark their own notifications as read. The system (Edge Functions, server actions) creates notifications for users.

**automations** — A declarative automation definition: trigger event, optional JSON condition, action type, and action config. Managed by admin/super_admin. Executed by the `run-automation` Edge Function. Action types: send_communication, create_task, create_follow_up, move_contact_stage, add_tag, notify, create_notification.

**automation_runs** — Append-only execution log. Records the trigger payload, status (running → succeeded/failed), error message, and timestamps. Used for debugging and auditing.

---

## 3. Relationship Explanation

### Identity chain
`auth.users` (Supabase managed) → `users` (1:1, application profile) → `role_assignments` (N, scoped roles) → `roles` (N:1, role catalog)

A user authenticates through Supabase Auth, which creates a row in `auth.users`. On first app interaction, a corresponding `users` row is created. Role assignments link the user to one or more roles, optionally scoped to a department, ministry, or group.

### Member identity
`users` → `members` (1:0..1, nullable link) → `member_profiles` (1:1, extended data)

A member may or may not have a login. When they do, `members.user_id` links to `users.id`. A member always has exactly one `member_profiles` row for extended data.

### Visitor → Member conversion
`visitors` → `members` (via `converted_to_member_id`)

When a visitor becomes a member, the visitor record is updated with `converted_to_member_id` and `converted_at`. The original visitor record is retained for history.

### Organizational hierarchy
`departments` → `ministries` → `groups` (optional chain)

Departments are the top level. Ministries belong to a department. Groups may optionally belong to a ministry (nullable `ministry_id`). Each level has a membership join table (`department_members`, `ministry_members`, `group_members`) linking members with a role.

### Attendance
`attendance_events` → `attendance_records` (1:N, per-person)

An attendance event is a scheduled gathering. Each attendance record links one member to one event with a status. The event may be scoped to a department or group, which determines which leaders can access the records.

### Events & registrations
`events` → `event_registrations` (1:N)

A public/calendar event can have many registrations. A registration may link to a member, a visitor, or just a name/email for external attendees.

### CRM pipeline
`contacts` → `contact_movements` (1:N, append-only)

A contact moves through pipeline stages. Each movement is logged with from/to stage, reason, and who moved it. A contact may optionally reference a member or visitor.

### Follow-up chain
`follow_ups` → `follow_up_activities` (1:N, append-only)

A follow-up is assigned to a staff member for a visitor, member, or contact. Each activity (call, text, visit) is logged as an append-only record.

### Giving
`giving_campaigns` → `giving_transactions` (1:N, append-only)

A campaign has many transactions. Transactions are append-only — corrections are reversal entries that reference the original transaction via `reversal_of_id`.

### Communications
`messages` → `message_recipients` (1:N)

A message has many recipients. Each recipient record tracks delivery status and is updated by webhook callbacks from the email/SMS provider.

### Automation chain
`automations` → `automation_runs` (1:N, append-only)

An automation definition is triggered by a domain event. Each execution is logged as an automation run with status and error information.

### Tag system (polymorphic)
`tags` → `tag_assignments` (1:N, polymorphic via entity_type + entity_id)

Tags can be applied to any entity. The `entity_type` column identifies the table (member, visitor, event, group, department, ministry) and `entity_id` is the row's UUID.

### Task system (polymorphic)
`tasks` can link to any entity via `entity_type` + `entity_id`. This allows tasks to be created for members, visitors, events, follow-ups, contacts, groups, or departments.

---

## 4. ERD Description

```
┌─────────────┐     ┌─────────────┐     ┌────────────────────┐
│ auth.users  │1───1│   users     │1───N│  role_assignments   │N──1│ roles │
│ (Supabase)  │     │ (app profile)│     │  (scoped grants)    │     │(catalog)│
└─────────────┘     └──────┬──────┘     └────────────────────┘     └───────┘
                           │
                    ┌──────▼──────┐
                    │   members   │1──1┌──────────────────┐
                    │             │    │ member_profiles   │
                    │             │    └──────────────────┘
                    │             │1──N┌──────────────────┐
                    │             │    │ membership_history│ (append-only)
                    │             │    └──────────────────┘
                    │             │1──N┌──────────────────┐
                    │             │    │ attendance_records│N──1│ attendance_events │
                    │             │    └──────────────────┘    └───────────────────┘
                    │             │1──N┌──────────────────┐
                    │             │    │ event_registrations│N──1│ events │
                    │             │    └──────────────────┘    └─────────┘
                    │             │1──N┌──────────────────┐
                    │             │    │  group_members    │N──1│ groups │
                    │             │    └──────────────────┘    └───┬────┘
                    │             │1──N┌──────────────────┐        │ (optional)
                    │             │    │ dept_members     │N──1│ departments │1──N│ ministries │
                    │             │    └──────────────────┘    └────────────┘    └───────────┘
                    │             │1──N┌──────────────────┐
                    │             │    │ giving_transactions│N──1│ giving_campaigns │
                    │             │    └──────────────────┘    └──────────────────┘
                    └─────────────┘

┌───────────┐     ┌───────────────────┐     ┌────────────────────┐
│ visitors  │1──1│ contacts           │1──N│ contact_movements   │
│           │    │ (CRM pipeline)     │    │ (append-only)       │
│           │    └───────────────────┘    └────────────────────┘
│           │1──N┌───────────────────┐
│           │    │ follow_ups          │1──N┌─────────────────────┐
│           │    │                    │    │ follow_up_activities  │
│           │    └───────────────────┘    │ (append-only)        │
└───────────┘                              └─────────────────────┘

┌──────────────────┐     ┌────────────────────┐
│ messages         │1──N│ message_recipients   │
│ (communications) │    │ (delivery tracking)  │
└──────────────────┘    └────────────────────┘

┌──────────────────┐
│ prayer_requests  │ (4 visibility levels: public, members_only, pastoral_only, private)
└──────────────────┘

┌──────────────────┐     ┌────────────────────┐
│ automations      │1──N│ automation_runs     │
│ (trigger+action) │    │ (append-only log)   │
└──────────────────┘    └────────────────────┘

┌──────────────────┐
│ notifications    │ (per-user, realtime)
└──────────────────┘

┌──────────────────┐
│ audit_logs       │ (append-only, super_admin only)
└──────────────────┘

┌──────────────────┐
│ church_settings  │ (key/value, public + private)
└──────────────────┘

┌──────────────────┐     ┌────────────────────┐
│ tags             │1──N│ tag_assignments      │
│ (catalog)        │    │ (polymorphic)        │
└──────────────────┘    └────────────────────┘

┌──────────────────┐
│ tasks            │ (polymorphic entity link, assignable)
└──────────────────┘

┌──────────────────────┐
│ membership_statuses  │ (catalog: visitor → member → inactive/transferred)
│ pipeline_stages      │ (catalog: first_visit → serving)
└──────────────────────┘
```

---

## 5. SQL Migrations

All migrations are applied via the Supabase MCP `apply_migration` tool. Migration files are stored in `supabase/migrations/` for reference but are applied directly to the database.

| # | Filename | Description |
|---|----------|-------------|
| 1 | `0001_foundation.sql` | Roles, users, role_assignments, church_settings, audit_logs + `has_role()` and `update_updated_at()` functions |
| 2 | `0002_people.sql` | Members, member_profiles, visitors, membership_statuses, membership_history, tags, tag_assignments |
| 3 | `0003_organization.sql` | Departments, department_members, ministries, ministry_members, groups, group_members + supplementary member SELECT policies for scoped leaders |
| 4 | `0004_attendance_events.sql` | Attendance_events, attendance_records, events, event_registrations |
| 5 | `0005_crm_followups_tasks.sql` | Pipeline_stages, contacts, contact_movements, follow_ups, follow_up_activities, tasks |
| 6 | `0006_communications_prayer_giving.sql` | Messages, message_recipients, prayer_requests, giving_campaigns, giving_transactions |
| 7 | `0007_notifications_automations.sql` | Notifications, automations, automation_runs |
| 8 | `0008_seed_data.sql` | Seed: 8 roles, 5 membership statuses, 5 pipeline stages, 16 church settings |

**Migration rules:**
- Each migration starts with a detailed markdown comment block explaining purpose, tables, security, and notes.
- Tables are created before policies that reference them (to avoid dependency errors).
- All statements use `IF NOT EXISTS` or `DROP POLICY IF EXISTS` before `CREATE POLICY` for idempotency.
- No `DROP`, `DELETE` columns, type changes, or table renames — data safety first.
- No transaction control statements (`BEGIN`/`COMMIT`/`ROLLBACK`) — `DO $$ ... END $$` blocks are used where needed.

---

## 6. Seed Data Strategy

### What is seeded

Catalog/reference data that the application needs to function is seeded in Migration 8:

**Roles (8 rows):** super_admin, admin, pastor, finance_officer, follow_up_manager, department_leader, group_leader, member. All marked `is_system = true`.

**Membership statuses (5 rows):** visitor, regular_attender, member, inactive, transferred. Ordered by `sort_order`.

**Pipeline stages (5 rows):** first_visit, engaged, member, active, serving. Ordered by `sort_order` with UI colors.

**Church settings (16 rows):** Church name, tagline, address, phone, email, service times, website, description (public); feature flags for automations/giving/CRM/communications, automation caps, notification digest, default currency, registration approval (private).

### What is NOT seeded

- **Users** — Created through the application sign-up flow.
- **Members** — Created by admin/pastor through the admin portal.
- **Role assignments** — Granted by super_admin through the admin portal.
- **Departments, ministries, groups** — Created by admin/pastor.
- **Events, attendance, follow-ups** — Created by staff through the admin portal.

### Idempotency

All seed inserts use `ON CONFLICT DO NOTHING` so re-running Migration 8 is safe. The migration can be re-applied without duplicating data.

### Future seed data

Additional seed data (e.g., default communication templates, default automations, sample departments) can be added in future migrations. The pattern is: create a new migration with `INSERT ... ON CONFLICT DO NOTHING` statements.

---

## 7. RLS Policies

### Design principles

1. **RLS is the authoritative security layer.** UI guards are decorative; a UI bug must never leak data because RLS blocks the query.
2. **Four policies per table** (SELECT, INSERT, UPDATE, DELETE) — never `FOR ALL`.
3. **`has_role()` function** — SECURITY DEFINER function that checks `role_assignments` for a matching, non-revoked role. Used by all staff-scoped policies.
4. **`auth.uid()` for ownership** — never `current_user`.
5. **Owner columns default to `auth.uid()`** where applicable (users, notifications).
6. **Append-only tables** have no UPDATE or DELETE policies (audit_logs, membership_history, contact_movements, follow_up_activities, giving_transactions).
7. **Public reads** use `TO anon, authenticated` with `USING (true)` only for intentionally public data (public events, public prayer requests, public giving campaigns, public church settings).

### Policy summary by table

| Table | SELECT | INSERT | UPDATE | DELETE | Notes |
|-------|--------|--------|--------|--------|-------|
| roles | authenticated (all) | super_admin | super_admin | super_admin | Catalog |
| users | self + staff | self | self | super_admin | App profile |
| role_assignments | self + admin/super | super_admin | super_admin | super_admin | Scoped grants |
| church_settings | public (anon) + staff | super_admin | super_admin | super_admin | Sensitive keys filtered |
| audit_logs | super_admin only | any authenticated | NONE | NONE | Append-only |
| members | self + staff + scoped leaders | staff | self + staff | admin/super | Pastoral notes restricted |
| member_profiles | self + staff | staff | self + staff | admin/super | Counseling notes restricted |
| visitors | staff only | staff | staff | admin/super | No self-access |
| membership_statuses | authenticated (all) | super_admin | super_admin | super_admin | Catalog |
| membership_history | self + staff | staff | NONE | NONE | Append-only |
| tags | authenticated (all) | admin/super | admin/super | admin/super | |
| tag_assignments | authenticated (all) | staff | NONE | staff | |
| departments | authenticated (all) | staff | staff + scoped leader | admin/super | |
| department_members | authenticated (all) | staff + scoped leader | staff + scoped leader | staff + scoped leader | |
| ministries | authenticated (all) | staff + scoped leader | staff + scoped leader | admin/super | |
| ministry_members | authenticated (all) | staff | staff | staff | |
| groups | authenticated (all) | staff | staff + scoped leader | admin/super | |
| group_members | authenticated (all) | staff + scoped leader | staff + scoped leader | staff + scoped leader | |
| attendance_events | authenticated (all) | staff + scoped leader | staff + scoped leader | admin/super | |
| attendance_records | self + staff + scoped leader | staff + scoped leader | staff + scoped leader | admin/super | Members can't self-record |
| events | public (anon) + authenticated | staff | staff + scoped leader | admin/super | is_public controls visibility |
| event_registrations | self + staff | self + staff | self + staff | staff | Members can self-register |
| pipeline_stages | authenticated (all) | super_admin | super_admin | super_admin | Catalog |
| contacts | staff + assignee | staff | staff + assignee | admin/super | |
| contact_movements | staff | staff | NONE | NONE | Append-only |
| follow_ups | staff + assignee | staff | staff + assignee | admin/super | |
| follow_up_activities | staff + assignee | staff + assignee | NONE | NONE | Append-only |
| tasks | staff + assignee + assigner | staff | staff + assignee | admin/super | |
| messages | staff + recipient | staff | sender + admin | admin/super | |
| message_recipients | staff + recipient | staff | staff | admin/super | |
| prayer_requests | 4 policies by visibility | any authenticated | submitter + pastor | pastor/super | Strictest: pastoral_only |
| giving_campaigns | public (anon) + finance | finance/admin | finance/admin | admin/super | |
| giving_transactions | finance/super ONLY | NONE | NONE | NONE | Service role only |
| notifications | self only | any authenticated | self | self | |
| automations | admin/super | admin/super | admin/super | admin/super | |
| automation_runs | admin/super | any authenticated | admin/super | NONE | Append-only |

### Scoped leader access

Department leaders can read members in their department via a supplementary SELECT policy on `members` that checks `department_members` + `role_assignments`. Group leaders have the same pattern via `group_members`.

For attendance, department/group leaders can read and record attendance for events scoped to their department/group (checked via `attendance_events.department_id` or `group_id`).

### Prayer request visibility (strictest access control)

Four separate SELECT policies enforce the four visibility levels:
- `public` → `TO anon, authenticated` — anyone can read
- `members_only` → `TO authenticated` — any logged-in user
- `pastoral_only` → `TO authenticated` with `has_role('pastor') OR has_role('super_admin')` — pastors and super admins only
- `private` → `TO authenticated` with `submitted_by = auth.uid() OR has_role('pastor') OR has_role('super_admin')` — submitter and pastoral staff

### Giving transactions (strictest table)

No client INSERT, UPDATE, or DELETE policies exist. The table is effectively write-only via the service role (Edge Function). Only finance_officer and super_admin can SELECT. A member sees their own giving history through an Edge Function or view, never by direct table access.

---

## 8. Index Strategy

### Indexing rules

1. **Every foreign key column** gets an index (Postgres doesn't automatically index FKs).
2. **Frequently-filtered columns** (status, due_date, created_at, scope fields) get an index.
3. **Soft-delete aware:** indexes on soft-deleted tables include `WHERE deleted_at IS NULL` to avoid indexing dead rows.
4. **Polymorphic tables:** composite index on `(entity_type, entity_id)` for tag_assignments, tasks, and audit_logs.
5. **Partial indexes** for active/revoked filters (e.g., `WHERE revoked_at IS NULL` on role_assignments).

### Index inventory

**Foundation:**
- `idx_users_status` — users(status) WHERE deleted_at IS NULL
- `idx_users_email` — users(email)
- `idx_ra_user` — role_assignments(user_id) WHERE revoked_at IS NULL
- `idx_ra_role` — role_assignments(role_key) WHERE revoked_at IS NULL
- `idx_ra_scope` — role_assignments(scope_type, scope_id) WHERE revoked_at IS NULL
- `idx_audit_actor` — audit_logs(actor_id)
- `idx_audit_entity` — audit_logs(entity_type, entity_id)
- `idx_audit_action` — audit_logs(action)
- `idx_audit_created` — audit_logs(created_at)

**People:**
- `idx_members_user_id` — members(user_id) WHERE deleted_at IS NULL
- `idx_members_status` — members(status_key) WHERE deleted_at IS NULL
- `idx_members_name` — members(first_name, last_name) WHERE deleted_at IS NULL
- `idx_members_email` — members(email) WHERE deleted_at IS NULL
- `idx_members_active` — members(is_active) WHERE deleted_at IS NULL
- `idx_mp_member` — member_profiles(member_id)
- `idx_visitors_name` — visitors(first_name, last_name) WHERE deleted_at IS NULL
- `idx_visitors_email` — visitors(email) WHERE deleted_at IS NULL
- `idx_visitors_source` — visitors(source) WHERE deleted_at IS NULL
- `idx_visitors_first_visit` — visitors(first_visit_date) WHERE deleted_at IS NULL
- `idx_visitors_converted` — visitors(converted_to_member_id) WHERE deleted_at IS NULL
- `idx_mh_member` — membership_history(member_id)
- `idx_mh_changed_at` — membership_history(changed_at)
- `idx_mh_new_status` — membership_history(new_status)
- `idx_tags_slug` — tags(slug) WHERE deleted_at IS NULL
- `idx_tags_name` — tags(name) WHERE deleted_at IS NULL
- `idx_ta_tag` — tag_assignments(tag_id)
- `idx_ta_entity` — tag_assignments(entity_type, entity_id)

**Organization:**
- `idx_departments_status` — departments(status) WHERE deleted_at IS NULL
- `idx_departments_leader` — departments(leader_id) WHERE deleted_at IS NULL
- `idx_dm_department` — department_members(department_id)
- `idx_dm_member` — department_members(member_id)
- `idx_ministries_department` — ministries(department_id) WHERE deleted_at IS NULL
- `idx_ministries_status` — ministries(status) WHERE deleted_at IS NULL
- `idx_ministries_leader` — ministries(leader_id) WHERE deleted_at IS NULL
- `idx_mm_ministry` — ministry_members(ministry_id)
- `idx_mm_member` — ministry_members(member_id)
- `idx_groups_ministry` — groups(ministry_id) WHERE deleted_at IS NULL
- `idx_groups_status` — groups(status) WHERE deleted_at IS NULL
- `idx_groups_leader` — groups(leader_id) WHERE deleted_at IS NULL
- `idx_groups_type` — groups(group_type) WHERE deleted_at IS NULL
- `idx_gm_group` — group_members(group_id)
- `idx_gm_member` — group_members(member_id)

**Attendance & Events:**
- `idx_ae_date` — attendance_events(event_date) WHERE deleted_at IS NULL
- `idx_ae_type` — attendance_events(event_type) WHERE deleted_at IS NULL
- `idx_ae_department` — attendance_events(department_id) WHERE deleted_at IS NULL
- `idx_ae_group` — attendance_events(group_id) WHERE deleted_at IS NULL
- `idx_ae_status` — attendance_events(status) WHERE deleted_at IS NULL
- `idx_ar_event` — attendance_records(attendance_event_id)
- `idx_ar_member` — attendance_records(member_id)
- `idx_ar_status` — attendance_records(status)
- `idx_events_start` — events(start_date) WHERE deleted_at IS NULL
- `idx_events_public` — events(is_public) WHERE deleted_at IS NULL
- `idx_events_status` — events(status) WHERE deleted_at IS NULL
- `idx_events_department` — events(department_id) WHERE deleted_at IS NULL
- `idx_er_event` — event_registrations(event_id)
- `idx_er_member` — event_registrations(member_id)
- `idx_er_status` — event_registrations(status)
- `idx_er_email` — event_registrations(email)

**CRM, Follow-ups & Tasks:**
- `idx_ps_sort` — pipeline_stages(sort_order)
- `idx_contacts_stage` — contacts(pipeline_stage) WHERE deleted_at IS NULL
- `idx_contacts_member` — contacts(member_id) WHERE deleted_at IS NULL
- `idx_contacts_visitor` — contacts(visitor_id) WHERE deleted_at IS NULL
- `idx_contacts_assigned` — contacts(assigned_to) WHERE deleted_at IS NULL
- `idx_contacts_name` — contacts(first_name, last_name) WHERE deleted_at IS NULL
- `idx_contacts_email` — contacts(email) WHERE deleted_at IS NULL
- `idx_cm_contact` — contact_movements(contact_id)
- `idx_cm_moved_at` — contact_movements(moved_at)
- `idx_cm_to_stage` — contact_movements(to_stage)
- `idx_fu_visitor` — follow_ups(visitor_id) WHERE deleted_at IS NULL
- `idx_fu_member` — follow_ups(member_id) WHERE deleted_at IS NULL
- `idx_fu_contact` — follow_ups(contact_id) WHERE deleted_at IS NULL
- `idx_fu_assigned` — follow_ups(assigned_to) WHERE deleted_at IS NULL
- `idx_fu_status` — follow_ups(status) WHERE deleted_at IS NULL
- `idx_fu_due_date` — follow_ups(due_date) WHERE deleted_at IS NULL
- `idx_fu_priority` — follow_ups(priority) WHERE deleted_at IS NULL
- `idx_fa_follow_up` — follow_up_activities(follow_up_id)
- `idx_fa_performed_at` — follow_up_activities(performed_at)
- `idx_tasks_assigned_to` — tasks(assigned_to) WHERE deleted_at IS NULL
- `idx_tasks_status` — tasks(status) WHERE deleted_at IS NULL
- `idx_tasks_priority` — tasks(priority) WHERE deleted_at IS NULL
- `idx_tasks_due_date` — tasks(due_date) WHERE deleted_at IS NULL
- `idx_tasks_entity` — tasks(entity_type, entity_id) WHERE deleted_at IS NULL

**Communications, Prayer & Giving:**
- `idx_messages_sender` — messages(sender_id) WHERE deleted_at IS NULL
- `idx_messages_channel` — messages(channel) WHERE deleted_at IS NULL
- `idx_messages_status` — messages(status) WHERE deleted_at IS NULL
- `idx_messages_scheduled` — messages(scheduled_at) WHERE deleted_at IS NULL AND status = 'scheduled'
- `idx_mr_message` — message_recipients(message_id)
- `idx_mr_recipient_user` — message_recipients(recipient_user_id)
- `idx_mr_recipient_member` — message_recipients(recipient_member_id)
- `idx_mr_delivery_status` — message_recipients(delivery_status)
- `idx_mr_email` — message_recipients(recipient_email)
- `idx_pr_visibility` — prayer_requests(visibility) WHERE deleted_at IS NULL
- `idx_pr_status` — prayer_requests(status) WHERE deleted_at IS NULL
- `idx_pr_submitted_by` — prayer_requests(submitted_by) WHERE deleted_at IS NULL
- `idx_pr_member` — prayer_requests(member_id) WHERE deleted_at IS NULL
- `idx_pr_created` — prayer_requests(created_at) WHERE deleted_at IS NULL
- `idx_gc_status` — giving_campaigns(status) WHERE deleted_at IS NULL
- `idx_gc_public` — giving_campaigns(is_public) WHERE deleted_at IS NULL
- `idx_gc_dates` — giving_campaigns(start_date, end_date) WHERE deleted_at IS NULL
- `idx_gc_fund_code` — giving_campaigns(fund_code) WHERE deleted_at IS NULL
- `idx_gt_member` — giving_transactions(member_id)
- `idx_gt_campaign` — giving_transactions(campaign_id)
- `idx_gt_date` — giving_transactions(transaction_date)
- `idx_gt_status` — giving_transactions(status)
- `idx_gt_payment_method` — giving_transactions(payment_method)
- `idx_gt_fund_code` — giving_transactions(fund_code)
- `idx_gt_reversal` — giving_transactions(reversal_of_id) WHERE is_reversal = true

**Notifications & Automations:**
- `idx_notifications_user` — notifications(user_id) WHERE is_read = false
- `idx_notifications_created` — notifications(created_at)
- `idx_notifications_type` — notifications(type)
- `idx_automations_trigger` — automations(trigger_event) WHERE deleted_at IS NULL AND is_enabled = true
- `idx_automations_enabled` — automations(is_enabled) WHERE deleted_at IS NULL
- `idx_arun_automation` — automation_runs(automation_id)
- `idx_arun_status` — automation_runs(status)
- `idx_arun_started` — automation_runs(started_at)

---

## 9. Audit Strategy

### What is audited

Privileged mutations — operations that require elevated roles or affect sensitive data — are recorded in `audit_logs`. This includes:

- User role changes (grant, revoke, scope changes)
- Church settings changes
- Member creation, update, deletion
- Membership status changes
- Giving transaction recording and reversals
- Automation creation, update, enable/disable
- Communication sending
- Any Edge Function privileged operation

### How auditing works

1. **Edge Functions** write audit entries after performing a privileged mutation, using the service role key. The entry records the actor (from the verified JWT), the action, the entity type/id, and a redacted JSON diff.

2. **Server Actions** can write audit entries for mutations they perform. The entry is inserted alongside the data mutation.

3. **Database triggers** are NOT used for audit logging (except for `updated_at` maintenance). Audit logging is application-level, not trigger-level, so it can capture the actor identity and business context that triggers cannot.

### Audit log structure

```
audit_logs
  actor_id     — who performed the action (from JWT)
  action       — what they did (e.g., 'member.create', 'role.grant', 'giving.record')
  entity_type  — what type of entity was affected (e.g., 'member', 'role_assignment', 'giving_transaction')
  entity_id    — which specific entity was affected
  diff         — JSON of before/after (for updates) or new state (for inserts); sensitive fields redacted
  ip_address   — request IP
  user_agent   — request user agent
  created_at   — when the action occurred
```

### Audit log access

- **INSERT:** Any authenticated user can insert (the system writes audit entries).
- **SELECT:** Only super_admin can read audit logs.
- **UPDATE:** No policy — entries are immutable.
- **DELETE:** No policy — entries are permanent.

### Sensitive field redaction

The `diff` JSON should redact sensitive fields before writing:
- Giving amounts (store only the transaction ID, not the amount)
- Passwords (never stored)
- Pastoral notes and counseling notes (store only a boolean indicating they were changed)
- API keys and credentials (never stored)

### Retention

Audit logs are retained indefinitely in v1. A future migration may add a retention policy (e.g., archive entries older than 7 years to cold storage). No automatic deletion is performed.

---

## Database Helper Functions

### `has_role(p_user, p_role, p_scope_type, p_scope_id)`
- **Type:** SECURITY DEFINER, STABLE
- **Returns:** boolean
- **Purpose:** Checks if a user has an active (non-revoked) role assignment matching the given role and optional scope. This is the single source of truth for role checks at the database level, used by all RLS policies.
- **Security:** Runs with table-owner privileges, bypassing RLS on `role_assignments`. Safe because it only reads and returns a boolean. Search path is set to `public` to prevent injection.

### `update_updated_at()`
- **Type:** Trigger function
- **Purpose:** Sets `NEW.updated_at = now()` on any row update. Attached to every table with an `updated_at` column via a `BEFORE UPDATE` trigger.

---

## Approval

This document is the approved database source of truth for ChurchConnect. Any change to the schema — new tables, column changes, RLS policy changes, index strategy changes — requires a new migration and an update to this document.

Architect: ChurchConnect design team
Date: 2026-09-20
