import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tenant_configs')
export class TenantConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'structure_id', unique: true })
  structureId: number;

  @Column({ name: 'db_host', default: 'localhost' })
  host: string;

  @Column({ name: 'db_port', type: 'integer', default: 5432 })
  port: number;

  @Column({ name: 'db_username' })
  username: string;

  @Column({ name: 'db_password' })
  password: string;

  @Column({ name: 'db_name' })
  database: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn()
  created_at: Date;
}
