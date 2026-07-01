import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { DataSource } from 'typeorm';

interface TenantStore {
  dataSource: DataSource;
  structureId: number;
}

@Injectable()
export class TenantContextService {
  private readonly als = new AsyncLocalStorage<TenantStore>();

  run<T>(structureId: number, dataSource: DataSource, fn: () => T): T {
    return this.als.run({ structureId, dataSource }, fn) as T;
  }

  getDataSource(): DataSource {
    const store = this.als.getStore();
    if (!store?.dataSource) {
      throw new InternalServerErrorException(
        'Aucun contexte tenant actif. Vérifiez que votre token contient un structureId valide.',
      );
    }
    return store.dataSource;
  }

  getStructureId(): number | null {
    return this.als.getStore()?.structureId ?? null;
  }

  hasContext(): boolean {
    return !!this.als.getStore()?.dataSource;
  }
}
