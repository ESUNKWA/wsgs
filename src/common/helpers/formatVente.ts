export function formatVente(vente: any, produits?: { id: number; nom: string }[]) {

  return {

    nom_client: vente?.client?.nom,
    telephone_client: vente?.client?.telephone,
    detail_vente: vente?.detail_vente?.map((item: any) => {
      // Résout le nom depuis : objet relation, tableau produits, ou champ direct
      const nom =
        item?.produit?.nom                                              // relation chargée (update)
        ?? produits?.find(p => p.id == item?.produit)?.nom             // tableau passé en paramètre (create)
        ?? item?.nom;                                                   // fallback
      return {
        produit: nom,
        quantite: item?.quantite,
        prix: item?.prix_unitaire_vente ?? item?.prix,
      };
    }),

    montant_total: vente?.montant_total,
    remise: vente?.remise,
    montant_recu: vente?.montant_recu,
    monnaie_rendu: vente?.monnaie_rendu,
    montant_total_apres_remise: vente?.montant_total_apres_remise,
    statut: vente?.statut,
    reference: vente?.reference,
    date_vente: vente?.date_vente,
    logo_boutique: vente?.boutique.logo,
    nom_boutique: vente?.boutique.nom,
    email_boutique: vente?.boutique.email,
    phone_boutique: vente?.boutique.telephone,
    adresse_boutique: vente?.boutique.situation_geo,
  };
}
