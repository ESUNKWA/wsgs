import { defaultDateGeneratorHelper } from 'src/common/helpers/default-date-genarate';
import { Boutique } from 'src/gestion-boutiques/boutique/entities/boutique.entity';
import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

export type StatutCaisse = 'ACTIVE' | 'INACTIVE';

@Entity('t_caisses')
export class Caisse extends defaultDateGeneratorHelper {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'r_nom', type: 'character varying', length: 100 })
  nom!: string;

  @Index()
  @Column({ name: 'r_code', type: 'character varying', length: 20 })
  code!: string;

  @Column({ name: 'r_description', nullable: true, type: 'text' })
  description!: string | null;

  @Column({ name: 'r_emplacement', nullable: true, type: 'character varying', length: 150 })
  emplacement!: string | null;

  @Column({ name: 'r_statut', type: 'character varying', length: 10, default: 'ACTIVE' })
  statut!: StatutCaisse;

  @ManyToOne(() => Boutique, { nullable: false, eager: false })
  boutique!: Boutique;
}
