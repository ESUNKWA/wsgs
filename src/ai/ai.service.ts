import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { Produit } from 'src/config/produit/entities/produit.entity';
import { Vente } from 'src/gestion-ventes/vente/entities/vente.entity';
import { DetailVente } from 'src/gestion-ventes/detail-vente/entities/detail-vente.entity';
import axios from 'axios';

@Injectable()
export class AiService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private get dataSource() {
    return this.tenantContext.getDataSource();
  }

  // ─── PRIX SUGGÉRÉ ──────────────────────────────────────────────────────────

  async getPrixSuggere(produitId: number, boutiqueId: number) {
    if (isNaN(produitId) || isNaN(boutiqueId)) {
      throw new BadRequestException('Paramètres produit et boutique requis');
    }

    const produit = await this.dataSource.getRepository(Produit).findOne({
      where: { id: produitId, boutique: { id: boutiqueId } },
    });
    if (!produit) throw new NotFoundException('Produit introuvable dans cette boutique');
    if (!produit.prix_achat || produit.prix_achat <= 0) {
      throw new BadRequestException("Prix d'achat non renseigné pour ce produit");
    }

    const prixAchat = produit.prix_achat;
    const prixActuel = produit.prix_vente;
    const margeActuelle =
      prixActuel > 0 ? Math.round(((prixActuel - prixAchat) / prixActuel) * 1000) / 10 : 0;

    const dateDebut = new Date();
    dateDebut.setDate(dateDebut.getDate() - 30);

    // Marge moyenne réelle de la boutique (calculée sur les ventes des 30 derniers jours)
    const margeBoutiqueRow = await this.dataSource
      .getRepository(DetailVente)
      .createQueryBuilder('dv')
      .innerJoin('dv.vente', 'v')
      .innerJoin('dv.produit', 'p')
      .select(
        'AVG((dv.prix_unitaire_vente - p.prix_achat) / NULLIF(dv.prix_unitaire_vente, 0) * 100)',
        'marge_moyenne',
      )
      .where('v.boutique = :boutiqueId', { boutiqueId })
      .andWhere('v.created_at >= :dateDebut', { dateDebut })
      .andWhere('p.prix_achat > 0')
      .getRawOne();

    const margeBoutique =
      Math.round((parseFloat(margeBoutiqueRow?.marge_moyenne) || 0) * 10) / 10;
    // Si pas assez de données, on utilise la marge actuelle du produit comme référence
    const margeReference = margeBoutique > 0 ? margeBoutique : Math.max(margeActuelle, 20);

    // Vélocité de vente du produit (unités/jour sur 30 jours)
    const velociteRow = await this.dataSource
      .getRepository(DetailVente)
      .createQueryBuilder('dv')
      .innerJoin('dv.vente', 'v')
      .select('COALESCE(SUM(dv.quantite), 0)', 'total_vendu')
      .where('dv.produit = :produitId', { produitId })
      .andWhere('v.boutique = :boutiqueId', { boutiqueId })
      .andWhere('v.created_at >= :dateDebut', { dateDebut })
      .getRawOne();

    const totalVendu = parseFloat(velociteRow?.total_vendu) || 0;
    const velociteJournaliere = Math.round((totalVendu / 30) * 100) / 100;

    // Ajustement selon la popularité du produit
    let margeAjustee: number;
    let raisonAjustement: string;

    if (velociteJournaliere > 2) {
      // Produit populaire : marge plus haute possible
      margeAjustee = Math.min(margeReference + 5, 65);
      raisonAjustement = 'Produit très demandé — hausse de marge sans risque de perte de ventes';
    } else if (velociteJournaliere > 0.3) {
      // Ventes régulières : aligner sur la moyenne boutique
      margeAjustee = margeReference;
      raisonAjustement = 'Ventes régulières — alignement sur la marge moyenne de la boutique';
    } else if (velociteJournaliere > 0) {
      // Peu vendu : légèrement en dessous pour relancer
      margeAjustee = Math.max(margeReference - 3, 10);
      raisonAjustement = 'Ventes faibles — marge légèrement réduite pour stimuler la rotation';
    } else {
      // Aucune vente sur la période : suggérer la marge boutique
      margeAjustee = margeReference;
      raisonAjustement = 'Aucune vente récente — suggestion basée sur la marge moyenne boutique';
    }

    margeAjustee = Math.round(margeAjustee * 10) / 10;

    const prixSuggereRaw = prixAchat / (1 - margeAjustee / 100);
    const prixSuggere = this.arrondirPrix(prixSuggereRaw);

    const gainPotentielMensuel =
      velociteJournaliere > 0
        ? Math.round((prixSuggere - prixActuel) * velociteJournaliere * 30)
        : 0;

    return {
      produit: { id: produit.id, nom: produit.nom, unite_mesure: produit.unite_mesure },
      prix_achat: prixAchat,
      prix_actuel: prixActuel,
      prix_suggere: prixSuggere,
      marge_actuelle: `${margeActuelle}%`,
      marge_cible: `${margeAjustee}%`,
      marge_moyenne_boutique: margeBoutique > 0 ? `${margeBoutique}%` : null,
      velocite_journaliere: velociteJournaliere,
      gain_potentiel_mensuel: gainPotentielMensuel,
      conseil: raisonAjustement,
    };
  }

  // ─── OCR FACTURE FOURNISSEUR (LLaVA via Ollama) ───────────────────────────

  async scanFacture(imageBuffer: Buffer) {
    if (!imageBuffer || imageBuffer.length === 0) {
      throw new BadRequestException('Image vide ou non fournie');
    }

    const base64Image = imageBuffer.toString('base64');

    const prompt = `Tu es un assistant d'extraction de données de factures fournisseur.
Analyse cette image de facture et retourne UNIQUEMENT un objet JSON valide, sans aucun texte avant ou après, sans balises markdown.

Structure JSON attendue :
{
  "fournisseur": "nom du fournisseur ou null",
  "numero_facture": "numéro de facture ou null",
  "date_facture": "date au format YYYY-MM-DD ou null",
  "montant_total": 0,
  "lignes": [
    {
      "designation": "nom du produit",
      "quantite": 0,
      "prix_unitaire": 0,
      "montant_ligne": 0
    }
  ]
}

Règles importantes :
- Les montants sont des nombres entiers (pas de symbole F, FCFA, XOF)
- Si une colonne contient un montant total par ligne, calcule prix_unitaire = montant_ligne / quantite
- Ignore les lignes de totaux, sous-totaux et taxes
- Colonnes possibles pour quantité : Qté, Nbre, Quantité, QTE, Q, Nb
- Colonnes possibles pour prix unitaire : Prix unit., P.U., Prix HT, Tarif, Coût
- Si une valeur est illisible ou absente : null pour les textes, 0 pour les nombres
- Retourne UNIQUEMENT le JSON, rien d'autre`;

    let rawResponse: string;
    try {
      const model = process.env.OLLAMA_VISION_MODEL || 'llava';
      const { data } = await axios.post(
        'http://localhost:11434/api/generate',
        { model, prompt, images: [base64Image], stream: false },
        { timeout: 60000 },
      );
      rawResponse = data.response as string;
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED') {
        throw new ServiceUnavailableException(
          'Ollama est inaccessible. Vérifiez que le service tourne sur localhost:11434',
        );
      }
      if (err.response?.status === 404) {
        throw new ServiceUnavailableException(
          'Modèle LLaVA non installé. Exécutez : ollama pull llava',
        );
      }
      throw new ServiceUnavailableException(`Erreur Ollama : ${err.message}`);
    }

    const parsed = this.parseJsonFromLlm(rawResponse);

    return {
      fournisseur: parsed?.fournisseur ?? null,
      numero_facture: parsed?.numero_facture ?? null,
      date_facture: parsed?.date_facture ?? null,
      montant_total: Number(parsed?.montant_total) || 0,
      lignes: this.sanitiserLignes(parsed?.lignes),
      fiabilite: parsed ? 'ok' : 'erreur_parsing',
      brut: parsed ? undefined : rawResponse,
    };
  }

  // Extrait le premier bloc JSON valide de la réponse du LLM
  private parseJsonFromLlm(raw: string): any {
    // Supprimer les balises markdown ```json ... ```
    const stripped = raw
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    // Tentative 1 : parse direct
    try {
      return JSON.parse(stripped);
    } catch { /* */ }

    // Tentative 2 : extraire le premier { ... } trouvé dans le texte
    const match = stripped.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch { /* */ }
    }

    return null;
  }

  private sanitiserLignes(lignes: any[]): any[] {
    if (!Array.isArray(lignes)) return [];
    return lignes
      .filter((l) => l?.designation && String(l.designation).trim())
      .map((l) => {
        const qte = Number(l.quantite) || 1;
        let pu = Number(l.prix_unitaire) || 0;
        const montant = Number(l.montant_ligne) || 0;
        // Si prix_unitaire absent mais montant_ligne présent, on calcule
        if (!pu && montant && qte) pu = Math.round(montant / qte);
        return {
          designation: String(l.designation).trim(),
          quantite: qte,
          prix_unitaire: pu,
          montant_ligne: montant || Math.round(pu * qte),
        };
      });
  }

  // Arrondir au palier le plus cohérent selon la gamme de prix (contexte CFA)
  private arrondirPrix(prix: number): number {
    if (prix <= 500) return Math.round(prix / 25) * 25;
    if (prix <= 2000) return Math.round(prix / 50) * 50;
    if (prix <= 10000) return Math.round(prix / 100) * 100;
    if (prix <= 50000) return Math.round(prix / 500) * 500;
    return Math.round(prix / 1000) * 1000;
  }

  // ─── RÉSUMÉ JOURNALIER ─────────────────────────────────────────────────────

  async getResumeJournalier(boutiqueId: number) {
    if (isNaN(boutiqueId)) throw new BadRequestException('Veuillez préciser la boutique');

    const venteRepo = this.dataSource.getRepository(Vente);
    const detailVenteRepo = this.dataSource.getRepository(DetailVente);
    const produitRepo = this.dataSource.getRepository(Produit);

    // Bornes temporelles
    const debutAujourdhui = new Date();
    debutAujourdhui.setHours(0, 0, 0, 0);

    const debutHier = new Date(debutAujourdhui);
    debutHier.setDate(debutHier.getDate() - 1);

    const [statsAujourdhui, statsHier] = await Promise.all([
      venteRepo
        .createQueryBuilder('v')
        .select('COUNT(v.id)', 'nb_ventes')
        .addSelect('COALESCE(SUM(v.montant_total_apres_remise), 0)', 'total_ca')
        .where('v.boutique = :boutiqueId', { boutiqueId })
        .andWhere('v.created_at >= :debut', { debut: debutAujourdhui })
        .getRawOne(),

      venteRepo
        .createQueryBuilder('v')
        .select('COUNT(v.id)', 'nb_ventes')
        .addSelect('COALESCE(SUM(v.montant_total_apres_remise), 0)', 'total_ca')
        .where('v.boutique = :boutiqueId', { boutiqueId })
        .andWhere('v.created_at >= :debut', { debut: debutHier })
        .andWhere('v.created_at < :fin', { fin: debutAujourdhui })
        .getRawOne(),
    ]);

    // Top 3 produits aujourd'hui
    const top3 = await detailVenteRepo
      .createQueryBuilder('dv')
      .innerJoin('dv.vente', 'v')
      .innerJoin('dv.produit', 'p')
      .select('p.nom', 'nom')
      .addSelect('SUM(dv.quantite)', 'qte')
      .addSelect('SUM(dv.quantite * dv.prix_unitaire_vente)', 'ca')
      .where('v.boutique = :boutiqueId', { boutiqueId })
      .andWhere('v.created_at >= :debut', { debut: debutAujourdhui })
      .groupBy('p.id, p.nom')
      .orderBy('SUM(dv.quantite)', 'DESC')
      .limit(3)
      .getRawMany();

    // Produits sous seuil d'alerte
    const nbProduitsEnAlerte = await produitRepo
      .createQueryBuilder('p')
      .where('p.boutique = :boutiqueId', { boutiqueId })
      .andWhere('p.seuil_alert > 0')
      .andWhere('p.stock_disponible <= p.seuil_alert')
      .getCount();

    // Produits en rupture totale
    const nbProduitsRupture = await produitRepo
      .createQueryBuilder('p')
      .where('p.boutique = :boutiqueId', { boutiqueId })
      .andWhere('p.stock_disponible <= 0')
      .getCount();

    // Parsing
    const nbVentes = parseInt(statsAujourdhui?.nb_ventes) || 0;
    const caAujourdhui = Math.round(parseFloat(statsAujourdhui?.total_ca) || 0);
    const nbVentesHier = parseInt(statsHier?.nb_ventes) || 0;
    const caHier = Math.round(parseFloat(statsHier?.total_ca) || 0);

    const evolutionVentes =
      nbVentesHier > 0 ? Math.round(((nbVentes - nbVentesHier) / nbVentesHier) * 100) : null;
    const evolutionCA =
      caHier > 0 ? Math.round(((caAujourdhui - caHier) / caHier) * 100) : null;

    const topProduits = top3.map((r) => ({
      nom: r.nom,
      quantite_vendue: parseInt(r.qte) || 0,
      chiffre_affaires: Math.round(parseFloat(r.ca) || 0),
    }));

    const meilleurProduit = topProduits[0]?.nom ?? null;

    return {
      date: debutAujourdhui.toISOString().split('T')[0],
      boutique_id: boutiqueId,
      ventes: {
        aujourd_hui: nbVentes,
        hier: nbVentesHier,
        evolution: evolutionVentes !== null ? `${evolutionVentes >= 0 ? '+' : ''}${evolutionVentes}%` : null,
      },
      chiffre_affaires: {
        aujourd_hui: caAujourdhui,
        hier: caHier,
        evolution: evolutionCA !== null ? `${evolutionCA >= 0 ? '+' : ''}${evolutionCA}%` : null,
      },
      top_produits: topProduits,
      stock: {
        produits_en_alerte: nbProduitsEnAlerte,
        produits_en_rupture: nbProduitsRupture,
      },
      resume_texte: this.genererResumeTexte({
        nbVentes,
        evolutionVentes,
        caAujourdhui,
        evolutionCA,
        meilleurProduit,
        nbProduitsEnAlerte,
        nbProduitsRupture,
      }),
    };
  }

  private genererResumeTexte(d: {
    nbVentes: number;
    evolutionVentes: number | null;
    caAujourdhui: number;
    evolutionCA: number | null;
    meilleurProduit: string | null;
    nbProduitsEnAlerte: number;
    nbProduitsRupture: number;
  }): string {
    const sign = (n: number) => (n >= 0 ? '+' : '');

    const ventes = `${d.nbVentes} vente${d.nbVentes > 1 ? 's' : ''}${
      d.evolutionVentes !== null ? ` (${sign(d.evolutionVentes)}${d.evolutionVentes}% vs hier)` : ''
    }`;

    const ca =
      d.caAujourdhui > 0
        ? `CA : ${new Intl.NumberFormat('fr-FR').format(d.caAujourdhui)} F CFA${
            d.evolutionCA !== null ? ` (${sign(d.evolutionCA)}${d.evolutionCA}%)` : ''
          }`
        : null;

    const top = d.meilleurProduit ? `Meilleure vente : ${d.meilleurProduit}` : null;

    const alerte =
      d.nbProduitsRupture > 0
        ? `${d.nbProduitsRupture} produit${d.nbProduitsRupture > 1 ? 's' : ''} en rupture`
        : d.nbProduitsEnAlerte > 0
          ? `${d.nbProduitsEnAlerte} produit${d.nbProduitsEnAlerte > 1 ? 's' : ''} sous seuil d'alerte`
          : null;

    return [
      `Aujourd'hui : ${ventes}`,
      ca,
      top,
      alerte,
    ]
      .filter(Boolean)
      .join(' | ');
  }
}
