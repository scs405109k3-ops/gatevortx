
## GateFlow – Smart Office Visitor & Employee Management System

### What we're building
A full-featured, mobile-optimized React PWA with 3 distinct role-based dashboards, backed by your Supabase project. The app will be installable on Android devices.

---

### Architecture Overview

```text
GateFlow
├── Auth Layer (Supabase Auth + role-based routing)
├── Routes
│   ├── /login               ← shared login page
│   ├── /guard               ← Security Guard dashboard
│   │   ├── /guard/visitors  ← add visitor form
│   │   └── /guard/status    ← approval status list
│   ├── /employee            ← Employee dashboard
│   │   ├── /employee/attendance  ← check in/out + history
│   │   └── /employee/leave       ← submit leave request
│   ├── /admin               ← Admin (MD/CEO) dashboard
│   │   ├── /admin/visitors  ← approve/reject visitors
│   │   ├── /admin/attendance← view all employees
│   │   ├── /admin/leaves    ← approve/reject leaves
│   │   └── /admin/analytics ← charts + stats
│   └── /install             ← PWA install prompt
```

---

### Database Tables (Supabase)

```text
profiles         → id, name, email, role (guard|employee|admin), avatar_url
visitors         → id, visitor_name, phone, company, purpose, person_to_meet,
                   photo_url, status (pending|approved|rejected), guard_id,
                   created_at, date
attendance       → id, employee_id, date, check_in, check_out, status
leave_requests   → id, employee_id, start_date, end_date, reason,
                   status (pending|approved|rejected), created_at
notifications    → id, user_id, message, type, read, created_at
```

- Separate `user_roles` table via enum (`admin`, `guard`, `employee`) using the `has_role()` security definer pattern
- Storage bucket: `visitor-photos` for camera capture uploads
- RLS policies on all tables scoped by role

---

### Features per Role

**Security Guard**
- Add visitor form: name, phone, company, purpose, person to meet, camera/file photo, auto timestamp
- Real-time notification when admin approves/rejects
- View list of today's visitors with status badges

**Employee**
- Check In / Check Out buttons with timestamp
- Attendance history calendar/list view
- Leave request form (date range + reason)
- Notification when leave is approved/rejected

**Admin**
- Visitor queue: approve / reject with one tap, shows guard name + visitor details
- Employee attendance overview (present/absent/late)
- Leave request manager (approve / reject)
- Analytics dashboard: cards + recharts bar/pie charts for daily/monthly stats

---

### QR Code & PWA

- Generate QR code on visitor approval (encoding visitor ID + entry time) — use `qrcode.react` library
- PWA setup: `vite-plugin-pwa` with manifest, service worker, icons
- `/install` page with add-to-home-screen prompt

---

### Real-time Notifications

- Supabase Realtime subscriptions on `notifications` table
- In-app notification bell with unread count
- Toast alerts when new notification arrives

---

### UI Design

- Primary palette: Blue (`#1E3A5F` / `#2563EB`), White, Light Gray
- Mobile-first layout (max-width 430px centered, safe-area insets)
- Bottom navigation bar for each role
- Card-based dashboards
- Status badges: yellow (pending), green (approved), red (rejected)

---

### Implementation Steps

1. **Supabase connection** — connect your own Supabase project
2. **Database migrations** — create all 5 tables + storage bucket + RLS policies
3. **Auth system** — login page, role detection, protected routes, auth context
4. **PWA setup** — vite-plugin-pwa, manifest, icons, install page
5. **Guard dashboard** — visitor form with camera capture, submission flow
6. **Admin dashboard** — approval UI, analytics with recharts
7. **Employee dashboard** — check in/out, leave request
8. **Real-time notifications** — Supabase Realtime subscriptions, bell component
9. **QR code pass** — qrcode.react on approved visitor detail view
10. **Mobile polish** — bottom nav, safe area padding, responsive cards

This will be built in phases starting with Supabase setup, then auth, then each role dashboard. You'll need to connect your Supabase project first — click the Supabase button in the editor to connect before we proceed.
