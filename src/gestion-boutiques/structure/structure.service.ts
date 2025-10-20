import { Injectable, InternalServerErrorException, NotAcceptableException, NotFoundException } from '@nestjs/common';
import { CreateStructureDto } from './dto/create-structure.dto';
import { UpdateStructureDto } from './dto/update-structure.dto';
import { Structure } from './entities/structure.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as fs from 'fs';
import { UtilisateursService } from 'src/gestion-utilisateurs/utilisateurs/utilisateurs.service';
import { Utilisateur } from 'src/gestion-utilisateurs/utilisateurs/entities/utilisateur.entity';
import { ProfilsService } from 'src/gestion-utilisateurs/profils/profils.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class StructureService {

  constructor( 
      @InjectRepository(Structure)
      private structureRepository: Repository<Structure>,

      private userService: UtilisateursService,
      private profileService: ProfilsService,
      private readonly dataSource: DataSource
    ){}

  async create(createStructureDto: CreateStructureDto, file?: Express.Multer.File): Promise<any> {
    
    try {

      //Récupération des profils
      const profils = await this.profileService.findAll();
      const profilResponsable = profils.find(p => p.code === 'responsable_structure');

      if (!profilResponsable) {
        throw new NotAcceptableException('Profil du reponsable non trouvé');
      }

      createStructureDto.responsable.profil = profilResponsable;
      const hashPassword = await bcrypt.hash(createStructureDto.responsable.mot_de_passe, 10);
      createStructureDto.responsable.mot_de_passe = hashPassword;

      return await this.dataSource.transaction(async (manager)=>{

        //créer un nouvel utilisateurs
        const user = manager.create(Utilisateur, createStructureDto.responsable);
        const registerClient = await manager.save(user);


        const structure = manager.create(Structure,{
          ...createStructureDto,
          logo: file ? 'uploads/logos/'+file.filename : null,
          responsable: user  // Enregistre le nom du fichier de l'image
        });
        const saveStructure = await manager.save(structure);
        
        return structure;
      });


      /* const saveUser = await this.userService.create(createStructureDto.responsable);

      const structure = this.structureRepository.create({
        ...createStructureDto,
        logo: file ? 'uploads/logos/'+file.filename : null,  // Enregistre le nom du fichier de l'image
      });
      const saveStructure = await this.structureRepository.save(structure);

      return saveStructure */

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
