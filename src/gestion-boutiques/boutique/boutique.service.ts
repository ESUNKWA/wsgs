import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateBoutiqueDto } from './dto/create-boutique.dto';
import { UpdateBoutiqueDto } from './dto/update-boutique.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Boutique } from './entities/boutique.entity';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import { Structure } from '../structure/entities/structure.entity';

@Injectable()
export class BoutiqueService {

  constructor( 
        @InjectRepository(Boutique)
        private boutiqueRepository: Repository<Boutique> ){}
        
  async create(createBoutiqueDto: CreateBoutiqueDto, file?: Express.Multer.File): Promise<Boutique> {
      
      try {
        const data = this.boutiqueRepository.create({
          ...createBoutiqueDto,
          logo: file ? 'uploads/logos/'+file.filename : null,  // Enregistre le nom du fichier de l'image
        });
        return await this.boutiqueRepository.save(data);
  
      } catch (error) {
        throw new InternalServerErrorException(error.message);
      }
      
  }
  
  async findAll(): Promise<Boutique[]> {
    // Récupérer tous les produits depuis la base de données
    const structure = await this.boutiqueRepository.find({order: {'nom': 'ASC'}});

    // Ajouter l'URL complète de l'image pour chaque produit
    const structureWithLogoPath = structure.map((structure) => {
    const logoPath = structure.logo ? `${structure.logo}` : null;
      return {
        ...structure,
        imageUrl: logoPath,  // Ajouter le champ imageUrl avec l'URL complète
      };
    });

    return structureWithLogoPath;
  }
  
  async findOne(id: number): Promise<Boutique> {
    const data = await this.boutiqueRepository.findOne({where: {
          id: id
        }});
        
        if(!data){
          throw new NotFoundException('Produit inexistant');
        }
        return data;
  }
  
  async update(id: number, updateBoutiqueDto: UpdateBoutiqueDto, file?: Express.Multer.File) {
    try {
          const structure = await this.boutiqueRepository.preload({id, ...updateBoutiqueDto});
          if(!structure){
            throw new NotFoundException('Structure inexistant');
          }
          
            // Si un fichier est fourni (image), on met à jour l'image du produit
          if (file) {
    
              // Supprimer l'ancienne image si elle existe
              if (structure.logo) {
              
              const oldImagePath = structure.logo; // Construire le chemin complet de l'ancienne image
              
              // Vérifier si le fichier existe et le supprimer
              fs.unlinkSync(oldImagePath);
              }
            
            // Gérer le chemin de l'image ou le nom du fichier (peut-être avec une date ou un UUID pour l'unicité)
            const imagePath = `uploads/logos/${file.filename}`; // Assure-toi que le fichier est dans un dossier public comme 'uploads/produits'
            
            // Mettre à jour le champ image du produit
            structure.logo = imagePath;
          }
    
          return await this.boutiqueRepository.save(structure);
        } catch (error) {
          throw new InternalServerErrorException(error.message);
        }
  }
  
  remove(id: number) {
    return `This action removes a #${id} structure`;
  }
}
