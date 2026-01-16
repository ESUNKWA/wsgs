import { Injectable } from "@nestjs/common";
import { profile } from "console";

@Injectable()
export class SourceResolverService {
  private readonly tableMap = {
    ventes: ['vente', 'ventes', 'transaction', 'transactions'],
    produits: ['produit', 'produits', 'stock', 'stocks'],
    users: ['utilisateur', 'utilisateurs', 'user', 'users'],
    clients: ['client', 'clients'],
    profil: ['profil', 'profils', 'profile', 'profiles', 'profi'],
    detail_achat: ['detail achat', 'detail', 'details achats', 'details des achats'],
    // ajouter d’autres tables si nécessaire
  };

  resolveSource(question: string): string {
    const q = question.toLowerCase();

    for (const [table, keywords] of Object.entries(this.tableMap)) {
      if (keywords.some(word => q.includes(word))) {
        return table;
      }
    }

    return 'default'; // table fallback si aucun mot clé
  }
}
