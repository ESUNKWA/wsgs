import * as fs from 'fs';
import * as path from 'path';

export function generateHtml(data: any, documentType = 'FACTURE'): string {
  const templatePath = 'src/templates/facture.html';
  const template = fs.readFileSync(templatePath, 'utf8');

  const lignes = data?.detail_vente?.map((p: { produit: any; quantite: number; prix: number }) => `
    <tr>
      <td>${p.produit}</td>
      <td>${p.quantite}</td>
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

  return template
    .replace(/{{document_type}}/g, documentType)
    .replace(/{{client_nom}}/g, data?.nom_client || '-')
    .replace(/{{client_telephone}}/g, data?.telephone_client || '-')
    .replace(/{{nom_boutique}}/g, data?.nom_boutique || '')
    .replace(/{{logo_boutique}}/g, data?.logo_boutique || '')
    .replace(/{{adresse_boutique}}/g, data?.adresse_boutique || '')
    .replace(/{{phone_boutique}}/g, data?.phone_boutique || '')
    .replace(/{{email_boutique}}/g, data?.email_boutique || '')
    .replace(/{{reference}}/g, data?.reference || '')
    .replace(/{{statut}}/g, data?.statut || '')
    .replace(/{{date}}/g, formatDate(data?.date_vente))
    .replace(/{{lignes}}/g, lignes || '')
    .replace(/{{total}}/g, Number(data?.montant_total || 0).toLocaleString('fr-FR'))
    .replace(/{{remise}}/g, Number(data?.remise || 0).toLocaleString('fr-FR'))
    .replace(/{{net_a_payer}}/g, Number(data?.montant_total_apres_remise || data?.montant_total || 0).toLocaleString('fr-FR'));
}

