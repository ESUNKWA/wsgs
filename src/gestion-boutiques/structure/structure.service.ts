import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateStructureDto } from './dto/create-structure.dto';
import { UpdateStructureDto } from './dto/update-structure.dto';
import { Structure } from './entities/structure.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';

@Injectable()
export class StructureService {

  constructor( 
      @InjectRepository(Structure)
      private structureRepository: Repository<Structure> ){}

  async create(createStructureDto: CreateStructureDto, file?: Express.Multer.File): Promise<Structure> {
    
    try {
      const data = this.structureRepository.create({
        ...createStructureDto,
        logo: file ? 'uploads/logos/'+file.filename : null,  // Enregistre le nom du fichier de l'image
      });
      return await this.structureRepository.save(data);

    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
    
  }

  async findAll(): Promise<Structure[]> {
    // Récupérer tous les produits depuis la base de données
    const structure = await this.structureRepository.find({order: {'nom': 'ASC'}});

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

  async findOne(id: number): Promise<Structure> {
   const data = await this.structureRepository.findOne({where: {
         id: id
       }});
       
       if(!data){
         throw new NotFoundException('Produit inexistant');
       }
       return data;
  }

  async update(id: number, updateStructureDto: UpdateStructureDto, file?: Express.Multer.File) {
    try {
          const structure = await this.structureRepository.preload({id, ...updateStructureDto});
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
    
          return await this.structureRepository.save(structure);
        } catch (error) {
          throw new InternalServerErrorException(error.message);
        }
  }

  remove(id: number) {
    return `This action removes a #${id} structure`;
  }
}
