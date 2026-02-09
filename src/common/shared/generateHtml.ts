import * as fs from 'fs';
import * as path from 'path';

export function generateHtml(data: any): string {
  const templatePath = 'src/templates/facture.html'; //path.join(__dirname, 'facture.html');
  const template = fs.readFileSync(templatePath, 'utf8');
  console.log(data);
  
  const lignes = data?.detail_vente?.map((p: { produit: any; quantite: number; prix: number; }) => `
    <tr>
      <td>${p.produit}</td>
      <td>${p.quantite}</td>
      <td>${p.prix.toLocaleString('fr-FR')}</td>
      <td>${(p.quantite * p.prix).toLocaleString('fr-FR')}</td>
    </tr>
  `).join('');

  return template
    .replace(/{{nom_boutique}}/g, data.boutique?.nom || '')
    .replace(/{{logo_boutique}}/g, data.boutique?.logo || null)
    .replace(/{{adresse_boutique}}/g, data.boutique?.situation_geo || '')
    .replace(/{{phone_boutique}}/g, data.boutique?.telephone || null)
    .replace(/{{email_boutique}}/g, data.boutique?.email || null)
    .replace(/{{reference}}/g, data.reference)
    .replace(/{{client}}/g, data.client)
    .replace(
      /{{date}}/g,
      (() => {
        const d = new Date(data.date_vente);

        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).padStart(4, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');

        return `${day}-${month}-${year} à ${hours}:${minutes}:${seconds}`;
      })()
    )
    .replace(/{{lignes}}/g, lignes)
    .replace(/{{total}}/g, data.montant_total.toLocaleString('fr-FR'))
    .replace(/{{remise}}/g, data.remise.toLocaleString('fr-FR'))
    .replace(/{{net_a_payer}}/g, data.montant_total_apres_remise.toLocaleString('fr-FR'));
}

