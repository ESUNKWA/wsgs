import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateAuthenticationDto } from './dto/create-authentication.dto';
import { UtilisateursService } from '../utilisateurs/utilisateurs.service';
import * as bcrypt from 'bcrypt';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { TenantService } from 'src/tenant/tenant.service';
import { Boutique } from 'src/gestion-boutiques/boutique/entities/boutique.entity';
import { Utilisateur } from '../utilisateurs/entities/utilisateur.entity';
import { AbonnementService } from 'src/abonnement/abonnement.service';
import { ModuleStructureService } from 'src/modules/module-structure.service';

@Injectable()
export class AuthenticationService {

  constructor(
    private utulisateurService: UtilisateursService,
    private jwtService: JwtService,
    private readonly tenantService: TenantService,
    private readonly abonnementService: AbonnementService,
    private readonly moduleService: ModuleStructureService,
  ) {}

  async login(createAuthenticationDto: CreateAuthenticationDto): Promise<any> {

    // 1. Authentification sur la BD master (vérification des credentials)
    const masterUser: any = await this.utulisateurService.signin(createAuthenticationDto.telephone);

    if (!masterUser || !(await bcrypt.compare(createAuthenticationDto.mot_de_passe, masterUser.mot_de_passe))) {
      throw new NotFoundException('Identifiant ou mot de passe incorrect');
    }

    const structureId: number | null =
      masterUser.structure_id ??
      masterUser.structure?.[0]?.id ??
      null;

    const profilCode: string = masterUser.profil?.code ?? '';
    const isSuperAdmin = profilCode === 'super_admin';
    const isManager    = ['admin', 'responsable_structure'].includes(profilCode);

    // 2. super_admin : accès plateforme global, aucune structure requise
    if (isSuperAdmin) {
      const utilisateur: any = { ...masterUser };
      delete utilisateur.mot_de_passe;

      const payload = {
        userId: masterUser.id,
        telephone: masterUser.telephone,
        email: masterUser.email,
        profil: profilCode,
        structureId: null,
        is_super_admin: true,
      };

      const access_token = this.jwtService.sign(payload, {
        secret: process.env.JWT_SECRET || 'secret',
        expiresIn: process.env.JWT_TOKEN_EXPIRE || '1h',
      } as JwtSignOptions);

      return { utilisateur, access_token };
    }

    // 3. Récupérer boutique_id, boutiques et l'id tenant de l'utilisateur
    let boutique_id: number | null = masterUser.boutique_id ?? null;
    let boutique: any = null;
    let boutiques: any[] = [];
    // id à retourner au front = id dans la DB tenant (≠ id master pour éviter la collision)
    let tenantUserId: number = masterUser.id;

    if (structureId) {
      try {
        const tenantDs = await this.tenantService.getDataSource(structureId);

        // Résolution de l'id tenant par téléphone
        const tenantUser = await tenantDs
          .getRepository(Utilisateur)
          .findOne({ where: { telephone: masterUser.telephone } });
        if (tenantUser) tenantUserId = tenantUser.id;

        if (isManager) {
          const all = await tenantDs.getRepository(Boutique).find({ order: { nom: 'ASC' } });
          boutiques = all.map((b) => ({
            ...b,
            logo: b.logo ? `${process.env.BASE_URL}/${b.logo}` : null,
          }));
        } else {
          if (boutique_id) {
            const b = await tenantDs.getRepository(Boutique).findOne({ where: { id: boutique_id } });
            if (b) {
              boutique = { ...b, logo: b.logo ? `${process.env.BASE_URL}/${b.logo}` : null };
            }
          }
        }
      } catch (err: any) {
        console.error('[Auth] Tenant fetch error:', err?.message);
      }
    }

    // On remplace l'id master par l'id tenant : le front utilisera cet id pour les appels API tenant
    const utilisateur: any = { ...masterUser, id: tenantUserId, boutique_id };
    delete utilisateur.mot_de_passe;

    // JWT : userId reste l'id master (usage interne), telephone permet la résolution cross-DB
    const payload = {
      userId: masterUser.id,
      telephone: masterUser.telephone,
      email: masterUser.email,
      profil: profilCode,
      structureId,
    };

    const access_token = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'secret',
      expiresIn: process.env.JWT_TOKEN_EXPIRE || '1h',
    } as JwtSignOptions);

    // Infos abonnement pour que le front affiche le statut / jours restants
    const abonnement = structureId
      ? await this.abonnementService.getAbonnement(structureId).catch(() => null)
      : null;

    // Modules actifs pour la structure
    const modules = structureId
      ? await this.moduleService.getActiveModules(structureId).catch(() => [])
      : [];

    return {
      utilisateur: isManager
        ? { ...utilisateur, boutiques }
        : { ...utilisateur, boutique },
      access_token,
      abonnement,
      modules,
    };
  }

  validateToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Token expiré ou invalide');
    }
  }

  
}
