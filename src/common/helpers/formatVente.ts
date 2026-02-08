export function formatVente(vente: any) {
    
  return {
    
    client: vente.clientdata.nom , // ou vente.client?.nom ?? 'Client divers'
    telephone: vente.clientdata.telephone,
    detail_vente: vente.detail_vente.map((item: { nom: string; quantite: any; prix_unitaire_vente: any; }) => ({
      produit: item?.nom,
      quantite: item.quantite,
      prix: item.prix_unitaire_vente,
    })),

    montant_total: vente.montant_total,
    remise: vente.remise,
    montant_recu: vente.montant_recu,
    monnaie_rendu: vente.monnaie_rendu,
    montant_total_apres_remise: vente.montant_total_apres_remise,
    statut: vente.statut,
    reference: vente.reference,
  };
}
