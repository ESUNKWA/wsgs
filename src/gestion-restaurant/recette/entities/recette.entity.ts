import { defaultDateGeneratorHelper } from 'src/common/helpers/default-date-genarate';
import { Boutique } from 'src/gestion-boutiques/boutique/entities/boutique.entity';
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { CompositionRecette } from './composition-recette.entity';

@Entity('t_recettes')
export class Recette extends defaultDateGeneratorHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'r_nom', type: 'character varying', length: 150 })
  nom: string;

  @Column({ name: 'r_description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'r_categorie', type: 'character varying', length: 100, nullable: true })
  categorie: string | null;

  @Column({ name: 'r_prix_vente', type: 'real', default: 0 })
  prix_vente: number;

  @Column({ name: 'r_actif', type: 'boolean', default: true })
  actif: boolean;

  @ManyToOne(() => Boutique, { eager: false, nullable: false })
  boutique: Boutique;

  @OneToMany(() => CompositionRecette, (c) => c.recette, { cascade: true })
  compositions: CompositionRecette[];
}
