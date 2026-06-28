import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';
import { Repository } from 'typeorm';
import { Produit } from './entities/produit.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';

@Injectable()
export class ProduitService {

  constructor( 
    @InjectRepository(Produit)
    private produitRepository: Repository<Produit> ){}

  async create(createProduitDto: CreateProduitDto, file?: Express.Multer.File): Promise<Produit> {
    try {
      createProduitDto.stock_disponible = createProduitDto.stock_initial;
      const produit = this.produitRepository.create({
        ...createProduitDto,
        image: file ? 'uploads/produits/'+file.filename : null,  // Enregistre le nom du fichier de l'image
      });
      return await this.produitRepository.save(produit);

    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAll(query: { boutique: number; page?: number; limit?: number }) {
    try {
      const { boutique } = query;
      if (isNaN(boutique)) {
        throw new BadRequestException('Veuillez préciser la boutique');
      }
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
        imageUrl: `${String(process.env.BASE_URL)}/${produit.image}`,
      }));

      return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findOne(id: number): Promise<Produit> {

    const data = await this.produitRepository.findOne({where: {
      id: id
    }});
    
    if(!data){
      throw new NotFoundException('Produit inexistant');
    }
    return data;
    
  }

  async update(id: number, updateProduitDto: UpdateProduitDto, file?: Express.Multer.File) {
    try {
      const produitUpd = await this.produitRepository.preload({id, ...updateProduitDto});
      if(!produitUpd){
        throw new NotFoundException('Produit inexistant');
      }

       // Si un fichier est fourni (image), on met à jour l'image du produit
       if (file) {
        
        
         // Supprimer l'ancienne image si elle existe
         if (produitUpd?.image) {
            
          const oldImagePath = produitUpd?.image; // Construire le chemin complet de l'ancienne image
       
          // Vérifier si le fichier existe et le supprimer
          //fs.unlinkSync(oldImagePath);
        }
        
        // Gérer le chemin de l'image ou le nom du fichier (peut-être avec une date ou un UUID pour l'unicité)
        const imagePath = `api/produits/${file?.filename}`; // Assure-toi que le fichier est dans un dossier public comme 'uploads/produits'
        
        // Mettre à jour le champ image du produit
        produitUpd.image = imagePath;
      }

      return await this.produitRepository.save(produitUpd);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findByCodeBarre(code: string, boutiqueId: number): Promise<Produit> {
    const produit = await this.produitRepository.findOne({
      where: { code_barre: code, boutique: { id: boutiqueId } },
    });
    if (!produit) throw new NotFoundException('Aucun produit trouvé pour ce code-barres');
    return produit;
  }

  async remove(id: number) {
    return await this.produitRepository.softDelete(id);
  }
}
