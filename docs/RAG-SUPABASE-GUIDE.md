# 🧠 RAG with Supabase - Complete Beginner's Guide

## What is RAG (Retrieval Augmented Generation)?

RAG is a technique that makes AI chatbots **smarter** by giving them access to your own documents. Instead of the AI making up answers, it:

1. **Searches** your documents for relevant information
2. **Retrieves** the most related content
3. **Generates** an answer using that context

```
┌─────────────────────────────────────────────────────────────────┐
│                    HOW RAG WORKS                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  USER: "What kind of buildings did Romans live in?"            │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. EMBED: Convert question to vector (numbers)          │   │
│  │    "buildings Romans live" → [0.23, -0.45, 0.12, ...]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 2. SEARCH: Find similar vectors in database (pgvector)  │   │
│  │    Returns: Document chunks about Roman architecture    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 3. GENERATE: Send context + question to OpenAI          │   │
│  │    "Given these docs: [...], answer: What buildings..." │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  AI: "Romans lived in insulae (apartment blocks) and         │
│       domus (single-family homes)..."                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Understanding the Database Schema

### What We Created with the SQL Migrations

#### Migration 1: Storage Setup
```
PURPOSE: Create a place to store uploaded files

WHAT IT DOES:
├── Creates a 'private' schema (for internal functions)
├── Creates a 'files' storage bucket (like a folder for uploads)
└── Creates RLS policies (security rules)
    ├── Only logged-in users can upload
    ├── Users can only see their own files
    ├── Users can only update their own files
    └── Users can only delete their own files
```

#### Migration 2: Documents & Vectors
```
PURPOSE: Store document metadata and chunks with embeddings

TABLES CREATED:
├── documents
│   ├── id (unique identifier)
│   ├── name (filename)
│   ├── storage_object_id (link to actual file)
│   ├── created_by (who uploaded it)
│   └── created_at (when)
│
└── document_sections
    ├── id (unique identifier)
    ├── document_id (which document this belongs to)
    ├── content (the actual text chunk)
    └── embedding vector(384) ← THIS IS THE MAGIC!
        └── 384 numbers representing the meaning of the text

ALSO CREATES:
├── pgvector extension (enables vector operations)
├── pg_net extension (enables HTTP calls from database)
├── HNSW index (makes vector search FAST)
└── RLS policies (users only see their own docs)
```

#### Migration 3: Automatic Processing
```
PURPOSE: Automatically process files when uploaded

FLOW:
User uploads file
       │
       ▼
Trigger fires (on_file_upload)
       │
       ▼
Creates entry in 'documents' table
       │
       ▼
Calls Edge Function '/functions/v1/process'
       │
       ▼
Edge Function splits markdown into sections
       │
       ▼
Inserts sections into 'document_sections' table
```

#### Migration 4: Automatic Embeddings
```
PURPOSE: Automatically generate embeddings for new sections

FLOW:
New rows inserted into document_sections
       │
       ▼
Trigger fires (embed_document_sections)
       │
       ▼
Calls Edge Function '/functions/v1/embed'
       │
       ▼
Edge Function generates vector embeddings
       │
       ▼
Updates 'embedding' column with vector data
```

#### Migration 5: Search Function
```
PURPOSE: Enable similarity search

FUNCTION: match_document_sections(embedding, threshold)

HOW IT WORKS:
1. Takes your question's embedding (vector)
2. Compares with all document_sections embeddings
3. Returns sections with similarity > threshold
4. Ordered by relevance (most similar first)

MATH BEHIND IT:
- Uses "inner product" distance (<#>)
- Normalized vectors: closer to 1 = more similar
- Threshold 0.8 = only very relevant results
```


```
┌─────────────────────────────────────────────────────────────────┐
│                      CHAT FLOW                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User types question: "What did Romans eat?"                │
│           │                                                     │
│           ▼                                                     │
│  2. Browser generates embedding using Transformers.js           │
│     (runs locally in your browser - no API call needed!)        │
│           │                                                     │
│           ▼                                                     │
│  3. Embedding sent to /chat Edge Function                       │
│           │                                                     │
│           ▼                                                     │
│  4. Edge Function calls match_document_sections()               │
│     - Finds document chunks similar to your question            │
│           │                                                     │
│           ▼                                                     │
│  5. Relevant chunks combined into prompt context                │
│           │                                                     │
│           ▼                                                     │
│  6. OpenAI receives: context + question                         │
│           │                                                     │
│           ▼                                                     │
│  7. AI generates answer based ONLY on your documents            │
│           │                                                     │
│           ▼                                                     │
│  8. Streamed response displayed to user                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Project Components

### Edge Functions (Serverless Backend)

Located in `supabase/functions/`:

| Function | Purpose |
|----------|---------|
| `process` | Splits uploaded markdown into sections |
| `embed` | Generates vector embeddings for text |
| `chat` | Handles RAG chat with OpenAI |

### Frontend (Next.js)

| Page | Purpose |
|------|---------|
| `/login` | User authentication |
| `/files` | Upload and view documents (supports **multiple file upload**) |
| `/chat` | Chat with your documents |

### Multiple File Upload Feature

The `/files` page supports uploading multiple files at once:

- **Select multiple files**: Hold `Ctrl` (Windows) or `Cmd` (Mac) while clicking
- **Supported formats**: `.md`, `.markdown`, `.txt`
- **Progress indicator**: Shows upload progress for each file
- **Automatic processing**: Each file is automatically split and embedded

### Document Deletion Feature

Users can delete their documents from the `/files` page:

- **Delete button**: Click the trash icon on any document card
- **Confirmation dialog**: Confirms before deleting
- **Cascade delete**: Deleting a document removes:
  - The file from storage
  - The document record
  - All associated document sections and embeddings

**Required SQL** (run if not already applied):
```sql
CREATE POLICY "Users can delete their own documents"
ON documents FOR DELETE TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own document sections"
ON document_sections FOR DELETE TO authenticated USING (
  document_id IN (SELECT id FROM documents WHERE created_by = auth.uid())
);
```

### Modern Chat Interface

The `/chat` page features:

- **Clean, modern design** with message bubbles
- **AI assistant branding** with avatar icons
- **Auto-scroll** to latest messages
- **Loading indicators** while AI responds
- **Suggested prompts** for new users
- **Enhanced AI responses** - formatted and detailed answers

---

## 📝 Configuration Checklist for Beginners

### Required Environment Variables

**`.env.local`** (for Next.js frontend):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
```

**`supabase/functions/.env`** (for Edge Functions):
```env
OPENAI_API_KEY=sk-proj-your-openai-key
```

### Required Database Setup

1. ✅ Run all 6 SQL migrations (see [MIGRATIONS.md](./MIGRATIONS.md))
2. ✅ Vault secret for supabase_url
3. ⏳ Deploy Edge Functions

### Required Cloud Setup

1. ✅ Supabase project created
2. ✅ CLI linked to project
3. ⏳ OpenAI API key set as secret
4. ⏳ Edge Functions deployed

---

## 🔍 Troubleshooting Common Issues

### "No documents found" in chat
- Check if files are uploaded in `/files` page
- Verify embeddings exist: Run in SQL Editor:
  ```sql
  SELECT id, content, embedding IS NOT NULL as has_embedding
  FROM document_sections LIMIT 10;
  ```

### File upload not working
- Check RLS policies are enabled
- Verify storage bucket 'files' exists
- Check you're logged in

### Embeddings not generating
- Verify Edge Functions are deployed
- Check `/embed` function logs in Supabase Dashboard
- Verify `supabase_url` vault secret is correct

### Chat not responding
- Check OpenAI API key is set
- Verify `/chat` function is deployed
- Check browser console for CORS errors

---

## 📚 Key Concepts Glossary

| Term | Definition |
|------|------------|
| **Vector** | Array of numbers representing meaning |
| **Embedding** | Converting text → vector |
| **pgvector** | PostgreSQL extension for vector operations |
| **HNSW Index** | Fast approximate nearest neighbor search |
| **RLS** | Row Level Security - data access control |
| **Edge Function** | Serverless function running on Supabase |
| **Vault** | Secure secret storage in Supabase |
| **Trigger** | Automatic database action on events |

---

## 🎯 Next Steps After Setup

1. **Deploy Edge Functions** (required)
2. **Test file upload** with sample markdown files
3. **Verify embeddings** are generated
4. **Test chat** with questions about your documents
5. **Explore** the code to understand each component

---

## 🚀 Quick Setup Summary (For Chat Reference)

If you're asked "How do I set up this RAG application?", here's the quick answer:

### Prerequisites
- Node.js 18+
- Docker Desktop (will auto-install WSL2 on Windows)
- Supabase account (free tier works)
- OpenAI API key

### Setup Steps
1. Clone the repo and run `npm install`
2. Create a Supabase project at supabase.com
3. Copy Project URL and anon key to `.env.local`
4. Run `npx supabase login --token YOUR_TOKEN`
5. Run `npx supabase link --project-ref YOUR_PROJECT_REF`
6. Run database migrations (either `npx supabase db push` or manually via SQL Editor)
7. Add `supabase_url` secret in Supabase Dashboard Vault
8. Set OpenAI key: `npx supabase secrets set OPENAI_API_KEY=sk-...`
9. Start Docker Desktop
10. Deploy functions: `npx supabase functions deploy`
11. Run `npm run dev` and test at http://localhost:3000

### Features
- **Multiple file upload**: Select multiple markdown files at once
- **Automatic embedding**: Files are processed and embedded automatically
- **Vector search**: Questions find relevant document sections
- **AI chat**: OpenAI generates answers based on your documents

---

*Documentation created for learning purposes. Happy coding! 🚀*
