import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('frais_setup')
export class FraisSetup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'label', type: 'varchar', length: 255 })
  label: string;

  @Column({ name: 'montant', type: 'real' })
  montant: number;

  @Column({ name: 'devise', type: 'varchar', length: 5, default: 'XOF' })
  devise: string;

  @Column({ name: 'est_actif', type: 'boolean', default: true })
  est_actif: boolean;

  @Column({ name: 'ordre', type: 'integer', default: 0 })
  ordre: number;
}
