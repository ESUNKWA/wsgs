import {
  MAX_LIGNES_IMPORT,
  UNITE_MESURE_DEFAUT,
  parseListeParLigne,
  resoudreUniteMesure,
  toIdPositif,
  toUniteMesureAutorisee,
} from './import-produit.helper';

describe('import-produit.helper', () => {
  describe('parseListeParLigne', () => {
    it('retourne undefined si rien n’est transmis ou si le JSON est invalide', () => {
      expect(parseListeParLigne(undefined, toIdPositif)).toBeUndefined();
      expect(parseListeParLigne('', toIdPositif)).toBeUndefined();
      expect(parseListeParLigne('{pas du json', toIdPositif)).toBeUndefined();
    });

    it('retourne undefined si le JSON n’est pas un tableau', () => {
      expect(parseListeParLigne('{"a":1}', toIdPositif)).toBeUndefined();
      expect(parseListeParLigne('42', toIdPositif)).toBeUndefined();
      expect(
        parseListeParLigne(['[1]'] as unknown, toIdPositif),
      ).toBeUndefined();
    });

    it('convertit chaque entrée et remplace les invalides par null', () => {
      expect(
        parseListeParLigne(
          '[3, null, "7", -1, 1.5, "x", {"id":2}]',
          toIdPositif,
        ),
      ).toEqual([3, null, 7, null, null, null, null]);
    });

    it('borne le nombre d’entrées', () => {
      const json = JSON.stringify(new Array(MAX_LIGNES_IMPORT + 50).fill(1));
      expect(parseListeParLigne(json, toIdPositif)).toHaveLength(
        MAX_LIGNES_IMPORT,
      );
    });

    it('n’altère pas le prototype (clé __proto__)', () => {
      parseListeParLigne(
        '[{"__proto__":{"pollue":true}}]',
        toUniteMesureAutorisee,
      );
      expect(Object.prototype).not.toHaveProperty('pollue');
    });
  });

  describe('toUniteMesureAutorisee', () => {
    it('accepte uniquement les unités de la liste', () => {
      expect(toUniteMesureAutorisee('kg')).toBe('kg');
      expect(toUniteMesureAutorisee(' litre ')).toBe('litre');
      expect(toUniteMesureAutorisee('bouteille')).toBeNull();
      expect(
        toUniteMesureAutorisee("kg'; DROP TABLE t_produits;--"),
      ).toBeNull();
      expect(toUniteMesureAutorisee('<script>alert(1)</script>')).toBeNull();
      expect(toUniteMesureAutorisee(12)).toBeNull();
      expect(toUniteMesureAutorisee(null)).toBeNull();
    });
  });

  describe('resoudreUniteMesure', () => {
    it('privilégie le choix fait dans l’aperçu', () => {
      expect(resoudreUniteMesure('kg', 'litre')).toEqual({ unite: 'kg' });
    });

    it('ignore un choix hors liste et retombe sur la valeur du fichier', () => {
      expect(resoudreUniteMesure('<b>x</b>', 'litre')).toEqual({
        unite: 'litre',
      });
    });

    it('conserve une unité libre provenant du fichier (comportement historique)', () => {
      expect(resoudreUniteMesure(null, ' bouteille ')).toEqual({
        unite: 'bouteille',
      });
    });

    it('utilise « pièce » par défaut', () => {
      expect(resoudreUniteMesure(undefined, undefined)).toEqual({
        unite: UNITE_MESURE_DEFAUT,
      });
      expect(resoudreUniteMesure(null, '   ')).toEqual({
        unite: UNITE_MESURE_DEFAUT,
      });
      expect(resoudreUniteMesure(null, '')).toEqual({
        unite: UNITE_MESURE_DEFAUT,
      });
    });

    it('rejette une unité du fichier trop longue ou contenant des caractères de contrôle', () => {
      expect(resoudreUniteMesure(null, 'x'.repeat(21))).toHaveProperty(
        'erreur',
      );
      expect(resoudreUniteMesure(null, 'kg\u0000')).toHaveProperty('erreur');
      expect(resoudreUniteMesure(null, 'x'.repeat(20))).toEqual({
        unite: 'x'.repeat(20),
      });
    });
  });
});
