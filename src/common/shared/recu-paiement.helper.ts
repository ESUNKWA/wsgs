// Informations de paiement affichées sur les reçus (thermique et A4).

/** Libellés des modes de paiement — alignés sur ALL_MODES du POS (front). */
export const LIBELLES_MODE_PAIEMENT: Record<string, string> = {
  espece: 'Espèces',
  orange_money: 'Orange Money',
  wave: 'Wave',
  mtn_money: 'MTN Money',
  moov_money: 'Moov Money',
  dajmo: 'Dajmo',
  carte: 'Carte',
  credit: 'Crédit',
  mixte: 'Mixte',
};

/** Échappe une valeur avant insertion dans du HTML (le reçu est rendu dans le navigateur). */
export function escapeHtml(valeur: unknown): string {
  const texte =
    typeof valeur === 'string' || typeof valeur === 'number'
      ? String(valeur)
      : '';
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Source d'image sûre pour l'attribut src du logo, déjà échappée ; '' sinon.
 * Acceptée : data:image/…;base64 (logo embarqué), http(s):// ou chemin relatif sans schéma.
 * Refusée : tout autre schéma (javascript:, data:text/html…).
 */
export function urlImageSure(valeur: unknown): string {
  if (typeof valeur !== 'string') return '';
  const url = valeur.trim();
  if (!url) return '';
  const autorisee =
    /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i.test(url) ||
    /^https?:\/\//i.test(url) ||
    !/^[a-z][a-z0-9+.-]*:/i.test(url); // relatif : pas de schéma
  return autorisee ? escapeHtml(url) : '';
}

export interface InfosPaiementRecu {
  /** Libellé lisible, déjà échappé pour le HTML. */
  mode: string;
  /** null quand le montant reçu n'a pas de sens (crédit) ou n'est pas connu (anciennes ventes). */
  montantRecu: number | null;
  monnaieRendue: number | null;
}

/** Champs de paiement lus dans recu_data (valeurs non fiables : type inconnu). */
export interface DonneesPaiementRecu {
  // recu_data contient aussi le reste de la vente (produits, totaux…)
  [champ: string]: unknown;
  mode_paiement?: unknown;
  montant_recu?: unknown;
  monnaie_rendu?: unknown;
}

function nombreOuNull(valeur: unknown): number | null {
  if (valeur === null || valeur === undefined || valeur === '') return null;
  const n = Number(valeur);
  return Number.isFinite(n) ? n : null;
}

/**
 * Informations de paiement à afficher, ou null si le document n'en porte pas
 * (devis, anciennes ventes sans mode de paiement) — le reçu reste alors identique.
 */
export function infosPaiementRecu(
  data: DonneesPaiementRecu | null | undefined,
): InfosPaiementRecu | null {
  const brut = data?.mode_paiement;
  const modeBrut = typeof brut === 'string' ? brut.trim() : '';
  if (!modeBrut) return null;

  const mode = escapeHtml(
    Object.prototype.hasOwnProperty.call(LIBELLES_MODE_PAIEMENT, modeBrut)
      ? LIBELLES_MODE_PAIEMENT[modeBrut]
      : modeBrut,
  );

  // Vente à crédit : rien n'a été encaissé, montant reçu / monnaie seraient trompeurs.
  if (modeBrut === 'credit')
    return { mode, montantRecu: null, monnaieRendue: null };

  const montantRecu = nombreOuNull(data?.montant_recu);
  if (montantRecu === null)
    return { mode, montantRecu: null, monnaieRendue: null };

  return {
    mode,
    montantRecu,
    monnaieRendue: Math.max(0, nombreOuNull(data?.monnaie_rendu) ?? 0),
  };
}
