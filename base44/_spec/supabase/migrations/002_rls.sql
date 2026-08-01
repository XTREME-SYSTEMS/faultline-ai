begin;
create or replace function public.is_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.organization_members m where m.organization_id=target_org and m.user_id=auth.uid());
$$;
create or replace function public.has_org_role(target_org uuid, allowed public.member_role[])
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.organization_members m where m.organization_id=target_org and m.user_id=auth.uid() and m.role=any(allowed));
$$;
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
create policy organizations_read_member on public.organizations for select using(public.is_org_member(id));
create policy profiles_read_self on public.profiles for select using(id=auth.uid());
create policy profiles_update_self on public.profiles for update using(id=auth.uid()) with check(id=auth.uid());
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['organization_members','companies','websites','audits','evidence','findings','risks','revenue_leaks','system_nodes','system_edges','repair_plans','repair_actions','approvals','outreach_drafts','monitoring_rules','monitoring_events','workflow_runs','receipts','dead_letter_jobs','audit_logs']
  LOOP
    EXECUTE format('alter table public.%I enable row level security',t);
    EXECUTE format('create policy %I on public.%I for select using(public.is_org_member(organization_id))',t||'_read_org',t);
    EXECUTE format('create policy %I on public.%I for insert with check(public.is_org_member(organization_id))',t||'_insert_org',t);
    EXECUTE format('create policy %I on public.%I for update using(public.is_org_member(organization_id)) with check(public.is_org_member(organization_id))',t||'_update_org',t);
    EXECUTE format('create policy %I on public.%I for delete using(public.has_org_role(organization_id,ARRAY[''owner''::public.member_role,''admin''::public.member_role]))',t||'_delete_admin',t);
  END LOOP;
END $$;
alter table public.finding_evidence enable row level security;
create policy finding_evidence_read_org on public.finding_evidence for select using(
  exists(select 1 from public.findings f where f.id=finding_id and public.is_org_member(f.organization_id))
);
create policy finding_evidence_write_org on public.finding_evidence for all using(
  exists(select 1 from public.findings f where f.id=finding_id and public.is_org_member(f.organization_id))
) with check(
  exists(select 1 from public.findings f where f.id=finding_id and public.is_org_member(f.organization_id))
);
revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.has_org_role(uuid,public.member_role[]) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid,public.member_role[]) to authenticated;
commit;
