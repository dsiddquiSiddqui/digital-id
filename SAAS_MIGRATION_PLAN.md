# SaaS Migration Plan

This project is currently built for one company. To convert it into a SaaS product, the main change is to introduce a tenant boundary so every company sees only its own users, staff, IDs, documents, alerts, and audit logs.

## Target Model

- A SaaS platform has many organizations.
- Each organization has its own admin users, HR/operations users, staff users, staff records, digital IDs, documents, alerts, and audit logs.
- Platform owners can manage all organizations.
- Organization users can manage only their own organization.
- Staff users can see only their own staff portal and documents.

## Core Database Changes

Add an `organizations` table:

```sql
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active',
  plan text not null default 'starter',
  logo_url text,
  primary_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Add `organization_id uuid references organizations(id)` to tenant-owned tables:

- `profiles`
- `staff`
- `staff_ids`
- `staff_documents`
- `staff_employment`
- `staff_addresses`
- `staff_emergency_contacts`
- `staff_bank_details`
- `audit_logs`
- `security_events`
- `screenshot_alerts`
- tenant-specific `document_types`, if each company needs its own document catalog

Keep truly global tables separate. For example, platform-level plans, billing products, feature flags, and global document templates can remain global.

## Auth And Role Model

Keep existing organization roles:

- `owner`
- `admin`
- `hr_manager`
- `hr`
- `operation_manager`
- `operation_team`
- `staff`

Add platform roles separately:

- `platform_owner`
- `platform_admin`
- `support`

Avoid mixing platform roles and company roles in the same permission checks unless intentional. A platform user should not accidentally become an admin inside every tenant.

## Tenant Resolution

Recommended first version:

- Admin URL: `/app/[orgSlug]/dashboard`
- Staff URL: `/staff/[orgSlug]/login`
- Verify URL: `/verify/[token]`

The app should resolve `orgSlug` to `organization_id`, then apply that `organization_id` to every query and mutation.

Later SaaS version:

- Custom domains per company, such as `ids.customer.com`
- Middleware maps hostnames to `organization_id`

## Code Changes

Create a shared tenant helper:

```ts
// src/lib/tenant.ts
export async function getCurrentProfileWithOrg() {
  // Load Supabase session user.
  // Load profile by auth_user_id.
  // Require profile.organization_id for tenant users.
  // Return { user, profile, organizationId, role }.
}
```

Create shared permission helpers:

```ts
// src/lib/permissions.ts
export function canManageStaff(role: string) {
  return ['owner', 'admin', 'hr_manager', 'hr', 'operation_manager'].includes(role)
}

export function canManageUsers(role: string) {
  return ['owner', 'admin'].includes(role)
}

export function canViewAuditLogs(role: string) {
  return ['owner', 'admin'].includes(role)
}
```

Every API route using `createAdminClient()` must:

1. Authenticate the current user.
2. Load the current profile.
3. Get `organization_id`.
4. Check permissions.
5. Filter all tenant data by `organization_id`.
6. Insert `organization_id` into all new tenant rows.

Example:

```ts
const { profile, organizationId } = await requireTenantAccess()

const { data } = await adminSupabase
  .from('staff')
  .select('*')
  .eq('organization_id', organizationId)
  .eq('id', staffId)
  .single()
```

## Current Code Hotspots

These areas currently assume one company:

- `src/app/(admin)/layout.tsx`
- `src/app/(admin)/dashboard/page.tsx`
- `src/app/(admin)/users/page.tsx`
- `src/app/(admin)/v2/staff/**`
- `src/app/api/admin/**`
- `src/app/api/v2/**`
- `src/app/api/staff/bulk-upload/route.ts`
- `src/app/my-id/page.tsx`
- `src/app/verify/[token]/page.tsx`
- `src/components/IdCard.tsx`

The highest-risk routes are server API routes that use the service-role Supabase client, because service-role access bypasses row-level security. Those routes must always enforce `organization_id` in application code or move more access to RLS-protected clients.

## Storage Changes

Current bucket usage appears global, such as `guard-photos`.

Use tenant-scoped paths:

```text
organizations/{organization_id}/staff/{staff_id}/photo.jpg
organizations/{organization_id}/documents/{document_id}/file.pdf
```

This makes cleanup, export, and isolation much easier.

## Billing And SaaS Features

Add later, after tenant isolation is solid:

- subscription table
- Stripe customer ID per organization
- plan limits such as staff count, admins, document storage, custom branding
- organization settings page
- invite flow for organization users
- onboarding flow for first company owner

Suggested tables:

```sql
create table organization_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  provider text not null default 'stripe',
  provider_customer_id text,
  provider_subscription_id text,
  status text not null,
  plan text not null,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);
```

## Migration Order

1. Add `organizations` and `organization_id` columns.
2. Backfill existing rows into a default organization.
3. Add indexes on every `organization_id`.
4. Create tenant/auth/permission helper functions.
5. Update admin layout and login to load organization context.
6. Update read routes first.
7. Update write routes second.
8. Update bulk upload and storage paths.
9. Update staff portal and verification pages.
10. Add RLS policies after application filtering is correct.
11. Add organization settings, onboarding, and billing.

## Minimum Safe First Milestone

The first SaaS milestone should support:

- one default organization migrated from the current single-company data
- multiple organizations in the same database
- admin users scoped to one organization
- staff records scoped to one organization
- API routes refusing cross-organization access
- audit logs recording `organization_id`

Billing, custom domains, and self-service onboarding can come after this foundation.
