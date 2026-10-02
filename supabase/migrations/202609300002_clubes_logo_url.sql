alter table public.clubes
  add column logo_url text,
  add constraint clubes_logo_url_https_check
    check (logo_url is null or logo_url ~ '^https://[^[:space:]]+$');
