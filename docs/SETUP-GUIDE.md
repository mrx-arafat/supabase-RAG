# 🚀 Complete Setup Guide - RAG with Supabase

This guide will help you set up this project from scratch on any device.

---

## 📋 Prerequisites

Before starting, ensure you have:

| Tool | Version | Download Link |
|------|---------|---------------|
| Node.js | 18+ | https://nodejs.org |
| Docker Desktop | Latest | https://docker.com/products/docker-desktop |
| Git | Latest | https://git-scm.com |

### 🐳 Docker Desktop Note (Windows)

When you install Docker Desktop on Windows, it will automatically install **WSL2** (Windows Subsystem for Linux) if not already present. This is required for Docker to run Linux containers on Windows.

**First-time setup:**
1. Install Docker Desktop
2. Restart your computer if prompted
3. Open Docker Desktop and wait for it to fully start (whale icon turns stable)
4. You may need to enable WSL2 integration in Docker Settings → Resources → WSL Integration

---

## 🔑 Accounts Required

1. **Supabase Account** - https://supabase.com (free tier available)
2. **OpenAI Account** - https://platform.openai.com (API key required, paid)

---

## 📝 Step-by-Step Setup

### Step 1: Clone the Repository

```powershell
git clone https://github.com/supabase-community/chatgpt-your-files.git
cd chatgpt-your-files
```

### Step 2: Install Dependencies

```powershell
npm install
```

### Step 3: Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click **"New Project"**
3. Fill in:
   - **Name**: `chatgpt-your-files` (or any name)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to you
4. Click **"Create new project"**
5. Wait for project to be ready (~2 minutes)

### Step 4: Get Supabase Credentials

1. In your Supabase Dashboard, go to **Settings → API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...`

### Step 5: Configure Environment Variables

Create a file named `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key-here
```

### Step 6: Login to Supabase CLI

**Option A: Browser Login (Recommended)**
```powershell
npx supabase login
```
Follow the browser prompt to authorize.

**Option B: Token Login (If browser fails)**
1. Go to https://supabase.com/dashboard/account/tokens
2. Click **"Generate new token"**
3. Copy the token
4. Run:
```powershell
npx supabase login --token YOUR_TOKEN_HERE
```

### Step 7: Link Project to CLI

Get your **Project Reference ID** from: Supabase Dashboard → Settings → General → Reference ID

```powershell
npx supabase link --project-ref YOUR_PROJECT_REF
```

### Step 8: Run Database Migrations

**Option A: Using CLI (Requires network access to DB)**
```powershell
npx supabase db push
```

**Option B: Manual SQL (If CLI fails)**

If you get network errors, run migrations manually:

1. Go to: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql/new`
2. Run the 5 migration files in order from `supabase/migrations/` folder
3. See [MIGRATIONS.md](./MIGRATIONS.md) for the exact SQL to run

### Step 9: Start Docker Desktop

1. Open **Docker Desktop** from Start Menu
2. Wait until status shows **"Docker Desktop is running"** (green indicator)
3. Verify with:
```powershell
docker --version
```

### Step 10: Set OpenAI API Key

Get your API key from: https://platform.openai.com/api-keys

```powershell
npx supabase secrets set OPENAI_API_KEY=sk-proj-your-key-here
```

### Step 11: Deploy Edge Functions

```powershell
npx supabase functions deploy
```

This deploys 3 functions:
- `process` - Splits documents into sections
- `embed` - Generates vector embeddings
- `chat` - Handles RAG chat with OpenAI

### Step 12: Update Vault Secret (Important!)

The database needs to know your Supabase URL to call Edge Functions.

**Method 1: Via Dashboard UI (Recommended)**
1. Go to: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF/settings/vault`
2. Click **"Add new secret"**
3. Name: `supabase_url`
4. Secret: `https://YOUR_PROJECT_REF.supabase.co`
5. Click **Save**

**Method 2: Via SQL (If you have permissions)**
```sql
DELETE FROM vault.secrets WHERE name = 'supabase_url';
INSERT INTO vault.secrets (name, secret)
VALUES ('supabase_url', 'https://YOUR_PROJECT_REF.supabase.co');
```

### Step 13: Run Delete Policies Migration (For File Deletion)

If you want users to be able to delete their documents, run this SQL:

```sql
-- Allow users to delete their own documents
CREATE POLICY "Users can delete their own documents"
ON documents FOR DELETE TO authenticated USING (
  auth.uid() = created_by
);

-- Allow users to delete their own document sections
CREATE POLICY "Users can delete their own document sections"
ON document_sections FOR DELETE TO authenticated USING (
  document_id IN (
    SELECT id FROM documents WHERE created_by = auth.uid()
  )
);
```

### Step 14: Start the Application

```powershell
npm run dev
```

Open http://localhost:3000 in your browser.

---

## ✅ Testing the Setup

1. **Create an account** at http://localhost:3000/login
2. **Upload documents** at http://localhost:3000/files
   - You can select **multiple files at once** (Ctrl+Click or Shift+Click)
   - Supported formats: `.md`, `.markdown`, `.txt`
   - Use sample files from `./sample-files/` folder
3. **Wait ~10 seconds** for processing (embeddings are generated automatically)
4. **Chat** at http://localhost:3000/chat with questions about your documents

---

## 🔍 Verifying Everything Works

### Check Storage Bucket Exists
```sql
SELECT * FROM storage.buckets WHERE id = 'files';
```

### Check Documents Table
```sql
SELECT * FROM documents;
```

### Check Embeddings Generated
```sql
SELECT id, content, embedding IS NOT NULL as has_embedding 
FROM document_sections;
```

### Check Edge Functions Deployed
```powershell
npx supabase functions list
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Docker not found | Start Docker Desktop, wait for green indicator |
| Login session failed | Use token-based login instead |
| Network/DNS errors | Use manual SQL via Dashboard |
| Functions not deploying | Ensure Docker is running |
| Embeddings not generating | Check Edge Function logs in Dashboard |
| Chat not responding | Verify OpenAI API key is set correctly |

---

## 📁 Project Structure

```
chatgpt-your-files/
├── app/                    # Next.js pages
├── components/             # React components
├── lib/                    # Utility functions
├── supabase/
│   ├── functions/          # Edge Functions (Deno)
│   │   ├── chat/           # RAG chat handler
│   │   ├── embed/          # Embedding generator
│   │   └── process/        # Document processor
│   ├── migrations/         # SQL migrations
│   └── config.toml         # Supabase config
├── sample-files/           # Test markdown files
├── .env.local              # Environment variables (create this)
└── docs/                   # Documentation
```

---

## 🔐 Security Notes

- Never commit `.env.local` to git
- Rotate API keys periodically
- The `anon` key is safe for public use (it's a public key)
- OpenAI API key should be kept secret

---

---

## 🎯 Quick Command Reference

```powershell
# Login to Supabase CLI
npx supabase login --token YOUR_TOKEN

# Link project
npx supabase link --project-ref YOUR_PROJECT_REF

# Push database migrations
npx supabase db push

# Set OpenAI secret
npx supabase secrets set OPENAI_API_KEY=sk-your-key

# Deploy Edge Functions
npx supabase functions deploy

# List deployed functions
npx supabase functions list

# View function logs
npx supabase functions logs chat
npx supabase functions logs embed
npx supabase functions logs process

# Start local development
npm run dev
```

---

*Last updated: December 2024*

