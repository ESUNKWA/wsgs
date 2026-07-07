import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';
import { Produit } from './entities/produit.entity';
import { Categorie } from 'src/config/categorie/entities/categorie.entity';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { buildTenantFilePath } from 'src/common/helpers/tenant-file.helper';
import { BarcodeHelper } from 'src/common/helpers/barcode.helper';
import { PdfService } from 'src/documents/pdf/pdf.service';
import { IsNull } from 'typeorm';
import * as XLSX from 'xlsx';

@Injectable()
export class ProduitService {

  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly pdfService: PdfService,
  ) {}

  private get produitRepository() {
    return this.tenantContext.getDataSource().getRepository(Produit);
  }

  private get categorieRepository() {
    return this.tenantContext.getDataSource().getRepository(Categorie);
  }

  async create(createProduitDto: CreateProduitDto, file?: Express.Multer.File): Promise<Produit> {
    try {
      createProduitDto.stock_disponible = createProduitDto.stock_initial;
      const structureId = this.tenantContext.getStructureId();
      const produit = this.produitRepository.create({
        ...createProduitDto,
        code_barre: createProduitDto.code_barre || BarcodeHelper.generateEan13(structureId ?? 0),
        image: file ? buildTenantFilePath(structureId, 'produits', file.filename) : null,
      });
      return await this.produitRepository.save(produit);
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAll(query: { boutique: number; page?: number; limit?: number }) {
    try {
      const { boutique } = query;
      if (isNaN(boutique)) throw new BadRequestException('Veuillez préciser la boutique');
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 50;
      const skip = (page - 1) * limit;

      const [produits, total] = await this.produitRepository.findAndCount({
        where: { boutique: { id: +boutique } },
        order: { nom: 'ASC' },
        skip,
        take: limit,
      });

      const items = produits.map((produit) => ({
        ...produit,
        imageUrl: produit.image ? `${String(process.env.BASE_URL)}/${produit.image}` : null,
      }));

      return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findOne(id: number): Promise<Produit> {
    const data = await this.produitRepository.findOne({ where: { id } });
    if (!data) throw new NotFoundException('Produit inexistant');
    return data;
  }

  async findByCodeBarre(code: string, boutiqueId: number): Promise<Produit> {
    const produit = await this.produitRepository.findOne({
      where: { code_barre: code, boutique: { id: boutiqueId } },
    });
    if (!produit) throw new NotFoundException('Aucun produit trouvé pour ce code-barres');
    return produit;
  }

  async update(id: number, updateProduitDto: UpdateProduitDto, file?: Express.Multer.File) {
    try {
      const produitUpd = await this.produitRepository.preload({ id, ...updateProduitDto });
      if (!produitUpd) throw new NotFoundException('Produit inexistant');
      if (file) {
        const structureId = this.tenantContext.getStructureId();
        produitUpd.image = buildTenantFilePath(structureId, 'produits', file.filename);
      }
      return await this.produitRepository.save(produitUpd);
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async remove(id: number) {
    return await this.produitRepository.softDelete(id);
  }

  async generateCatalogueCodeBarres(boutiqueId: number): Promise<Buffer> {
    const structureId = this.tenantContext.getStructureId();

    // Étape 1 : assigner un code-barre aux produits qui n'en ont pas (SQL direct)
    const ds = this.tenantContext.getDataSource();
    const sansCodes = await this.produitRepository.find({
      where: { boutique: { id: boutiqueId }, code_barre: IsNull() },
      order: { nom: 'ASC' },
    });
    for (const p of sansCodes) {
      const newCode = BarcodeHelper.generateEan13(structureId ?? 0);
      await ds.query(
        `UPDATE t_produits SET r_code_barre = $1 WHERE id = $2`,
        [newCode, p.id],
      );
    }

    // Étape 2 : re-lire depuis la base pour garantir que le PDF = base de données
    const produits = await this.produitRepository.find({
      where: { boutique: { id: boutiqueId } },
      order: { nom: 'ASC' },
    });
    if (!produits.length) throw new NotFoundException('Aucun produit trouvé pour cette boutique');

    const produitsAvecCode = produits.filter(p => !!p.code_barre);
    if (!produitsAvecCode.length) throw new NotFoundException('Aucun produit avec code-barres');

    // Génère toutes les images en parallèle
    const items = await Promise.all(
      produitsAvecCode.map(async (p) => {
        const img = await BarcodeHelper.toBase64Png(p.code_barre!);
        const prix = p.prix_vente ? `${Number(p.prix_vente).toLocaleString('fr-FR')} FCFA` : '';
        return { nom: p.nom, code: p.code_barre, img, prix };
      }),
    );

    const cells = items.map(item => `
      <div class="cell">
        <p class="nom">${item.nom}</p>
        <img src="${item.img}" alt="${item.code}">
        <p class="code">${item.code}</p>
        ${item.prix ? `<p class="prix">${item.prix}</p>` : ''}
      </div>`).join('');

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #fff; padding: 8mm; }
    h1 { font-size: 13pt; color: #222; margin-bottom: 5mm; border-bottom: 1px solid #ccc; padding-bottom: 3mm; }
    .grid { display: flex; flex-wrap: wrap; gap: 4mm; }
    .cell {
      width: 55mm;
      border: 1px solid #ddd;
      border-radius: 2mm;
      padding: 3mm;
      text-align: center;
      page-break-inside: avoid;
      background: #fff;
    }
    .nom  { font-size: 8pt; font-weight: bold; margin-bottom: 2mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #111; }
    img   { width: 100%; max-height: 20mm; object-fit: contain; margin: 1mm 0; }
    .code { font-size: 7pt; color: #666; letter-spacing: 1px; font-family: 'Courier New', monospace; }
    .prix { font-size: 9pt; font-weight: bold; color: #222; margin-top: 2mm; }
  </style>
</head>
<body>
  <h1>Catalogue codes-barres — ${items.length} produit(s)</h1>
  <div class="grid">${cells}</div>
</body>
</html>`;

    return this.pdfService.generatePdfBuffer(html);
  }

  async generateEtiquette(id: number, copies = 1): Promise<Buffer> {
    const produit = await this.produitRepository.findOne({ where: { id } });
    if (!produit) throw new NotFoundException('Produit inexistant');

    if (!produit.code_barre) {
      const structureId = this.tenantContext.getStructureId();
      produit.code_barre = BarcodeHelper.generateEan13(structureId ?? 0);
      await this.produitRepository.save(produit);
    }

    const barcodeImg = await BarcodeHelper.toBase64Png(produit.code_barre);
    const prix = produit.prix_vente ? `${Number(produit.prix_vente).toLocaleString('fr-FR')} FCFA` : '';

    const label = `
      <div class="label">
        <p class="nom">${produit.nom}</p>
        <img src="${barcodeImg}" alt="barcode" />
        <p class="code">${produit.code_barre}</p>
        ${prix ? `<p class="prix">${prix}</p>` : ''}
      </div>`;

    const labelRepeat = Array(copies).fill(label).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; background: #fff; }
  .grid { display: flex; flex-wrap: wrap; gap: 2mm; padding: 4mm; }
  .label {
    width: 50mm; border: 1px solid #ccc; border-radius: 2mm;
    padding: 2mm; text-align: center; page-break-inside: avoid;
  }
  .nom  { font-size: 9pt; font-weight: bold; margin-bottom: 1mm; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  img   { width: 100%; max-height: 18mm; object-fit: contain; }
  .code { font-size: 7pt; color: #555; margin-top: 1mm; letter-spacing: 1px; }
  .prix { font-size: 10pt; font-weight: bold; color: #1a1a1a; margin-top: 1mm; }
</style>
</head>
<body>
  <div class="grid">${labelRepeat}</div>
</body>
</html>`;

    return this.pdfService.generatePdfBuffer(html);
  }

  async importFromFile(
    file: Express.Multer.File,
    boutiqueId: number,
  ): Promise<{ created: number; skipped: number; errors: string[] }> {
    if (!boutiqueId || isNaN(boutiqueId)) {
      throw new BadRequestException('Veuillez préciser la boutique');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows.length) throw new BadRequestException('Le fichier est vide');

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const nom = String(row['nom'] ?? row['Nom'] ?? '').trim();

      if (!nom) {
        errors.push(`Ligne ${i + 2} : le champ "nom" est obligatoire`);
        skipped++;
        continue;
      }

      const prixAchat = parseFloat(row['prix_achat'] ?? row['Prix achat'] ?? 0);
      const prixVente = parseFloat(row['prix_vente'] ?? row['Prix vente'] ?? 0);

      if (isNaN(prixAchat) || isNaN(prixVente)) {
        errors.push(`Ligne ${i + 2} (${nom}) : prix_achat et prix_vente doivent être des nombres`);
        skipped++;
        continue;
      }

      let categorie: Categorie | null = null;
      const categorieNom = String(row['categorie'] ?? row['Catégorie'] ?? row['categorie_nom'] ?? '').trim();
      if (categorieNom) {
        categorie = await this.categorieRepository.findOne({
          where: { nom: categorieNom, boutique: { id: boutiqueId } },
        });
        if (!categorie) {
          errors.push(`Ligne ${i + 2} (${nom}) : catégorie "${categorieNom}" introuvable`);
          skipped++;
          continue;
        }
      }

      const stockInitial = parseFloat(row['stock_initial'] ?? row['Stock initial'] ?? 0) || 0;

      try {
        const entity = this.produitRepository.create();
        entity.nom              = nom;
        entity.prix_achat       = prixAchat;
        entity.prix_vente       = prixVente;
        entity.stock_initial    = stockInitial;
        entity.stock_disponible = stockInitial;
        entity.stock_minimum    = parseFloat(row['stock_minimum'] ?? row['Stock minimum'] ?? 0) || 0;
        entity.seuil_alert      = parseInt(row['seuil_alert'] ?? row['Seuil alerte'] ?? 2) || 2;
        entity.unite_mesure     = String(row['unite_mesure'] ?? row['Unité'] ?? 'pièce').trim() || 'pièce';
        (entity as any).code_barre  = String(row['code_barre'] ?? row['Code barre'] ?? '').trim() || null;
        (entity as any).description = String(row['description'] ?? row['Description'] ?? '').trim() || null;
        (entity as any).categorie   = categorie ?? null;
        (entity as any).boutique    = { id: boutiqueId };
        await this.produitRepository.save(entity);
        created++;
      } catch (error: any) {
        if (error.code === '23505') {
          skipped++;
        } else {
          errors.push(`Ligne ${i + 2} (${nom}) : ${error.message}`);
          skipped++;
        }
      }
    }

    return { created, skipped, errors };
  }
}
