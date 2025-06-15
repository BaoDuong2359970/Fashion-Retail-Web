import { connectToMongo } from "./db.js"; // page pour connection à MongoDB

const db = await connectToMongo(); // Se connecter
const sessionsCollection = db.collection("session"); // Cherche la collection des utilisateurs

// Tableau des utilisateurs. Insert primaire
const sessions = [
    // EXEMPLE
    {
        date_connexion: new Date("2024-03-12T10:30:00Z"),
        utilisateur_id: ObjectId("507f191e810c19729de860eb"),
        admin_id: ObjectId("507f191e810c19729de860ec"),
        date_expiration: new Date("2024-03-12T12:30:00Z")
    }
];


// Si la session exite, ca va update.
// Si la session n'existe pas, ca va insert
for (const session of sessions) {
    await utilisateursCollection.updateOne(
        { utilisateur_id: session.utilisateur_id }, 
        { $set: session },
        { upsert: true }
    );
}

console.log("Session(s) insérés/mis à jour avec succès !");
