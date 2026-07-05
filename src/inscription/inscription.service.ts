import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DemandeInscription } from './entities/demande-inscription.entity';
import { SoumettreInscriptionDto } from './dto/soumettre-inscription.dto';
import { ValiderInscriptionDto } from './dto/valider-inscription.dto';
import { TenantService } from 'src/tenant/tenant.service';
import { Structure } from 'src/gestion-boutiques/structure/entities/structure.entity';
import { Boutique } from 'src/gestion-boutiques/boutique/entities/boutique.entity';

@Injectable()
export class InscriptionService {
  constructor(
    @InjectRepository(DemandeInscription)
    private readonly demandeRepo: Repository<DemandeInscription>,

    @InjectDataSource()
    private readonly masterDs: DataSource,

    private readonly tenantService: TenantService,
  ) {}

  // ── Soumission publique ────────────────────────────────────────────────────

  async soumettre(dto: SoumettreInscriptionDto): Promise<{ message: string }> {
    // Vérifier doublon sur le téléphone du responsable
    const existing = await this.demandeRepo.findOne({
      where: { responsable_telephone: dto.responsable_telephone, statut: 'en_attente' },
    });
    if (existing) {
      throw new ConflictException('Une demande est déjà en cours pour ce numéro de téléphone.');
    }

    const demande = this.demandeRepo.create({
      structure_nom:          dto.structure_nom,
      structure_telephone:    dto.structure_telephone,
      structure_email:        dto.structure_email ?? null,
      structure_situation_geo: dto.structure_situation_geo ?? null,
      boutique_nom:           dto.boutique_nom,
      boutique_situation_geo: dto.boutique_situation_geo ?? null,
      responsable_nom:        dto.responsable_nom,
      responsable_prenoms:    dto.responsable_prenoms ?? null,
      responsable_telephone:  dto.responsable_telephone,
      responsable_email:      dto.responsable_email ?? null,
      responsable_password:   dto.responsable_password,
      statut:                 'en_attente',
      structure_id:           null,
      validated_at:           null,
      notes:                  null,
    });

    await this.demandeRepo.save(demande);

    return {
      message: 'Votre demande a bien été enregistrée. Elle sera validée dans 1h maximum. Vous pourrez ensuite vous connecter avec votre numéro de téléphone.',
    };
  }

  // ── Lecture (super_admin) ─────────────────────────────────────────────────

  async findAll(statut?: string): Promise<DemandeInscription[]> {
    const where = statut ? { statut: statut as any } : {};
    return this.demandeRepo.find({ where, order: { created_at: 'DESC' } });
  }

  async findOne(id: number): Promise<DemandeInscription> {
    const demande = await this.demandeRepo.findOne({ where: { id } });
    if (!demande) throw new NotFoundException('Demande introuvable');
    return demande;
  }

  // ── Validation (super_admin) ───────────────────────────────────────────────

  async valider(id: number, dbDto: ValiderInscriptionDto): Promise<any> {
    const demande = await this.demandeRepo.findOne({ where: { id, statut: 'en_attente' } });
    if (!demande) throw new NotFoundException('Demande introuvable ou déjà traitée');

    const structureRepo = this.masterDs.getRepository(Structure);
    let structure: Structure | null = null;
    let tenantProvisioned = false;

    // Nettoyer toute structure orpheline d'une tentative précédente
    // (la demande est encore en_attente donc rien n'est "validé" → on peut tout purger)
    const orphan = await structureRepo.findOne({ where: { nom: demande.structure_nom } });
    if (orphan) {
      await this.masterDs.query(
        `DELETE FROM t_tenant_configs WHERE "structureId" = $1`, [orphan.id],
      ).catch(() => {});
      await this.tenantService.destroyConnection(orphan.id).catch(() => {});
      await structureRepo.delete(orphan.id).catch(() => {});
    }

    // ── Étape 1 : Structure ───────────────────────────────────────────────
    try {
      structure = await structureRepo.save(
        structureRepo.create({
          nom:           demande.structure_nom,
          telephone:     demande.structure_telephone,
          email:         demande.structure_email ?? undefined,
          situation_geo: demande.structure_situation_geo ?? undefined,
        }),
      );
    } catch (e: any) {
      throw new InternalServerErrorException(`Étape 1 — création structure : ${e.message}`);
    }

    // ── Étape 2 : Provisionnement tenant (DDL — non transactionnable) ─────
    try {
      await this.tenantService.provision({
        structureId:    structure.id,
        host:           dbDto.host,
        port:           dbDto.port,
        username:       dbDto.username,
        password:       dbDto.password,
        database:       dbDto.database,
        adminNom:       demande.responsable_nom,
        adminPrenoms:   demande.responsable_prenoms ?? undefined,
        adminTelephone: demande.responsable_telephone,
        adminEmail:     demande.responsable_email ?? undefined,
        adminPassword:  demande.responsable_password,
      });
      tenantProvisioned = true;
    } catch (e: any) {
      // Rollback étape 1
      await structureRepo.delete(structure.id).catch(() => {});
      throw new InternalServerErrorException(`Étape 2 — provisionnement tenant : ${e.message}`);
    }

    // ── Étape 3 : Boutique dans le tenant DB ──────────────────────────────
    let boutique: any;
    try {
      const tenantDs = await this.tenantService.getDataSource(structure.id);
      const boutiqueRepo = tenantDs.getRepository(Boutique);
      boutique = await boutiqueRepo.save(
        boutiqueRepo.create({
          nom:           demande.boutique_nom,
          telephone:     demande.structure_telephone,
          email:         demande.structure_email ?? undefined,
          situation_geo: demande.boutique_situation_geo ?? undefined,
          structure_id:  structure.id,
          is_active:     true,
        } as any),
      );
    } catch (e: any) {
      // Rollback étapes 1 + 2 (TenantConfig + Structure dans master DB)
      await this.masterDs.query(
        `DELETE FROM t_tenant_configs WHERE "structureId" = $1`, [structure.id],
      ).catch(() => {});
      await structureRepo.delete(structure.id).catch(() => {});
      await this.tenantService.destroyConnection(structure.id).catch(() => {});
      throw new InternalServerErrorException(`Étape 3 — création boutique : ${e.message}`);
    }

    // ── Étape 4 : Marquer la demande validée ─────────────────────────────
    try {
      demande.statut       = 'validee';
      demande.structure_id = structure.id;
      demande.validated_at = new Date();
      await this.demandeRepo.save(demande);
    } catch (e: any) {
      // Tout est créé mais on n'a pas pu marquer → logguer sans bloquer
      console.error(`[Inscription] Avertissement : demande ${id} non marquée comme validée`, e.message);
    }

    return {
      message:   'Inscription validée avec succès',
      structure,
      boutique,
    };
  }

  // ── Rejet (super_admin) ───────────────────────────────────────────────────

  async rejeter(id: number, notes?: string): Promise<{ message: string }> {
    const demande = await this.demandeRepo.findOne({ where: { id, statut: 'en_attente' } });
    if (!demande) throw new NotFoundException('Demande introuvable ou déjà traitée');

    demande.statut = 'rejetee';
    demande.notes  = notes ?? null;
    await this.demandeRepo.save(demande);

    return { message: 'Demande rejetée' };
  }
}
