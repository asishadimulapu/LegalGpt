# Judgment-Aware Legal Information Retrieval System

A Retrieval-Augmented Generation (RAG) based legal reasoning engine for Indian law.

## Features

- **RAG Architecture**: Semantic search over Indian statutes and judicial judgments
- **Vector Database**: ChromaDB for efficient legal document retrieval
- **Legal Reasoning**: Structured analysis following judicial methodology
- **Hallucination Reduction**: Strict citation verification and confidence scoring
- **API-First**: FastAPI backend for integration with frontend applications

## Legal Scope

- Constitution of India
- IPC / Bharatiya Nyaya Sanhita (BNS)
- CrPC / Bharatiya Nagarik Suraksha Sanhita (BNSS)
- Indian Evidence Act / Bharatiya Sakshya Adhiniyam
- Special Criminal Laws (IT Act, NDPS, POCSO)
- Supreme Court & High Court judgments

## Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Edit .env with your configuration
```

## Project Structure

```
Major-Project/
├── src/
│   ├── api/
│   │   └── main.py              # FastAPI application
│   ├── rag/
│   │   ├── vector_store.py      # Vector database operations
│   │   ├── document_processor.py # Legal document chunking
│   │   └── rag_engine.py        # RAG retrieval logic
│   ├── reasoning/
│   │   └── legal_reasoning.py   # Legal analysis engine
│   ├── config.py                # Configuration management
│   └── utils.py                 # Utility functions
├── data/
│   ├── legal_documents/         # Source documents
│   └── chroma_db/              # Vector store
├── scripts/
│   └── index_documents.py      # Document indexing utility
└── tests/                      # Test suite
```

## Usage

### 1. Index Legal Documents

```bash
python scripts/index_documents.py
```

### 2. Start API Server

```bash
python src/api/main.py
# Or with uvicorn:
uvicorn src.api.main:app --reload
```

### 3. Query the System

```bash
curl -X POST "http://localhost:8000/api/query" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the punishment for theft under IPC?"
  }'
```

## API Endpoints

- `POST /api/query` - Submit legal query
- `POST /api/ingest` - Add new legal documents
- `GET /api/health` - System health check
- `GET /api/stats` - Vector store statistics

## Safety & Ethics

- **No Legal Advice**: System provides legal information, not advice
- **Citation Required**: All responses traceable to source documents
- **Confidence Scoring**: Low-confidence responses flagged explicitly
- **Judicial Neutrality**: No bias in legal interpretation

## License

For educational and research purposes only.
