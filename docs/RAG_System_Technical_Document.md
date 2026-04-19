# LegalGPT — RAG System Technical Document

**System**: Indian Law RAG Chatbot (LegalGPT)  
**Version**: 1.0.0  
**Base URL**: `https://law-gpt.app`  
**Stack**: FastAPI · LangChain · FAISS / pgvector · Groq · HuggingFace  
**Last Updated**: April 2026

---

## 1. System Summary

### What It Does

LegalGPT is a Retrieval-Augmented Generation (RAG) system that answers user questions about Indian law. Instead of relying on the LLM's training data (which can hallucinate), the system retrieves actual legal text from a pre-indexed corpus of Indian statutes and injects that text into the LLM prompt. The LLM is instructed to answer **only** from the provided context.

### Use Case

- Interactive legal Q&A chatbot for Indian citizens
- Supports multilingual input (Hindi, Tamil, Telugu, etc.) via Google Translate at the edges
- Per-user memory enables personalised, context-aware follow-ups
- Document upload and analysis (FIR, court orders, contracts)

### Core Components

| Component | Implementation | Module |
|---|---|---|
| **Query Processor** | Regex-based section/article enhancement + keyword extraction | `rag_pipeline._enhance_section_query()` |
| **Embedding Model** | `sentence-transformers/all-MiniLM-L6-v2` (384-dim, local, free) | `embeddings.get_embedding_model()` |
| **Vector Database** | FAISS (primary, file-based) / pgvector (production fallback) | `vector_store.VectorStoreManager` |
| **Retriever** | Hybrid search: dense vector similarity + keyword boost scoring | `vector_store.similarity_search()` |
| **LLM (Generator)** | Groq `llama-3.1-8b-instant` at `temperature=0.0` | `rag_pipeline.get_llm()` |
| **Translation** | `deep-translator` (Google Translate) with LRU cache | `translation.translate_to_english()` |
| **Memory** | Short-term (session) + long-term (per-user DB) memory | `memory.py` |

---

## 2. End-to-End Workflow (Detailed)

### Step 1 — User Query Input

| Field | Detail |
|---|---|
| **What happens** | User sends a POST request to `/api/chat` with a natural-language legal question |
| **Input** | `ChatRequest` — `{ query: str, session_id?: UUID, language?: str }` |
| **Output** | Raw query string passed to Step 2 |
| **Validation** | Pydantic enforces `min_length=3`, `max_length=2000` |
| **Module** | `app/api/routes/chat.py → chat()` |

### Step 2 — Language Detection & Translation

| Field | Detail |
|---|---|
| **What happens** | If query is non-English, auto-detect language and translate to English. English queries pass through unchanged |
| **Input** | Raw query + optional `source_lang` hint from user profile |
| **Output** | `(translated_query: str, detected_lang: str)` |
| **Tools** | `deep-translator` (GoogleTranslator) with in-memory cache (1024 entries) |
| **Fallback** | If translation fails, use original query as-is |
| **Module** | `app/core/translation.py → translate_to_english()` |

### Step 3 — Query Enhancement (Preprocessing)

| Field | Detail |
|---|---|
| **What happens** | Regex engine detects section/article references (e.g., "Section 65B", "Article 21") and injects domain-specific keywords to improve retrieval accuracy |
| **Input** | Translated English query |
| **Output** | Enhanced query string with additional legal context terms |
| **Logic** | Hard-coded lookup table maps known sections → keywords (e.g., `65B → "electronic records admissibility Evidence Act"`) |
| **Module** | `app/core/rag_pipeline.py → _enhance_section_query()` |

**Example:**
```
Input:  "What is Section 65B?"
Output: "What is Section 65B? electronic records admissibility Evidence Act computer output"
```

### Step 4 — Embedding Generation

| Field | Detail |
|---|---|
| **What happens** | Convert the enhanced query text into a 384-dimensional dense vector |
| **Input** | Enhanced query string |
| **Output** | `List[float]` — 384-dimension embedding vector |
| **Model** | `sentence-transformers/all-MiniLM-L6-v2` via HuggingFace (runs locally on CPU) |
| **Caching** | MD5-keyed in-memory LRU cache (1000 entries). Cache hit: <1ms. Cache miss: ~200–400ms |
| **Normalization** | Embeddings are L2-normalized (`normalize_embeddings=True`) |
| **Module** | `app/core/embeddings.py → EmbeddingGenerator.embed_query()` |

### Step 5 — Vector Similarity Search (Top-K Retrieval)

| Field | Detail |
|---|---|
| **What happens** | FAISS performs approximate nearest-neighbour search on the embedding. Returns `k×2` candidates for the hybrid scoring step |
| **Input** | Query embedding vector (384-dim) |
| **Output** | `k×2` candidate `Document` objects with metadata (`act_name`, `section`, `title`) |
| **Database** | FAISS (local, file-based at `./data/faiss_index`) or pgvector (PostgreSQL) |
| **Default K** | `top_k_results = 5` (configurable in `config.py`). Retrieves `k*2 = 10` candidates internally |
| **Module** | `app/core/vector_store.py → VectorStoreManager.similarity_search()` |

### Step 6 — Hybrid Re-Ranking (Keyword Boost)

| Field | Detail |
|---|---|
| **What happens** | Each of the `k×2` candidates is scored by keyword matches. Section/article matches in metadata get +3 boost; content matches get +2. Results are sorted by boost score, top-K are kept |
| **Input** | `k×2` candidate documents + extracted keywords from query |
| **Output** | Top-K documents ranked by `keyword_score` (descending) |
| **Keyword Extraction** | Stopword removal + regex extraction of section/article patterns |
| **Module** | `app/core/vector_store.py → similarity_search()` (inline) + `_extract_keywords()` |

**Scoring Logic:**
```
for each candidate document:
    score = 0
    for keyword in query_keywords:
        if keyword in document.content       → score += 2
        if keyword in document.metadata.section → score += 3
    
    ranked_results = sort(candidates, by=score, descending=True)[:k]
```

### Step 7 — Context Formatting + Source Extraction

| Field | Detail |
|---|---|
| **What happens** | Retrieved documents are formatted into a structured context string. Each document block contains a header, source citation, and content |
| **Input** | Top-K `Document` objects |
| **Output** | Formatted context string + `List[LegalSource]` objects |
| **Format** | `[Document N] → Source: {act_name}, {section} - {title} → Content: {page_content}` separated by `---` |
| **Module** | `app/core/prompts.py → format_retrieved_context()` + `rag_pipeline.py → format_sources()` |

**Output Structure (`LegalSource`):**
```json
{
    "act": "Indian Evidence Act, 1872",
    "section": "Section 65B",
    "title": "Admissibility of electronic records",
    "content": "Relevant text excerpt (max 500 chars)"
}
```

### Step 8 — Memory Injection (Per-User Context)

| Field | Detail |
|---|---|
| **What happens** | For authenticated users: load short-term session messages + long-term memory (conversation summaries, user facts) + user profile. Inject into prompt |
| **Input** | `user_id`, `session_id`, current query |
| **Output** | `memory_context`, `chat_history`, `user_profile_context` strings |
| **Short-term** | Last 10 messages from current session (truncated to 500 chars each) |
| **Long-term** | Recent summaries (3) + keyword-matched memories + high-importance user facts. Deduped, sorted by importance × recency |
| **Isolation** | All queries are scoped by `user_id`. No cross-user leakage |
| **Module** | `app/core/memory.py → recall_relevant_memories()`, `get_short_term_context()`, `get_user_profile_context()` |

### Step 9 — Prompt Construction

| Field | Detail |
|---|---|
| **What happens** | Assemble the final LLM prompt from system prompt + context + memory + question |
| **Template (no memory)** | `RAG_SYSTEM_PROMPT` + `RAG_QA_TEMPLATE{context, question}` |
| **Template (with memory)** | `RAG_SYSTEM_PROMPT` + `MEMORY_AUGMENTED_QA_TEMPLATE{context, user_profile, chat_history, memory_context, question}` |
| **Anti-hallucination** | System prompt explicitly instructs: "Answer ONLY from context. Do NOT fabricate legal provisions." |
| **Citation format** | LLM instructed to use `[Act Name, Section X]` in-line citation |
| **Module** | `app/core/prompts.py` |

### Step 10 — LLM Response Generation

| Field | Detail |
|---|---|
| **What happens** | Send assembled prompt to Groq API. LLM generates a response grounded in the provided legal context |
| **Input** | `ChatPromptTemplate` with all filled slots |
| **Output** | Raw answer string |
| **Model** | `llama-3.1-8b-instant` via Groq (ultra-fast inference) |
| **Temperature** | `0.0` — fully deterministic for legal accuracy |
| **Chain** | LangChain LCEL: `prompt | llm | StrOutputParser()` |
| **Timeout** | 30 seconds, with 2 retries |
| **Module** | `app/core/rag_pipeline.py → generate_response()` |

### Step 11 — Post-Processing & Response Delivery

| Field | Detail |
|---|---|
| **What happens** | Translate answer back to user's language (if non-English). Encrypt and store messages. Log query for analytics. Return structured response |
| **Input** | Raw English answer + detected language + sources |
| **Output** | `ChatResponse` — `{ answer, sources[], session_id, is_fallback, latency_ms }` |
| **Encryption** | User messages and responses encrypted at rest via Fernet/HKDF per-user keys |
| **Memory Storage** | If authenticated + not fallback: generate conversation summary via LLM and persist as long-term memory |
| **Logging** | Full query log saved to `QueryLog` table: query, response, sources, latency_ms, was_successful |
| **Module** | `app/api/routes/chat.py → chat()` |

---

## 3. Flow Representation

### Happy Path

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER QUERY                                  │
│                 POST /api/chat { query }                         │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │  Language       │   deep-translator
              │  Detection &    │   (auto-detect → English)
              │  Translation    │
              └───────┬────────┘
                      │
                      ▼
              ┌────────────────┐
              │  Query          │   Regex: Section/Article
              │  Enhancement    │   expansion + keyword injection
              │  Engine         │
              └───────┬────────┘
                      │
                      ▼
              ┌────────────────┐
              │  Sentence-      │   all-MiniLM-L6-v2
              │  Transformer    │   384-dim, L2-normalized
              │  Embedding      │   (cached: <1ms / uncached: ~300ms)
              └───────┬────────┘
                      │
                      ▼
              ┌────────────────┐
              │  FAISS Dense    │   k×2 candidates retrieved
              │  Vector         │   + keyword boost scoring
              │  Similarity     │   → top-K results
              │  Search         │
              └───────┬────────┘
                      │
                      ▼
              ┌────────────────┐
              │  Context        │   Documents → structured string
              │  Formatter +    │   + LegalSource[] extraction
              │  Source         │
              │  Extractor      │
              └───────┬────────┘
                      │
                      ▼
              ┌────────────────┐
              │  Memory         │   Short-term: last 10 messages
              │  Injection      │   Long-term: summaries + facts
              │  (per-user)     │   Profile: location, interests
              └───────┬────────┘
                      │
                      ▼
              ┌────────────────┐
              │  LLM Generator  │   Groq Llama 3.1 8B
              │  (temp=0.0)     │   Anti-hallucination prompt
              │                 │   LCEL chain execution
              └───────┬────────┘
                      │
                      ▼
              ┌────────────────┐
              │  Post-          │   Translate → user language
              │  Processing     │   Encrypt → store in DB
              │                 │   Log → QueryLog table
              └───────┬────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              RESPONSE: ChatResponse                              │
│     { answer, sources[], session_id, is_fallback, latency_ms }   │
└─────────────────────────────────────────────────────────────────┘
```

### Failure Branch — No Relevant Documents

```
similarity_search() returns [] (empty)
        │
        ▼
RAGPipeline.query() detects `not documents`
        │
        ▼
Returns FALLBACK_RESPONSE:
  "The requested information is not available
   in the provided legal documents."
        │
        ▼
is_fallback = True in ChatResponse
No memory summary stored (skipped)
Query logged with was_successful = False
```

### Failure Branch — LLM / API Error

```
generate_response() raises Exception
        │
        ▼
chat() catches Exception
        │
        ├─→ Structured error logged (type, message, traceback, truncated query)
        ├─→ QueryLogCRUD.create(was_successful=False, error_message=...)
        └─→ HTTP 500 returned to client
```

### Failure Branch — Vector Store Not Loaded

```
similarity_search() called with _initialized = False
        │
        ▼
Lazy-load attempt: vector_store_manager.load()
        │
        ├─→ pgvector available and has data? → use pgvector
        ├─→ FAISS index file exists? → load FAISS
        └─→ Neither available → return [] → fallback response
```

---

## 4. System Performance Metrics

### 4.1 Retrieval Performance

| Metric | Definition | How Measured |
|---|---|---|
| **Precision@K** | Fraction of top-K retrieved docs that are relevant | Manual annotation of sample queries against retrieved results |
| **Recall@K** | Fraction of all relevant docs captured in top-K | Compare top-K against known relevant sections for benchmark queries |
| **Hit Rate** | % of queries where at least one relevant doc is in top-K | `1 - (fallback_count / total_queries)` from `QueryLog` table |
| **Keyword Boost Effectiveness** | % of queries where hybrid re-ranking improves result ordering | Compare FAISS-only rank vs. hybrid rank for section-specific queries |

### 4.2 Generation Quality

| Metric | Definition | How Measured |
|---|---|---|
| **Faithfulness** | Does the answer use ONLY facts from the retrieved context? | Compare answer claims against retrieved `page_content`. Flag any claim not traceable to context |
| **Relevance Score** | Does the answer address the user's actual question? | Human evaluation (1–5 scale) on sample queries |
| **Answer Completeness** | Does the answer cover all relevant aspects from the context? | Check if all retrieved sections are referenced in the answer |
| **Hallucination Rate** | % of responses containing fabricated legal provisions | `(responses_with_ungrounded_claims / total_responses) × 100` |
| **Citation Accuracy** | % of inline citations `[Act, Section]` that match actual retrieved sources | Automated check: parse citations from answer, verify against `sources[]` |

### 4.3 System Performance

| Metric | Definition | Source |
|---|---|---|
| **Total Latency** | End-to-end response time (ms) | `latency_ms` field in `ChatResponse` and `QueryLog` |
| **Embedding Latency** | Time to generate query embedding | `EmbeddingGenerator` internal logging (`embed_query()`) |
| **Retrieval Latency** | FAISS search + hybrid scoring time | Instrumented in `similarity_search()` |
| **LLM Latency** | Time for Groq API to return response | Measured within `generate_response()` |
| **Translation Latency** | Time for language detection + translation | Instrumented in `translate_to_english()` / `translate_from_english()` |
| **Throughput** | Requests per second the system can handle | Load test against `/api/chat` endpoint |
| **Cache Hit Rate** | % of embedding lookups served from cache | `embedding_generator.get_cache_stats()` → `hit_rate_percent` |
| **Token Usage** | Input/output tokens per LLM call | Groq API response metadata |

---

## 5. RAG Status Model (RED / AMBER / GREEN)

### Operational Health Thresholds

| Metric | 🟢 GREEN (Healthy) | 🟡 AMBER (Degraded) | 🔴 RED (Unhealthy) |
|---|---|---|---|
| **Retrieval Hit Rate** | ≥ 85% | 60–84% | < 60% |
| **Total Latency** | < 2s | 2–5s | > 5s |
| **Hallucination Rate** | < 5% | 5–15% | > 15% |
| **Embedding Cache Hit Rate** | ≥ 50% | 20–49% | < 20% |
| **LLM Success Rate** | ≥ 99% | 95–98% | < 95% |
| **DB Connection Pool** | < 50% utilised | 50–80% utilised | > 80% utilised |
| **Vector Store** | Loaded, doc_count > 0 | Loaded, stale index | Not loaded / 0 docs |
| **Translation Success** | ≥ 95% | 80–94% | < 80% |

### How Each Metric Is Calculated

- **Retrieval Hit Rate**: `COUNT(was_successful=True) / COUNT(*) FROM query_log` over rolling 24h window
- **Total Latency**: `AVG(latency_ms) FROM query_log WHERE created_at > NOW() - 1h`
- **Hallucination Rate**: Periodic human audit of random sample (50 queries/week). Flag answers with claims not traceable to `sources[]`
- **Embedding Cache Hit Rate**: `GET /health` → `components.embedding_cache.hit_rate_percent`
- **LLM Success Rate**: `1 - (COUNT(error_message IS NOT NULL) / COUNT(*)) FROM query_log`
- **DB Connection Pool**: `GET /health` → `components.database.pool.checked_out / pool.pool_size`
- **Vector Store**: `GET /health` → `components.vector_store.status` + `document_count`

### System Health Decision

```
if ALL metrics are GREEN     → System is HEALTHY
if ANY metric is AMBER       → System is DEGRADED (alert team)
if ANY metric is RED         → System is UNHEALTHY (page on-call)
```

---

## 6. Monitoring & Logging

### 6.1 What Is Logged

| Event | Data Logged | Table / Destination |
|---|---|---|
| **Every query** | query (encrypted), response (encrypted), sources, latency_ms, was_successful, error_message, user_id | `query_log` table |
| **Every message** | role, content (encrypted), sources, session_id | `chat_messages` table |
| **Errors** | error_type, error_message, truncated query, user_id, session_id, full traceback | Application logs (structured JSON) |
| **Embedding cache** | cache_size, hits, misses, hit_rate_percent | `/health` endpoint |
| **DB pool** | pool_size, checked_out, checked_in, overflow | `/health` endpoint |
| **Startup events** | Model load times, index load success/failure | Application logs |

### 6.2 Health Check Endpoints

| Endpoint | Purpose | Response |
|---|---|---|
| `GET /health` | Full system status with all component details | `{ status, version, environment, components{} }` |
| `GET /health/live` | Kubernetes liveness probe | `{ status: "alive" }` — always returns 200 if app is running |
| `GET /health/ready` | Kubernetes readiness probe | Returns 200 if DB connected + vector store loaded. Returns 503 otherwise |

### 6.3 Dashboard Metrics to Track

| Dashboard Panel | Metrics |
|---|---|
| **Request Volume** | Queries/min, unique users/hour, session count |
| **Latency** | P50, P90, P99 total latency; breakdown by stage (embedding, retrieval, LLM, translation) |
| **Error Rate** | Failed queries/min, error types breakdown, HTTP 500 rate |
| **Retrieval Quality** | Hit rate (non-fallback %), average sources per response |
| **Cache Efficiency** | Embedding cache hit rate, translation cache hit rate |
| **Infrastructure** | DB pool utilisation, FAISS index doc count, memory usage |

### 6.4 Alert Conditions

| Condition | Severity | Action |
|---|---|---|
| `latency_ms P99 > 5000` for 5 min | 🔴 Critical | Page on-call. Check Groq API status, FAISS index size |
| `was_successful rate < 60%` for 15 min | 🔴 Critical | Investigate vector store / LLM availability |
| `DB pool checked_out > 80%` | 🟡 Warning | Scale DB pool or investigate connection leaks |
| `embedding cache hit_rate < 20%` | 🟡 Warning | Check if cache is being cleared unexpectedly |
| `error_message != NULL rate > 5%` for 10 min | 🟡 Warning | Review error logs for patterns |

---

## 7. Failure Scenarios & Handling

### 7.1 No Relevant Documents Retrieved

```
Scenario: User asks about a topic not in the indexed corpus
Symptom:  similarity_search() returns []
Handling: Return FALLBACK_RESPONSE, set is_fallback=True
Current:  "The requested information is not available in the provided legal documents."
Fix:      Expand corpus, add more legal acts, improve chunking
```

### 7.2 Irrelevant Context Retrieved

```
Scenario: Retrieved docs don't match user intent (e.g., wrong section)
Symptom:  LLM generates answer from wrong context
Handling: Hybrid search with keyword boost mitigates this
Fix:      
  - Improve embedding model (upgrade to all-mpnet-base-v2 or BGE)
  - Tune chunk_size/chunk_overlap (currently 1500/300)
  - Add cross-encoder re-ranker as a post-retrieval step
```

### 7.3 Hallucinated Answer

```
Scenario: LLM generates legal provisions not in the context
Symptom:  Answer contains claims not traceable to sources[]
Handling: Anti-hallucination prompt rules + temperature=0.0
Fix:
  - Stricter system prompt enforcement
  - Post-generation citation verification (automated)
  - Switch to model with better instruction following
```

### 7.4 Slow Response (> 5s)

```
Scenario: Total latency exceeds acceptable threshold
Symptom:  latency_ms > 5000 in QueryLog
Handling: Timeout at 30s, 2 retries for LLM
Fix:
  - Enable embedding cache warmup at startup (warmup())
  - Reduce top_k from 5 to 3
  - Use Groq (already fastest inference provider)
  - Cache frequent queries at response level
```

### 7.5 LLM Provider Down

```
Scenario: Groq API returns 503 / timeout
Symptom:  generate_response() raises exception
Handling: 2 automatic retries with 30s timeout
Fix:
  - Switch llm_provider to fallback (gemini, openai, openrouter)
  - All 4 providers are pre-configured in config.py
  - Implement automatic provider failover
```

### 7.6 Vector Store Not Loaded

```
Scenario: FAISS index missing or pgvector empty
Symptom:  GET /health/ready returns 503
Handling: Lazy-load attempt on first query; auto-tries pgvector → FAISS
Fix:
  - Re-run data ingestion pipeline to rebuild index
  - Check ./data/faiss_index/ for index.faiss file
  - Verify pgvector connection in DATABASE_URL
```

### 7.7 Translation Service Failure

```
Scenario: Google Translate API unreachable
Symptom:  translate_to_english() raises exception
Handling: Graceful fallback — use original query as-is
Fix:
  - Translation failure is non-fatal by design
  - RAG pipeline runs in English regardless
  - Response returned in English if back-translation fails
```

---

## 8. Implementation Details

### 8.1 Technology Stack

| Layer | Tool | Version / Detail |
|---|---|---|
| **API Framework** | FastAPI | Async Python, Pydantic v2 schemas |
| **LLM Orchestration** | LangChain | LCEL chains (`prompt \| llm \| parser`) |
| **Embedding** | sentence-transformers (`all-MiniLM-L6-v2`) | 384-dim, local CPU inference |
| **Vector Store** | FAISS (primary) / pgvector (production) | Dense vector similarity search |
| **LLM** | Groq (`llama-3.1-8b-instant`) | Temperature 0.0, 30s timeout |
| **Database** | PostgreSQL | Chat sessions, messages, query logs, user memory |
| **Cache** | In-memory LRU | Embedding cache (1000 entries), translation cache (1024 entries) |
| **Authentication** | JWT (HS256) + Google OAuth 2.0 | Access tokens (30m) + refresh tokens (7d) |
| **Encryption** | Fernet / HKDF | Per-user E2EE for messages and query logs |
| **Translation** | deep-translator (Google Translate) | Auto-detect + 15+ Indian languages |
| **Containerisation** | Docker Compose | PostgreSQL + Redis + App services |

### 8.2 Data Pipeline: Document → Index

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Raw Legal   │     │   Text       │     │  Embedding   │     │  FAISS       │
│  Document    │ ──→ │   Chunking   │ ──→ │  Generation  │ ──→ │  Index       │
│  (.pdf/.txt) │     │  (1500/300)  │     │  (384-dim)   │     │  (saved to   │
│              │     │              │     │              │     │   disk)      │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

**Chunking parameters** (from `config.py`):
- `chunk_size = 1500` characters
- `chunk_overlap = 300` characters

**Metadata per chunk:**
```json
{
    "act_name": "Indian Evidence Act, 1872",
    "section": "Section 65B",
    "title": "Admissibility of electronic records",
    "source_file": "evidence_act.pdf"
}
```

**Index storage:**
- FAISS: `./data/faiss_index/index.faiss` + `./data/faiss_index/index.pkl`
- pgvector: `langchain_pg_embedding` table in PostgreSQL

### 8.3 Configurable LLM Providers

The system supports hot-swappable LLM providers via `LLM_PROVIDER` env variable:

| Provider | Model | API Base | Notes |
|---|---|---|---|
| `groq` (default) | `llama-3.1-8b-instant` | Groq Cloud | Fastest inference (~200ms) |
| `gemini` | `gemini-1.5-flash` | Google AI | Free tier available |
| `openai` | `gpt-4-turbo-preview` | OpenAI | Highest quality, highest cost |
| `openrouter` | `openai/gpt-oss-120b:free` | OpenRouter | Free aggregator |

### 8.4 Configurable Embedding Providers

| Provider | Model | Dimension | Cost |
|---|---|---|---|
| `huggingface` (default) | `all-MiniLM-L6-v2` | 384 | Free (local) |
| `openai` | `text-embedding-ada-002` | 1536 | Paid API |
| `gemini` | `models/embedding-001` | 768 | Paid API |

### 8.5 Response Schema

```json
{
    "answer": "Section 65B of the Indian Evidence Act, 1872 deals with ...",
    "sources": [
        {
            "act": "Indian Evidence Act, 1872",
            "section": "Section 65B",
            "title": "Admissibility of electronic records",
            "content": "Notwithstanding anything contained in this Act...",
            "relevance_score": null
        }
    ],
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "is_fallback": false,
    "latency_ms": 1340
}
```

### 8.6 Key Configuration Values

| Setting | Default | Environment Variable |
|---|---|---|
| `top_k_results` | 5 | `TOP_K_RESULTS` |
| `chunk_size` | 1500 | `CHUNK_SIZE` |
| `chunk_overlap` | 300 | `CHUNK_OVERLAP` |
| `llm_temperature` | 0.0 | `LLM_TEMPERATURE` |
| `faiss_index_path` | `./data/faiss_index` | `FAISS_INDEX_PATH` |
| `embedding_cache_size` | 1000 | Hard-coded in `EmbeddingGenerator` |
| `rate_limit_per_minute` | 100 | `RATE_LIMIT_PER_MINUTE` |

---

## 9. Summary

This document describes the complete implementation of the LegalGPT RAG system — from user query intake through translation, enhancement, embedding, hybrid retrieval, memory-augmented prompt construction, LLM generation, and encrypted response delivery. Every component, failure path, and performance metric maps directly to the production codebase.

**Key file references:**

| Module | Path |
|---|---|
| RAG Pipeline | `app/core/rag_pipeline.py` |
| Embeddings | `app/core/embeddings.py` |
| Vector Store | `app/core/vector_store.py` |
| Prompts | `app/core/prompts.py` |
| Memory | `app/core/memory.py` |
| Translation | `app/core/translation.py` |
| Chat API | `app/api/routes/chat.py` |
| Health Check | `app/api/routes/health.py` |
| Configuration | `app/config.py` |
| Chat Schemas | `app/schemas/chat.py` |
