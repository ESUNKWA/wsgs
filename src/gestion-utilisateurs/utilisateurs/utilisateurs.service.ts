import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateUtilisateurDto } from './dto/create-utilisateur.dto';
import { UpdateUtilisateurDto } from './dto/update-utilisateur.dto';
import { Utilisateur } from './entities/utilisateur.entity';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { ProfilsService } from '../profils/profils.service';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { TenantService } from 'src/tenant/tenant.service';
import { Profil } from '../profils/entities/profil.entity';
import { Boutique } from 'src/gestion-boutiques/boutique/entities/boutique.entity';

@Injectable()
export class UtilisateursService {

  constructor(
    @InjectRepository(Utilisateur) private utilisateurRepository: Repository<Utilisateur>,
    private profilService: ProfilsService,
    private readonly tenantContext: TenantContextService,
    private readonly tenantService: TenantService,
  ) {}

  private async syncUserToTenant(user: Utilisateur): Promise<void> {
    const structureId = this.tenantContext.hasContext()
      ? this.tenantContext.getStructureId()
      : user.structure_id ?? null;

    if (!structureId) return;

    const tenantDs = this.tenantContext.hasContext()
      ? this.tenantContext.getDataSource()
      : await this.tenantService.getDataSource(structureId);

    const tenantRepo = tenantDs.getRepository(Utilisateur);

    let tenantProfilId: number | null = null;
    const profilCode = (user as any).profil?.code;
    if (profilCode) {
      let tenantProfil = await tenantDs.getRepository(Profil).findOne({ where: { code: profilCode } });
      if (!tenantProfil) {
        // Profil absent du tenant — on l'insère depuis la master DB
        const masterProfil = await this.profilService.findOneByCode(profilCode).catch(() => null);
        if (masterProfil) {
          tenantProfil = await tenantDs.getRepository(Profil).save({
            code: masterProfil.code,
            nom: masterProfil.nom,
            description: masterProfil.description,
          } as Profil);
        }
      }
      tenantProfilId = tenantProfil?.id ?? null;
    }

    const { profil, structure, ...userFlat } = user as any;
    const safeFlat = { ...userFlat, peut_faire_retour: userFlat.peut_faire_retour ?? false };
    const tenantProfil = tenantProfilId ? { id: tenantProfilId } : null;

    const existing = await tenantRepo.findOne({ where: { telephone: user.telephone } });
    if (existing) {
      await tenantRepo.save({ ...existing, ...safeFlat, id: existing.id, profil: tenantProfil ?? existing.profil });
    } else {
      await tenantRepo.save({ ...safeFlat, profil: tenantProfil });
    }
  }

  /** S'assure que l'utilisateur existe dans la DB tenant courante.
   *  Appelle la sync depuis la master DB si nécessaire. */
  async ensureUserInTenant(userId: number): Promise<void> {
    if (!this.tenantContext.hasContext()) return;
    const tenantRepo = this.tenantContext.getDataSource().getRepository(Utilisateur);
    const exists = await tenantRepo.findOne({ where: { id: userId } });
    if (exists) return;

    const masterUser = await this.utilisateurRepository.findOne({ where: { id: userId } });
    if (!masterUser) throw new NotFoundException(`Utilisateur ${userId} introuvable en base`);
    await this.syncUserToTenant(masterUser);
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async create(createUtilisateurDto: CreateUtilisateurDto): Promise<any> {
    try {
      const doublon = await this.utilisateurRepository.findOne({
        where: { telephone: createUtilisateurDto.telephone },
      });
      if (doublon) {
        throw new BadRequestException(
          `Le numéro ${createUtilisateurDto.telephone} est déjà utilisé par un autre compte.`,
        );
      }

      const defaultPwd = process.env.ADMIN_PASSWORD || '12345';
      const rawPassword = createUtilisateurDto.mot_de_passe || defaultPwd;
      const hashPassword = await bcrypt.hash(rawPassword, 10);

      const { boutique, structure, ...rest } = createUtilisateurDto as any;

      const resolvedStructureId =
        structure != null
          ? +(typeof structure === 'object' ? structure.id : structure)
          : rest.structure_id != null
            ? +rest.structure_id
            : null;

      const userData = {
        ...rest,
        mot_de_passe: hashPassword,
        boutique_id:  boutique == null ? null : +(typeof boutique === 'object' ? boutique.id : boutique),
        structure_id: resolvedStructureId,
      };

      const saved = await this.utilisateurRepository.save(userData);
      const reloaded = await this.utilisateurRepository.findOne({ where: { id: saved.id } });
      await this.syncUserToTenant(reloaded!);
      return saved;
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async superAdminExiste(): Promise<boolean> {
    const existing = await this.utilisateurRepository.findOne({ where: { is_admin: true } });
    return !!existing;
  }

  async createAdminUser(createUtilisateurDto: CreateUtilisateurDto) {
    try {
      const existing = await this.utilisateurRepository.findOne({ where: { is_admin: true } });
      if (existing) {
        throw new ConflictException(
          `Super admin déjà créé — ${existing.nom} ${existing.prenoms} (${existing.telephone})`,
        );
      }

      const profil = await this.profilService.findOneByCode('super_admin');
      if (!profil) throw new BadRequestException("Profil 'super_admin' introuvable. Créez-le d'abord.");

      const rawPassword = createUtilisateurDto.mot_de_passe || String(process.env.ADMIN_PASSWORD);
      const hashPassword = await bcrypt.hash(rawPassword, 10);

      const user = this.utilisateurRepository.create({
        nom: createUtilisateurDto.nom,
        prenoms: createUtilisateurDto.prenoms,
        email: createUtilisateurDto.email ?? null,
        telephone: createUtilisateurDto.telephone,
        mot_de_passe: hashPassword,
        profil,
        is_admin: true,
        structure_id: null,
        boutique_id: null,
        must_change_password: false,
      });

      const saved = await this.utilisateurRepository.save(user);
      // Pas de syncUserToTenant : le super_admin vit uniquement dans la DB master
      delete (saved as any).mot_de_passe;
      return saved;

    } catch (error: any) {
      if (error instanceof ConflictException || error instanceof BadRequestException) throw error;
      if (error.code === '23505') throw new ConflictException('Ce téléphone ou cet email existe déjà');
      throw new InternalServerErrorException('Erreur : ' + error.message);
    }
  }

  private async enrichAvecBoutiques(users: Utilisateur[]): Promise<any[]> {
    const ids = [...new Set(users.map(u => u.boutique_id).filter((id): id is number => id != null))];

    let boutiquesMap = new Map<number, Boutique>();
    if (ids.length && this.tenantContext.hasContext()) {
      const boutiques = await this.tenantContext
        .getDataSource()
        .getRepository(Boutique)
        .find({ where: { id: In(ids) } });
      boutiques.forEach(b => boutiquesMap.set(b.id, b));
    }

    return users.map(u => {
      const { mot_de_passe, ...rest } = u as any;
      const boutiqueRaw = u.boutique_id ? boutiquesMap.get(u.boutique_id) ?? null : null;
      const boutiqueInfo = boutiqueRaw
        ? { ...boutiqueRaw, logo: boutiqueRaw.logo ? `${process.env.BASE_URL}/${boutiqueRaw.logo}` : null }
        : null;
      return { ...rest, boutique: boutiqueInfo };
    });
  }

  async findAll(profilCode: string, boutique: string, structureId?: number, telephone?: string): Promise<any[]> {
    let users: Utilisateur[];

    if (profilCode === 'super_admin') {
      
      users = telephone
        ? await this.utilisateurRepository.find({ where: { telephone }, order: { nom: 'ASC' } })
        : await this.utilisateurRepository.find({ order: { nom: 'ASC' } });
       
    } else {
      const repo = this.tenantContext.hasContext()
        ? this.tenantContext.getDataSource().getRepository(Utilisateur)
        : this.utilisateurRepository;

      if (telephone) {
        users = await repo.find({ where: { telephone, structure_id: structureId }, order: { nom: 'ASC' } });
      } else {
        const boutiqueId = boutique ? +boutique : NaN;
        if (!isNaN(boutiqueId)) {
          users = await repo.find({ where: { boutique_id: boutiqueId, structure_id: structureId }, order: { nom: 'ASC' } });
        } else if (['admin', 'responsable_structure'].includes(profilCode) && structureId) {
          users = await repo.find({ where: { structure_id: structureId }, order: { nom: 'ASC' } });
        } else {
          users = await repo.find({ where: { structure_id: structureId }, order: { nom: 'ASC' } });
        }
      }
    }

    return this.enrichAvecBoutiques(users);
  }

  /**
   * Résout l'utilisateur dans la DB master à partir d'un id qui peut être
   * un id tenant (différent de l'id master à cause du super_admin id=1).
   * Stratégie : en contexte tenant, on trouve d'abord par id dans la DB tenant
   * pour récupérer le téléphone, puis on cherche dans la master par téléphone.
   */
  private async resolveMasterUser(tenantOrMasterId: number): Promise<Utilisateur> {
    if (this.tenantContext.hasContext()) {
      const tenantUser = await this.tenantContext
        .getDataSource()
        .getRepository(Utilisateur)
        .findOne({ where: { id: tenantOrMasterId } });
      if (!tenantUser) throw new NotFoundException('Utilisateur inexistant');

      const masterUser = await this.utilisateurRepository.findOne({ where: { telephone: tenantUser.telephone } });
      if (!masterUser) throw new NotFoundException('Utilisateur introuvable en master DB');
      return masterUser;
    }

    const user = await this.utilisateurRepository.findOne({ where: { id: tenantOrMasterId } });
    if (!user) throw new NotFoundException('Utilisateur inexistant');
    return user;
  }

  async findOne(id: number): Promise<Utilisateur> {
    const repo = this.tenantContext.hasContext()
      ? this.tenantContext.getDataSource().getRepository(Utilisateur)
      : this.utilisateurRepository;
    const data = await repo.findOne({ where: { id } });
    if (!data) throw new NotFoundException('Utilisateur inexistant');
    return data;
  }

  async findMasterById(id: number): Promise<Utilisateur> {
    const data = await this.utilisateurRepository.findOne({ where: { id } });
    if (!data) throw new NotFoundException('Utilisateur introuvable');
    return data;
  }

  async updatePassword(masterUserId: number, hashedPassword: string): Promise<void> {
    await this.utilisateurRepository.update(masterUserId, {
      mot_de_passe: hashedPassword,
      must_change_password: false,
    } as any);

    // Sync to tenant DB so must_change_password stays false after next login
    const masterUser = await this.utilisateurRepository.findOne({ where: { id: masterUserId } });
    if (masterUser?.structure_id) {
      const tenantDs = await this.tenantService.getDataSource(masterUser.structure_id);
      const tenantRepo = tenantDs.getRepository(Utilisateur);
      const tenantUser = await tenantRepo.findOne({ where: { telephone: masterUser.telephone } });
      if (tenantUser) {
        await tenantRepo.update(tenantUser.id, {
          mot_de_passe: hashedPassword,
          must_change_password: false,
        } as any);
      }
    }
  }

  async update(id: number, updateUtilisateurDto: UpdateUtilisateurDto): Promise<any> {
    try {
      delete updateUtilisateurDto.mot_de_passe;
      const { boutique, structure, profil, ...rest } = updateUtilisateurDto as any;

      // Résolution via téléphone en contexte tenant pour éviter la collision d'id
      const user = await this.resolveMasterUser(id);

      Object.assign(user, rest);

      if (boutique !== undefined) {
        user.boutique_id = boutique == null ? null : +(typeof boutique === 'object' ? boutique.id : boutique);
      }
      if (structure !== undefined) {
        user.structure_id = structure == null ? null : +(typeof structure === 'object' ? structure.id : structure);
      }
      if (profil !== undefined && profil !== null) {
        const profilId = +(typeof profil === 'object' ? profil.id : profil);
        (user as any).profil = { id: profilId };
      }

      await this.utilisateurRepository.save(user);
      const reloaded = await this.utilisateurRepository.findOne({ where: { id: user.id }, relations: ['profil'] });
      await this.syncUserToTenant(reloaded!);
      const { mot_de_passe, ...result } = reloaded as any;
      return result;
    } catch (error: any) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  async changePassword(id: number, ancienMotDePasse: string, nouveauMotDePasse: string): Promise<void> {
    const utilisateur = await this.resolveMasterUser(id);

    const valid = await bcrypt.compare(ancienMotDePasse, utilisateur.mot_de_passe);
    if (!valid) throw new UnauthorizedException('Ancien mot de passe incorrect');

    const newHash = await bcrypt.hash(nouveauMotDePasse, 10);
    await this.utilisateurRepository.update(utilisateur.id, { mot_de_passe: newHash });
    if (this.tenantContext.hasContext()) {
      const tenantRepo = this.tenantContext.getDataSource().getRepository(Utilisateur);
      const tenantUser = await tenantRepo.findOne({ where: { telephone: utilisateur.telephone } });
      if (tenantUser) await tenantRepo.update(tenantUser.id, { mot_de_passe: newHash });
    }
  }

  async resetPassword(id: number): Promise<void> {
    const masterUser = await this.resolveMasterUser(id);
    const defaultPwd = process.env.ADMIN_PASSWORD || '12345';
    const hash = await bcrypt.hash(defaultPwd, 10);
    await this.utilisateurRepository.update(masterUser.id, { mot_de_passe: hash });
    if (this.tenantContext.hasContext()) {
      const tenantRepo = this.tenantContext.getDataSource().getRepository(Utilisateur);
      const tenantUser = await tenantRepo.findOne({ where: { telephone: masterUser.telephone } });
      if (tenantUser) await tenantRepo.update(tenantUser.id, { mot_de_passe: hash });
    }
  }

  async remove(id: number) {
    if (this.tenantContext.hasContext()) {
      const tenantRepo = this.tenantContext.getDataSource().getRepository(Utilisateur);
      const tenantUser = await tenantRepo.findOne({ where: { id } });
      if (tenantUser?.telephone) {
        const masterUser = await this.utilisateurRepository.findOne({ where: { telephone: tenantUser.telephone } });
        if (masterUser) await this.utilisateurRepository.softDelete(masterUser.id);
      }
      return tenantRepo.softDelete(id);
    }
    return this.utilisateurRepository.softDelete(id);
  }

  async signin(telephone: string): Promise<Utilisateur> {
    try {
      const data = await this.utilisateurRepository.findOne({
        where: { telephone },
        relations: ['structure'],
      });
      if (!data) throw new NotFoundException('Identifiant ou mot de passe incorrect');
      return data;
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
