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
          <td class="col-produit">${p.produit}</td>
          <td class="col-qte">${p.quantite}</td>
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
    ? `<tr class="net-row"><td colspan="3">NET À PAYER</td><td class="col-tot">${fmt(net)} F</td></tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      width: 72mm;
      padding: 2mm 3mm;
      color: #000;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .large { font-size: 13px; }
    .small { font-size: 9px; }
    .sep-solid { border-top: 1px solid #000; margin: 2mm 0; }
    .sep-dash  { border-top: 1px dashed #000; margin: 2mm 0; }
    .info-line { display: flex; justify-content: space-between; }
    table { width: 100%; border-collapse: collapse; margin-top: 1mm; }
    thead tr th {
      font-size: 9px;
      font-weight: bold;
      border-bottom: 1px dashed #000;
      padding-bottom: 1mm;
    }
    tbody tr td { font-size: 10px; padding: 0.5mm 0; vertical-align: top; }
    tfoot tr td { font-size: 10px; padding: 0.5mm 0; }
    .col-produit { width: 42%; }
    .col-qte { width: 10%; text-align: center; }
    .col-pu  { width: 22%; text-align: right; }
    .col-tot { width: 26%; text-align: right; }
    .total-row td { border-top: 1px dashed #000; font-weight: bold; padding-top: 1mm; }
    .net-row td { font-weight: bold; font-size: 12px; border-top: 1px solid #000; padding-top: 1mm; }
    .footer { text-align: center; margin-top: 3mm; font-size: 9px; }
    .merci { font-size: 11px; font-weight: bold; margin-top: 2mm; }
  </style>
</head>
<body>

  <div class="center bold large">${data?.nom_boutique || ''}</div>
  ${data?.adresse_boutique ? `<div class="center small">${data.adresse_boutique}</div>` : ''}
  ${data?.phone_boutique ? `<div class="center small">Tél: ${data.phone_boutique}</div>` : ''}
  ${data?.email_boutique ? `<div class="center small">${data.email_boutique}</div>` : ''}

  <div class="sep-solid"></div>

  <div class="center bold large">${documentType}</div>

  <div class="sep-dash"></div>

  <div class="info-line"><span>Réf:</span><span>${data?.reference || '-'}</span></div>
  <div class="info-line"><span>Date:</span><span>${formatDate(data?.date_vente)}</span></div>
  <div class="info-line"><span>Client:</span><span>${data?.nom_client || 'Comptant'}</span></div>
  ${data?.telephone_client && data.telephone_client !== '-' ? `<div class="info-line"><span>Tél:</span><span>${data.telephone_client}</span></div>` : ''}

  <div class="sep-dash"></div>

  <table>
    <thead>
      <tr>
        <th class="col-produit">ARTICLE</th>
        <th class="col-qte">QTÉ</th>
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

  <div class="sep-solid"></div>

  <div class="footer merci">Merci de votre visite !</div>
  <div class="footer">Revenez nous voir bientôt</div>
  <div class="footer" style="margin-top:4mm;">********************************</div>

</body>
</html>`;
}
