import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type TypeTarif = 'montant' | 'pourcentage';

@Entity('config_tarifs')
export class ConfigTarif {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'cle', type: 'varchar', length: 50, unique: true })
  cle: string;

  @Column({ name: 'valeur', type: 'real' })
  valeur: number;

  /** 'montant' = valeur en FCFA fixe ; 'pourcentage' = % du plan de base */
  @Column({ name: 'type', type: 'varchar', length: 20, default: 'montant' })
  type: TypeTarif;

  @Column({ name: 'devise', type: 'varchar', length: 5, default: 'XOF' })
  devise: string;

  @Column({ name: 'description', type: 'varchar', length: 255, nullable: true })
  description: string | null;
}
