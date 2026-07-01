---
name: project-multitenant
description: Multi-tenant SaaS architecture — one DB per structure, dynamic connection via AsyncLocalStorage
metadata:
  type: project
---

SaaS multi-tenancy implemented: one PostgreSQL DB per structure.

**Architecture:**
- Master DB (env vars): Utilisateur, Profil, Structure, TenantConfig — auth only
- Tenant DB (per structure): ALL other entities — business operations

**Key files:**
- `src/tenant/tenant.module.ts` — @Global() module, exports TenantService + TenantContextService
- `src/tenant/tenant.service.ts` — DataSource pool (Map<structureId, DataSource>), provision endpoint
- `src/tenant/tenant-context.service.ts` — AsyncLocalStorage wrapper for current tenant DataSource
- `src/tenant/tenant.middleware.ts` — Reads JWT, calls tenantService.getDataSource(), wraps request in ALS context
- `src/tenant/tenant.controller.ts` — POST /tenant/provision, GET /tenant, DELETE /tenant/:id/reset

**JWT payload:** `{ userId, email, profil, structureId }`

**structureId resolution at login:**
1. user.structure_id (new column on Utilisateur)
2. fallback: user.boutique.structure.id
3. fallback: user.structure[0].id (responsable_structure)

**Service pattern for tenant services:**
```typescript
constructor(private readonly tenantContext: TenantContextService) {}
private get dataSource() { return this.tenantContext.getDataSource(); }
private get myRepo() { return this.dataSource.getRepository(MyEntity); }
```

**Master services (unchanged):** UtilisateursService, ProfilsService, StructureService

**Provisioning flow:**
1. POST /structure → creates structure in master DB (get structureId)
2. POST /tenant/provision → creates tenant DB, synchronizes schema
3. User assigned structure_id on creation → logs in → JWT contains structureId

**Why:** User requested SaaS multi-tenancy with data isolation per structure.
**How to apply:** All new business features must use TenantContextService, not @InjectRepository.
