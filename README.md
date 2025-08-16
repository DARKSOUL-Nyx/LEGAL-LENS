# Legal Lens — Tech Stack & AI Architecture Blueprint

*Last updated: 16 Aug 2025*

## 1) Product goals & scope

**Primary goal:** Help users quickly understand legal documents (contracts, notices, policies, case PDFs) via search, question answering, summarization, clause extraction, and risk flags, with verifiable citations.

**Personas**

* **Individual/SMB user:** uploads a contract, asks questions, gets a summary + highlights + editable report.
* **Legal ops/analyst:** bulk process docs, custom clause library, redline suggestions, export to Word/JSON.
* **Developer (you):** reliable APIs, testable pipeline, modular models, safe PII handling.

**MVP slices**

1. Upload PDF → extract text + structure → RAG QA with citations → downloadable summary.
2. Clause extraction for a small set (e.g., Term, Termination, Confidentiality, Liability Cap).
3. Full‑text vector search across a workspace.

---

## 2) Non‑functional requirements

* **Accuracy with provenance** (always show source snippets + page numbers).
* **Latency**: < 4s for QA on single doc; < 15s for first-time indexing.
* **Privacy**: encryption at rest/in transit, PII redaction, per‑workspace isolation.
* **Observability**: traces for each request step + model calls.
* **Cost control**: batch embeddings, caching, adaptive context.

---

## 3) Proposed Tech Stack

### Frontend

* **Next.js (React, TypeScript)** — app router, SSR/ISR for dashboards.
* UI: **TailwindCSS**, **shadcn/ui**, **Framer Motion** for micro‑interactions.
* PDF viewer with overlays: **react-pdf** + custom highlights.

### Backend APIs

* **FastAPI (Python)** for AI/services orchestration and admin.
* Realtime events: **WebSocket** (FastAPI) or **tRPC** if you prefer TS end-to-end.
* Background jobs: **Celery + Redis** (or **RQ**) for ingestion/indexing.

### Data & Storage

* **PostgreSQL** for app data; **pgvector** extension for embeddings.
* **Object storage**: S3-compatible (AWS S3 / MinIO) for raw files & artifacts.
* **Search**: Start with **Postgres + pg\_trgm + pgvector**; scale to **OpenSearch/Elasticsearch** if needed.

### AI/ML Layer

* **LLMs**: choose per deployment

  * Hosted APIs: OpenAI (GPT‑4o/4.1), Anthropic (Claude 3.5), Google (Gemini 1.5), Azure.
  * OSS (self‑host): **Llama‑3.1‑70B**, **Mixtral 8x22B** via **vLLM**.
* **Embeddings**: `text-embedding-3-large` or OSS **bge‑m3** / **E5‑mistral**.
* **OCR/Parsing**: **PaddleOCR** or cloud OCR (Textract/Vision AI) + **PyMuPDF**, **Unstructured.io** for layout; **Tesseract** only as fallback.
* **Entity/PII**: **Microsoft Presidio** or **spaCy** pipelines.
* **Evaluation**: **ragas**, **trulens**, **Great Expectations** for data tests.

### Infra & DevOps

* **Docker** everywhere; **docker-compose** for local.
* **Kubernetes** (K8s) or **Fly.io/Render** for simple start.
* **Observability**: **OpenTelemetry** → **Tempo/Jaeger**, **Prometheus + Grafana**, **ELK**.
* **Secrets**: **Doppler**, **AWS Secrets Manager**, or **Vault**.

---

## 4) High‑Level Architecture

```
[Client] ──HTTP/WebSocket──> [API Gateway]
                     └──> [Auth]
                       
[FastAPI App]
  ├─ Upload Service  ──> [S3 Storage]
  ├─ Ingestion Orchestrator → [Celery/Redis]
  │     └─ Workers: [PDF Parsing] → [OCR] → [Text+Layout JSON]
  │                         └─ [Chunking] → [Embeddings] → [pgvector]
  ├─ Search/RAG Service → [Retriever] + [Re-Ranker (optional)]
  │     └─ [LLM Orchestrator] → [LLM Provider(s)]
  ├─ Clause Extractor → [Rule+ML Components]
  ├─ Summarizer/QA → [Citations/Quotes + Page anchors]
  └─ Exporter → [DOCX/CSV/JSON] in [S3]

[Postgres] (metadata, users, workspaces, docs, chunks, eval runs)
[pgvector] (embeddings)
[OpenSearch?] (optional hybrid search at scale)
```

---

## 5) Detailed Components

### 5.1 Auth & Multi‑Tenancy

* OAuth (Google/Microsoft) + email magic links.
* Tenancy: **workspace\_id** on all records with **Row Level Security** (Postgres RLS).
* Roles: `owner`, `admin`, `analyst`, `viewer`.

### 5.2 Document Ingestion & Parsing

* Accept: PDF, DOCX, TXT, HTML, Images (PNG/JPG), ZIP (bulk).
* Pipeline (as Celery chain):

  1. **Virus scan** (clamav) → reject.
  2. **MIME sniff** + **page count**.
  3. **Parsing**: PyMuPDF/Unstructured to get text, page, block, bbox, tables.
  4. **OCR if needed**: PaddleOCR → per page, multi‑column support.
  5. **Normalization**: produce a **Layout JSON** schema (see Appendix A).
  6. **Chunking**: semantic or layout‑aware (by headings, clauses, tables), target 500‑1,200 tokens with overlap.
  7. **Embeddings**: batch → pgvector, store `(chunk_id, doc_id, page_start,end, bbox hints)`.
  8. **Quality checks**: missing text %, OCR confidence, table cell density; flag low‑quality pages.

### 5.3 Search & Retrieval

* **Hybrid** query: BM25 (Postgres trigram/OpenSearch) + vector (pgvector) + rerank (**bge‑reranker‑base** / API reranker).
* Filters: doc, tags, date, author, jurisdiction, clause type.
* Top‑k per document to improve diversity; **Maximal Marginal Relevance (MMR)** to reduce duplication.

### 5.4 RAG QA Orchestration

* Prompt template enforces: answer with citations + quote spans + page numbers.
* **Context windowing**: pack chunks until token budget; prioritize high‑score + diverse pages.
* **Tools/Functions**: function calls for `fetch_page_image`, `get_clause`, `expand_citation`.
* **Grounding**: if confidence < threshold → respond with “insufficient context” and suggest pages to read.

### 5.5 Clause Extraction Engine

* **Two‑stage**: (1) candidate detection via regex/patterns/rules; (2) LLM classification + span extraction.
* Maintain **Clause Library** with canonical names, synonyms, expected signals, risk heuristics.
* Output JSON with: `clause_name`, `present?`, `span`, `page_refs`, `risk_level`, `notes`.

### 5.6 Summarization & Risk Report

* Structured summary sections (Parties, Term, Termination, Fees, Confidentiality, IP, Liability Cap, Indemnity, Governing Law, Dispute Resolution, Data Processing, Subprocessors, Audit, SLAs).
* For each section: **evidence table** with page refs and snippet.
* Optional **compare docs** mode (e.g., latest vs baseline) with diff.

### 5.7 Exports & Integrations

* **DOCX** via python‑docx; **CSV/JSON** for analytics; **PDF** summary with links back to source pages.
* Webhooks/Integrations: Slack, Email, Google Drive, Notion; later: CLM tools.

### 5.8 Monitoring & Cost Control

* Log each LLM call (model, tokens, latency, cost, cache hit).
* **Results cache** keyed by `(prompt_hash, context_hash)`.
* Auto‑switch to cheaper model for non‑critical tasks; escalate on low confidence.

---

## 6) Data Model (simplified)

```
users(id, email, name, created_at)
workspaces(id, name, owner_id)
workspace_members(user_id, workspace_id, role)

documents(id, workspace_id, title, mime, status, page_count, ocr_ratio, created_at)
document_pages(id, document_id, page_no, text, ocr_conf, layout_json_s3)

chunks(id, document_id, page_start, page_end, content, token_count, embedding vector)
chunk_scores(id, query_id, chunk_id, score, rank)

clauses(id, name, description, risk_rules_json)
doc_clauses(id, document_id, clause_id, present, risk_level, span_text, page_refs int[])

queries(id, workspace_id, query_text, created_at)
answers(id, query_id, llm_model, answer_text, citations_json, cost, latency_ms)

exports(id, document_id, kind, s3_path, created_at)

evals(id, run_id, dataset_id, metrics_json, created_at)
```

---

## 7) API Design (sample)

**Auth**

* `POST /auth/login` (magic link) → token

**Documents**

* `POST /docs/upload` (multipart) → `{document_id}`
* `GET /docs/{id}` → status, meta, pages

**Search & QA**

* `POST /qa/query` → `{answer, citations:[{doc_id, page, quote}]}`
* `POST /search` → hybrid results

**Clauses**

* `POST /clauses/extract` → per doc result JSON

**Exports**

* `POST /exports/{doc_id}?type=docx|json|pdf` → download link

---

## 8) AI Service Design Details

### 8.1 Prompting patterns (sketch)

**RAG‑QA System Prompt**

* "You are Legal Lens. Answer **only** from provided context. For each claim, attach citations `[Doc:Title p.X]` and include a short quote. If context is insufficient, say so."

**Clause Extract**

* Input: doc slices; Output JSON schema with `present`, `span`, `risk_level`, `rationale`, `citations`.

**Summarizer**

* Produce a sectioned summary with bullet points + evidence table.

### 8.2 Function‑calling schemas

```json
{
  "name": "fetch_page_image",
  "parameters": {
    "type": "object",
    "properties": {
      "document_id": {"type": "string"},
      "page_no": {"type": "integer"}
    },
    "required": ["document_id", "page_no"]
  }
}
```

### 8.3 Retrieval strategy

* K=12 (MMR 0.5), dedupe by page, pack to token budget.
* Rerank top 30 via cross‑encoder; keep top 8 for context.
* Table‑aware: render table to markdown; preserve cell headers.

### 8.4 Guardrails

* Disallow answers without citations; check hallucination via **answer‑faithfulness** metric.
* PII scrubbing prior to logs; redact access tokens; per‑workspace encryption key.

---

## 9) Testing Strategy (developer mindset)

### 9.1 Unit & Integration

* **Parsers**: golden PDFs → deterministic text & layout JSON.
* **Chunker**: invariant tests (no empty chunks; token limits respected).
* **Embeddings**: checksum of vectors across versions (or pin model hash).
* **RAG**: fixed small corpus → known answers with accepted citation spans.

### 9.2 Data Quality

* **Great Expectations**: page coverage ≥ 95%, OCR conf ≥ threshold, no nulls in critical fields.

### 9.3 LLM Evaluation

* **ragas** metrics: context precision/recall, answer relevancy, faithfulness.
* **Human‑in‑loop**: label 50–100 Q/A per doc category; use as regression set.

### 9.4 Load & Cost

* K6/Locust: upload spikes, concurrent QA; track p95 latency, token spend per feature.

### 9.5 Security & Privacy Tests

* Pen test with common PDF exploits; verify RLS; audit log coverage.

---

## 10) Local Dev Setup

* `docker compose up` services: postgres+pgvector, minio, redis, fastapi, worker, nextjs.
* Seed with sample legal PDFs; run ingestion scripts.
* Makefile targets: `make up`, `make seed`, `make tests`, `make eval`.

---

## 11) Observability

* **OpenTelemetry** spans: `upload`, `parse`, `ocr`, `chunk`, `embed`, `index`, `retrieve`, `rerank`, `llm_call`, `compose_answer`.
* Dashboards: per‑stage latency, failure rates, token usage, cache hit ratio, cost per workspace.

---

## 12) Risk Register & Mitigations

* **Bad PDFs / scans** → OCR fallback + low‑confidence flag + human review queue.
* **Model drift** → nightly canary eval on regression set.
* **Cost spikes** → result caching + adaptive truncation + cheaper models for drafts.
* **Privacy** → PII scrub + encryption + strict RLS + signed URLs with TTL.

---

## 13) Phased Roadmap

**Week 1–2 (MVP)**

* Upload → Parse/OCR → Chunk/Embed → RAG QA with citations; basic UI.

**Week 3–4**

* Clause extractor (4–6 clauses); summary exporter; evaluation harness; dashboards.

**Week 5–6**

* Hybrid search + reranker; bulk upload; compare docs; role‑based access.

**Beyond**

* Fine‑tuned extractors; advanced redlining; integrations; multilingual.

---

## Appendix A — Layout JSON (example)

```json
{
  "document_id": "...",
  "pages": [
    {
      "page_no": 1,
      "width": 595,
      "height": 842,
      "blocks": [
        {"type": "heading", "text": "Master Services Agreement", "bbox": [50,50,545,95]},
        {"type": "paragraph", "text": "This Agreement...", "bbox": [50,110,545,150]},
        {"type": "table", "html": "<table>...</table>", "bbox": [50, 300, 545, 500]}
      ]
    }
  ]
}
```

## Appendix B — Sample Prompt (RAG QA)

```
You are Legal Lens. Use only the CONTEXT to answer. Cite like [Doc:Title p.PAGE]. Include a short quote (≤25 words) near each citation.
QUESTION: {question}
CONTEXT:
{retrieved_chunks}
If unsure or not found, reply: "I don’t have enough information in the provided documents to answer confidently." Also suggest the top 3 pages to review next.
```

## Appendix C — Minimal Directory Structure

```
legal-lens/
  apps/
    api/ (FastAPI)
    web/ (Next.js)
    workers/ (Celery tasks)
  packages/
    parsers/
    retriever/
    prompts/
    evaluators/
  infra/
    docker/
    k8s/
  tests/
  datasets/
  Makefile
```
