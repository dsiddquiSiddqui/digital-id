-- Migration 010: configured jobs, run history, and failure visibility.
-- Run after the production polish migrations.

create table if not exists public.scheduled_jobs (
  id uuid primary key default gen_random_uuid(),
  job_key text not null unique,
  name text not null,
  description text,
  endpoint text not null,
  cron_expression text not null,
  provider text not null default 'vercel',
  is_enabled boolean not null default true,
  last_run_at timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_status text not null default 'never' check (last_status in ('never', 'running', 'success', 'failed', 'skipped')),
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists scheduled_jobs_set_updated_at on public.scheduled_jobs;
create trigger scheduled_jobs_set_updated_at
before update on public.scheduled_jobs
for each row execute function public.set_updated_at();

create table if not exists public.scheduled_job_runs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.scheduled_jobs(id) on delete cascade,
  job_key text not null,
  status text not null default 'running' check (status in ('running', 'success', 'failed', 'skipped')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer,
  error_message text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists scheduled_job_runs_job_key_idx
on public.scheduled_job_runs(job_key);

create index if not exists scheduled_job_runs_started_at_idx
on public.scheduled_job_runs(started_at desc);

insert into public.scheduled_jobs (job_key, name, description, endpoint, cron_expression, provider)
values
  ('expiry_reminders', 'Expiry reminders', 'Find expiring staff documents and send notifications or emails.', '/api/cron/expiry-reminders', '0 7 * * *', 'vercel'),
  ('automation_runner', 'Automation runner', 'Run active workflow automation rules.', '/api/cron/automation-runner', '*/30 * * * *', 'vercel'),
  ('report_delivery', 'Scheduled report delivery', 'Send configured report schedules to selected recipients.', '/api/cron/report-delivery', '0 8 * * 1', 'vercel')
on conflict (job_key) do update
set
  name = excluded.name,
  description = excluded.description,
  endpoint = excluded.endpoint,
  cron_expression = excluded.cron_expression,
  provider = excluded.provider;
