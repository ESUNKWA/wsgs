import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type ModuleCode =
  | 'commandes_fournisseurs'
  | 'devis'
  | 'commandes_clients'
  | 'retours_produits'
  | 'caisse'
  | 'ia'
  | 'restauration'
  | 'clients'
  | 'fournisseurs';

export const ALL_MODULES: ModuleCode[] = [
  'commandes_fournisseurs',
  'devis',
  'commandes_clients',
  'retours_produits',
  'caisse',
  'ia',
  'restauration',
  'clients',
  'fournisseurs',
];

@Entity('module_structures')
export class ModuleStructure {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'structure_id' })
  structureId: number;

  @Column({ name: 'module', type: 'varchar', length: 50 })
  module: ModuleCode;

  @Column({ name: 'est_actif', type: 'boolean', default: false })
  est_actif: boolean;
}
