# 🏛️ Indian Law RAG Chatbot

<div align="center">

![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-green.svg)
![LangChain](https://img.shields.io/badge/LangChain-0.1+-orange.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

**An AI-powered legal question answering system based on Indian law documents using Retrieval-Augmented Generation (RAG)**

[Features](#-features) • [Architecture](#-architecture) • [Installation](#-installation) • [Usage](#-usage) • [API](#-api-endpoints) • [Viva Guide](#-viva-ready-explanations)

</div>

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [API Endpoints](#-api-endpoints)
- [Anti-Hallucination Strategy](#-anti-hallucination-strategy)
- [Example Queries](#-example-queries)
- [Viva-Ready Explanations](#-viva-ready-explanations)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Features

- 🔍 **Semantic Search**: Find relevant legal sections using natural language queries
- 🤖 **RAG Pipeline**: Answers grounded exclusively in legal documents
- 📝 **Legal Citations**: Every answer includes Act name and Section/Article references
- 💬 **Chat History**: Continue conversations across sessions
- 🔒 **Anti-Hallucination**: Strict adherence to source documents - no guessing
- 🔐 **JWT Authentication**: Secure user sessions (optional)
- 📊 **Query Logging**: Track all queries for analytics
- 🚀 **Production Ready**: Health checks, CORS, error handling

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Request                               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FastAPI Application                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │   /health   │  │  /api/chat  │  │ /api/retrieve│                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      RAG Pipeline                                    │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐       │
│  │ Query Embedding │ → │ FAISS Retrieval │ → │ LLM Generation │       │
│  └───────────────┘    └───────────────┘    └───────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
        │                       │                      │
        ▼                       ▼                      ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   Gemini/    │       │    FAISS     │       │  PostgreSQL  │
│   OpenAI     │       │ Vector Store │       │   Database   │
└──────────────┘       └──────────────┘       └──────────────┘
```

### Data Flow

1. **User Query** → FastAPI receives the legal question
2. **Embedding** → Query is converted to vector using Gemini/OpenAI
3. **Retrieval** → FAISS finds top-5 most similar legal document chunks
4. **Generation** → LLM generates answer using ONLY retrieved context
5. **Response** → Answer with legal citations returned to user

---

## 🛠️ Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Backend** | FastAPI | High-performance async API framework |
| **AI Orchestration** | LangChain | RAG pipeline and document processing |
| **LLM** | Gemini / OpenAI | Answer generation from context |
| **Embeddings** | Gemini / OpenAI | Text to vector conversion |
| **Vector Database** | FAISS | Fast similarity search |
| **Database** | PostgreSQL | Users, chat history, logs |
| **Auth** | JWT | Token-based authentication |
| **Logging** | Python logging | Structured application logs |

---

## 📦 Installation

### Prerequisites

- Python 3.10 or higher
- PostgreSQL 13+ (or Docker)
- Gemini API key or OpenAI API key

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/indian-law-rag-chatbot.git
cd indian-law-rag-chatbot
```

### Step 2: Create Virtual Environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 4: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings
notepad .env  # Windows
nano .env     # Linux/Mac
```

**Required Settings:**
```env
# Choose your LLM provider
LLM_PROVIDER=gemini  # or "openai"

# API Key (required)
GOOGLE_API_KEY=your_gemini_api_key
# OR
OPENAI_API_KEY=your_openai_api_key

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/indian_law_db
```

### Step 5: Start PostgreSQL

**Option A: Using Docker (Recommended)**
```bash
docker-compose up -d
```

**Option B: Local PostgreSQL**
```bash
# Create database
createdb indian_law_db
```

### Step 6: Initialize Database

```bash
python scripts/init_db.py
```

### Step 7: Create FAISS Index

```bash
python scripts/create_embeddings.py
```

This will:
- Load the `viber1/indian-law-dataset` from Hugging Face
- Chunk documents (800 chars, 150 overlap)
- Generate embeddings
- Save FAISS index to `./data/faiss_index/`

### Step 8: Run the Application

```bash
python run.py
```

The API will be available at: http://localhost:8000

---

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_PROVIDER` | `gemini` | LLM provider: "gemini" or "openai" |
| `GOOGLE_API_KEY` | - | Gemini API key |
| `OPENAI_API_KEY` | - | OpenAI API key |
| `DATABASE_URL` | - | PostgreSQL connection string |
| `FAISS_INDEX_PATH` | `./data/faiss_index` | FAISS index location |
| `TOP_K_RESULTS` | `5` | Number of documents to retrieve |
| `CHUNK_SIZE` | `800` | Text chunk size for splitting |
| `CHUNK_OVERLAP` | `150` | Overlap between chunks |

---

## 🚀 Usage

### Start the Server

```bash
python run.py
```

### Access Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

### Quick Test

```bash
# Health check
curl http://localhost:8000/health

# Ask a legal question
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the punishment for theft under IPC?"}'
```

---

## 📡 API Endpoints

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "components": {
    "database": {"status": "healthy"},
    "vector_store": {"status": "healthy", "document_count": 5000}
  }
}
```

### Chat (RAG Query)

```http
POST /api/v1/chat
```

**Request:**
```json
{
  "query": "What is Article 21 of the Constitution?",
  "session_id": null
}
```

**Response:**
```json
{
  "answer": "Article 21 of the Constitution of India provides that no person shall be deprived of his life or personal liberty except according to procedure established by law. This is one of the most fundamental rights guaranteed under Part III of the Constitution. [Constitution of India, Article 21]",
  "sources": [
    {
      "act": "Constitution of India",
      "section": "Article 21",
      "title": "Protection of life and personal liberty",
      "content": "..."
    }
  ],
  "session_id": "uuid",
  "is_fallback": false,
  "latency_ms": 1234
}
```

### Retrieve Documents Only

```http
POST /api/v1/retrieve
```

**Request:**
```json
{
  "query": "punishment for murder",
  "top_k": 5
}
```

---

## 🛡️ Anti-Hallucination Strategy

This system implements strict anti-hallucination controls:

### 1. Prompt Engineering
```
You are an Indian Law Assistant. Answer questions ONLY using the provided context.

STRICT RULES:
1. Use ONLY the information from the CONTEXT below
2. NEVER use external knowledge or make assumptions
3. ALWAYS cite the specific Act name and Section/Article number
4. If answer NOT in context, respond: "The requested information is not available..."
```

### 2. Implementation Controls

| Control | Implementation |
|---------|----------------|
| **Context-Only** | LLM receives only retrieved documents |
| **Temperature=0** | Deterministic outputs, no creativity |
| **Fallback Response** | Standard message when no relevant docs found |
| **Citation Enforcement** | Every fact must have [Act, Section] reference |
| **Empty Context Check** | Return fallback if retrieval returns nothing |

### 3. Fallback Response

When information is not found:
```
"The requested information is not available in the provided legal documents."
```

---

## 💡 Example Queries

### Query 1: IPC Section
**Q:** "What is the punishment for murder under IPC?"

**A:** "Under Section 302 of the Indian Penal Code (IPC), whoever commits murder shall be punished with death, or imprisonment for life, and shall also be liable to fine. [Indian Penal Code, Section 302]"

### Query 2: Constitutional Right
**Q:** "Explain Article 14 of the Constitution"

**A:** "Article 14 of the Constitution of India guarantees equality before law. The State shall not deny to any person equality before the law or the equal protection of the laws within the territory of India. [Constitution of India, Article 14]"

### Query 3: Out of Scope
**Q:** "What are the tax laws in USA?"

**A:** "The requested information is not available in the provided legal documents."

---

## 📚 Viva-Ready Explanations

### What is RAG?

**Retrieval-Augmented Generation (RAG)** is an AI architecture that combines:
1. **Retrieval**: Finding relevant documents from a knowledge base
2. **Augmentation**: Adding retrieved context to the prompt
3. **Generation**: LLM generates answer from context

**Why RAG for Legal QA?**
- Reduces hallucinations by grounding answers in documents
- Always provides citations
- Can be updated without retraining
- Cost-effective compared to fine-tuning

### What is FAISS?

**FAISS (Facebook AI Similarity Search)** is a library for efficient similarity search:
- Developed by Meta AI Research
- Optimized for dense vector search
- Supports billions of vectors
- Uses L2 (Euclidean) distance for similarity

**How it works:**
1. Convert text to vectors (embeddings)
2. Build an index of all vectors
3. Query with new vector
4. Find k-nearest neighbors

### How do embeddings work?

**Embeddings** are numerical representations of text:
- High-dimensional vectors (768-3072 dimensions)
- Semantically similar text → similar vectors
- Enables semantic search vs keyword matching

**Example:**
- "murder" and "homicide" have similar embeddings
- "murder" and "apple" have different embeddings

### What prevents hallucination?

1. **Prompt constraints**: Explicit instructions to use only context
2. **Temperature=0**: Deterministic, less creative outputs
3. **No external knowledge**: Model only sees retrieved documents
4. **Fallback mechanism**: Clear response when info not found
5. **Citation requirement**: Forces grounding in specific sources

---

## 🔧 Troubleshooting

### Database Connection Failed
```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart PostgreSQL
docker-compose restart postgres
```

### FAISS Index Not Found
```bash
# Create the index
python scripts/create_embeddings.py
```

### API Key Errors
```bash
# Verify your .env file has the correct key
cat .env | grep API_KEY
```

### Import Errors
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

---

## 📂 Project Structure

```
indian-law-rag-chatbot/
├── app/
│   ├── api/               # API routes
│   │   ├── routes/
│   │   │   ├── chat.py
│   │   │   ├── health.py
│   │   │   └── retrieval.py
│   │   └── dependencies.py
│   ├── core/              # RAG pipeline
│   │   ├── embeddings.py
│   │   ├── prompts.py
│   │   ├── rag_pipeline.py
│   │   └── vector_store.py
│   ├── db/                # Database
│   │   ├── crud.py
│   │   ├── database.py
│   │   └── models.py
│   ├── schemas/           # Pydantic schemas
│   ├── utils/             # Utilities
│   ├── config.py
│   └── main.py
├── data/
│   └── faiss_index/       # Vector store
├── scripts/
│   ├── create_embeddings.py
│   ├── init_db.py
│   └── load_dataset.py
├── .env.example
├── docker-compose.yml
├── requirements.txt
└── run.py
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Dataset: [viber1/indian-law-dataset](https://huggingface.co/datasets/viber1/indian-law-dataset)
- Built with [LangChain](https://langchain.com/), [FastAPI](https://fastapi.tiangolo.com/), [FAISS](https://github.com/facebookresearch/faiss)

---

<div align="center">

**Built for Academic Excellence** 🎓

</div>
#   L e g a l G p t  
 