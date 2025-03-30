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
      const produit = this.produitRepository.create({
        ...createProduitDto,
        image: file ? 'uploads/produits/'+file.filename : null,  // Enregistre le nom du fichier de l'image
      });
      return await this.produitRepository.save(produit);

    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAll(body: {boutique: number}): Promise<Produit[]> {
    try {

      if (isNaN(body.boutique)) {
        throw new BadRequestException('Veuillez préciser la boutique');
      }
      // Récupérer tous les produits depuis la base de données
      const produits = await this.produitRepository.find({where: {boutique: {id: body.boutique}}, order: {'nom': 'ASC'}});

      // Ajouter l'URL complète de l'image pour chaque produit
      const produitsWithImagePath = produits.map((produit) => {
      const imagePath = produit.image ? `/uploads/produits/${produit.image}` : null;
        return {
          ...produit,
          imageUrl: imagePath,  // Ajouter le champ imageUrl avec l'URL complète
        };
      });

      return produitsWithImagePath;
    } catch (error) {
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
         if (produitUpd.image) {
          
          const oldImagePath = produitUpd.image; // Construire le chemin complet de l'ancienne image
          
          // Vérifier si le fichier existe et le supprimer
          fs.unlinkSync(oldImagePath);
        }
        
        // Gérer le chemin de l'image ou le nom du fichier (peut-être avec une date ou un UUID pour l'unicité)
        const imagePath = `uploads/produits/${file.filename}`; // Assure-toi que le fichier est dans un dossier public comme 'uploads/produits'
        
        // Mettre à jour le champ image du produit
        produitUpd.image = imagePath;
      }

      return await this.produitRepository.save(produitUpd);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async remove(id: number) {
    return await this.produitRepository.softDelete(id);
  }
}
