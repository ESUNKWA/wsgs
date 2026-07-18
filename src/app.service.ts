import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, IsNull } from 'typeorm';
import { ConfigurationEcran } from './configuration-ecran/entities/configuration-ecran.entity';

const PROFILS_SEED = [
  { code: 'admin',                 nom: 'Administrateur',        description: 'Administrateur' },
  { code: 'gerant',                nom: 'Gérant boutique',       description: 'Gérant boutiques' },
  { code: 'responsable_structure', nom: 'Responsable structure', description: 'Responsable structure' },
  { code: 'user',                  nom: 'Utilisateur standard',  description: 'Utilisateur standard' },
  { code: 'super_admin',           nom: 'Super admin',           description: 'Super admin' },
  { code: 'magasinier',            nom: 'Magasinier',            description: 'Magasinier' },
  { code: 'caissier',              nom: 'Caissier',              description: 'Caissier' },
  { code: 'vendeur',               nom: 'Vendeur',               description: 'Vendeur — accès POS vente' },
  { code: 'serveur',               nom: 'Serveur',               description: 'Serveur restaurant — layout mobile' },
  { code: 'cuisiner',              nom: 'Cuisinier',             description: 'Cuisinier restaurant — layout mobile' },
];

@Injectable()
export class AppService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AppService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    for (const p of PROFILS_SEED) {
      await this.dataSource.query(
        `INSERT INTO "t_profils" ("r_code","r_nom","r_description","created_at","updated_at","deleted_at")
         VALUES ($1,$2,$3,NOW(),NOW(),NULL)
         ON CONFLICT ("r_code") DO NOTHING`,
        [p.code, p.nom, p.description],
      );
    }
    this.logger.log(`Seed profils — ${PROFILS_SEED.length} profils vérifiés.`);
    await this.seedConfigurationsEcran();

    // Migration master DB : tous les utilisateurs existants doivent changer leur mot de passe
    // sauf le super_admin (is_admin = true)
    const run = (sql: string) => this.dataSource.query(sql).catch(() => {});
    await run(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS r_must_change_password BOOLEAN DEFAULT TRUE`);
    await run(`
      UPDATE utilisateurs
      SET r_must_change_password = CASE WHEN r_is_admin = TRUE THEN FALSE ELSE TRUE END
      WHERE r_must_change_password IS NULL
    `);
    // Garantir que le super_admin reste toujours à false
    await run(`UPDATE utilisateurs SET r_must_change_password = FALSE WHERE r_is_admin = TRUE`);
  }

  private async seedConfigurationsEcran(): Promise<void> {
    const repo = this.dataSource.getRepository(ConfigurationEcran);

    const defaults: Array<{ boutique_type: string | null; profil_code: string; ecran_cible: string }> = [
      // ── Super admin (pas de boutique) ──────────────────────────
      { boutique_type: null, profil_code: 'super_admin',  ecran_cible: 'ekwatech' },

      // ── Boutique classique ──────────────────────────────────────
      { boutique_type: 'boutique', profil_code: 'admin',      ecran_cible: 'dashboard' },
      { boutique_type: 'boutique', profil_code: 'gerant',     ecran_cible: 'dashboard' },
      { boutique_type: 'boutique', profil_code: 'magasinier', ecran_cible: 'dashboard' },
      { boutique_type: 'boutique', profil_code: 'user',       ecran_cible: 'dashboard' },
      { boutique_type: 'boutique', profil_code: 'vendeur',    ecran_cible: 'pos' },
      { boutique_type: 'boutique', profil_code: 'caissier',   ecran_cible: 'pos' },

      // ── Restaurant ──────────────────────────────────────────────
      { boutique_type: 'restaurant', profil_code: 'admin',     ecran_cible: 'restaurant-admin' },
      { boutique_type: 'restaurant', profil_code: 'gerant',    ecran_cible: 'restaurant-admin' },
      { boutique_type: 'restaurant', profil_code: 'serveur',   ecran_cible: 'restaurant-serveur' },
      { boutique_type: 'restaurant', profil_code: 'cuisiner',  ecran_cible: 'restaurant-cuisine' },
      { boutique_type: 'restaurant', profil_code: 'caissier',  ecran_cible: 'restaurant-caissier' },
      { boutique_type: 'restaurant', profil_code: 'vendeur',   ecran_cible: 'restaurant-caissier' },

      // ── Wildcard (fallback toutes boutiques) ────────────────────
      { boutique_type: null, profil_code: 'admin',      ecran_cible: 'dashboard' },
      { boutique_type: null, profil_code: 'gerant',     ecran_cible: 'dashboard' },
      { boutique_type: null, profil_code: 'magasinier', ecran_cible: 'dashboard' },
      { boutique_type: null, profil_code: 'user',       ecran_cible: 'dashboard' },
      { boutique_type: null, profil_code: 'vendeur',    ecran_cible: 'pos' },
      { boutique_type: null, profil_code: 'caissier',   ecran_cible: 'pos' },
      { boutique_type: null, profil_code: 'serveur',    ecran_cible: 'restaurant-serveur' },
      { boutique_type: null, profil_code: 'cuisiner',   ecran_cible: 'restaurant-cuisine' },
    ];

    for (const cfg of defaults) {
      const where: any = { profil_code: cfg.profil_code, boutique_type: cfg.boutique_type === null ? IsNull() : cfg.boutique_type };
      const existing = await repo.findOne({ where });
      if (!existing) {
        await repo.save(repo.create(cfg));
      }
    }

    this.logger.log(`Seed configurations_ecran — ${defaults.length} entrées vérifiées.`);
  }

  getHello(): string {
    return 'Hello World!';
  }
}
