import { connectToMongo } from "./db.js"; // page pour connection à MongoDB

const db = await connectToMongo(); // Se connecter
const paniersCollection = db.collection("panier"); // Cherche la collection des utilisateurs

// Tableau des utilisateurs. Insert primaire
const paniers = [
    // EXEMPLE TEMPORAIRE
    /*
    {
        quantite: 3,
        date_livraison: new Date("2024-03-20T00:00:00Z"),
        utilisateur_id: ObjectId("507f191e810c19729de860eb"),
        paiement_id: ObjectId("507f191e810c19729de860ea"),
	    
        produits: [
        	{ produit_id: ObjectId("507f191e810c19729de860ed"), quantite: 2, prix_unitaire: 100.00 },
            { produit_id: ObjectId("507f191e810c19729de860ee"), quantite: 1, prix_unitaire: 200.00 }
    	]
    } */

];


// Si le panier exite, ca va update.
// Si le panier n'existe pas, ca va insert
for (const panier of paniers) {
    await paniersCollection.updateOne(
        { paiement_id: panier.paiement_id }, 
        { $set: panier },
        { upsert: true }
    );
}

console.log("Panier(s) insérés/mis à jour avec succès !");
