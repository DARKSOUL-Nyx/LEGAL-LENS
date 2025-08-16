
1. Tech Stack
Frontend / API Layer
•	Next.js (TypeScript) → SSR for SEO + API routes for server-side calls
•	TailwindCSS → Quick, professional styling
•	NextAuth.js → Authentication (email/password, Google, LinkedIn)
•	Prisma ORM + PostgreSQL → User accounts, document metadata, search history
•	Zustand or React Query → State management & server data fetching
AI + Backend Services
•	FastAPI / Node.js (TS) microservice for AI processing (can be a separate container)
•	LEGAL-BERT / Legal-PICO embeddings via Hugging Face
•	FAISS / Weaviate / Pinecone → Vector search
•	RAG pipeline (LangChain.js or LangChain Python) for summarization with source highlighting
Infrastructure & Deployment
•	Docker for multi-service setup (frontend + backend + DB + vector store)
•	Vercel for Next.js frontend (or Railway if you want API + frontend together)
•	Cloud DB (Neon.tech or Supabase) for PostgreSQL
•	Optional: S3/MinIO for document storage

Multiple User Support Plan
1.	Authentication & Authorization
o	Use NextAuth.js with JWT session tokens
o	Store user info in PostgreSQL (users table)
o	Role-based access (basic user, admin)
2.	Document Ownership
o	documents table with ownerId FK to users
o	Each search request is tied to a user session
o	Users can only see their own docs/search history
3.	User Quotas & Billing (optional)
o	Store usage (API calls, tokens used)
o	Enforce per-user limits for free tier
o	Stripe integration for premium tier

16 - 08 - 2025

Working On API - Backend

### Backend API phase 1 

### Auth 
    POST /auth/signup
    POST /auth/login
    GET  /AUTH/ME

### Case Management 
    POST /cases/(Upload the text documents)
    GET /cases/:id
    GET /cases/(list cases)

### AI SERVICES
    POST /ai/query
    POST /ai/summarize/:caseID
    POST /ai/recommend(similar cases/ legal precedents)


## Testing the services 

routes -> Postman 
Controllers -> mock data
Services -> unit tests
utils -> small focused tests
Middleware -> simulate requests with/without JWT, invalid body etc 