import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('config_tarifs')
export class ConfigTarif {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'cle', type: 'varchar', length: 50, unique: true })
  cle: string;

  @Column({ name: 'valeur', type: 'real' })
  valeur: number;

  @Column({ name: 'devise', type: 'varchar', length: 5, default: 'XOF' })
  devise: string;

  @Column({ name: 'description', type: 'varchar', length: 255, nullable: true })
  description: string | null;
}
