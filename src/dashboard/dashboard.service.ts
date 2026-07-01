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
          'vente_par_mois', (SELECT array_to_json(array_agg(row_to_json(t)))
            FROM (
                SELECT 
                    CASE EXTRACT(MONTH FROM tv.created_at)::int
                        WHEN 1 THEN 'Janvier'
                        WHEN 2 THEN 'Février'
                        WHEN 3 THEN 'Mars'
                        WHEN 4 THEN 'Avril'
                        WHEN 5 THEN 'Mai'
                        WHEN 6 THEN 'Juin'
                        WHEN 7 THEN 'Juillet'
                        WHEN 8 THEN 'Août'
                        WHEN 9 THEN 'Septembre'
                        WHEN 10 THEN 'Octobre'
                        WHEN 11 THEN 'Novembre'
                        WHEN 12 THEN 'Décembre'
                    END AS mois,
                    SUM(tv.r_montant_total) AS montant
                FROM t_ventes tv
                WHERE EXTRACT(YEAR FROM tv.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
                AND tv."boutiqueId" = $1
                GROUP BY EXTRACT(MONTH FROM tv.created_at)
                ORDER BY EXTRACT(MONTH FROM tv.created_at)
            ) AS t
            ),
          'produit', (
              SELECT json_build_object(
                  'total_stock_dispo', (SELECT SUM(tp.r_prix_achat) 
                                        FROM t_produits tp  
                                        WHERE DATE(tp.created_at) = CURRENT_DATE 
                                          AND tp."boutiqueId" = $1),
                  'stock_alert', (
                      SELECT json_agg(
                                 json_build_object(
                                    'path',tp.r_image,
                                     'nom', tp.r_nom,
                                     'stock_disponible', tp.r_stock_disponible,
                                     'seuil_alert', tp.r_seuil_alert
                                 )
                             )
                      FROM t_produits tp
                      WHERE tp.r_stock_disponible - tp.r_seuil_alert <= 0
                        AND tp."boutiqueId" = $1
                  ),
                  'stock_rupture', (
                      SELECT json_agg(
                                 json_build_object(
                                    'path',tp.r_image,
                                     'nom', tp.r_nom,
                                     'stock_disponible', tp.r_stock_disponible,
                                     'seuil_alert', tp.r_seuil_alert
                                 )
                             )
                      FROM t_produits tp
                      WHERE tp.r_stock_disponible = 0
                        AND tp."boutiqueId" = $1
                  )
              )
          ),
          'vente', (
              SELECT json_build_object(
                  'nbre_vente_jr', (SELECT COUNT(id) 
                                    FROM t_ventes tv 
                                    WHERE DATE(tv.created_at) = CURRENT_DATE 
                                      AND tv."boutiqueId" = $1),
                  'total_vente_jr', (SELECT coalesce(SUM(tv.r_montant_total),0)
                                     FROM t_ventes tv  
                                     WHERE DATE(tv.created_at) = CURRENT_DATE 
                                       AND tv."boutiqueId" = $1),
                   'total_vente_hier', (SELECT COALESCE(SUM(r_montant_total), 0) AS ca_hier
										FROM t_ventes
										WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
										  AND created_at < CURRENT_DATE
													  AND "boutiqueId" = $1),
                  'total_vente_mois', (SELECT coalesce(SUM(tv.r_montant_total),0)
                                       FROM t_ventes tv 
                                       WHERE EXTRACT(MONTH FROM tv.created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
                                         AND EXTRACT(YEAR FROM tv.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
                                         AND tv."boutiqueId" = $1),
                  'total_vente_mois_passe', (SELECT COALESCE(SUM(tv.r_montant_total), 0) AS total_vente_mois_precedent
												FROM t_ventes tv
												WHERE EXTRACT(MONTH FROM tv.created_at) = EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')
												  AND EXTRACT(YEAR FROM tv.created_at) = EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month')
												  AND tv."boutiqueId" = $1
												),			
                  'top_dix', (SELECT json_agg(prod ORDER BY prod.quantite_vendu DESC)
                               FROM (
                                   SELECT
                                       tp.r_nom AS nom,
                                       tp.r_image AS image,
                                       SUM(tdv.r_quantite) AS quantite_vendu,
                                       SUM(tdv.r_prix_unitaire_vente) AS prix_total
                                   FROM t_produits tp
                                   INNER JOIN t_detail_ventes tdv ON tp.id = tdv."produitId"
                                   INNER JOIN t_ventes tv ON tv.id = tdv."venteId"
                                   WHERE EXTRACT(MONTH FROM tv.created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
                                     AND EXTRACT(YEAR FROM tv.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
                                     AND tv."boutiqueId" = $1
                                   GROUP BY tp.r_nom, tp.r_image
                                   ORDER BY quantite_vendu DESC
                                   LIMIT 10
                               ) prod),
                  'dix_moins_vendu', (SELECT json_agg(prod ORDER BY prod.quantite_vendue ASC)
                              FROM (
                                  SELECT
                                      tp.r_nom AS nom,
                                      tp.r_image AS image,
                                      COALESCE(SUM(tdv.r_quantite), 0) AS quantite_vendue,
                                      COALESCE(SUM(tdv.r_prix_unitaire_vente * tdv.r_quantite), 0) AS montant_total
                                  FROM t_produits tp
                                  LEFT JOIN t_detail_ventes tdv ON tp.id = tdv."produitId"
                                  LEFT JOIN t_ventes tv ON tv.id = tdv."venteId"
                                  WHERE EXTRACT(MONTH FROM tv.created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
                                    AND EXTRACT(YEAR FROM tv.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
                                    AND tv."boutiqueId" = $1
                                  GROUP BY tp.r_nom, tp.r_image
                                  ORDER BY quantite_vendue ASC
                                  LIMIT 10
                              ) prod
                  ),
                  'jamais_vendu_un_mois_apres_saisie', (
                      SELECT json_agg(
					  json_build_object(
					    'nom', tp.r_nom,
					    'image', tp.r_image,
					    'stock_disponible', tp.r_stock_disponible
					  )
					)
					FROM t_produits tp
					WHERE tp."boutiqueId" = $1
					  AND tp.created_at <= CURRENT_DATE - INTERVAL '1 month'
					  AND NOT EXISTS (
					    SELECT 1
					    FROM t_detail_ventes tdv
					    WHERE tdv."produitId" = tp.id
					  )
                  ),
                  'vendu_depuis_mois', (
                    SELECT json_agg(
                        json_build_object(
                            'id', sub.id,
                            'nom', sub.r_nom,
                            'image', sub.r_image,
                            'stock_disponible', sub.r_stock_disponible,
                            'date_creation', sub.created_at
                        )
                    )
                    FROM (
                        SELECT tp.id, tp.r_nom, tp.r_image, tp.r_stock_disponible, tp.created_at
                        FROM t_produits tp
                        LEFT JOIN t_detail_ventes tdv ON tdv."produitId" = tp.id
                        LEFT JOIN t_ventes tv
                          ON tv.id = tdv."venteId"
                         AND tv.created_at >= CURRENT_DATE - INTERVAL '1 month'
                        WHERE tp."boutiqueId" = $1
                          AND tp.created_at <= CURRENT_DATE - INTERVAL '1 month'
                        GROUP BY tp.id
                        HAVING COUNT(tv.id) = 0
                    ) sub
                  )
              )
          )
      ) as dash
    `;

    const result = await this.dataSource.query(query, [boutiqueId]);
    return result[0]; // json_build_object renvoie un tableau contenant un objet
  }

  async getDashboardCaissier(boutiqueId: number, caissierVal: string | number) {
    const ds = this.dataSource;

    // Résolution caissier : accepte id tenant OU téléphone
    const asStr = String(caissierVal).trim();
    const asId  = parseInt(asStr, 10);
    let caissier: Utilisateur | null = null;
    if (!isNaN(asId)) caissier = await ds.getRepository(Utilisateur).findOne({ where: { id: asId } });
    if (!caissier)    caissier = await ds.getRepository(Utilisateur).findOne({ where: { telephone: asStr } });
    if (!caissier) throw new NotFoundException('Caissier introuvable');

    const params = [boutiqueId, caissier.id];

    // 1. Résumé global du jour
    const [summary] = await ds.query(
      `SELECT
         COUNT(*)::int                                            AS nb_ventes,
         COALESCE(SUM(r_montant_total_apres_remise), 0)::float   AS chiffre_affaires
       FROM t_ventes
       WHERE "boutiqueId" = $1
         AND "userId"     = $2
         AND DATE(created_at) = CURRENT_DATE
         AND deleted_at IS NULL`,
      params,
    );

    // 2. Répartition par mode de paiement
    const modesRows: { mode: string; total: number }[] = await ds.query(
      `SELECT
         r_mode_paiement                                        AS mode,
         COALESCE(SUM(r_montant_total_apres_remise), 0)::float AS total
       FROM t_ventes
       WHERE "boutiqueId" = $1
         AND "userId"     = $2
         AND DATE(created_at) = CURRENT_DATE
         AND deleted_at IS NULL
       GROUP BY r_mode_paiement`,
      params,
    );
    const par_mode_paiement = Object.fromEntries(modesRows.map(r => [r.mode, r.total]));

    // 3. Détail produits vendus
    const produits: {
      produit_id: number;
      nom: string;
      prix_unitaire: number;
      quantite_vendue: number;
      montant_total: number;
    }[] = await ds.query(
      `SELECT
         p.id                                               AS produit_id,
         p.r_nom                                           AS nom,
         p.r_prix_vente::float                             AS prix_unitaire,
         SUM(dv.r_quantite)::int                           AS quantite_vendue,
         SUM(dv.r_quantite * dv.r_prix_unitaire_vente)::float AS montant_total
       FROM t_detail_ventes dv
       JOIN t_produits  p ON p.id  = dv."produitId"
       JOIN t_ventes    v ON v.id  = dv."venteId"
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
    return `This action returns all dashboard`;
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
