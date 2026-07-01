import { Module } from '@nestjs/common';
import { OllamaService } from './ollama.service';
import { OllamaController } from './ollama.controller';
import { ProduitService } from 'src/config/produit/produit.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VenteService } from 'src/gestion-ventes/vente/vente.service';
import { PromptBuilderService } from './ai/prompt-builder/prompt-builder.service';
import { DataProviderService } from './ai/data-provider/data-provider.service';
import { UtilisateursService } from 'src/gestion-utilisateurs/utilisateurs/utilisateurs.service';
import { Utilisateur } from 'src/gestion-utilisateurs/utilisateurs/entities/utilisateur.entity';
import { ProfilsService } from 'src/gestion-utilisateurs/profils/profils.service';
import { Profil } from 'src/gestion-utilisateurs/profils/entities/profil.entity';
import { SourceResolverService } from './SourceResolverService';

@Module({
  imports: [TypeOrmModule.forFeature([Utilisateur, Profil])],
  controllers: [OllamaController],
  providers: [
    OllamaService, ProduitService, VenteService,
    PromptBuilderService, DataProviderService,
    UtilisateursService, ProfilsService, SourceResolverService,
  ],
})
export class OllamaModule {}
