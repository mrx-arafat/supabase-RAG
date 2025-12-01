# 📦 SQL Migrations Reference

If `npx supabase db push` fails due to network issues, run these migrations manually via the Supabase Dashboard SQL Editor.

**URL**: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql/new`

Run each migration **in order**. Copy the entire block and click "Run".

---

## Migration 1: Storage Setup

```sql
-- Migration 1: Files & Storage Setup
-- Creates storage bucket and security policies

create schema if not exists private;

insert into storage.buckets (id, name)
values ('files', 'files')
on conflict do nothing;

create or replace function private.uuid_or_null(str text)
returns uuid
language plpgsql
as $$
begin
  return str::uuid;
  exception when invalid_text_representation then
    return null;
  end;
$$;

create policy "Authenticated users can upload files"
on storage.objects for insert to authenticated with check (
  bucket_id = 'files' and
    owner = auth.uid() and
    private.uuid_or_null(path_tokens[1]) is not null
);

create policy "Users can view their own files"
on storage.objects for select to authenticated using (
  bucket_id = 'files' and owner = auth.uid()
);

create policy "Users can update their own files"
on storage.objects for update to authenticated with check (
  bucket_id = 'files' and owner = auth.uid()
);

create policy "Users can delete their own files"
on storage.objects for delete to authenticated using (
  bucket_id = 'files' and owner = auth.uid()
);
```

---

## Migration 2: Documents & Vector Tables

```sql
-- Migration 2: Documents, Sections & Vector Setup
-- Creates core tables with pgvector extension

create extension if not exists pg_net with schema extensions;
create extension if not exists vector with schema extensions;

create table documents (
  id bigint primary key generated always as identity,
  name text not null,
  storage_object_id uuid not null references storage.objects (id),
  created_by uuid not null references auth.users (id) default auth.uid(),
  created_at timestamp with time zone not null default now()
);

create view documents_with_storage_path
with (security_invoker=true)
as
  select documents.*, storage.objects.name as storage_object_path
  from documents
  join storage.objects
    on storage.objects.id = documents.storage_object_id;

create table document_sections (
  id bigint primary key generated always as identity,
  document_id bigint not null references documents (id),
  content text not null,
  embedding vector (384)
);

create index on document_sections using hnsw (embedding vector_ip_ops);

alter table documents enable row level security;
alter table document_sections enable row level security;

create policy "Users can insert documents"
on documents for insert to authenticated with check (
  auth.uid() = created_by
);

create policy "Users can query their own documents"
on documents for select to authenticated using (
  auth.uid() = created_by
);

create policy "Users can insert document sections"
on document_sections for insert to authenticated with check (
  document_id in (
    select id
    from documents
    where created_by = auth.uid()
  )
);

create policy "Users can update their own document sections"
on document_sections for update to authenticated using (
  document_id in (
    select id
    from documents
    where created_by = auth.uid()
  )
) with check (
  document_id in (
    select id
    from documents
    where created_by = auth.uid()
  )
);

create policy "Users can query their own document sections"
on document_sections for select to authenticated using (
  document_id in (
    select id
    from documents
    where created_by = auth.uid()
  )
);

create function supabase_url()
returns text
language plpgsql
security definer
as $$
declare
  secret_value text;
begin
  select decrypted_secret into secret_value from vault.decrypted_secrets where name = 'supabase_url';
  return secret_value;

create function private.embed()
returns trigger
language plpgsql
as $$
declare
  content_column text = TG_ARGV[0];
  embedding_column text = TG_ARGV[1];
  batch_size int = case when array_length(TG_ARGV, 1) >= 3 then TG_ARGV[2]::int else 5 end;
  timeout_milliseconds int = case when array_length(TG_ARGV, 1) >= 4 then TG_ARGV[3]::int else 5 * 60 * 1000 end;
  batch_count int = ceiling((select count(*) from inserted) / batch_size::float);
begin
  for i in 0 .. (batch_count-1) loop
  perform
    net.http_post(
      url := supabase_url() || '/functions/v1/embed',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', current_setting('request.headers')::json->>'authorization'
      ),
      body := jsonb_build_object(
        'ids', (select json_agg(ds.id) from (select id from inserted limit batch_size offset i*batch_size) ds),
        'table', TG_TABLE_NAME,
        'contentColumn', content_column,
        'embeddingColumn', embedding_column
      ),
      timeout_milliseconds := timeout_milliseconds
    );
  end loop;

  return null;
end;
$$;

create trigger embed_document_sections
  after insert on document_sections
  referencing new table as inserted
  for each statement
  execute procedure private.embed(content, embedding);
```

---

## Migration 4: Match Function

```sql
-- Migration 4: Vector Similarity Search Function
-- Enables RAG retrieval

create or replace function match_document_sections(embedding vector(384), match_threshold float)
returns setof document_sections
language plpgsql
as $$
#variable_conflict use_variable
begin
  return query
  select *
  from document_sections
  where document_sections.embedding <#> embedding < -match_threshold
  order by document_sections.embedding <#> embedding;
end;
$$;
```

---

## Migration 5: Cascade Delete

```sql
-- Migration 5: Add cascade delete for document sections
-- When a document is deleted, its sections are also deleted

alter table document_sections
drop constraint document_sections_document_id_fkey,
add constraint document_sections_document_id_fkey
   foreign key (document_id)
   references documents(id)
   on delete cascade;
```

---

## Migration 6: Delete Policies (Required for File Deletion)

```sql
-- Migration 6: Add delete policies for documents and document_sections
-- This allows users to delete their own documents and related data

-- Delete policy for documents table
CREATE POLICY "Users can delete their own documents"
ON documents FOR DELETE TO authenticated USING (
  auth.uid() = created_by
);

-- Delete policy for document_sections table
CREATE POLICY "Users can delete their own document sections"
ON document_sections FOR DELETE TO authenticated USING (
  document_id IN (
    SELECT id FROM documents WHERE created_by = auth.uid()
  )
);
```

---

## Final Step: Set Supabase URL in Vault

**⚠️ IMPORTANT**: Replace `YOUR_PROJECT_REF` with your actual project reference ID!

**Method 1: Via Dashboard (Recommended)**
1. Go to: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF/settings/vault`
2. Click **"Add new secret"**
3. Name: `supabase_url`
4. Secret: `https://YOUR_PROJECT_REF.supabase.co`
5. Click **Save**

**Method 2: Via SQL**
```sql
INSERT INTO vault.secrets (name, secret)
VALUES ('supabase_url', 'https://YOUR_PROJECT_REF.supabase.co')
ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret;
```

---

## Verification Queries

After running all migrations, verify with:

```sql
-- Check storage bucket
SELECT * FROM storage.buckets WHERE id = 'files';

-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('documents', 'document_sections');

-- Check extensions
SELECT extname FROM pg_extension WHERE extname IN ('vector', 'pg_net');

-- Check vault secret
SELECT name FROM vault.secrets WHERE name = 'supabase_url';
```

---

*All migrations should be run in order for proper setup.*
