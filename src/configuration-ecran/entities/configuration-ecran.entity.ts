import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Unique(['boutique_type', 'profil_code'])
@Entity('t_configurations_ecran')
export class ConfigurationEcran {
  @PrimaryGeneratedColumn()
  id: number;

  /** null = wildcard (s'applique à tous les types de boutique) */
  @Column({ name: 'r_boutique_type', type: 'varchar', length: 50, nullable: true })
  boutique_type: string | null;

  @Column({ name: 'r_profil_code', type: 'varchar', length: 50 })
  profil_code: string;

  /**
   * Valeurs possibles :
   * 'dashboard' | 'pos' | 'ekwatech'
   * 'restaurant-admin' | 'restaurant-serveur' | 'restaurant-caissier' | 'restaurant-cuisine'
   */
  @Column({ name: 'r_ecran_cible', type: 'varchar', length: 80 })
  ecran_cible: string;
}
