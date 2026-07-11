import { defaultDateGeneratorHelper } from 'src/common/helpers/default-date-genarate';
import { Boutique } from 'src/gestion-boutiques/boutique/entities/boutique.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

export type StatutTable = 'libre' | 'occupee' | 'reservee';

@Entity('t_tables_restaurant')
export class TableRestaurant extends defaultDateGeneratorHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'r_numero', type: 'character varying', length: 20 })
  numero: string;

  @Column({ name: 'r_nom', type: 'character varying', length: 100, nullable: true })
  nom: string | null;

  @Column({ name: 'r_capacite', type: 'integer', default: 4 })
  capacite: number;

  @Column({
    name: 'r_statut',
    type: 'enum',
    enum: ['libre', 'occupee', 'reservee'],
    default: 'libre',
  })
  statut: StatutTable;

  @ManyToOne(() => Boutique, { eager: false, nullable: false })
  boutique: Boutique;

  /** True si le client a demandé un serveur via QR */
  @Column({ name: 'r_appel_serveur', type: 'boolean', default: false })
  appel_serveur: boolean;
}
