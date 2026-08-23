import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, IsNull } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigurationEcran } from './configuration-ecran/entities/configuration-ecran.entity';
import { Utilisateur } from './gestion-utilisateurs/utilisateurs/entities/utilisateur.entity';
import { Profil } from './gestion-utilisateurs/profils/entities/profil.entity';

const PROFILS_SEED = [
  { code: 'admin', nom: 'Administrateur', description: 'Administrateur' },
  { code: 'gerant', nom: 'Gérant boutique', description: 'Gérant boutiques' },
  {
    code: 'responsable_structure',
    nom: 'Responsable structure',
    description: 'Responsable structure',
  },
  {
    code: 'user',
    nom: 'Utilisateur standard',
    description: 'Utilisateur standard',
  },
  { code: 'super_admin', nom: 'Super admin', description: 'Super admin' },
  { code: 'magasinier', nom: 'Magasinier', description: 'Magasinier' },
  { code: 'caissier', nom: 'Caissier', description: 'Caissier' },
  { code: 'vendeur', nom: 'Vendeur', description: 'Vendeur — accès POS vente' },
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
    await this.seedSuperAdmin();
    await this.seedConfigurationsEcran();

    // Migration master DB : tous les utilisateurs existants doivent changer leur mot de passe
    // sauf le super_admin (is_admin = true)
    const run = (sql: string) => this.dataSource.query(sql).catch(() => {});
    await run(
      `ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS r_must_change_password BOOLEAN DEFAULT TRUE`,
    );
    await run(`
      UPDATE utilisateurs
      SET r_must_change_password = CASE WHEN r_is_admin = TRUE THEN FALSE ELSE TRUE END
      WHERE r_must_change_password IS NULL
    `);
    // Garantir que le super_admin reste toujours à false
    await run(
      `UPDATE utilisateurs SET r_must_change_password = FALSE WHERE r_is_admin = TRUE`,
    );
  }

  /**
   * Garantit qu'un super admin existe toujours après le démarrage.
   * Idempotent : ne fait rien si un utilisateur `is_admin = true` existe déjà.
   * Ne fait jamais échouer le boot de l'app — une erreur ici est loguée, pas levée.
   */
  private async seedSuperAdmin(): Promise<void> {
    try {
      const utilisateurRepo = this.dataSource.getRepository(Utilisateur);

      const existing = await utilisateurRepo.findOne({
        where: { is_admin: true },
      });
      if (existing) {
        this.logger.log(`Super admin déjà présent — ${existing.telephone}`);
        return;
      }

      const profilRepo = this.dataSource.getRepository(Profil);
      const profil = await profilRepo.findOne({
        where: { code: 'super_admin' },
      });
      if (!profil) {
        this.logger.error(
          "Seed super admin ignoré : profil 'super_admin' introuvable (seed profils a-t-il échoué ?).",
        );
        return;
      }

      const nom = process.env.SUPER_ADMIN_NOM || 'Super';
      const prenoms = process.env.SUPER_ADMIN_PRENOMS || 'Admin';
      const telephone = process.env.SUPER_ADMIN_TELEPHONE || '0000000000';
      const email = process.env.SUPER_ADMIN_EMAIL || 'admin@neurostock.local';
      const motDePasse =
        process.env.SUPER_ADMIN_PASSWORD ||
        process.env.ADMIN_PASSWORD ||
        '12345';

      const hash = await bcrypt.hash(motDePasse, 10);

      const admin = utilisateurRepo.create({
        nom,
        prenoms,
        email,
        telephone,
        mot_de_passe: hash,
        profil,
        is_admin: true,
        structure_id: null,
        boutique_id: null,
        must_change_password: false,
      } as Utilisateur);

      await utilisateurRepo.save(admin);

      this.logger.warn(
        `Super admin créé automatiquement — téléphone: ${telephone}. ` +
          (process.env.SUPER_ADMIN_TELEPHONE && process.env.SUPER_ADMIN_PASSWORD
            ? "Identifiants définis via variables d'environnement."
            : 'ATTENTION : identifiants par défaut utilisés — définissez SUPER_ADMIN_TELEPHONE et SUPER_ADMIN_PASSWORD dans .env pour la production, puis changez le mot de passe dès la première connexion.'),
      );
    } catch (error: any) {
      // Un conflit (23505) signifie qu'un autre process/replica a créé l'admin en parallèle : pas grave.
      if (error?.code === '23505') {
        this.logger.log(
          'Super admin déjà créé par un autre process (conflit unique ignoré).',
        );
        return;
      }
      this.logger.error(`Échec du seed super admin : ${error.message}`);
    }
  }

  private async seedConfigurationsEcran(): Promise<void> {
    const repo = this.dataSource.getRepository(ConfigurationEcran);

    const defaults: Array<{
      boutique_type: string | null;
      profil_code: string;
      ecran_cible: string;
    }> = [
      // ── Super admin (pas de boutique) ──────────────────────────
      {
        boutique_type: null,
        profil_code: 'super_admin',
        ecran_cible: 'ekwatech',
      },

      // ── Boutique classique ──────────────────────────────────────
      {
        boutique_type: 'boutique',
        profil_code: 'admin',
        ecran_cible: 'dashboard',
      },
      {
        boutique_type: 'boutique',
        profil_code: 'gerant',
        ecran_cible: 'dashboard',
      },
      {
        boutique_type: 'boutique',
        profil_code: 'responsable_structure',
        ecran_cible: 'dashboard',
      },
      {
        boutique_type: 'boutique',
        profil_code: 'magasinier',
        ecran_cible: 'dashboard',
      },
      {
        boutique_type: 'boutique',
        profil_code: 'user',
        ecran_cible: 'dashboard',
      },
      { boutique_type: 'boutique', profil_code: 'vendeur', ecran_cible: 'pos' },
      {
        boutique_type: 'boutique',
        profil_code: 'caissier',
        ecran_cible: 'pos',
      },

      // ── Wildcard (fallback toutes boutiques) ────────────────────
      { boutique_type: null, profil_code: 'admin', ecran_cible: 'dashboard' },
      { boutique_type: null, profil_code: 'gerant', ecran_cible: 'dashboard' },
      {
        boutique_type: null,
        profil_code: 'responsable_structure',
        ecran_cible: 'dashboard',
      },
      {
        boutique_type: null,
        profil_code: 'magasinier',
        ecran_cible: 'dashboard',
      },
      { boutique_type: null, profil_code: 'user', ecran_cible: 'dashboard' },
      { boutique_type: null, profil_code: 'vendeur', ecran_cible: 'pos' },
      { boutique_type: null, profil_code: 'caissier', ecran_cible: 'pos' },
    ];

    for (const cfg of defaults) {
      const where: any = {
        profil_code: cfg.profil_code,
        boutique_type:
          cfg.boutique_type === null ? IsNull() : cfg.boutique_type,
      };
      const existing = await repo.findOne({ where });
      if (!existing) {
        await repo.save(repo.create(cfg));
      }
    }

    this.logger.log(
      `Seed configurations_ecran — ${defaults.length} entrées vérifiées.`,
    );
  }

  getHello(): string {
    return 'Hello World!';
  }
}
