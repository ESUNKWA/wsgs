import * as fs from 'fs';
import * as path from 'path';
import { escapeHtml as e, infosPaiementRecu, urlImageSure } from './recu-paiement.helper';

/** Lignes "Paiement / Montant reçu / Monnaie rendue" du tableau des totaux (vide pour un devis). */
function lignesPaiement(data: any): string {
  const paiement = infosPaiementRecu(data);
  if (!paiement) return '';
  const fmt = (n: number) => Number(n || 0).toLocaleString('fr-FR');
  let html = `<tr><td class="sub-label">Mode de paiement</td><td class="sub-value">${paiement.mode}</td></tr>`;
  if (paiement.montantRecu !== null) {
    html += `<tr><td class="sub-label">Montant reçu</td><td class="sub-value">${fmt(paiement.montantRecu)} FCFA</td></tr>`;
    html += `<tr><td class="sub-label">Monnaie rendue</td><td class="sub-value">${fmt(paiement.monnaieRendue ?? 0)} FCFA</td></tr>`;
  }
  return html;
}

export function generateHtml(data: any, documentType = 'FACTURE'): string {
  const templatePath = 'src/templates/facture.html';
  const template = fs.readFileSync(templatePath, 'utf8');

  const lignes = data?.detail_vente?.map((p: { produit: any; quantite: number; prix: number }) => `
    <tr>
      <td>${e(p.produit)}</td>
      <td>${e(p.quantite)}</td>
      <td>${Number(p.prix).toLocaleString('fr-FR')}</td>
      <td>${(p.quantite * p.prix).toLocaleString('fr-FR')}</td>
    </tr>
  `).join('');

  const formatDate = (dateVal: any) => {
    if (!dateVal) return '-';
    const d = new Date(dateVal);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).padStart(4, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}-${month}-${year} à ${hours}:${minutes}:${seconds}`;
  };

  // Sécurité : toutes les données sont échappées (le HTML est aussi rendu dans le navigateur),
  // et le remplacement se fait en une seule passe : une valeur contenant "{{…}}" n'est jamais
  // réinterprétée, et les motifs spéciaux de String.replace ($&, $1…) ne s'appliquent pas.
  const valeurs: Record<string, string> = {
    document_type: e(documentType),
    client_nom: e(data?.nom_client || '-'),
    client_telephone: e(data?.telephone_client || '-'),
    nom_boutique: e(data?.nom_boutique || ''),
    logo_boutique: urlImageSure(data?.logo_boutique),
    adresse_boutique: e(data?.adresse_boutique || ''),
    phone_boutique: e(data?.phone_boutique || ''),
    email_boutique: e(data?.email_boutique || ''),
    reference: e(data?.reference || ''),
    statut: e(data?.statut || ''),
    date: e(formatDate(data?.date_vente)),
    lignes: lignes || '', // déjà construit avec des valeurs échappées
    total: Number(data?.montant_total || 0).toLocaleString('fr-FR'),
    remise: Number(data?.remise || 0).toLocaleString('fr-FR'),
    net_a_payer: Number(data?.montant_total_apres_remise || data?.montant_total || 0).toLocaleString('fr-FR'),
    paiement: documentType === 'DEVIS' ? '' : lignesPaiement(data),
  };

  return template.replace(/{{(\w+)}}/g, (motif: string, cle: string) =>
    Object.prototype.hasOwnProperty.call(valeurs, cle) ? valeurs[cle] : motif,
  );
}

