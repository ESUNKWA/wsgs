import { escapeHtml as e, infosPaiementRecu, urlImageSure } from './recu-paiement.helper';

// Sécurité : toute donnée issue de la vente (produits, client, boutique…) est échappée,
// car ce HTML est rendu dans le navigateur (iframe du POS) avec les droits de l'application.
export function generateHtmlThermique(data: any, documentType = 'FACTURE'): string {
  const formatDate = (dateVal: any) => {
    if (!dateVal) return '-';
    const d = new Date(dateVal);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const fmt = (n: number) => Number(n || 0).toLocaleString('fr-FR');

  const lignes = (data?.detail_vente ?? [])
    .map((p: { produit: any; quantite: number; prix: number }) => {
      const total = p.quantite * p.prix;
      return `
        <tr>
          <td class="col-produit">${e(p.produit)}</td>
          <td class="col-qte">${e(p.quantite)}</td>
          <td class="col-pu">${fmt(p.prix)}</td>
          <td class="col-tot">${fmt(total)}</td>
        </tr>`;
    })
    .join('');

  const remise = Number(data?.remise || 0);
  const net = Number(data?.montant_total_apres_remise || data?.montant_total || 0);
  const total = Number(data?.montant_total || 0);

  const remiseLigne = remise > 0
    ? `<tr><td colspan="3">Remise</td><td class="col-tot">-${fmt(remise)}</td></tr>`
    : '';
  const netLigne = remise > 0
    ? `<tr class="net-row"><td colspan="3">NET A PAYER</td><td class="col-tot">${fmt(net)} F</td></tr>`
    : '';

  // Mode de paiement, montant reçu et monnaie rendue (absent pour les anciennes ventes sans mode)
  const paiement = infosPaiementRecu(data);
  const paiementBloc = paiement
    ? `
  <div class="sep-dash"></div>
  <div class="info-line"><span>Mode de paiement:</span><span>${paiement.mode}</span></div>
  ${paiement.montantRecu !== null ? `<div class="info-line"><span>Montant reçu:</span><span>${fmt(paiement.montantRecu)} F</span></div>
  <div class="info-line"><span>Monnaie rendue:</span><span>${fmt(paiement.monnaieRendue ?? 0)} F</span></div>` : ''}`
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    /* Hauteur : fixée à la hauteur exacte du ticket au moment de l'impression (POS front).
       ("size: 72mm auto" était invalide et ignoré → le navigateur prenait le format du pilote,
       ex. 279/297 mm, d'où un grand blanc reporté en tête du ticket suivant.) */
    @page { margin: 0; }
    @font-face {
      font-family: 'ThermalFont';
      /* DejaVu Mono en premier : installé sur Linux, couvre tous les caractères français */
      src: local('DejaVu Sans Mono'), local('Liberation Mono'), local('Courier New'), local('Courier');
    }
    html, body {
      font-family: 'ThermalFont', 'DejaVu Sans Mono', 'Liberation Mono', 'Courier New', Arial, sans-serif;
      font-size: 14px;
      width: 72mm;
      color: #000;
    }
    /* Marges uniquement sur body (appliquées aussi à html, elles étaient doublées : 70 mm en bas).
       10 mm en bas : avance du papier pour que la coupe/déchirure ne touche pas le dernier texte. */
    body { padding: 2mm 3mm 10mm 3mm; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .large { font-size: 16px; }
    .small { font-size: 12px; }
    .sep-solid { border-top: 1px solid #000; margin: 2mm 0; }
    .sep-dash  { border-top: 1px dashed #000; margin: 2mm 0; }
    .info-line { display: flex; justify-content: space-between; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 1mm; }
    thead tr th {
      font-size: 12px;
      font-weight: bold;
      border-bottom: 1px dashed #000;
      padding-bottom: 1mm;
    }
    tbody tr td { font-size: 13px; padding: 1mm 0; vertical-align: top; }
    tfoot tr td { font-size: 13px; padding: 1mm 0; }
    .col-produit { width: 42%; }
    .col-qte { width: 10%; text-align: center; }
    .col-pu  { width: 22%; text-align: right; }
    .col-tot { width: 26%; text-align: right; }
    .total-row td { border-top: 1px dashed #000; font-weight: bold; padding-top: 1mm; }
    .net-row td { font-weight: bold; font-size: 15px; border-top: 1px solid #000; padding-top: 1mm; }
    .footer { text-align: center; margin-top: 3mm; font-size: 12px; }
    .merci { font-size: 14px; font-weight: bold; margin-top: 2mm; }
    .boutique-logo { display: block; margin: 0 auto 2mm; max-width: 22mm; max-height: 22mm; object-fit: contain; }
  </style>
</head>
<body>

  ${urlImageSure(data?.logo_boutique) ? `<img class="boutique-logo" src="${urlImageSure(data.logo_boutique)}" alt="Logo">` : ''}
  <div class="center bold large">${e(data?.nom_boutique || '')}</div>
  ${data?.adresse_boutique ? `<div class="center small">${e(data.adresse_boutique)}</div>` : ''}
  ${data?.phone_boutique ? `<div class="center small">Tél: ${e(data.phone_boutique)}</div>` : ''}
  ${data?.email_boutique ? `<div class="center small">${e(data.email_boutique)}</div>` : ''}

  <div class="sep-solid"></div>

  <div class="center bold large">${e(documentType)}</div>

  <div class="sep-dash"></div>

  <div class="info-line"><span>Ref:</span><span>${e(data?.reference || '-')}</span></div>
  <div class="info-line"><span>Date:</span><span>${e(formatDate(data?.date_vente))}</span></div>
  <div class="info-line"><span>Client:</span><span>${e(data?.nom_client || 'Comptant')}</span></div>
  ${data?.telephone_client && data.telephone_client !== '-' ? `<div class="info-line"><span>Tel:</span><span>${e(data.telephone_client)}</span></div>` : ''}

  <div class="sep-dash"></div>

  <table>
    <thead>
      <tr>
        <th class="col-produit">ARTICLE</th>
        <th class="col-qte">QTE</th>
        <th class="col-pu">P.U</th>
        <th class="col-tot">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${lignes}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="3">TOTAL</td>
        <td class="col-tot">${fmt(total)} F</td>
      </tr>
      ${remiseLigne}
      ${netLigne}
    </tfoot>
  </table>
${paiementBloc}

  <div class="sep-solid"></div>

  <div class="footer merci">Merci de votre visite !</div>
  <div class="footer">Revenez nous voir bientôt</div>
  <div class="footer" style="margin-top:4mm;">********************************</div>

</body>
</html>`;
}
