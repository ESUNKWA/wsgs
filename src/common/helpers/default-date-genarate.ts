import { CreateDateColumn, DeleteDateColumn, UpdateDateColumn } from "typeorm";

export class defaultDateGeneratorHelper{
     @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
    
    @DeleteDateColumn()
    deleted_at: Date;
}