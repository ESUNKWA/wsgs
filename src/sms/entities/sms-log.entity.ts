import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('t_sms_logs')
export class SmsLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'structure_id', nullable: true, type: 'integer' })
  structureId: number | null;

  @Column({ name: 'destinataire', type: 'varchar', length: 20 })
  destinataire: string;

  @Column({ name: 'message', type: 'text' })
  message: string;

  @Column({ name: 'type', type: 'varchar', length: 30, default: 'manuel' })
  type: string; // 'rapport_journalier' | 'alerte_stock' | 'manuel'

  @Column({ name: 'statut', type: 'varchar', length: 15, default: 'en_attente' })
  statut: 'envoye' | 'echec' | 'en_attente';

  @Column({ name: 'orange_resource_url', type: 'varchar', length: 255, nullable: true })
  orangeResourceUrl: string | null;

  @Column({ name: 'erreur', type: 'text', nullable: true })
  erreur: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
