-- Migration: Add delete policies for documents and document_sections
-- This allows users to delete their own documents and related data

-- Delete policy for documents table
-- Users can only delete documents they created
create policy "Users can delete their own documents"
on documents for delete to authenticated using (
  auth.uid() = created_by
);

-- Delete policy for document_sections table  
-- Users can only delete sections of documents they own
create policy "Users can delete their own document sections"
on document_sections for delete to authenticated using (
  document_id in (
    select id
    from documents
    where created_by = auth.uid()
  )
);

