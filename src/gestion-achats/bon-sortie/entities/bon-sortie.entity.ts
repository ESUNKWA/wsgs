import { defaultDateGeneratorHelper } from 'src/common/helpers/default-date-genarate';
import { Boutique } from 'src/gestion-boutiques/boutique/entities/boutique.entity';
import { Utilisateur } from 'src/gestion-utilisateurs/utilisateurs/entities/utilisateur.entity';
import { Column, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { LigneBonSortie } from './ligne-bon-sortie.entity';

@Entity('t_bons_sortie')
export class BonSortie extends defaultDateGeneratorHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'r_reference', type: 'character varying', length: 30, unique: true })
  reference: string;

  @Column({ name: 'r_motif', type: 'text', nullable: true })
  motif: string;

  @ManyToOne(() => Boutique, { eager: true, nullable: false })
  boutiqueSource: Boutique;

  @ManyToOne(() => Boutique, { eager: true, nullable: false })
  departement: Boutique;

  @ManyToOne(() => Utilisateur, { eager: true, nullable: true })
  utilisateur: Utilisateur;

  @OneToMany(() => LigneBonSortie, (l) => l.bonSortie, { cascade: true, eager: true })
  lignes: LigneBonSortie[];
}
