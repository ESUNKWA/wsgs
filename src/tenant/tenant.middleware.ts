import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantService } from './tenant.service';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly tenantService: TenantService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.replace('Bearer ', '')
      ?? (req.query?.token as string | undefined);

    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(
            Buffer.from(parts[1], 'base64url').toString('utf-8'),
          );
          const structureId = payload?.structureId;
          if (structureId) {
            const ds = await this.tenantService.getDataSource(+structureId);
            return this.tenantContext.run(+structureId, ds, () => next());
          }
        }
      } catch (err: any) {
        console.error('[TenantMiddleware] Impossible de résoudre le DataSource tenant:', err?.message);
        // On laisse passer — le JwtAuthGuard ou TenantContextService lèveront l'erreur appropriée
      }
    }

    next();
  }
}
