<div align="center">
  <h1>🔮 Supabase RAG</h1>
  <p><strong>AI-Powered Document Chat Assistant</strong></p>
  <p>Chat with your documents using RAG (Retrieval Augmented Generation) powered by Supabase, pgvector, and OpenAI</p>

  <br />

  ![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
  ![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)
  ![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)
  ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Chat** | Intelligent responses based on your document content |
| 📁 **Multi-File Upload** | Upload multiple markdown/text files at once |
| 🗑️ **File Management** | Delete documents with one click |
| 🔐 **User Authentication** | Secure login with email/password |
| 🎨 **Modern UI** | Clean, responsive dashboard design |
| 🔒 **Row-Level Security** | Each user can only access their own documents |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ → [Download](https://nodejs.org)
- **Docker Desktop** → [Download](https://docker.com/products/docker-desktop)
- **Supabase Account** → [Sign up](https://supabase.com)
- **OpenAI API Key** → [Get key](https://platform.openai.com/api-keys)

### Installation

```bash
# Clone the repository
git clone https://github.com/mrx-arafat/supabase-RAG.git
cd supabase-RAG

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
```

### Setup Supabase

```bash
# Login to Supabase CLI
npx supabase login

# Link your project (get PROJECT_REF from Supabase Dashboard → Settings → General)
npx supabase link --project-ref YOUR_PROJECT_REF

# Push database migrations
npx supabase db push

# Set OpenAI API key
npx supabase secrets set OPENAI_API_KEY=sk-your-key-here

# Deploy Edge Functions (requires Docker running)
npx supabase functions deploy
```

### Set Vault Secret

1. Go to: **Supabase Dashboard → Settings → Vault**
2. Click **"Add new secret"**
3. Name: `supabase_url`
4. Value: `https://your-project.supabase.co`

### Run

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** 🎉

---

## 📖 How It Works

```
Upload Files → Process Markdown → Generate Embeddings
                                        ↓
Display Response ← OpenAI Generate ← Vector Search ← User Query
```

1. **Upload** - Files stored in Supabase Storage
2. **Process** - Markdown split into sections
3. **Embed** - Sections converted to 384-dim vectors
4. **Search** - User query matched via pgvector
5. **Generate** - OpenAI creates response from matched content

---

## 📁 Project Structure

```
supabase-RAG/
├── app/                    # Next.js pages (chat, files, login)
├── components/             # React components
├── docs/                   # Setup guides & documentation
├── supabase/
│   ├── functions/          # Edge Functions (chat, embed, process)
│   └── migrations/         # Database SQL migrations
└── sample-files/           # Test markdown files
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 14 | React framework |
| Supabase | Database, Auth, Storage |
| pgvector | Vector similarity search |
| OpenAI GPT | AI responses |
| Tailwind CSS | Styling |

---

## 📚 Documentation

See the [`docs/`](./docs) folder for detailed guides:

- [**SETUP-GUIDE.md**](./docs/SETUP-GUIDE.md) - Complete setup instructions
- [**MIGRATIONS.md**](./docs/MIGRATIONS.md) - SQL reference
- [**RAG-SUPABASE-GUIDE.md**](./docs/RAG-SUPABASE-GUIDE.md) - How RAG works

---

## 🧪 Test It

1. Upload files from `./sample-files/`
2. Ask: *"What did Romans eat?"* or *"Tell me about Roman architecture"*

---

## 📄 License

MIT License

---

<div align="center">
  <p>Developed by <a href="https://github.com/mrx-arafat"><strong>mrx-arafat</strong></a></p>
</div>
