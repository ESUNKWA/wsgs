import { defaultDateGeneratorHelper } from 'src/common/helpers/default-date-genarate';
import { Utilisateur } from 'src/gestion-utilisateurs/utilisateurs/entities/utilisateur.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SessionCaisse } from './session-caisse.entity';

@Entity('t_mouvements_caisse')
export class MouvementCaisse extends defaultDateGeneratorHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'r_type', type: 'character varying', length: 10 })
  type: 'entree' | 'sortie';

  @Column({ name: 'r_motif', type: 'character varying', length: 150 })
  motif: string;

  @Column({ name: 'r_montant', type: 'real' })
  montant: number;

  @Column({ name: 'r_mode_paiement', type: 'character varying', length: 20, default: 'espece' })
  mode_paiement: string;

  @ManyToOne(() => SessionCaisse, (s) => s.mouvements, { nullable: false, onDelete: 'CASCADE' })
  session: SessionCaisse;

  @ManyToOne(() => Utilisateur, { eager: true, nullable: true })
  caissier: Utilisateur;
}
