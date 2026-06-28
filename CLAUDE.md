# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run start:dev        # Watch mode with hot reload
npm run start:debug      # Debug + watch mode

# Build & Production
npm run build            # Compile TypeScript via NestJS CLI
npm run start:prod       # Run compiled output

# Code Quality
npm run format           # Prettier format src/ and test/
npm run lint             # ESLint with auto-fix

# Tests
npm run test             # All unit tests (*.spec.ts under src/)
npm run test:watch       # Watch mode
npm run test:cov         # Coverage report
npm run test:e2e         # E2E tests via test/jest-e2e.json

# Run a single test file
npx jest src/gestion-ventes/vente/vente.service.spec.ts
```

## Environment

Copy `.env` and fill in values before running:

```
APP_PORT=3000
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_DB=gstock_db
JWT_SECRET=<secret>
JWT_TOKEN_EXPIRE=1h
BASE_URL=http://localhost:3000
ADMIN_PASSWORD=<password>
```

The app also requires a local **Ollama** instance at `http://localhost:11434` with the `llama3` model pulled for AI analysis features to work.

Swagger UI is available at `/swagger` and JSON schema at `/swagger/json`.

## Architecture

**StockFlow** is a NestJS 11 REST API for inventory/POS management backed by PostgreSQL via TypeORM with `synchronize: true` (schema auto-migrates on start).

### Module groups

| Directory | Domain |
|-----------|--------|
| `src/config/` | Reference data — Produit, Categorie, Fournisseur |
| `src/gestion-achats/` | Purchases — Achat, DetailAchat, HistoriqueStock |
| `src/gestion-ventes/` | Sales — Vente, DetailVente, Client |
| `src/gestion-boutiques/` | Multi-tenant — Structure (company), Boutique (store) |
| `src/gestion-utilisateurs/` | Users — Utilisateur, Profil, Authentication |
| `src/dashboard/` | Aggregated KPI stats via raw SQL |
| `src/ollama/` | AI analysis via local Ollama (llama3) |
| `src/documents/pdf/` | PDF generation via Puppeteer |
| `src/services/response/` | Shared `ResponseService` for `{status, message, data}` envelope |
| `src/common/helpers/` | Utilities: reference generator, multer config, date helpers |

### Auth

JWT guard (`JwtAuthGuard`) is registered globally via `APP_GUARD` in `AppModule`. All routes are protected by default. Use the `@Public()` decorator on any controller or handler that should bypass auth.

### Multi-tenancy pattern

Most resources are scoped to a `boutique` (store). Controllers accept a `boutique` query param (as a numeric ID) and services filter all queries by it. The `Boutique` belongs to a `Structure` (company/organization).

### Write operations

Achat (purchase) and Vente (sale) creation use TypeORM `DataSource.transaction()` to atomically:
1. Save the header record (with auto-generated reference via `ReferenceGeneratorHelper`)
2. Save detail lines
3. Append to `HistoriqueStock`
4. Update `Produit.stock_disponible`

### PDF generation

`PdfService` uses Puppeteer (headless Chrome) to render HTML → PDF, saved to `public/pdfs/`. Files are served as static assets at `/api/pdfs/<filename>` using `useStaticAssets`. The `BASE_URL` env var is used to build returned file URLs.

### AI analysis (`/ollama/analyse`)

`OllamaController` is marked `@Public()`. It uses three internal services:
- `SourceResolverService` — maps the user's question to a data source (`ventes`, `achats`, `produits`, etc.)
- `DataProviderService` — fetches relevant DB data for that source/boutique
- `PromptBuilderService` — constructs a structured prompt
- `OllamaService` — sends the prompt to the local Ollama API and returns the response

### Naming conventions

- Entity table names follow the pattern `t_<plural>` (e.g. `t_produits`, `t_ventes`)
- Column names on entities use `r_` prefix (e.g. `r_nom`, `r_montant_total`)
- French is used throughout for domain terms (boutique, achat, vente, fournisseur, utilisateur, etc.)
