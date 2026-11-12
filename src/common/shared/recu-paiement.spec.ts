import {
  escapeHtml,
  infosPaiementRecu,
  urlImageSure,
} from './recu-paiement.helper';
import { generateHtmlThermique } from './generateHtmlThermique';
import { generateHtml } from './generateHtml';

const vente = {
  reference: 'VNT/1',
  date_vente: '2026-11-12T13:29:51.768Z',
  nom_boutique: 'Boutique',
  detail_vente: [{ produit: 'Beurre 250 g', quantite: 2, prix: 1750 }],
  montant_total: 3500,
  remise: 0,
  montant_total_apres_remise: 3500,
};

// toLocaleString('fr-FR') utilise une espace insécable étroite comme séparateur de milliers
const sansEspaces = (html: string) => html.replace(/\s/g, ''); // \s couvre aussi les espaces Unicode (Zs)

describe('infosPaiementRecu', () => {
  it('retourne null sans mode de paiement (devis, anciennes ventes)', () => {
    expect(infosPaiementRecu(vente)).toBeNull();
    expect(infosPaiementRecu({ ...vente, mode_paiement: '  ' })).toBeNull();
    expect(infosPaiementRecu(null)).toBeNull();
  });

  it('traduit le mode et calcule montant reçu / monnaie', () => {
    expect(
      infosPaiementRecu({
        mode_paiement: 'orange_money',
        montant_recu: 5000,
        monnaie_rendu: 1500,
      }),
    ).toEqual({ mode: 'Orange Money', montantRecu: 5000, monnaieRendue: 1500 });
  });

  it('accepte 0 comme montant reçu / monnaie et borne la monnaie à 0', () => {
    expect(
      infosPaiementRecu({
        mode_paiement: 'wave',
        montant_recu: 0,
        monnaie_rendu: -20,
      }),
    ).toEqual({ mode: 'Wave', montantRecu: 0, monnaieRendue: 0 });
  });

  it('n’affiche ni montant reçu ni monnaie pour une vente à crédit', () => {
    expect(
      infosPaiementRecu({
        mode_paiement: 'credit',
        montant_recu: 0,
        monnaie_rendu: 0,
      }),
    ).toEqual({ mode: 'Crédit', montantRecu: null, monnaieRendue: null });
  });

  it('n’invente pas de montant reçu inconnu', () => {
    expect(infosPaiementRecu({ mode_paiement: 'espece' })).toEqual({
      mode: 'Espèces',
      montantRecu: null,
      monnaieRendue: null,
    });
  });

  it('échappe un mode inconnu (XSS)', () => {
    expect(
      infosPaiementRecu({ mode_paiement: '<img src=x onerror=alert(1)>' })
        ?.mode,
    ).toBe('&lt;img src=x onerror=alert(1)&gt;');
    expect(escapeHtml(`"'&`)).toBe('&quot;&#39;&amp;');
    expect(escapeHtml({ toString: () => '<b>' })).toBe('');
  });
});

describe('reçu thermique', () => {
  it('affiche mode, montant reçu et monnaie rendue', () => {
    const html = sansEspaces(
      generateHtmlThermique({
        ...vente,
        mode_paiement: 'espece',
        montant_recu: 5000,
        monnaie_rendu: 1500,
      }),
    );
    expect(html).toContain('<span>Modedepaiement:</span><span>Espèces</span>');
    expect(html).toContain('<span>Montantreçu:</span><span>5000F</span>');
    expect(html).toContain('<span>Monnaierendue:</span><span>1500F</span>');
  });

  it('reste inchangé sans mode de paiement et conserve les totaux', () => {
    const html = generateHtmlThermique(vente);
    expect(html).not.toContain('Mode de paiement');
    expect(html).not.toContain('Montant reçu');
    expect(sansEspaces(html)).toContain('TOTAL</td><tdclass="col-tot">3500F');
  });
});

describe('reçu A4', () => {
  it('ajoute les lignes de paiement sous le net à payer', () => {
    const html = sansEspaces(
      generateHtml({
        ...vente,
        mode_paiement: 'wave',
        montant_recu: 4000,
        monnaie_rendu: 500,
      }),
    );
    const net = html.indexOf('NETÀPAYER');
    const mode = html.indexOf('Modedepaiement</td><tdclass="sub-value">Wave');
    expect(net).toBeGreaterThan(-1);
    expect(mode).toBeGreaterThan(net);
    expect(html).toContain('Montantreçu</td><tdclass="sub-value">4000FCFA');
    expect(html).toContain('Monnaierendue</td><tdclass="sub-value">500FCFA');
    expect(html).not.toContain('{{paiement}}');
  });

  it('n’affiche aucun paiement sur un devis, même si les données en contiennent', () => {
    const html = generateHtml(
      { ...vente, mode_paiement: 'espece', montant_recu: 1 },
      'DEVIS',
    );
    expect(html).not.toContain('Mode de paiement');
    expect(html).not.toContain('{{paiement}}');
  });
});

describe('reçus — échappement des données (XSS)', () => {
  const piege = {
    ...vente,
    nom_boutique: '<script>alert(1)</script>',
    nom_client: '<img src=x onerror=alert(2)>',
    telephone_client: '"><svg onload=alert(3)>',
    adresse_boutique: '<b>adresse</b>',
    email_boutique: '<i>mail</i>',
    phone_boutique: '<u>tel</u>',
    reference: '</div><script>alert(4)</script>',
    statut: '<s>payer</s>',
    logo_boutique: 'javascript:alert(5)',
    detail_vente: [
      {
        produit: '<img src=x onerror=alert(7)>',
        quantite: '<b>1</b>',
        prix: 500,
      },
    ],
  };
  // Balises réellement injectées (le texte échappé &lt;…&gt; est inoffensif)
  const dangereux = /<script|<img src=x|<svg|<b>|<i>|<u>|<s>|src="javascript:/i;

  it.each([
    ['thermique', () => generateHtmlThermique(piege)],
    ['A4', () => generateHtml(piege)],
  ])('reçu %s : aucune balise ni attribut injecté', (_nom, generer) => {
    const html = generer();
    expect(html).not.toMatch(dangereux);
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(7)&gt;');
  });

  it('conserve un logo embarqué (data:image) et refuse les autres schémas', () => {
    const logo = 'data:image/png;base64,iVBORw0KGgo=';
    expect(generateHtmlThermique({ ...vente, logo_boutique: logo })).toContain(
      `src="${logo}"`,
    );
    expect(generateHtml({ ...vente, logo_boutique: logo })).toContain(
      `src="${logo}"`,
    );
    expect(urlImageSure('data:text/html;base64,PHNjcmlwdD4=')).toBe('');
    expect(urlImageSure('JavaScript:alert(1)')).toBe('');
    expect(urlImageSure('https://cdn.exemple.ci/logo.png?a=1&b=2')).toBe(
      'https://cdn.exemple.ci/logo.png?a=1&amp;b=2',
    );
    expect(urlImageSure('api/tenants/1/logos/logo.png')).toBe(
      'api/tenants/1/logos/logo.png',
    );
  });

  it('A4 : une donnée contenant un emplacement {{…}} n’est pas réinterprétée', () => {
    const html = generateHtml({ ...vente, nom_client: '{{lignes}} $& $1' });
    expect(html).toContain('<strong>{{lignes}} $&amp; $1</strong>');
  });
});
