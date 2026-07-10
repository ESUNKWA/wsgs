import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CommandeFournisseur, StatutCommandeFournisseur } from './entities/commande-fournisseur.entity';
import { DetailCommandeFournisseur } from './entities/detail-commande-fournisseur.entity';
import { CreateCommandeFournisseurDto } from './dto/create-commande-fournisseur.dto';
import { ReferenceGeneratorHelper } from 'src/common/helpers/reference-generator.helper';
import { AchatService } from '../achat/achat.service';
import { Utilisateur } from 'src/gestion-utilisateurs/utilisateurs/entities/utilisateur.entity';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { PdfService } from 'src/documents/pdf/pdf.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CommandeFournisseurService {

  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly achatService: AchatService,
    private readonly pdfService: PdfService,
  ) {}

  private get dataSource() { return this.tenantContext.getDataSource(); }
  private get commandeRepository() { return this.dataSource.getRepository(CommandeFournisseur); }

  async create(createDto: CreateCommandeFournisseurDto): Promise<CommandeFournisseur> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const telephone = String((createDto as any).user ?? '').trim();
        let tenantUser: Utilisateur | null = null;
        if (telephone) {
          tenantUser = await manager.findOne(Utilisateur, { where: { telephone } });
        }

        createDto.reference = ReferenceGeneratorHelper.generate('BCF');
        createDto['statut'] = 'brouillon';

        const { detail_commande, ...commandeData } = createDto as any;

        const commande = manager.create(CommandeFournisseur, {
          ...commandeData,
          boutique:    { id: +createDto.boutique },
          fournisseur: createDto.fournisseur ? { id: +(createDto.fournisseur as any) } : null,
          user:        tenantUser ?? undefined,
        } as any);
        const commandeSauvegardee = await manager.save(commande);

        const lignes = createDto.detail_commande.map((ligne: any) =>
          manager.create(DetailCommandeFournisseur, {
            produit:       { id: +ligne.produit },
            quantite:      +ligne.quantite,
            prix_unitaire: +ligne.prix_unitaire,
            commande:      commandeSauvegardee,
          })
        );
        await manager.save(lignes);

        return commandeSauvegardee;
      });
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAll(query: { boutique: number; page?: number; limit?: number }) {
    if (isNaN(query.boutique)) {
      throw new BadRequestException('Veuillez préciser la boutique.');
    }
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await this.commandeRepository.findAndCount({
      where: { boutique: { id: query.boutique } },
      relations: ['fournisseur', 'boutique'],
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number): Promise<CommandeFournisseur> {
    const commande = await this.commandeRepository.findOne({
      where: { id },
      relations: ['detail_commande', 'detail_commande.produit', 'fournisseur', 'boutique', 'user'],
    });
    if (!commande) throw new NotFoundException('Commande fournisseur inexistante');
    return commande;
  }

  async updateStatut(id: number, statut: StatutCommandeFournisseur): Promise<CommandeFournisseur> {
    const commande = await this.findOne(id);
    commande.statut = statut;
    return this.commandeRepository.save(commande);
  }

  async update(id: number, updateDto: any): Promise<CommandeFournisseur> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const fields: any = {};
        if (updateDto.boutique    !== undefined) fields.boutique    = { id: +updateDto.boutique };
        if (updateDto.fournisseur !== undefined) fields.fournisseur = updateDto.fournisseur ? { id: +updateDto.fournisseur } : null;
        if (updateDto.date_livraison_prevue !== undefined) fields.date_livraison_prevue = updateDto.date_livraison_prevue;
        if (updateDto.notes         !== undefined) fields.notes         = updateDto.notes;
        if (updateDto.montant_total !== undefined) fields.montant_total = +updateDto.montant_total;

        // Mise à jour directe sans cascade
        await manager.update(CommandeFournisseur, id, fields);

        if (updateDto.detail_commande) {
          await manager.delete(DetailCommandeFournisseur, { commande: { id } });
          const ref = manager.create(CommandeFournisseur, { id } as any);
          const lignes = updateDto.detail_commande.map((ligne: any) =>
            manager.create(DetailCommandeFournisseur, {
              produit:       { id: +ligne.produit },
              quantite:      +ligne.quantite,
              prix_unitaire: +ligne.prix_unitaire,
              commande:      ref,
            })
          );
          await manager.save(lignes);
        }

        return this.findOne(id);
      });
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  // Réception de la commande → crée un achat et met à jour le stock
  async recevoirCommande(
    id: number,
    lignes: { detail_id: number; quantite_recue: number }[],
  ): Promise<any> {
    const commande = await this.findOne(id);

    if (commande.statut === 'annule') {
      throw new BadRequestException('Impossible de recevoir une commande annulée');
    }
    if (commande.statut === 'recu_total') {
      throw new BadRequestException('Cette commande a déjà été entièrement reçue');
    }

    const receptionsMap = new Map(lignes.map(l => [+l.detail_id, +l.quantite_recue]));

    let estTotal = true;
    const detailsAvecReception = commande.detail_commande.map(detail => {
      const qteRecue = receptionsMap.has(detail.id)
        ? receptionsMap.get(detail.id)!
        : detail.quantite;
      if (qteRecue < detail.quantite) estTotal = false;
      return { ...detail, qteRecue };
    });

    const lignesNonNulles = detailsAvecReception.filter(d => d.qteRecue > 0);
    if (!lignesNonNulles.length) {
      throw new BadRequestException('Aucune quantité reçue renseignée');
    }

    const montantTotal = lignesNonNulles.reduce(
      (sum, d) => sum + d.qteRecue * d.prix_unitaire, 0,
    );

    const achatDto: any = {
      boutique: commande.boutique,
      fournisseur: commande.fournisseur,
      montant_total: montantTotal,
      statut: 'validé',
      user: (commande as any).user?.telephone ?? null,
      detail_achat: lignesNonNulles.map(d => ({
        produit: d.produit.id,
        quantite: d.qteRecue,
        prix_unitaire: d.prix_unitaire,
      })),
    };

    const achat = await this.achatService.create(achatDto);

    const ds = this.dataSource;
    for (const detail of detailsAvecReception) {
      await ds.query(
        `UPDATE t_detail_commandes_fournisseur SET r_quantite_recue = $1 WHERE id = $2`,
        [detail.qteRecue, detail.id],
      );
    }

    const nouveauStatut: StatutCommandeFournisseur = estTotal ? 'recu_total' : 'recu_partiel';
    await this.commandeRepository.update(id, { statut: nouveauStatut });

    return achat;
  }

  remove(id: number) {
    return this.commandeRepository.softDelete(id);
  }

  async generateBonCommande(id: number): Promise<Buffer> {
    const commande = await this.findOne(id);
    const boutique = (commande as any).boutique;
    const fournisseur = commande.fournisseur;

    const dateCommande = new Date(commande.created_at).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
    const dateLivraison = commande.date_livraison_prevue
      ? new Date(commande.date_livraison_prevue).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
      : '—';

    let logoDataUrl = '';
    if (boutique?.logo) {
      try {
        const diskPath = path.join(process.cwd(), 'public', boutique.logo.replace(/^api\//, ''));
        const ext = path.extname(diskPath).toLowerCase().replace('.', '');
        const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
        const data = fs.readFileSync(diskPath);
        logoDataUrl = `data:${mime};base64,${data.toString('base64')}`;
      } catch { /* logo absent ou illisible, on continue sans */ }
    }

    const lignesHtml = (commande.detail_commande ?? []).map((d, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td>${d.produit?.nom ?? '—'}</td>
        <td class="center">${d.quantite}</td>
        <td class="right">${Number(d.prix_unitaire).toLocaleString('fr-FR')} FCFA</td>
        <td class="right bold">${(d.quantite * d.prix_unitaire).toLocaleString('fr-FR')} FCFA</td>
      </tr>`).join('');

    const montant = Number(commande.montant_total ?? 0).toLocaleString('fr-FR');

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11pt; color: #222; padding: 20mm; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10mm; border-bottom: 2px solid #1a56db; padding-bottom: 6mm; }
  .boutique-info { display: flex; align-items: center; gap: 4mm; }
  .boutique-logo { width: 22mm; height: 22mm; object-fit: contain; flex-shrink: 0; }
  .boutique-text h1 { font-size: 15pt; color: #1a56db; margin-bottom: 1mm; line-height: 1.2; }
  .boutique-text p  { font-size: 9pt; color: #555; line-height: 1.5; margin: 0; }
  .doc-title { text-align: right; }
  .doc-title h2 { font-size: 22pt; font-weight: bold; color: #1a56db; text-transform: uppercase; letter-spacing: 3px; line-height: 1.1; }
  .doc-title .ref { font-size: 10pt; color: #444; margin-top: 2mm; font-weight: 600; }
  .doc-title .date { font-size: 9pt; color: #888; margin-top: 1mm; }
  .parties { display: flex; gap: 20mm; margin-bottom: 8mm; }
  .partie { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 5mm; }
  .partie h3 { font-size: 8pt; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 3mm; }
  .partie p  { font-size: 10pt; line-height: 1.7; }
  .partie .nom { font-weight: bold; font-size: 11pt; color: #1a1a1a; }
  .meta { display: flex; gap: 8mm; margin-bottom: 8mm; }
  .meta-item { background: #eff6ff; border-left: 3px solid #1a56db; padding: 3mm 5mm; font-size: 9pt; }
  .meta-item span { display: block; color: #888; font-size: 8pt; margin-bottom: 1mm; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 6mm; }
  thead th { background: #1a56db; color: #fff; padding: 3mm 4mm; font-size: 9pt; text-align: left; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  tbody td { padding: 3mm 4mm; border-bottom: 1px solid #e2e8f0; font-size: 10pt; }
  tfoot td { padding: 3mm 4mm; font-weight: bold; background: #eff6ff; border-top: 2px solid #1a56db; }
  .num    { width: 8mm; color: #888; font-size: 9pt; }
  .center { text-align: center; }
  .right  { text-align: right; }
  .bold   { font-weight: bold; }
  .total-row td { font-size: 12pt; color: #1a56db; }
  .notes { background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 4px; padding: 4mm; font-size: 9pt; color: #555; margin-bottom: 8mm; }
  .footer { text-align: center; font-size: 8pt; color: #aaa; border-top: 1px solid #e2e8f0; padding-top: 4mm; margin-top: 10mm; }
  .signature { display: flex; justify-content: space-between; margin-top: 12mm; }
  .signature-box { width: 60mm; border-top: 1px solid #555; padding-top: 2mm; font-size: 9pt; color: #555; text-align: center; }
</style>
</head>
<body>

  <div class="header">
    <div class="boutique-info">
      ${logoDataUrl ? `<img class="boutique-logo" src="${logoDataUrl}" alt="Logo">` : ''}
      <div class="boutique-text">
        <h1>${boutique?.nom ?? 'Boutique'}</h1>
        <p>${boutique?.situation_geo ?? ''}</p>
        <p>${boutique?.telephone ?? ''}</p>
      </div>
    </div>
    <div class="doc-title">
      <h2>Bon de commande</h2>
      <p class="ref">${commande.reference}</p>
      <p class="date">Émis le ${dateCommande}</p>
    </div>
  </div>

  <div class="parties">
    <div class="partie">
      <h3>Commandeur</h3>
      <p class="nom">${boutique?.nom ?? '—'}</p>
      <p>${boutique?.situation_geo ?? ''}</p>
      <p>${boutique?.telephone ?? ''}</p>
    </div>
    <div class="partie">
      <h3>Fournisseur</h3>
      <p class="nom">${fournisseur?.nom ?? '—'}</p>
      <p>${(fournisseur as any)?.adresse ?? ''}</p>
      <p>${(fournisseur as any)?.telephone ?? ''}</p>
    </div>
  </div>

  <div class="meta">
    <div class="meta-item"><span>Référence</span>${commande.reference}</div>
    <div class="meta-item"><span>Date de commande</span>${dateCommande}</div>
    <div class="meta-item"><span>Livraison prévue</span>${dateLivraison}</div>
    <div class="meta-item"><span>Statut</span>${commande.statut}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="num">#</th>
        <th>Désignation</th>
        <th class="center">Qté</th>
        <th class="right">Prix unitaire</th>
        <th class="right">Total</th>
      </tr>
    </thead>
    <tbody>${lignesHtml}</tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="4" class="right">MONTANT TOTAL</td>
        <td class="right">${montant} FCFA</td>
      </tr>
    </tfoot>
  </table>

  ${commande.notes ? `<div class="notes"><strong>Notes :</strong> ${commande.notes}</div>` : ''}

  <div class="signature">
    <div class="signature-box">Signature émetteur</div>
    <div class="signature-box">Signature fournisseur</div>
  </div>

  <div class="footer">Document généré par NeuStock — ${new Date().toLocaleDateString('fr-FR')}</div>

</body>
</html>`;

    return this.pdfService.generatePdfBuffer(html);
  }
}
