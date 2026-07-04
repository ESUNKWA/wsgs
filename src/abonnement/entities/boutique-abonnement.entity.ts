import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('boutique_abonnements')
export class BoutiqueAbonnement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'structure_id' })
  structureId: number;

  @Column({ name: 'boutique_id' })
  boutiqueId: number;

  @Column({ name: 'boutique_nom', type: 'varchar', length: 50 })
  boutiqueNom: string;

  @Column({ name: 'est_active', type: 'boolean', default: true })
  est_active: boolean;

  @CreateDateColumn({ name: 'date_ajout' })
  date_ajout: Date;

  @Column({ name: 'date_desactivation', type: 'timestamp', nullable: true })
  date_desactivation: Date | null;
}
