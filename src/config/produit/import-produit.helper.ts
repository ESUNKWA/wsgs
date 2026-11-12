// Helpers purs (sans dépendance Nest/TypeORM) pour l'import de produits :
// validation des choix faits ligne par ligne dans l'aperçu d'import côté front.

/** Unités proposées dans l'application — doit rester aligné avec le front (helpers/unites-mesure.ts). */
export const UNITES_MESURE = [
  'pièce',
  'kg',
  'g',
  'litre',
  'cl',
  'carton',
  'sachet',
  'boite',
  'paire',
  'm',
] as const;

export const UNITE_MESURE_DEFAUT = 'pièce';

/** Longueur de la colonne r_unite_mesure (varchar(20)). */
export const UNITE_MESURE_MAX_LENGTH = 20;

/** Nombre maximal d'entrées acceptées dans une liste « par ligne » (borne anti-abus). */
export const MAX_LIGNES_IMPORT = 10000;

// Caractères de contrôle (C0, DEL, C1) : refusés dans une unité saisie dans le fichier.
function contientCaractereControle(texte: string): boolean {
  for (let i = 0; i < texte.length; i++) {
    const code = texte.charCodeAt(i);
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) return true;
  }
  return false;
}

/**
 * Parse un champ multipart contenant un tableau JSON aligné sur les lignes du fichier.
 * Toute entrée invalide devient `null` ; un JSON invalide ou qui n'est pas un tableau
 * donne `undefined` (= aucun choix transmis, comportement historique).
 */
export function parseListeParLigne<T>(
  json: unknown,
  convertir: (valeur: unknown) => T | null,
): (T | null)[] | undefined {
  if (typeof json !== 'string' || !json.trim()) return undefined;
  let brut: unknown;
  try {
    brut = JSON.parse(json);
  } catch {
    return undefined;
  }
  if (!Array.isArray(brut)) return undefined;
  return brut.slice(0, MAX_LIGNES_IMPORT).map((v) => convertir(v));
}

/** Identifiant entier strictement positif (nombre ou chaîne de chiffres), sinon `null`. */
export function toIdPositif(valeur: unknown): number | null {
  const n =
    typeof valeur === 'number'
      ? valeur
      : typeof valeur === 'string' && /^\d{1,15}$/.test(valeur.trim())
        ? Number(valeur.trim())
        : NaN;
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** Unité choisie dans l'aperçu : acceptée uniquement si elle figure dans la liste autorisée. */
export function toUniteMesureAutorisee(valeur: unknown): string | null {
  if (typeof valeur !== 'string') return null;
  const v = valeur.trim();
  return (UNITES_MESURE as readonly string[]).includes(v) ? v : null;
}

/**
 * Détermine l'unité de mesure d'une ligne importée.
 * Priorité : choix fait dans l'aperçu (liste autorisée) → valeur du fichier → « pièce ».
 * La valeur du fichier reste libre (comportement historique) mais est bornée en longueur
 * et débarrassée des caractères de contrôle.
 */
export function resoudreUniteMesure(
  choix: string | null | undefined,
  valeurFichier: unknown,
): { unite: string } | { erreur: string } {
  const choixValide = toUniteMesureAutorisee(choix);
  if (choixValide) return { unite: choixValide };

  // Une cellule Excel donne une chaîne, un nombre ou un booléen ; tout autre type est ignoré.
  const fichier =
    typeof valeurFichier === 'string' ||
    typeof valeurFichier === 'number' ||
    typeof valeurFichier === 'boolean'
      ? String(valeurFichier).trim()
      : '';
  if (!fichier) return { unite: UNITE_MESURE_DEFAUT };

  if (fichier.length > UNITE_MESURE_MAX_LENGTH) {
    return {
      erreur: `l'unité de mesure ne doit pas dépasser ${UNITE_MESURE_MAX_LENGTH} caractères`,
    };
  }
  if (contientCaractereControle(fichier)) {
    return {
      erreur: `l'unité de mesure contient des caractères non autorisés`,
    };
  }
  return { unite: fichier };
}
