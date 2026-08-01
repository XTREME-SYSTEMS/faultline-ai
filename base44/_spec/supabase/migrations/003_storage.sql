begin;
insert into storage.buckets(id,name,public) values
('audit-evidence','audit-evidence',false),('client-uploads','client-uploads',false),
('generated-reports','generated-reports',false),('brand-assets','brand-assets',false),
('outreach-evidence','outreach-evidence',false),('marketing-assets','marketing-assets',true)
on conflict(id) do nothing;
create policy private_org_storage_read on storage.objects for select to authenticated using(
  bucket_id in('audit-evidence','client-uploads','generated-reports','brand-assets','outreach-evidence')
  and public.is_org_member((storage.foldername(name))[1]::uuid)
);
create policy private_org_storage_insert on storage.objects for insert to authenticated with check(
  bucket_id in('audit-evidence','client-uploads','generated-reports','brand-assets','outreach-evidence')
  and public.is_org_member((storage.foldername(name))[1]::uuid)
);
create policy public_marketing_assets_read on storage.objects for select using(bucket_id='marketing-assets');
commit;
