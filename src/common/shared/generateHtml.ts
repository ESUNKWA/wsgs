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
    .replace(/{{client}}/g, data.client)
    .replace(/{{date}}/g, new Date().toLocaleDateString('fr-FR'))
    .replace(/{{lignes}}/g, lignes)
    .replace(/{{total}}/g, data.montant_total_apres_remise.toLocaleString('fr-FR'));
}

