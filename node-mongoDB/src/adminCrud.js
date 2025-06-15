import { connectToMongo } from "./db.js"; // page pour connection à MongoDB

const db = await connectToMongo(); // Se connecter
const adminsCollection = db.collection("admin"); // Cherche la collection des utilisateurs

// Tableau des utilisateurs. Insert primaire
const admins = [
    { email: "2359970@bdeb.qc.ca", mot_de_passe: "elena123", nom: "Duong", prenom: "Elena" },
    { email: "2344893@bdeb.qc.ca", mot_de_passe: "nadine123", nom: "Dhaouahira", prenom: "Nadine" },
    { email: "2144434@bdeb.qc.ca", mot_de_passe: "zack123", nom: "Aubourg", prenom: "Zack" },
    { email: "2242101@bdeb.qc.ca", mot_de_passe: "joseph123", nom: "Tran-Nguyen", prenom: "Joseph" },
];


// Si l'utilisateur exite, ca va update.
// Si l'utilisateur existe pas, ca va insert
for (const admin of admins) {
    await adminsCollection.updateOne(
        { email: admin.email }, 
        { $set: admin },
        { upsert: true }
    );
}

console.log("Admin(s) insérés/mis à jour avec succès !");
