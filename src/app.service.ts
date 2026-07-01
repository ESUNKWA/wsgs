import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

const PROFILS_SEED = [
  { code: 'admin',                 nom: 'Administrateur',        description: 'Administrateur' },
  { code: 'gerant',                nom: 'Gérant boutique',       description: 'Gérant boutiques' },
  { code: 'responsable_structure', nom: 'Responsable structure', description: 'Responsable structure' },
  { code: 'user',                  nom: 'Utilisateur standard',  description: 'Utilisateur standard' },
  { code: 'super_admin',           nom: 'Super admin',           description: 'Super admin' },
  { code: 'magasinier',            nom: 'Magasinier',            description: 'Magasinier' },
  { code: 'caissier',              nom: 'Caissier',              description: 'Caissier' },
];

@Injectable()
export class AppService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AppService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    const [{ count }] = await this.dataSource.query(
      `SELECT COUNT(*) AS count FROM "t_profils"`,
    );
    if (Number(count) > 0) return;

    this.logger.log('Table t_profils vide — insertion des profils par défaut...');
    for (const p of PROFILS_SEED) {
      await this.dataSource.query(
        `INSERT INTO "t_profils" ("r_code","r_nom","r_description","created_at","updated_at","deleted_at")
         VALUES ($1,$2,$3,NOW(),NOW(),NULL)
         ON CONFLICT ("r_code") DO NOTHING`,
        [p.code, p.nom, p.description],
      );
    }
    this.logger.log(`${PROFILS_SEED.length} profils insérés.`);
  }

  getHello(): string {
    return 'Hello World!';
  }
}
