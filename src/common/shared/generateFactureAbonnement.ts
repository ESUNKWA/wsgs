export interface LigneFacture {
  description: string;
  periode?: string;
  montant: number | string;
}

export interface FactureAbonnementData {
  // Emetteur (votre société)
  emetteur_logo?: string;         // URL ou base64 de l'image
  emetteur_nom: string;
  emetteur_slogan?: string;
  emetteur_telephone?: string;
  emetteur_website?: string;
  emetteur_email?: string;

  // Destinataire
  client_nom: string;
  client_adresse?: string;
  client_contact?: string;

  // En-tête facture
  numero: string;                 // ex: FAC-2026-001
  date_emission: string;          // ex: 07/07/2026
  date_echeance?: string;
  devise?: string;                // défaut FCFA

  // Lignes de détail
  lignes: LigneFacture[];

  // Totaux
  sous_total?: number;
  remise?: number;
  total: number;

  // Pied
  modalites_paiement?: string;
  note?: string;
}

function formatMontant(v: number | string, devise = 'FCFA'): string {
  if (typeof v === 'string') return v;
  return `${Number(v).toLocaleString('fr-FR')} ${devise}`;
}

export function generateFactureAbonnement(data: FactureAbonnementData): string {
  const devise = data.devise ?? 'FCFA';

  const logoHtml = data.emetteur_logo
    ? `<img src="${data.emetteur_logo}" alt="Logo" style="height:60px;width:auto;object-fit:contain;">`
    : `<div style="width:60px;height:60px;background:#1A5F6E;border-radius:8px;
        display:flex;align-items:center;justify-content:center;
        color:white;font-weight:bold;font-size:18px;">
        ${data.emetteur_nom.charAt(0)}
       </div>`;

  const lignesHtml = data.lignes.map((l, i) => `
    <tr style="background:${i % 2 === 0 ? '#E8F4F2' : '#ffffff'}">
      <td style="padding:10px 12px;border:1px solid #d0dfe0;color:#333;">${l.description}</td>
      <td style="padding:10px 12px;border:1px solid #d0dfe0;text-align:center;color:#555;">${l.periode ?? '—'}</td>
      <td style="padding:10px 12px;border:1px solid #d0dfe0;text-align:right;color:#333;white-space:nowrap;">
        ${formatMontant(l.montant, devise)}
      </td>
    </tr>
  `).join('');

  const remiseLigneHtml = data.remise
    ? `<tr>
        <td colspan="2" style="padding:6px 12px;text-align:right;color:#6B7B7E;font-size:13px;">Remise</td>
        <td style="padding:6px 12px;text-align:right;color:#c0392b;white-space:nowrap;">
          -${formatMontant(data.remise, devise)}
        </td>
       </tr>`
    : '';

  const sousTotalHtml = data.sous_total
    ? `<tr>
        <td colspan="2" style="padding:6px 12px;text-align:right;color:#6B7B7E;font-size:13px;">Sous-total</td>
        <td style="padding:6px 12px;text-align:right;color:#333;white-space:nowrap;">
          ${formatMontant(data.sous_total, devise)}
        </td>
       </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Times New Roman', serif;
      font-size: 10pt;
      color: #333;
      background: #fff;
      padding: 40px 45px;
    }

    /* ── En-tête société ── */
    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 4px;
    }
    .header-info h1 {
      font-size: 18pt;
      color: #1A5F6E;
      font-weight: bold;
      letter-spacing: 0.5px;
    }
    .header-info .slogan {
      font-style: italic;
      font-size: 9pt;
      color: #6B7B7E;
      margin: 2px 0;
    }
    .header-info .contact {
      font-size: 9pt;
      color: #6B7B7E;
    }
    .separator {
      border: none;
      border-bottom: 1.5px solid #1A5F6E;
      margin: 10px 0 16px;
    }

    /* ── Titre facture ── */
    .title-section {
      text-align: right;
      margin-bottom: 20px;
    }
    .title-section h2 {
      font-size: 22pt;
      color: #1A5F6E;
      font-weight: bold;
      letter-spacing: 2px;
    }
    .title-section .numero {
      font-size: 10pt;
      color: #6B7B7E;
      margin-top: 4px;
    }

    /* ── Bloc bilatéral client / dates ── */
    .meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 24px;
      gap: 20px;
    }
    .meta-client {
      flex: 1;
    }
    .meta-client .label {
      font-weight: bold;
      color: #1A5F6E;
      font-size: 9pt;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .meta-client .value {
      font-size: 10pt;
      line-height: 1.6;
    }
    .meta-dates {
      text-align: right;
      font-size: 10pt;
      line-height: 1.8;
    }
    .meta-dates .row { display: block; }
    .meta-dates b { color: #333; }

    /* ── Table des lignes ── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 0;
    }
    thead tr {
      background: #1A5F6E;
    }
    thead th {
      padding: 10px 12px;
      color: #fff;
      font-size: 10pt;
      border: 1px solid #1A5F6E;
    }
    thead th:nth-child(1) { text-align: left; }
    thead th:nth-child(2) { text-align: center; }
    thead th:nth-child(3) { text-align: right; }

    /* ── Total ── */
    .total-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 0;
    }
    .total-table td {
      padding: 4px 12px;
    }
    .total-row td {
      background: #E8F4F2;
      padding: 10px 12px;
      border-top: 2px solid #1A5F6E;
    }
    .total-label {
      text-align: right;
      font-size: 11pt;
      font-weight: bold;
      color: #1A5F6E;
    }
    .total-value {
      text-align: right;
      font-size: 12pt;
      font-weight: bold;
      color: #1A5F6E;
      white-space: nowrap;
      width: 180px;
    }

    /* ── Modalités & pied ── */
    .modalites {
      margin-top: 28px;
    }
    .modalites h3 {
      font-size: 11pt;
      color: #1A5F6E;
      font-weight: bold;
      margin-bottom: 6px;
    }
    .modalites p {
      font-size: 10pt;
      color: #555;
      line-height: 1.5;
    }
    .note {
      margin-top: 12px;
      font-size: 9pt;
      color: #6B7B7E;
      font-style: italic;
    }
    .footer {
      margin-top: 36px;
      border-top: 1px solid #ccc;
      padding-top: 10px;
      text-align: center;
      font-size: 9pt;
      color: #6B7B7E;
      font-style: italic;
    }
  </style>
</head>
<body>

  <!-- En-tête société -->
  <div class="header">
    ${logoHtml}
    <div class="header-info">
      <h1>${data.emetteur_nom}</h1>
      ${data.emetteur_slogan ? `<p class="slogan">${data.emetteur_slogan}</p>` : ''}
      <p class="contact">
        ${[data.emetteur_telephone, data.emetteur_website, data.emetteur_email].filter(Boolean).join('&nbsp;&nbsp;|&nbsp;&nbsp;')}
      </p>
    </div>
  </div>
  <hr class="separator">

  <!-- Titre -->
  <div class="title-section">
    <h2>FACTURE</h2>
    <p class="numero">N° ${data.numero}</p>
  </div>

  <!-- Client + Dates -->
  <div class="meta-row">
    <div class="meta-client">
      <p class="label">Facturé à</p>
      <div class="value">
        <strong>${data.client_nom}</strong><br>
        ${data.client_adresse ? `${data.client_adresse}<br>` : ''}
        ${data.client_contact ?? ''}
      </div>
    </div>
    <div class="meta-dates">
      <span class="row"><b>Date d'émission&nbsp;:</b> ${data.date_emission}</span>
      ${data.date_echeance ? `<span class="row"><b>Échéance&nbsp;:</b> ${data.date_echeance}</span>` : ''}
      <span class="row"><b>Devise&nbsp;:</b> ${devise}</span>
    </div>
  </div>

  <!-- Lignes -->
  <table>
    <thead>
      <tr>
        <th style="width:55%">Description</th>
        <th style="width:25%">Période</th>
        <th style="width:20%">Montant (${devise})</th>
      </tr>
    </thead>
    <tbody>
      ${lignesHtml}
    </tbody>
  </table>

  <!-- Totaux -->
  <table class="total-table">
    <tbody>
      ${sousTotalHtml}
      ${remiseLigneHtml}
      <tr class="total-row">
        <td class="total-label">TOTAL À PAYER</td>
        <td class="total-value">${formatMontant(data.total, devise)}</td>
      </tr>
    </tbody>
  </table>

  <!-- Modalités -->
  ${data.modalites_paiement ? `
  <div class="modalites">
    <h3>Modalités de paiement</h3>
    <p>${data.modalites_paiement}</p>
  </div>` : ''}

  ${data.note ? `<p class="note">${data.note}</p>` : ''}

  <!-- Pied de page -->
  <div class="footer">
    ${data.emetteur_nom} — Merci pour votre confiance.
  </div>

</body>
</html>`;
}
