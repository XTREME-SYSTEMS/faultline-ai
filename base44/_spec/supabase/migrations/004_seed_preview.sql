-- PREVIEW DATA ONLY. Do not apply to production without explicit approval.
insert into public.organizations(id,name,slug)
values('11111111-1111-1111-1111-111111111111','Acme Manufacturing (Sample)','acme-sample')
on conflict(id) do nothing;
insert into public.companies(id,organization_id,name,domain,industry,status,source_provenance)
values('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','Acme Manufacturing (Sample)','example.com','Manufacturing','sample','[{"type":"sample","label":"Preview data"}]')
on conflict(id) do nothing;
