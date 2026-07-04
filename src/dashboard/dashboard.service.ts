import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateDashboardDto } from './dto/create-dashboard.dto';
import { UpdateDashboardDto } from './dto/update-dashboard.dto';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { Utilisateur } from 'src/gestion-utilisateurs/utilisateurs/entities/utilisateur.entity';

@Injectable()
export class DashboardService {

  constructor(private readonly tenantContext: TenantContextService) {}

  private get dataSource() { return this.tenantContext.getDataSource(); }

  async getDashboardStats(boutiqueId: number) {
    const query = `
      SELECT json_build_object(

        -- ── Ventes par mois (année courante) ──────────────────────────────
        'vente_par_mois', (
          SELECT array_to_json(array_agg(row_to_json(t)))
          FROM (
            SELECT
              CASE EXTRACT(MONTH FROM tv.created_at)::int
                WHEN 1 THEN 'Janvier'   WHEN 2  THEN 'Février'   WHEN 3  THEN 'Mars'
                WHEN 4 THEN 'Avril'     WHEN 5  THEN 'Mai'       WHEN 6  THEN 'Juin'
                WHEN 7 THEN 'Juillet'   WHEN 8  THEN 'Août'      WHEN 9  THEN 'Septembre'
                WHEN 10 THEN 'Octobre'  WHEN 11 THEN 'Novembre'  WHEN 12 THEN 'Décembre'
              END AS mois,
              EXTRACT(MONTH FROM tv.created_at)::int AS mois_num,
              COALESCE(SUM(COALESCE(NULLIF(tv.r_montant_total_apres_remise, 0), tv.r_montant_total)), 0) AS montant
            FROM t_ventes tv
            WHERE EXTRACT(YEAR FROM tv.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
              AND tv."boutiqueId" = $1
              AND tv.deleted_at IS NULL
            GROUP BY EXTRACT(MONTH FROM tv.created_at)
            ORDER BY EXTRACT(MONTH FROM tv.created_at)
          ) AS t
        ),

        -- ── Produits ──────────────────────────────────────────────────────
        'produit', (
          SELECT json_build_object(
            'total_produits', (
              SELECT COUNT(id) FROM t_produits
              WHERE "boutiqueId" = $1 AND deleted_at IS NULL
            ),
            'valeur_stock', (
              SELECT COALESCE(SUM(r_stock_disponible * r_prix_achat), 0)
              FROM t_produits WHERE "boutiqueId" = $1 AND deleted_at IS NULL
            ),
            'stock_alert', (
              SELECT json_agg(json_build_object(
                'path', tp.r_image, 'nom', tp.r_nom,
                'stock_disponible', tp.r_stock_disponible, 'seuil_alert', tp.r_seuil_alert
              ))
              FROM t_produits tp
              WHERE tp.r_stock_disponible > 0
                AND tp.r_stock_disponible <= tp.r_seuil_alert
                AND tp."boutiqueId" = $1 AND tp.deleted_at IS NULL
            ),
            'stock_rupture', (
              SELECT json_agg(json_build_object(
                'path', tp.r_image, 'nom', tp.r_nom,
                'stock_disponible', tp.r_stock_disponible, 'seuil_alert', tp.r_seuil_alert
              ))
              FROM t_produits tp
              WHERE tp.r_stock_disponible = 0
                AND tp."boutiqueId" = $1 AND tp.deleted_at IS NULL
            ),
            'jamais_vendu', (
              SELECT json_agg(json_build_object(
                'nom', tp.r_nom, 'image', tp.r_image,
                'stock_disponible', tp.r_stock_disponible
              ))
              FROM t_produits tp
              WHERE tp."boutiqueId" = $1
                AND tp.created_at <= CURRENT_DATE - INTERVAL '1 month'
                AND tp.deleted_at IS NULL
                AND NOT EXISTS (SELECT 1 FROM t_detail_ventes tdv WHERE tdv."produitId" = tp.id)
            )
          )
        ),

        -- ── KPIs Ventes ───────────────────────────────────────────────────
        'vente', (
          SELECT json_build_object(
            'nbre_vente_jr', (
              SELECT COUNT(id) FROM t_ventes
              WHERE DATE(created_at) = CURRENT_DATE AND "boutiqueId" = $1 AND deleted_at IS NULL
            ),
            'total_vente_jr', (
              SELECT COALESCE(SUM(COALESCE(NULLIF(r_montant_total_apres_remise, 0), r_montant_total)), 0)
              FROM t_ventes
              WHERE DATE(created_at) = CURRENT_DATE AND "boutiqueId" = $1 AND deleted_at IS NULL
            ),
            'total_vente_hier', (
              SELECT COALESCE(SUM(COALESCE(NULLIF(r_montant_total_apres_remise, 0), r_montant_total)), 0)
              FROM t_ventes
              WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
                AND created_at < CURRENT_DATE AND "boutiqueId" = $1 AND deleted_at IS NULL
            ),
            'total_vente_semaine', (
              SELECT COALESCE(SUM(COALESCE(NULLIF(r_montant_total_apres_remise, 0), r_montant_total)), 0)
              FROM t_ventes
              WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)
                AND "boutiqueId" = $1 AND deleted_at IS NULL
            ),
            'total_vente_mois', (
              SELECT COALESCE(SUM(COALESCE(NULLIF(r_montant_total_apres_remise, 0), r_montant_total)), 0)
              FROM t_ventes
              WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
                AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
                AND "boutiqueId" = $1 AND deleted_at IS NULL
            ),
            'total_vente_mois_passe', (
              SELECT COALESCE(SUM(COALESCE(NULLIF(r_montant_total_apres_remise, 0), r_montant_total)), 0)
              FROM t_ventes
              WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')
                AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month')
                AND "boutiqueId" = $1 AND deleted_at IS NULL
            ),
            'total_vente_annee', (
              SELECT COALESCE(SUM(COALESCE(NULLIF(r_montant_total_apres_remise, 0), r_montant_total)), 0)
              FROM t_ventes
              WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
                AND "boutiqueId" = $1 AND deleted_at IS NULL
            ),
            'mode_paiement_jr', (
              SELECT COALESCE(json_object_agg(COALESCE(mode, 'non_renseigne'), montant), '{}'::json)
              FROM (
                SELECT
                  r_mode_paiement::text AS mode,
                  COALESCE(SUM(COALESCE(NULLIF(r_montant_total_apres_remise, 0), r_montant_total)), 0) AS montant
                FROM t_ventes
                WHERE DATE(created_at) = CURRENT_DATE AND "boutiqueId" = $1 AND deleted_at IS NULL
                GROUP BY r_mode_paiement::text
              ) mp
            ),
            'top_dix', (
              SELECT json_agg(prod ORDER BY prod.quantite_vendu DESC)
              FROM (
                SELECT tp.r_nom AS nom, tp.r_image AS image,
                  SUM(tdv.r_quantite) AS quantite_vendu,
                  SUM(tdv.r_quantite * tdv.r_prix_unitaire_vente) AS montant_total
                FROM t_produits tp
                INNER JOIN t_detail_ventes tdv ON tp.id = tdv."produitId"
                INNER JOIN t_ventes tv ON tv.id = tdv."venteId"
                WHERE EXTRACT(MONTH FROM tv.created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
                  AND EXTRACT(YEAR FROM tv.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
                  AND tv."boutiqueId" = $1 AND tv.deleted_at IS NULL
                GROUP BY tp.r_nom, tp.r_image
                ORDER BY quantite_vendu DESC
                LIMIT 10
              ) prod
            ),
            'dix_moins_vendu', (
              SELECT json_agg(prod ORDER BY prod.quantite_vendue ASC)
              FROM (
                SELECT tp.r_nom AS nom, tp.r_image AS image,
                  COALESCE(SUM(tdv.r_quantite), 0) AS quantite_vendue,
                  COALESCE(SUM(tdv.r_quantite * tdv.r_prix_unitaire_vente), 0) AS montant_total
                FROM t_produits tp
                LEFT JOIN t_detail_ventes tdv ON tp.id = tdv."produitId"
                LEFT JOIN t_ventes tv
                  ON tv.id = tdv."venteId"
                  AND EXTRACT(MONTH FROM tv.created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
                  AND EXTRACT(YEAR FROM tv.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
                  AND tv.deleted_at IS NULL
                WHERE tp."boutiqueId" = $1 AND tp.deleted_at IS NULL
                GROUP BY tp.r_nom, tp.r_image
                ORDER BY quantite_vendue ASC
                LIMIT 10
              ) prod
            )
          )
        ),

        -- ── Achats ────────────────────────────────────────────────────────
        'achat', (
          SELECT json_build_object(
            'nbre_achat_jr', (
              SELECT COUNT(id) FROM t_achats
              WHERE DATE(created_at) = CURRENT_DATE AND "boutiqueId" = $1 AND deleted_at IS NULL
            ),
            'total_achat_jr', (
              SELECT COALESCE(SUM(r_montant_total), 0) FROM t_achats
              WHERE DATE(created_at) = CURRENT_DATE AND "boutiqueId" = $1 AND deleted_at IS NULL
            ),
            'total_achat_mois', (
              SELECT COALESCE(SUM(r_montant_total), 0) FROM t_achats
              WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
                AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
                AND "boutiqueId" = $1 AND deleted_at IS NULL
            ),
            'total_achat_annee', (
              SELECT COALESCE(SUM(r_montant_total), 0) FROM t_achats
              WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
                AND "boutiqueId" = $1 AND deleted_at IS NULL
            )
          )
        ),

        -- ── Retours ───────────────────────────────────────────────────────
        'retour', (
          SELECT json_build_object(
            'nbre_retour_jr', (
              SELECT COUNT(id) FROM t_retours_vente
              WHERE DATE(created_at) = CURRENT_DATE AND "boutiqueId" = $1 AND r_statut != 'annule'
            ),
            'montant_retour_jr', (
              SELECT COALESCE(SUM(r_montant_total_rembourse), 0) FROM t_retours_vente
              WHERE DATE(created_at) = CURRENT_DATE AND "boutiqueId" = $1 AND r_statut != 'annule'
            ),
            'nbre_retour_mois', (
              SELECT COUNT(id) FROM t_retours_vente
              WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
                AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
                AND "boutiqueId" = $1 AND r_statut != 'annule'
            ),
            'montant_retour_mois', (
              SELECT COALESCE(SUM(r_montant_total_rembourse), 0) FROM t_retours_vente
              WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
                AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
                AND "boutiqueId" = $1 AND r_statut != 'annule'
            )
          )
        ),

        -- ── Commandes client ──────────────────────────────────────────────
        'commandes_client', (
          SELECT json_build_object(
            'prevues_aujourd_hui', (
              SELECT COUNT(id) FROM t_commandes_client
              WHERE DATE(r_date_livraison_prevue) = CURRENT_DATE
                AND "boutiqueId" = $1 AND r_statut NOT IN ('livre', 'annule') AND deleted_at IS NULL
            ),
            'montant_prevues_aujourd_hui', (
              SELECT COALESCE(SUM(COALESCE(NULLIF(r_montant_total_apres_remise, 0), r_montant_total)), 0)
              FROM t_commandes_client
              WHERE DATE(r_date_livraison_prevue) = CURRENT_DATE
                AND "boutiqueId" = $1 AND r_statut NOT IN ('livre', 'annule') AND deleted_at IS NULL
            ),
            'total_en_attente', (
              SELECT COUNT(id) FROM t_commandes_client
              WHERE r_statut IN ('en_attente', 'confirme', 'en_preparation')
                AND "boutiqueId" = $1 AND deleted_at IS NULL
            ),
            'liste_prevues_aujourd_hui', (
              SELECT json_agg(json_build_object(
                'id', cc.id,
                'reference', cc.r_reference,
                'statut', cc.r_statut,
                'montant', COALESCE(NULLIF(cc.r_montant_total_apres_remise, 0), cc.r_montant_total),
                'client', c.r_nom,
                'telephone_client', c.r_telephone
              ))
              FROM t_commandes_client cc
              LEFT JOIN t_clients c ON c.id = cc."clientId"
              WHERE DATE(cc.r_date_livraison_prevue) = CURRENT_DATE
                AND cc."boutiqueId" = $1
                AND cc.r_statut NOT IN ('livre', 'annule') AND cc.deleted_at IS NULL
            )
          )
        ),

        -- ── Commandes fournisseur ─────────────────────────────────────────
        'commandes_fournisseur', (
          SELECT json_build_object(
            'prevues_aujourd_hui', (
              SELECT COUNT(id) FROM t_commandes_fournisseur
              WHERE DATE(r_date_livraison_prevue) = CURRENT_DATE
                AND r_statut NOT IN ('recu_total', 'annule') AND "boutiqueId" = $1 AND deleted_at IS NULL
            ),
            'total_en_attente', (
              SELECT COUNT(id) FROM t_commandes_fournisseur
              WHERE r_statut IN ('envoye', 'recu_partiel')
                AND "boutiqueId" = $1 AND deleted_at IS NULL
            ),
            'liste_en_attente', (
              SELECT json_agg(json_build_object(
                'id', cf.id,
                'reference', cf.r_reference,
                'statut', cf.r_statut,
                'montant', cf.r_montant_total,
                'fournisseur', f.r_nom,
                'date_livraison_prevue', cf.r_date_livraison_prevue
              ))
              FROM t_commandes_fournisseur cf
              LEFT JOIN t_fournisseurs f ON f.id = cf."fournisseurId"
              WHERE cf.r_statut IN ('envoye', 'recu_partiel')
                AND cf."boutiqueId" = $1 AND cf.deleted_at IS NULL
              LIMIT 10
            )
          )
        ),

        -- ── Bénéfice estimé (CA - coût d'achat des produits vendus) ───────
        'benefice_estime', (
          SELECT json_build_object(
            'jr', (
              SELECT COALESCE(SUM((tdv.r_prix_unitaire_vente - p.r_prix_achat) * tdv.r_quantite), 0)
              FROM t_detail_ventes tdv
              JOIN t_produits p ON p.id = tdv."produitId"
              JOIN t_ventes tv ON tv.id = tdv."venteId"
              WHERE DATE(tv.created_at) = CURRENT_DATE
                AND tv."boutiqueId" = $1 AND tv.deleted_at IS NULL
            ),
            'mois', (
              SELECT COALESCE(SUM((tdv.r_prix_unitaire_vente - p.r_prix_achat) * tdv.r_quantite), 0)
              FROM t_detail_ventes tdv
              JOIN t_produits p ON p.id = tdv."produitId"
              JOIN t_ventes tv ON tv.id = tdv."venteId"
              WHERE EXTRACT(MONTH FROM tv.created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
                AND EXTRACT(YEAR FROM tv.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
                AND tv."boutiqueId" = $1 AND tv.deleted_at IS NULL
            ),
            'annee', (
              SELECT COALESCE(SUM((tdv.r_prix_unitaire_vente - p.r_prix_achat) * tdv.r_quantite), 0)
              FROM t_detail_ventes tdv
              JOIN t_produits p ON p.id = tdv."produitId"
              JOIN t_ventes tv ON tv.id = tdv."venteId"
              WHERE EXTRACT(YEAR FROM tv.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
                AND tv."boutiqueId" = $1 AND tv.deleted_at IS NULL
            )
          )
        ),

        -- ── Clients ───────────────────────────────────────────────────────
        'clients', (
          SELECT json_build_object(
            'total_uniques', (
              SELECT COUNT(DISTINCT "clientId") FROM t_ventes
              WHERE "boutiqueId" = $1 AND "clientId" IS NOT NULL AND deleted_at IS NULL
            ),
            'nouveaux_ce_mois', (
              SELECT COUNT(DISTINCT v."clientId")
              FROM t_ventes v
              WHERE v."boutiqueId" = $1 AND v."clientId" IS NOT NULL AND v.deleted_at IS NULL
                AND EXTRACT(MONTH FROM v.created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
                AND EXTRACT(YEAR FROM v.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
                AND v."clientId" NOT IN (
                  SELECT DISTINCT "clientId" FROM t_ventes
                  WHERE "boutiqueId" = $1 AND "clientId" IS NOT NULL AND deleted_at IS NULL
                    AND created_at < DATE_TRUNC('month', CURRENT_DATE)
                )
            )
          )
        )

      ) AS dash
    `;

    const result = await this.dataSource.query(query, [boutiqueId]);
    return result[0];
  }

  async getDashboardCaissier(boutiqueId: number, caissierVal: string | number) {
    const ds = this.dataSource;

    const asStr = String(caissierVal).trim();
    const asId  = parseInt(asStr, 10);
    let caissier: Utilisateur | null = null;
    if (!isNaN(asId)) caissier = await ds.getRepository(Utilisateur).findOne({ where: { id: asId } });
    if (!caissier)    caissier = await ds.getRepository(Utilisateur).findOne({ where: { telephone: asStr } });
    if (!caissier) throw new NotFoundException('Caissier introuvable');

    const params = [boutiqueId, caissier.id];

    const [summary] = await ds.query(
      `SELECT
         COUNT(*)::int                                                                          AS nb_ventes,
         COALESCE(SUM(COALESCE(NULLIF(r_montant_total_apres_remise, 0), r_montant_total)), 0)::float AS chiffre_affaires
       FROM t_ventes
       WHERE "boutiqueId" = $1
         AND "userId"     = $2
         AND DATE(created_at) = CURRENT_DATE
         AND deleted_at IS NULL`,
      params,
    );

    const modesRows: { mode: string; total: number }[] = await ds.query(
      `SELECT
         r_mode_paiement                                                                              AS mode,
         COALESCE(SUM(COALESCE(NULLIF(r_montant_total_apres_remise, 0), r_montant_total)), 0)::float AS total
       FROM t_ventes
       WHERE "boutiqueId" = $1
         AND "userId"     = $2
         AND DATE(created_at) = CURRENT_DATE
         AND deleted_at IS NULL
       GROUP BY r_mode_paiement`,
      params,
    );
    const par_mode_paiement = Object.fromEntries(modesRows.map(r => [r.mode, r.total]));

    const produits: {
      produit_id: number;
      nom: string;
      prix_unitaire: number;
      quantite_vendue: number;
      montant_total: number;
    }[] = await ds.query(
      `SELECT
         p.id                                                   AS produit_id,
         p.r_nom                                               AS nom,
         p.r_prix_vente::float                                 AS prix_unitaire,
         SUM(dv.r_quantite)::int                               AS quantite_vendue,
         SUM(dv.r_quantite * dv.r_prix_unitaire_vente)::float  AS montant_total
       FROM t_detail_ventes dv
       JOIN t_produits p ON p.id  = dv."produitId"
       JOIN t_ventes   v ON v.id  = dv."venteId"
       WHERE v."boutiqueId" = $1
         AND v."userId"     = $2
         AND DATE(v.created_at) = CURRENT_DATE
         AND v.deleted_at IS NULL
       GROUP BY p.id, p.r_nom, p.r_prix_vente
       ORDER BY quantite_vendue DESC`,
      params,
    );

    return {
      date: new Date().toISOString().slice(0, 10),
      caissier: {
        id: caissier.id,
        nom: caissier.nom,
        prenoms: caissier.prenoms,
        telephone: caissier.telephone,
      },
      nb_ventes: summary.nb_ventes,
      chiffre_affaires: summary.chiffre_affaires,
      par_mode_paiement,
      produits,
    };
  }

  create(createDashboardDto: CreateDashboardDto) {
    return 'This action adds a new dashboard';
  }

  findAll() {
    return 'This action returns all dashboard';
  }

  findOne(id: number) {
    return `This action returns a #${id} dashboard`;
  }

  update(id: number, updateDashboardDto: UpdateDashboardDto) {
    return `This action updates a #${id} dashboard`;
  }

  remove(id: number) {
    return `This action removes a #${id} dashboard`;
  }
}
