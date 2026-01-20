export const actualDate = ()=> {
    const date = new Date(); // Créer un objet Date avec la date actuelle
    const day = String(date.getDate()).padStart(2, '0'); // Ajouter un zéro devant le jour si nécessaire
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Ajouter un zéro devant le mois (mois commence à 0)
    const year = date.getFullYear(); // Récupérer l'année

    const formattedDate = `${day}-${month}-${year}`;

    return formattedDate;
}