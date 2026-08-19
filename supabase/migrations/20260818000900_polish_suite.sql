-- Migration 009: email templates, launch checklist notes, and UI readiness state.
-- Run after enterprise readiness migrations.

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  template_key text not null,
  name text not null,
  subject text not null,
  preview_text text,
  body_html text not null,
  body_text text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_templates_org_key_unique unique (organization_id, template_key)
);

drop trigger if exists email_templates_set_updated_at on public.email_templates;
create trigger email_templates_set_updated_at
before update on public.email_templates
for each row execute function public.set_updated_at();

create index if not exists email_templates_organization_id_idx
on public.email_templates(organization_id);

alter table public.organizations
  add column if not exists launch_checklist_state jsonb not null default '{}'::jsonb,
  add column if not exists ui_polish_state jsonb not null default '{"mobile_reviewed":false,"accessibility_reviewed":false,"microcopy_reviewed":false,"performance_reviewed":false}'::jsonb;
