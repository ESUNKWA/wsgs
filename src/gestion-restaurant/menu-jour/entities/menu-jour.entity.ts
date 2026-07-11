import { defaultDateGeneratorHelper } from 'src/common/helpers/default-date-genarate';
import { Boutique } from 'src/gestion-boutiques/boutique/entities/boutique.entity';
import { Recette } from 'src/gestion-restaurant/recette/entities/recette.entity';
import { Column, Entity, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('t_menus_jour')
@Unique(['date', 'boutique'])
export class MenuJour extends defaultDateGeneratorHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'r_date', type: 'date' })
  date: string;

  @ManyToOne(() => Boutique, { eager: false, nullable: false })
  boutique: Boutique;

  @ManyToMany(() => Recette, { cascade: false })
  @JoinTable({
    name: 't_menu_jour_recettes',
    joinColumn:        { name: 'menu_id',   referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'recette_id', referencedColumnName: 'id' },
  })
  recettes: Recette[];
}
