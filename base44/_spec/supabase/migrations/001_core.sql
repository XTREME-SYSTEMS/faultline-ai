begin;
create extension if not exists pgcrypto;
create type public.member_role as enum ('owner','admin','reviewer','member','billing');
create type public.finding_evidence_state as enum ('verified','supported_inference','needs_review');
create type public.severity_level as enum ('critical','high','medium','low');
create type public.approval_state as enum ('pending','approved','rejected','changes_requested');

create table public.organizations (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade, full_name text, email text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.organization_members (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, role public.member_role not null default 'member',
  created_at timestamptz not null default now(), unique(organization_id,user_id)
);
create table public.companies (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, domain text, industry text, location text, status text not null default 'active',
  source_provenance jsonb not null default '[]', created_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.websites (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade, url text not null, status text not null default 'queued',
  last_scanned_at timestamptz, source_provenance jsonb not null default '[]',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.audits (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade, audit_type text not null, title text not null,
  status text not null default 'draft', scope jsonb not null default '{}', created_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.evidence (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  audit_id uuid references public.audits(id) on delete cascade, source_type text not null, source_uri text,
  captured_at timestamptz not null default now(), content_summary text not null, content_hash text,
  metadata jsonb not null default '{}', created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table public.findings (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  audit_id uuid not null references public.audits(id) on delete cascade, title text not null, description text not null,
  category text not null, severity public.severity_level not null,
  evidence_state public.finding_evidence_state not null default 'needs_review', confidence numeric(5,2) check(confidence between 0 and 100),
  business_impact text, financial_impact_min numeric, financial_impact_max numeric, assumptions jsonb not null default '[]',
  recommended_repair text, estimated_effort text, responsible_role text, time_to_value text,
  approval_status public.approval_state not null default 'pending', resolution_status text not null default 'open',
  validation_result text, created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.finding_evidence (
  finding_id uuid not null references public.findings(id) on delete cascade,
  evidence_id uuid not null references public.evidence(id) on delete cascade,
  primary key(finding_id,evidence_id)
);
create table public.risks (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  finding_id uuid references public.findings(id) on delete set null, title text not null,
  likelihood int check(likelihood between 1 and 5), impact int check(impact between 1 and 5), controls jsonb not null default '[]',
  owner_user_id uuid references auth.users(id), status text not null default 'open',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.revenue_leaks (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  finding_id uuid references public.findings(id) on delete set null, category text not null,
  annual_impact_min numeric, annual_impact_max numeric, confidence numeric(5,2), assumptions jsonb not null default '[]',
  status text not null default 'modeled', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.system_nodes (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade, node_type text not null, name text not null,
  owner_role text, health_status text, metadata jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.system_edges (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  source_node_id uuid not null references public.system_nodes(id) on delete cascade,
  target_node_id uuid not null references public.system_nodes(id) on delete cascade,
  relationship text not null, risk_status text, metadata jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.repair_plans (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  audit_id uuid references public.audits(id) on delete cascade, title text not null, horizon_days int not null default 90,
  status text not null default 'draft', approved_by uuid references auth.users(id), approved_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.repair_actions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  repair_plan_id uuid not null references public.repair_plans(id) on delete cascade,
  finding_id uuid references public.findings(id) on delete set null, title text not null, description text,
  priority int not null default 2, owner_user_id uuid references auth.users(id), effort text, due_at timestamptz,
  status text not null default 'not_started', validation_result text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.approvals (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  subject_type text not null, subject_id uuid not null, state public.approval_state not null default 'pending',
  requested_by uuid references auth.users(id), decided_by uuid references auth.users(id), decision_note text,
  created_at timestamptz not null default now(), decided_at timestamptz
);
create table public.outreach_drafts (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade, subject text not null, body text not null,
  evidence_refs jsonb not null default '[]', approval_status public.approval_state not null default 'pending',
  send_status text not null default 'draft_only', created_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint outreach_must_be_approved check(send_status='draft_only' or approval_status='approved')
);
create table public.monitoring_rules (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, rule_type text not null, configuration jsonb not null default '{}', active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.monitoring_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  monitoring_rule_id uuid references public.monitoring_rules(id) on delete cascade, event_type text not null,
  severity public.severity_level, payload jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.workflow_runs (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete cascade,
  workflow_name text not null, idempotency_key text not null unique, status text not null default 'queued',
  input jsonb not null default '{}', output jsonb, attempt_count int not null default 0,
  started_at timestamptz, completed_at timestamptz, created_at timestamptz not null default now()
);
create table public.receipts (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete cascade,
  system text not null, action text not null, status text not null, summary text,
  evidence jsonb not null default '{}', rollback jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.dead_letter_jobs (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete cascade,
  workflow_run_id uuid references public.workflow_runs(id) on delete set null, failure_class text not null,
  error_summary text not null, payload jsonb not null default '{}', retry_after timestamptz,
  resolved_at timestamptz, created_at timestamptz not null default now()
);
create table public.audit_logs (
  id bigint generated always as identity primary key, organization_id uuid references public.organizations(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null, action text not null,
  object_type text, object_id uuid, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
commit;
