import { BadRequestException, Injectable } from '@nestjs/common';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { Produit } from 'src/config/produit/entities/produit.entity';
import { HistoriqueStock } from 'src/gestion-achats/historique-stock/entities/historique-stock.entity';

export type StatutRupture = 'critique' | 'alerte' | 'attention' | 'ok' | 'inactif';

export interface PrevisionRupture {
  produit: {
    id: number;
    nom: string;
    categorie: string | null;
    unite_mesure: string;
    image_url: string | null;
  };
  stock_actuel: number;
  seuil_alert: number;
  consommation_journaliere: number;
  jours_restants: number | null;
  date_rupture_estimee: string | null;
  statut: StatutRupture;
  qte_a_commander: number;
}

const ORDRE_URGENCE: Record<StatutRupture, number> = {
  critique: 0,
  alerte: 1,
  attention: 2,
  ok: 3,
  inactif: 4,
};

@Injectable()
export class PrevisionService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private get dataSource() {
    return this.tenantContext.getDataSource();
  }

  async getPrevisionRupture(boutiqueId: number, jours = 30): Promise<PrevisionRupture[]> {
    if (isNaN(boutiqueId)) throw new BadRequestException('Veuillez préciser la boutique');

    const produitRepo = this.dataSource.getRepository(Produit);
    const historiqueRepo = this.dataSource.getRepository(HistoriqueStock);

    const produits = await produitRepo.find({
      where: { boutique: { id: boutiqueId } },
      order: { nom: 'ASC' },
    });

    if (!produits.length) return [];

    const produitIds = produits.map((p) => p.id);

    const dateDebut = new Date();
    dateDebut.setDate(dateDebut.getDate() - jours);

    // Agrège les sorties par produit sur la période
    const sorties: { produitId: number; total_sorties: string }[] = await historiqueRepo
      .createQueryBuilder('h')
      .innerJoin('h.produit', 'p')
      .select('p.id', 'produitId')
      .addSelect('SUM(h.quantite)', 'total_sorties')
      .where('h.mouvement = :mouvement', { mouvement: 'sortie' })
      .andWhere('p.id IN (:...produitIds)', { produitIds })
      .andWhere('h.created_at >= :dateDebut', { dateDebut })
      .groupBy('p.id')
      .getRawMany();

    const sortiesMap = new Map<number, number>(
      sorties.map((s) => [+s.produitId, parseFloat(s.total_sorties) || 0]),
    );

    const today = new Date();

    const results: PrevisionRupture[] = produits.map((p) => {
      const totalSorties = sortiesMap.get(p.id) ?? 0;
      const consommationJournaliere = Math.round((totalSorties / jours) * 100) / 100;
      const stockActuel = p.stock_disponible ?? 0;
      const seuilAlert = p.seuil_alert ?? 0;

      let joursRestants: number | null = null;
      let dateRuptureEstimee: string | null = null;
      let statut: StatutRupture;
      let qteACommander = 0;

      if (consommationJournaliere > 0) {
        joursRestants = Math.floor(stockActuel / consommationJournaliere);
        const dateRupture = new Date(today);
        dateRupture.setDate(dateRupture.getDate() + joursRestants);
        dateRuptureEstimee = dateRupture.toISOString().split('T')[0];

        if (joursRestants <= 3) statut = 'critique';
        else if (joursRestants <= 7) statut = 'alerte';
        else if (joursRestants <= 14) statut = 'attention';
        else statut = 'ok';

        // Quantité à commander pour couvrir `jours` jours
        const stockCible = Math.ceil(consommationJournaliere * jours);
        qteACommander = Math.max(0, stockCible - stockActuel);
      } else {
        // Aucune vente sur la période — vérifier le seuil d'alerte
        statut = stockActuel <= seuilAlert && seuilAlert > 0 ? 'attention' : 'inactif';
      }

      return {
        produit: {
          id: p.id,
          nom: p.nom,
          categorie: (p as any).categorie?.nom ?? null,
          unite_mesure: p.unite_mesure ?? 'pièce',
          image_url: p.image ? `${String(process.env.BASE_URL)}/${p.image}` : null,
        },
        stock_actuel: stockActuel,
        seuil_alert: seuilAlert,
        consommation_journaliere: consommationJournaliere,
        jours_restants: joursRestants,
        date_rupture_estimee: dateRuptureEstimee,
        statut,
        qte_a_commander: qteACommander,
      };
    });

    return results.sort((a, b) => ORDRE_URGENCE[a.statut] - ORDRE_URGENCE[b.statut]);
  }
}
