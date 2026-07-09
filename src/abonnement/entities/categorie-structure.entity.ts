import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('categories_structures')
export class CategorieStructure {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'label', type: 'varchar', length: 100, unique: true })
  label: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'est_actif', type: 'boolean', default: true })
  est_actif: boolean;

  @Column({ name: 'ordre', type: 'integer', default: 0 })
  ordre: number;
}
