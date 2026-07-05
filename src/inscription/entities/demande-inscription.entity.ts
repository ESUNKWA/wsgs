import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type StatutDemande = 'en_attente' | 'validee' | 'rejetee';

@Entity('t_demandes_inscription')
export class DemandeInscription {
  @PrimaryGeneratedColumn()
  id: number;

  // ── Structure ──────────────────────────────────────────────────────────────
  @Column({ name: 'structure_nom', type: 'varchar', length: 100 })
  structure_nom: string;

  @Column({ name: 'structure_telephone', type: 'varchar', length: 20 })
  structure_telephone: string;

  @Column({ name: 'structure_email', type: 'varchar', length: 100, nullable: true })
  structure_email: string | null;

  @Column({ name: 'structure_situation_geo', type: 'varchar', length: 255, nullable: true })
  structure_situation_geo: string | null;

  // ── Boutique ───────────────────────────────────────────────────────────────
  @Column({ name: 'boutique_nom', type: 'varchar', length: 100 })
  boutique_nom: string;

  @Column({ name: 'boutique_situation_geo', type: 'varchar', length: 255, nullable: true })
  boutique_situation_geo: string | null;

  // ── Responsable ────────────────────────────────────────────────────────────
  @Column({ name: 'responsable_nom', type: 'varchar', length: 50 })
  responsable_nom: string;

  @Column({ name: 'responsable_prenoms', type: 'varchar', length: 100, nullable: true })
  responsable_prenoms: string | null;

  @Column({ name: 'responsable_telephone', type: 'varchar', length: 20 })
  responsable_telephone: string;

  @Column({ name: 'responsable_email', type: 'varchar', length: 100, nullable: true })
  responsable_email: string | null;

  @Column({ name: 'responsable_password', type: 'varchar', length: 255 })
  responsable_password: string;

  // ── Statut & méta ─────────────────────────────────────────────────────────
  @Column({ name: 'statut', type: 'varchar', length: 20, default: 'en_attente' })
  statut: StatutDemande;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'structure_id', type: 'int', nullable: true })
  structure_id: number | null;

  @Column({ name: 'validated_at', type: 'timestamp', nullable: true })
  validated_at: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
