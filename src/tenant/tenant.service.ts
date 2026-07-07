import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { TenantConfig } from './entities/tenant-config.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { AbonnementService } from 'src/abonnement/abonnement.service';

import { Boutique } from 'src/gestion-boutiques/boutique/entities/boutique.entity';
import { Produit } from 'src/config/produit/entities/produit.entity';
import { Categorie } from 'src/config/categorie/entities/categorie.entity';
import { Fournisseur } from 'src/config/fournisseur/entities/fournisseur.entity';
import { Achat } from 'src/gestion-achats/achat/entities/achat.entity';
import { DetailAchat } from 'src/gestion-achats/detail-achat/entities/detail-achat.entity';
import { HistoriqueStock } from 'src/gestion-achats/historique-stock/entities/historique-stock.entity';
import { Vente } from 'src/gestion-ventes/vente/entities/vente.entity';
import { DetailVente } from 'src/gestion-ventes/detail-vente/entities/detail-vente.entity';
import { Client } from 'src/gestion-ventes/client/entities/client.entity';
import { Devis } from 'src/gestion-ventes/devis/entities/devis.entity';
import { DetailDevis } from 'src/gestion-ventes/devis/entities/detail-devis.entity';
import { CommandeFournisseur } from 'src/gestion-achats/commande-fournisseur/entities/commande-fournisseur.entity';
import { DetailCommandeFournisseur } from 'src/gestion-achats/commande-fournisseur/entities/detail-commande-fournisseur.entity';
import { CommandeClient } from 'src/gestion-ventes/commande-client/entities/commande-client.entity';
import { DetailCommandeClient } from 'src/gestion-ventes/commande-client/entities/detail-commande-client.entity';
import { SessionCaisse } from 'src/gestion-caisse/entities/session-caisse.entity';
import { MouvementCaisse } from 'src/gestion-caisse/entities/mouvement-caisse.entity';
import { Structure } from 'src/gestion-boutiques/structure/entities/structure.entity';
import { Utilisateur } from 'src/gestion-utilisateurs/utilisateurs/entities/utilisateur.entity';
import { Profil } from 'src/gestion-utilisateurs/profils/entities/profil.entity';
import { RetourVente } from 'src/gestion-ventes/retour-vente/entities/retour-vente.entity';
import { DetailRetourVente } from 'src/gestion-ventes/retour-vente/entities/detail-retour-vente.entity';

const PROFILS_SEED = [
  { code: 'admin',                 nom: 'administrateur',        description: 'administrateur' },
  { code: 'gerant',                nom: 'Gérant boutique',       description: 'Gérant boutiques' },
  { code: 'responsable_structure', nom: 'Responsable structure', description: 'Responsable structure' },
  { code: 'user',                  nom: 'Utilisateurs standard', description: 'Utilisateurs standard' },
  { code: 'super_admin',           nom: 'Super admin',           description: 'Super admin' },
  { code: 'magasinier',            nom: 'Magasinier',            description: 'Magasinier' },
  { code: 'caissier',              nom: 'Caissier',              description: 'Caissier' },
];

export const TENANT_ENTITIES = [
  Boutique, Produit, Categorie, Fournisseur,
  Achat, DetailAchat,
  Vente, DetailVente, Client,
  HistoriqueStock,
  Devis, DetailDevis,
  CommandeFournisseur, DetailCommandeFournisseur,
  CommandeClient, DetailCommandeClient,
  SessionCaisse, MouvementCaisse,
  Structure, Utilisateur, Profil,
  RetourVente, DetailRetourVente,
];

@Injectable()
export class TenantService {
  private readonly pool = new Map<number, DataSource>();

  constructor(
    @InjectRepository(TenantConfig)
    private readonly configRepo: Repository<TenantConfig>,
    @InjectDataSource()
    private readonly masterDs: DataSource,
    private readonly abonnementService: AbonnementService,
  ) {}

  // ─── Accès DataSource tenant (utilisé par le middleware et les services) ────

  async getDataSource(structureId: number): Promise<DataSource> {
    const cached = this.pool.get(structureId);
    if (cached?.isInitialized) return cached;

    const config = await this.configRepo.findOne({
      where: { structureId, isActive: true },
    });
    if (!config) {
      throw new NotFoundException(
        `Aucune base de données configurée pour la structure ${structureId}. Provisionnez-la via POST /tenant/provision.`,
      );
    }

    const ds = new DataSource({
      type: 'postgres',
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      database: config.database,
      entities: TENANT_ENTITIES,
      synchronize: false,
    });

    await ds.initialize();
    this.pool.set(structureId, ds);
    return ds;
  }


  // ─── Provisionnement ────────────────────────────────────────────────────────

  async provision(dto: CreateTenantDto): Promise<{ config: TenantConfig; admin?: Utilisateur }> {
    const existing = await this.configRepo.findOne({ where: { structureId: dto.structureId } });
    if (existing) {
      throw new BadRequestException(`Une configuration DB existe déjà pour la structure ${dto.structureId}`);
    }

    // ── Étape 1 : création physique de la base (DDL — hors transaction) ───────
    await this.createDatabaseIfNotExists(dto);

    // ── Étape 2 : initialisation + synchronisation du schéma tenant ───────────
    const tenantDs = new DataSource({
      type: 'postgres',
      host: dto.host ?? 'localhost',
      port: dto.port ?? 5432,
      username: dto.username,
      password: dto.password,
      database: dto.database,
      entities: TENANT_ENTITIES,
      synchronize: false,
    });
    await tenantDs.initialize();
    await tenantDs.synchronize(); // appel explicite pour garantir que les tables existent

    let savedConfig!: TenantConfig;
    let adminUser: Utilisateur | undefined;

    // ── Étape 4 : transaction master (config + utilisateur admin + responsable) ─
    try {
      await this.masterDs.transaction(async (masterTx) => {
        // 4a. Sauvegarder la config tenant
        const config = masterTx.create(TenantConfig, {
          structureId: dto.structureId,
          host: dto.host ?? 'localhost',
          port: dto.port ?? 5432,
          username: dto.username,
          password: dto.password,
          database: dto.database,
        });
        savedConfig = await masterTx.save(TenantConfig, config);

        // 4b. Créer l'utilisateur admin si les champs sont fournis
        if (dto.adminNom && dto.adminTelephone) {
          const adminProfil = await masterTx.findOne(Profil, { where: { code: 'responsable_structure' } });
          if (adminProfil) {
            const rawPwd = dto.adminPassword || process.env.ADMIN_PASSWORD || '12345';
            const hash = await bcrypt.hash(rawPwd, 10);

            const newUser = masterTx.create(Utilisateur, {
              nom: dto.adminNom,
              prenoms: dto.adminPrenoms ?? '',
              telephone: dto.adminTelephone,
              email: dto.adminEmail || undefined,
              mot_de_passe: hash,
              profil: adminProfil,
              structure_id: dto.structureId,
            });
            adminUser = (await masterTx.save(Utilisateur, newUser)) as Utilisateur;

            // 4c. Lier l'admin comme responsable de la structure
            await masterTx.update(Structure, { id: dto.structureId }, { responsable: adminUser });
          }
        }
      });
    } catch (masterError: any) {
      // Schéma créé mais aucune donnée insérée → on détruit la connexion proprement
      if (tenantDs.isInitialized) await tenantDs.destroy();
      throw new InternalServerErrorException(`Échec de la transaction master : ${masterError.message}`);
    }

    // ── Étape 5 : transaction tenant (seed profils + sync admin) ───────────
    try {
      for (const p of PROFILS_SEED) {
        await tenantDs.query(
          `INSERT INTO "t_profils" ("r_code","r_nom","r_description","created_at","updated_at","deleted_at")
           VALUES ($1,$2,$3,NOW(),NOW(),NULL)
           ON CONFLICT ("r_code") DO UPDATE SET
             "r_nom"        = EXCLUDED."r_nom",
             "r_description"= EXCLUDED."r_description"`,
          [p.code, p.nom, p.description],
        );
      }

      if (adminUser) {
        const { structure: _s, vente: _v, achat: _a, boutique: _bu, profil: masterProfil, ...userFlat } = adminUser as any;

        let tenantProfilId: number | null = null;
        if (masterProfil?.code) {
          const tenantProfil = await tenantDs.getRepository(Profil).findOne({ where: { code: masterProfil.code } });
          tenantProfilId = tenantProfil?.id ?? null;
        }

        await tenantDs.getRepository(Utilisateur).upsert(
          [{ ...userFlat, profil: tenantProfilId ? { id: tenantProfilId } : null }],
          ['id'],
        );
      }
    } catch (tenantError: any) {
      await this.masterDs.transaction(async (rollbackTx) => {
        if (adminUser) await rollbackTx.delete(Utilisateur, adminUser.id);
        await rollbackTx.delete(TenantConfig, savedConfig.id);
      });
      if (tenantDs.isInitialized) await tenantDs.destroy();
      throw new InternalServerErrorException(`Échec de la transaction tenant (rollback master effectué) : ${tenantError.message}`);
    }

    // ── Étape 6 : enregistrer le DataSource dans le pool ─────────────────────
    this.pool.set(dto.structureId, tenantDs);

    // ── Étape 7 : démarrer automatiquement la période d'essai ────────────────
    try {
      await this.abonnementService.demarrerEssai(dto.structureId);
    } catch {
      // Ne pas bloquer le provisionnement si l'essai échoue (ex: déjà existant)
    }

    delete (adminUser as any)?.mot_de_passe;
    return { config: savedConfig, admin: adminUser };
  }

  async reseedTenant(structureId: number): Promise<void> {
    await this.destroyConnection(structureId);
    const tenantDs = await this.getDataSource(structureId);

    // ALTER TYPE ADD VALUE ne peut pas s'exécuter dans une transaction (limitation PostgreSQL).
    // On utilise un QueryRunner sans transaction pour ajouter la valeur 'retour' si absente.
    const qr = tenantDs.createQueryRunner();
    await qr.connect();
    try {
      await qr.query(`ALTER TYPE t_historique_stock_r_source_enum ADD VALUE IF NOT EXISTS 'retour'`);
    } catch {
      // L'enum n'existe pas encore → synchronize() la créera avec toutes ses valeurs
    } finally {
      await qr.release();
    }

    await tenantDs.synchronize();
  }

  async runSqlOnAllTenants(sql: string[]): Promise<{ structureId: number; database: string; status: string }[]> {
    const configs = await this.configRepo.find({ where: { isActive: true } });
    const results: { structureId: number; database: string; status: string }[] = [];
    for (const config of configs) {
      try {
        const ds = await this.getDataSource(config.structureId);
        for (const query of sql) {
          await ds.query(query);
        }
        results.push({ structureId: config.structureId, database: config.database, status: 'ok' });
      } catch (e: any) {
        results.push({ structureId: config.structureId, database: config.database, status: `erreur: ${e.message}` });
      }
    }
    return results;
  }

  async reseedAll(): Promise<{ structureId: number; status: string }[]> {
    const configs = await this.configRepo.find({ where: { isActive: true } });
    const results: { structureId: number; status: string }[] = [];
    for (const config of configs) {
      try {
        await this.reseedTenant(config.structureId);
        results.push({ structureId: config.structureId, status: 'ok' });
      } catch (e: any) {
        results.push({ structureId: config.structureId, status: `erreur: ${e.message}` });
      }
    }
    return results;
  }

  async getConfig(structureId: number): Promise<TenantConfig | null> {
    return this.configRepo.findOne({ where: { structureId } });
  }

  async findAll(): Promise<TenantConfig[]> {
    return this.configRepo.find({ order: { structureId: 'ASC' } });
  }

  /** Liste toutes les DBs tenant enrichies avec les infos de la structure (master DB).
   *  Le mot de passe DB est masqué dans la réponse. */
  async findAllWithStructure(): Promise<any[]> {
    const configs = await this.configRepo.find({ order: { structureId: 'ASC' } });
    const structures = await this.masterDs.getRepository(Structure).find();
    const structureMap = new Map(structures.map(s => [s.id, s]));

    return configs.map(({ password: _pwd, ...config }) => ({
      ...config,
      structure: structureMap.get(config.structureId) ?? null,
    }));
  }

  /** Retourne la liste des tables d'un tenant (schéma public uniquement). */
  async getTables(structureId: number): Promise<string[]> {
    const ds = await this.getDataSource(structureId);
    const rows: { table_name: string }[] = await ds.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name`,
    );
    return rows.map(r => r.table_name);
  }

  /** Retourne le contenu paginé d'une table tenant.
   *  Le nom de table est validé contre information_schema pour éviter toute injection SQL. */
  async getTableContent(
    structureId: number,
    tableName: string,
    page = 1,
    limit = 20,
  ): Promise<any> {
    const validTables = await this.getTables(structureId);
    if (!validTables.includes(tableName)) {
      throw new NotFoundException(`Table '${tableName}' introuvable dans cette base`);
    }

    const ds = await this.getDataSource(structureId);
    const offset = (page - 1) * limit;

    const [rows, countResult] = await Promise.all([
      ds.query(`SELECT * FROM "${tableName}" ORDER BY id DESC LIMIT $1 OFFSET $2`, [limit, offset]),
      ds.query(`SELECT COUNT(*)::int AS total FROM "${tableName}"`),
    ]);

    // Masquer les mots de passe si la table contient un champ r_mot_de_passe
    const safeRows = rows.map((row: any) => {
      const { r_mot_de_passe, mot_de_passe, ...rest } = row;
      return rest;
    });

    return {
      table: tableName,
      total: countResult[0]?.total ?? 0,
      page,
      limit,
      total_pages: Math.ceil((countResult[0]?.total ?? 0) / limit),
      rows: safeRows,
    };
  }

  async destroyConnection(structureId: number): Promise<void> {
    const ds = this.pool.get(structureId);
    if (ds?.isInitialized) await ds.destroy();
    this.pool.delete(structureId);
  }

  async getStorageStats(): Promise<{ structureId: number; database: string; base_de_donnees: string; fichiers: Record<string, string>; total_fichiers: string }[]> {
    const configs = await this.configRepo.find({ where: { isActive: true } });
    const tenantsRoot = path.join(process.cwd(), 'public', 'tenants');

    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      const units = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
    };

    const dirSize = (dirPath: string): number => {
      if (!fs.existsSync(dirPath)) return 0;
      let total = 0;
      for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
        const full = path.join(dirPath, entry.name);
        total += entry.isDirectory() ? dirSize(full) : fs.statSync(full).size;
      }
      return total;
    };

    const results: { structureId: number; database: string; base_de_donnees: string; fichiers: Record<string, string>; total_fichiers: string }[] = [];
    for (const config of configs) {
      // Taille des fichiers par dossier
      const tenantDir = path.join(tenantsRoot, String(config.structureId));
      const subDirs = ['produits', 'logos', 'pdfs'];
      const fichiers: Record<string, string> = {};
      let totalFichiersBytes = 0;
      for (const sub of subDirs) {
        const bytes = dirSize(path.join(tenantDir, sub));
        totalFichiersBytes += bytes;
        fichiers[sub] = formatBytes(bytes);
      }

      // Taille de la base de données PostgreSQL
      let base_de_donnees = 'N/A';
      try {
        const ds = await this.getDataSource(config.structureId);
        const [row] = await ds.query(`SELECT pg_size_pretty(pg_database_size(current_database())) AS taille`);
        base_de_donnees = row?.taille ?? 'N/A';
      } catch { /* ignore */ }

      results.push({
        structureId: config.structureId,
        database: config.database,
        base_de_donnees,
        fichiers,
        total_fichiers: formatBytes(totalFichiersBytes),
      });
    }
    return results;
  }

  private async createDatabaseIfNotExists(dto: CreateTenantDto): Promise<void> {
    const adminDs = new DataSource({
      type: 'postgres',
      host: dto.host ?? 'localhost',
      port: dto.port ?? 5432,
      username: dto.username,
      password: dto.password,
      database: 'postgres',
    });
    try {
      await adminDs.initialize();
      const result = await adminDs.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dto.database]);
      if (!result.length) {
        await adminDs.query(`CREATE DATABASE "${dto.database}"`);
      }
    } finally {
      if (adminDs.isInitialized) await adminDs.destroy();
    }
  }
}
