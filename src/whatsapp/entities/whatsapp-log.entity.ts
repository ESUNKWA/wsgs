import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('t_whatsapp_logs')
export class WhatsappLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'structure_id', nullable: true, type: 'integer' })
  structureId: number | null;

  @Column({ name: 'destinataire', type: 'varchar', length: 25 })
  destinataire: string;

  @Column({ name: 'message', type: 'text' })
  message: string;

  @Column({ name: 'type', type: 'varchar', length: 30, default: 'manuel' })
  type: string; // 'notification_vente' | 'recu_vente' | 'manuel'

  @Column({ name: 'statut', type: 'varchar', length: 15, default: 'en_attente' })
  statut: 'envoye' | 'echec' | 'en_attente';

  @Column({ name: 'erreur', type: 'text', nullable: true })
  erreur: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
