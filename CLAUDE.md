# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Langue de communication avec l'utilisateur : **français**.

## Commandes

```bash
npm run start:dev        # Mode watch avec rechargement à chaud
npm run start:debug      # Debug + watch
npm run build            # nest build → dist/
npm run start:prod       # node dist/main

npm run lint             # ESLint avec --fix
npm run format           # Prettier sur src/ et test/

npm run test             # Tests unitaires (*.spec.ts sous src/)
npm run test:e2e         # Tests E2E (test/jest-e2e.json)
npx jest src/dashboard/dashboard.service.spec.ts   # Un seul fichier de test

# Docker (API + Postgres 16)
docker compose up -d --build                                              # image de production
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build # dev, sources montées + rechargement à chaud
```

## Environnement

Copier `.env.example` vers `.env`. Ce fichier sert à la fois pour `npm run start:dev` et pour docker compose ; en Docker, `DATABASE_HOST` est forcé à `db`. Variables notables en plus de la base et du JWT :

- `BASE_URL` — URL publique de l'API, utilisée pour construire les URLs d'images et de PDF renvoyées aux clients
- `CORS_ORIGINS` — origines autorisées, séparées par des virgules, pour le HTTP **et** le WebSocket. Si elle est absente, ce sont les valeurs par défaut de `src/common/helpers/cors-origins.ts` qui s'appliquent.
- `SUPER_ADMIN_*` — super admin créé au démarrage s'il n'existe pas (`AppService.onApplicationBootstrap`)
- `ORANGE_SMS_*` (API SMS Orange), `WASENDER_TOKEN` (WhatsApp via WaSenderAPI), `OLLAMA_VISION_MODEL` (par défaut `llava`)

Les fonctions IA nécessitent Ollama avec `llama3` (et le modèle de vision) téléchargés. L'URL `http://localhost:11434` est **codée en dur** dans `ollama/ollama.service.ts` et `ai/ai.service.ts` : Ollama est donc injoignable depuis le conteneur Docker tant que ces fichiers ne sont pas modifiés.

Swagger : `/swagger` (JSON sur `/swagger/json`).

## Architecture

**NeuroStock** est une API SaaS NestJS 11 de gestion de stock et de point de vente, sur PostgreSQL via TypeORM. Les termes métier sont en français partout (boutique, achat, vente, structure, caisse, abonnement…).

### Multi-tenant : une base de données par Structure (concept le plus important)

Il existe deux types de base de données :

- **Base master** (variables d'env, `TypeOrmModule.forRoot` dans `app.module.ts`, `synchronize: true`). Elle ne contient que les entités d'authentification et d'administration SaaS : Utilisateur, Profil, Structure, TenantConfig, les entités Abonnement/plans, DemandeInscription, SmsLog, WhatsappLog, ModuleStructure, ConfigurationEcran. Les services de ces entités utilisent `@InjectRepository`.
- **Base tenant** (une par Structure). Elle contient toutes les données métier : boutiques, produits, achats, ventes, caisse, stock… Ces entités sont listées dans `TENANT_ENTITIES` dans `src/tenant/tenant.service.ts`.

Déroulement d'une requête : `TenantMiddleware` (appliqué à toutes les routes) décode le JWT, pris dans l'en-tête `Authorization` ou dans le paramètre `?token=`, et en lit le `structureId`. Il récupère le `DataSource` de ce tenant dans le pool de `TenantService.getDataSource()`, puis exécute la requête dans un contexte `AsyncLocalStorage` (`TenantContextService`).

Les services tenant ne doivent **pas** utiliser `@InjectRepository`. Utiliser plutôt ce modèle :

```ts
constructor(private readonly tenantContext: TenantContextService) {}
private get dataSource() { return this.tenantContext.getDataSource(); }
private get venteRepository() { return this.dataSource.getRepository(Vente); }
```

Attention : Utilisateur, Profil et Structure existent dans les **deux** bases. Côté tenant, on retrouve un utilisateur par son téléphone, pas par son id master.

**Modifications de schéma sur les entités tenant :** les DataSources tenant sont en `synchronize: false`. Une nouvelle entité tenant doit être ajoutée à `TENANT_ENTITIES`, et les bases tenant existantes ont besoin d'un SQL idempotent ajouté dans `TenantService.applyMigrations()`, qui s'exécute à la première connexion de chaque tenant. Seuls les tenants nouvellement provisionnés reçoivent un `synchronize()` complet. Les entités master s'ajoutent au tableau `entities` de `app.module.ts`.

Provisionnement : créer la Structure (master), puis appeler `POST /tenant/provision`. Cela crée la base physique, synchronise son schéma et crée l'utilisateur admin. Le contrôleur tenant propose aussi des endpoints de reseed, d'exécution SQL sur tous les tenants et de réinitialisation.

À l'intérieur d'un tenant, la plupart des ressources sont en plus limitées à une `boutique`, passée en paramètre de requête numérique.

### Guards globaux

Les deux sont enregistrés via `APP_GUARD` dans `AppModule`, dans cet ordre :

1. `JwtAuthGuard` — toutes les routes sont protégées sauf celles marquées `@Public()` (`gestion-utilisateurs/authentication/auth/public.decorator.ts`).
2. `AbonnementGuard` — renvoie une 403 si la structure de l'utilisateur n'a pas d'abonnement `actif`. Il est ignoré pour les routes `@Public()`, les super admins et les utilisateurs sans `structureId`.

Payload JWT : `{ userId, email, profil, structureId, … }`. Codes de profil : `super_admin`, `admin`, `responsable_structure` (voit toutes les boutiques de la structure), `gerant`, `magasinier`, `caissier`, `vendeur`, `user`.

### Opérations d'écriture

Les opérations qui font bouger le stock s'exécutent dans `dataSource.transaction()` sur le DataSource tenant : vente, achat, retour-vente, transfert-stock et bon-sortie. Chaque transaction enregistre l'en-tête avec une référence générée par `ReferenceGeneratorHelper`, enregistre les lignes de détail, ajoute une entrée dans `HistoriqueStock` et met à jour `Produit.stock_disponible`.

### Événements temps réel

Les services appellent `EventsService.emit(boutiqueId, type, data)`, par exemple `vente.created`. Les clients reçoivent les événements de deux façons :
- SSE sur `/events/stream` (`@Public()`)
- Namespace Socket.IO `/events` : le client émet `join {boutique}` et reçoit les événements dans la room `boutique:<id>`

Aucun des deux canaux ne vérifie de token : tous deux font confiance à l'id de boutique fourni par le client.

### Fichiers, PDF, ressources statiques

`public/` est servi sur `/api/...`. Les fichiers envoyés sont rangés par tenant sous `public/tenants/<structureId>/<sous-dossier>/` (`common/helpers/tenant-file.helper.ts`). `PdfService` transforme des gabarits HTML (`common/shared/generateHtml*.ts`, `src/templates/`) en PDF avec Puppeteer. L'image Docker utilise le Chromium du système (`PUPPETEER_EXECUTABLE_PATH`).

### Autres modules

- `ollama/` — `/ollama/analyse` (`@Public()`). Enchaînement : SourceResolverService (question → source de données), puis DataProviderService, puis PromptBuilderService, puis OllamaService.
- `ai/` — analyse d'images avec le modèle de vision Ollama. `prevision/` — prévisions de stock.
- `sms/` — SMS Orange. `RapportJournalierService` envoie un rapport quotidien via `@Cron('0 20 * * *')`. `whatsapp/` envoie via WaSenderAPI.
- `abonnement/`, `inscription/` — abonnements SaaS, plans tarifaires, frais de mise en place, demandes d'inscription (tout en base master).
- `services/response/ResponseService` — enveloppe de réponse standard `{status, message, data}`.

### Conventions de nommage

- Tables : `t_<pluriel>` (ex. `t_produits`, `t_ventes`)
- Colonnes : préfixe `r_` (ex. `r_nom`, `r_montant_total`)
- Les imports utilisent des chemins absolus `src/...`
