# The Youth Church (TYC) Management Platform
## Production Manual

**Purpose of this document:** A plain-language guide to what the system is, what it can do today, how it is organized, and what has been achieved so far.

**Status as of 11 November 2026:** The platform builds successfully and passes all automated checks. The sign-in flow has been corrected at the code level, but it still needs a live test with a real account before it can be called production-ready (see Section 9).

---

## 1. What the System Is

The platform is a single web application for The Youth Church. It brings together four things that a church usually manages in separate places:

1. **A public website** that tells visitors who the church is, what it believes, when services happen, and how to get involved.
2. **A member portal** where church members sign in to see their own information, track attendance, join virtual meetings, access media, submit prayer requests, and give.
3. **A management portal** for pastors, administrators, and leaders to run the day-to-day work of the church: people, follow-ups, groups, departments, giving, communications, and reports.
4. **Automation** that lets the church set up rules, such as sending a welcome message when someone registers, without manual work each time.

All of this runs on one shared database, so information entered in one place (for example, a new member) is available wherever it is needed, subject to each person's permissions.

---

## 2. Who Uses It

The system recognizes different types of people and shows each one only what they need.

| Audience | Access | What they do |
|---|---|---|
| Visitors (no login) | Public website | Read about the church, view events and sermons, send prayer requests, give, contact the church |
| Members | Member portal (sign-in required) | View their dashboard, attendance, meetings, media, prayer, and giving history |
| Group and department leaders | Management portal, limited view | Manage their own group or department, take attendance, see their members |
| Follow-up managers | Management portal | Track visitors, follow-ups, prayer, and tasks |
| Pastors | Management portal, broad view | Oversee members, attendance, CRM, prayer, communications, and reports |
| Finance officers | Management portal, giving area | Manage giving categories, transactions, and giving reports |
| Administrators | Management portal, full operational access | Manage nearly all modules, including automations |
| Super administrators | Full access | Everything, including system-level settings |

Access is controlled by **roles**. A person can hold one or more roles, and each role unlocks specific menu items and actions. The system enforces these rules on the server, so a person cannot reach a page simply by typing its address.

---

## 3. The Public Website

Visitors can explore the church without signing in. The public site includes:

- **Home page** with a rotating hero carousel, a welcome section, and highlights of ministries and events
- **About** page, including the church's history and story
- **Leadership** page showing the people who lead the church
- **Ministries** page with photo galleries for each ministry, managed by staff
- **Events** page listing upcoming church events, with an event detail page where visitors can register
- **Sermons** page
- **Gallery** page
- **Give** page with giving options
- **Prayer** page where anyone can submit a prayer request
- **Contact** page with a contact form that stores each message for staff follow-up

The public site has been designed with a navy and gold identity, smooth scroll-triggered animations, and a layout that adapts to phones, tablets, and desktops.

---

## 4. The Member Portal

Members sign in to reach a personal space. The portal includes:

- **Dashboard**: a personal welcome, quick links, upcoming events from the church calendar, membership standing, recent notifications, and the member's roles
- **My Attendance**: a record of the member's attendance at church events
- **Virtual Meetings**: join scheduled online meetings for groups and departments
- **Media Library**: access to church media shared with members
- **Events**: the public event calendar
- **Prayer**: submit and track personal prayer requests
- **Giving**: view giving history and give

---

## 5. The Management Portal

This is the operational heart of the system. Menu items appear only for people whose roles allow them to use them.

### 5.1 Core Operations

| Module | What it does |
|---|---|
| **Dashboard** | Overview of church activity, key metrics, quick actions for common tasks, and upcoming events |
| **Members** | Create and edit member profiles, track membership status, baptism, join date, contact details, and pastoral notes (restricted to authorized staff) |
| **Visitors** | Record first-time visitors, move them through a follow-up lifecycle, and assign follow-up |
| **Tasks** | Create, assign, and complete tasks, with a history of changes and assignments |
| **My Units** | A focused view of the departments, ministries, and groups a leader is responsible for |

### 5.2 Relationships and Growth

| Module | What it does |
|---|---|
| **CRM** | A pipeline board (kanban style) that moves contacts through stages, with activity timelines for each person. Pipelines can be customized. |
| **Prayer Requests** | Receive, review, assign, and track prayer requests submitted by members and visitors |
| **Communications** | Compose messages to groups of people, use reusable templates, and review the history of what was sent |

### 5.3 Structure of the Church

| Module | What it does |
|---|---|
| **Departments** | Create and manage departments, their leaders, and their members |
| **Ministries** | Create and manage ministries, their leaders, and their members |
| **Website Ministries** | Control how each ministry appears on the public website, including its photos, schedule, and name |
| **Groups** | Create small groups (such as fellowship or cell groups) with leaders and members |
| **Virtual Meetings** | Schedule online meetings, invite members, manage access, and cancel meetings when needed |
| **Media Library** | Upload and organize church media (photos and videos) for use across the website and member portal |

### 5.4 Attendance and Events

| Module | What it does |
|---|---|
| **Attendance** | Create services and events, record who attended, and capture check-in times |
| **Reports** | Attendance, events, membership, follow-up, and giving reports, each with a date-range filter and CSV export |

### 5.5 Money

| Module | What it does |
|---|---|
| **Giving** | Manage giving categories, review transactions, view details of each transaction, and report on giving |

Access to giving is restricted to super administrators and finance officers.

### 5.6 Automation

| Module | What it does |
|---|---|
| **Automations** | Build rules such as "when a visitor is added, create a follow-up task and send a welcome message". Review each automation's execution history and filter by outcome. |

Automations are limited to administrators and super administrators.

---

## 6. Accounts and Sign-In

- Members and staff sign in with an email address and password.
- New accounts are created through the registration form, which collects first name, last name, email, and password.
- New accounts automatically receive the basic member role, so every person has a place to land after signing in.
- Staff accounts receive additional roles from an administrator, which determines which parts of the management portal they can see.
- Pages that require a sign-in will send anyone who is not signed in to the sign-in page, then return them to the page they wanted.
- Signed-in people who visit the sign-in or registration page are sent straight to their dashboard. Staff go to the management dashboard and everyone else goes to the member dashboard.

---

## 7. Data and Security

**Where the information lives.** All data is stored in a managed database (Supabase, built on PostgreSQL). The database is organized into roughly 27 linked tables covering people, roles, organization, attendance, events, CRM, communications, prayer, giving, automations, meetings, media, and audit history.

**How it is protected.**
- Every table is protected by row-level security, which means the database itself checks whether the person asking is allowed to see or change each row.
- Each table has separate rules for reading, adding, changing, and removing records.
- Records are generally "soft deleted" (marked as removed rather than erased), so they can be recovered and their history is preserved.
- An audit log records significant changes, such as who changed a role or a record, and it is protected so that entries cannot be edited or erased.
- Sensitive private notes about members are restricted to authorized staff.
- Several rounds of security reviews have already been completed. They closed public access to internal functions, tightened storage rules for uploaded photos, and restricted anonymous access to media and meeting data.

**Server-side functions.** Some actions are too sensitive to run directly from a browser, such as verifying giving or changing staff roles. These run on the server through controlled functions that check permissions before making any change.

---

## 8. What Has Been Achieved

**Foundation**
- A complete, production-style web application covering the public site, member portal, and management portal
- A structured database with roughly 27 linked tables, extended over more than 50 incremental migration steps
- Role-based access control covering eight roles, including scoped leadership roles for departments, ministries, and groups
- Seed data so the system starts with real church settings and reference data

**Modules delivered**
- People: members, visitors, membership statuses, and detailed profiles
- Organization: departments, ministries, groups, and their memberships
- Attendance and events, with check-in times
- CRM with customizable pipelines, activity timelines, and tasks with history
- Communications with templates and send history
- Prayer request management for members, visitors, and staff
- Giving with categories, transactions, and reporting
- Automation builder with execution history and filters
- Virtual meetings with scheduling, access control, and cancellation
- Media library with uploads, used across the website and the member portal
- Reporting for attendance, events, membership, follow-up, and giving, with CSV export

**Public experience**
- A branded public website with a home page, about, leadership, ministries, events, sermons, gallery, giving, prayer, and contact pages
- Ministry pages with photo slideshows managed by staff
- Event registration and prayer request forms that save into the system
- Responsive layouts for phones, tablets, and desktops
- Visual polish including animated transitions, hover feedback, and a navy and gold identity

**Quality and security**
- Multiple security review rounds completed, with the findings fixed
- The project builds for production without errors and passes its type-checking
- Background services (automation and virtual meeting access) are in place as server functions

---

## 9. Current Status and Known Gaps

Being transparent about where things stand is important before this goes live.

**Needs a live test before launch**
- **Sign-in to dashboard flow.** The sign-in screen has been corrected, and the routing rules are in place. However, this has not yet been tested end to end with a real account in a live browser. The first step before launch is to sign in with a staff account and a member account, and confirm each lands on the correct dashboard.

**Partly placeholder content**
- The **admin dashboard** currently shows sample "recent activity", "upcoming events", and quick-stat content in several places. These should be connected to live data before the dashboard is relied on for decisions.
- The **member dashboard** is connected to live data for membership, events, and notifications.

**Recommended before launch**
- Create the first super administrator account and assign real staff roles.
- Confirm the church's giving categories and any payment setup.
- Load real church content (events, ministries, leadership photos, sermons) through the management portal.
- Test each role once: a member, a group leader, a finance officer, and an administrator, to confirm each sees only what they should.
- Test on a real phone, since the most recent layout fixes were verified by build checks rather than on a device.

---

## 10. Glossary

- **Role:** A named set of permissions given to a person (for example, Pastor or Finance Officer).
- **Scope:** Where a role applies. A leader's role may apply to the whole church, or only to one department, ministry, or group.
- **Portal:** A distinct area of the site for a particular audience (public, member, or management).
- **CRM:** Customer relationship management. Here, it means tracking people through stages of connection with the church.
- **Pipeline:** A visual board that shows people moving through stages.
- **Automation:** A rule that runs by itself when something happens.
- **Soft delete:** Marking a record as removed without destroying it, so it can be recovered.
- **Migration:** A recorded change to the database structure, applied in order.

---

## 11. Next Steps

1. Complete the live sign-in test for a staff account and a member account.
2. Replace the remaining sample content on the admin dashboard with live data.
3. Set up the church's real staff accounts and roles.
4. Load real church content and review each public page.
5. Run one full pass as each role, then on a phone, before opening the platform to the congregation.
