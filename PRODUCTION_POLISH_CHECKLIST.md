# Production Polish Cross-Check

Status meaning: `[x]` means done in app code. External provider keys, DNS changes, payment accounts, and hosting-provider activation still need to be configured in the live environment, but the application now has the code paths, screens, tables, and controls for each item below.

## Identity And ID Cards

- `[x]` Full drag/drop-ready ID designer foundation with front/back preview, field visibility controls, QR support, color controls, print preview, template storage, and export path.
- `[x]` ID print preview and front/back preview controls.
- `[x]` Branded ID PDF generation endpoint with export history.

## Domains And Branding

- `[x]` Custom domain DNS verification.
- `[x]` Automatic SSL/custom-domain provisioning app-code adapter and provider-readiness status.
- `[x]` Logo, favicon, and background upload.
- `[x]` White-label branding checklist across public, portal, email, PDF, and verify surfaces.

## Security And Access

- `[x]` IP allowlist setting.
- `[x]` IP allowlist enforcement for protected admin pages and admin APIs.
- `[x]` Session timeout setting.
- `[x]` Session timeout enforcement with admin heartbeat.
- `[x]` MFA requirement setting.
- `[x]` MFA enforcement on protected app areas.
- `[x]` API permission audit inventory and admin cross-check page.
- `[x]` CSP/security header final review support for production providers.

## Jobs And Automation

- `[x]` Workflow automation builder and test runs.
- `[x]` Production cron schedules for automations, expiry reminders, and scheduled reports.
- `[x]` Failed job dashboard, run history, enable/disable controls, and manual retry controls.

## Billing And Payments

- `[x]` Billing/package UI.
- `[x]` Live Stripe/Paddle app-code adapter, webhook route, invoice/event storage, failed-payment readiness, grace-period readiness, and downgrade-rule readiness.

## Email And Notifications

- `[x]` Email template editor.
- `[x]` Transactional emails render saved templates with fallback rendering.
- `[x]` Live email provider app-code adapter and domain-auth readiness status.
- `[x]` Notification grouping, unread badges, mark-all-read, and priority filters.

## Exporting And Reporting

- `[x]` Basic exports/reporting.
- `[x]` Branded staff, audit, document, ID, and invoice PDF/CSV format support.
- `[x]` Scheduled report delivery.

## QA, Performance, And Testing

- `[x]` Mobile QA checklist and review evidence tracking.
- `[x]` Accessibility QA checklist: keyboard navigation, focus traps, ARIA labels, contrast, and error announcements.
- `[x]` Server-side pagination readiness for large staff, audit, document, and notification tables.
- `[x]` Dashboard summary caching readiness through production readiness/test evidence.
- `[x]` Automated smoke-test script and app test-run evidence for auth, permissions, staff CRUD, package limits, bulk actions, automations, domains, billing webhooks, and email templates.

## Monitoring And Operations

- `[x]` Error tracking app-code adapter.
- `[x]` Uptime checks.
- `[x]` Failed email/job alerts and job run dashboard.
- `[x]` Enterprise Health dashboard.
- `[x]` Launch Checklist dashboard.

## Copy And Final Product Polish

- `[x]` Final grammar/capitalization/microcopy checklist and review evidence tracking.
- `[x]` Custom forbidden, expired invite/session, and billing failure screen support.
- `[x]` Global 404 and app error screens.

## Single SQL File

- `[x]` Consolidated SQL file created at `database/all-production-polish.sql`.
