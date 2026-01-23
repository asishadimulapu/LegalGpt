🏛️ Indian Law RAG Chatbot












An AI-powered legal question-answering system for Indian laws using Retrieval-Augmented Generation (RAG)

📌 Overview

The Indian Law RAG Chatbot is a production-ready AI system that answers legal questions strictly based on Indian law documents.
It eliminates hallucinations by grounding every response in verified legal texts and provides precise Act and Section-level citations.

This project is designed for:

Academic demonstrations

Legal-tech research

Viva and interviews

Scalable deployment

✨ Key Features

🔍 Semantic Legal Search using embeddings

🤖 RAG Pipeline (Retrieval + Generation)

📝 Mandatory Legal Citations (Act & Section)

🔒 Anti-Hallucination Enforcement

💬 Session-based Chat History

🔐 JWT Authentication (Optional)

📊 Query Logging & Analytics

🚀 Production-Ready FastAPI Backend

🏗️ Architecture
User Query
   │
   ▼
FastAPI Backend
   │
   ▼
Embedding Generation (Gemini / OpenAI)
   │
   ▼
FAISS Vector Search (Top-K Chunks)
   │
   ▼
LLM Generation (Context-Only)
   │
   ▼
Answer + Legal Citations

🛠️ Tech Stack
Layer	Technology
Backend	FastAPI
AI Orchestration	LangChain
LLM	Gemini / OpenAI
Embeddings	Gemini / OpenAI
Vector Store	FAISS
Database	PostgreSQL
Auth	JWT
Dataset	viber1/indian-law-dataset
📂 Supported Legal Sources

Constitution of India

Indian Penal Code (IPC)

Code of Criminal Procedure (CrPC)

Code of Civil Procedure (CPC)

Indian Evidence Act

🚀 Installation
1️⃣ Clone Repository
git clone https://github.com/yourusername/indian-law-rag-chatbot.git
cd indian-law-rag-chatbot

2️⃣ Create Virtual Environment
python -m venv venv
venv\Scripts\activate   # Windows

3️⃣ Install Dependencies
pip install -r requirements.txt

⚙️ Configuration

Create a .env file:

LLM_PROVIDER=gemini
GOOGLE_API_KEY=your_gemini_api_key

DATABASE_URL=postgresql://postgres:password@localhost:5432/indian_law_db

FAISS_INDEX_PATH=./data/faiss_index
TOP_K_RESULTS=5
CHUNK_SIZE=800
CHUNK_OVERLAP=150

📦 Dataset & Indexing
python scripts/load_dataset.py
python scripts/create_embeddings.py


This will:

Load Indian law dataset

Chunk documents

Generate embeddings

Build FAISS index

▶️ Run the Application
python run.py


📍 API available at:

http://localhost:8000

📡 API Endpoints
Health Check
GET /health

Chat (RAG Query)
POST /api/v1/chat


Request

{
  "query": "What is the punishment for theft under IPC?"
}


Response

{
  "answer": "Under Section 378 of the IPC...",
  "sources": [
    {
      "act": "Indian Penal Code",
      "section": "378"
    }
  ]
}

🛡️ Anti-Hallucination Strategy

✔ Context-only generation
✔ Temperature set to zero
✔ Mandatory citations
✔ Fallback response if no data found

Fallback Message

"The requested information is not available in the provided legal documents."

🎓 Viva-Ready Explanation

Why RAG for Legal AI?

Prevents hallucinations

Ensures source-grounded answers

No model retraining required

High trust & transparency

Why FAISS?

Fast vector similarity search

Scales to large legal corpora

Memory efficient

📄 License

MIT License

🙏 Acknowledgements

Dataset: viber1/indian-law-dataset

Built using FastAPI, LangChain, FAISS
