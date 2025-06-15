import { connectToMongo } from "./db.js"; // page pour connection à MongoDB

const db = await connectToMongo(); // Se connecter
const utilisateursCollection = db.collection("utilisateur"); // Cherche la collection des utilisateurs

// Tableau des utilisateurs. Insert primaire
const utilisateurs = [
    { email: "alice.durand@example.com", mot_de_passe: "mdp123", nom: "Durand", prenom: "Alice" },
    { email: "bastien.martin@example.com", mot_de_passe: "mdp456", nom: "Martin", prenom: "Bastien" },
    { email: "charlotte.legrand@example.com", mot_de_passe: "mdp789", nom: "Legrand", prenom: "Charlotte" },
    { email: "david.robert@example.com", mot_de_passe: "mdp111", nom: "Robert", prenom: "David" },
    { email: "emma.bernard@example.com", mot_de_passe: "mdp222", nom: "Bernard", prenom: "Emma" },
    { email: "francois.moreau@example.com", mot_de_passe: "mdp333", nom: "Moreau", prenom: "François" },
    { email: "gabrielle.dubois@example.com", mot_de_passe: "mdp444", nom: "Dubois", prenom: "Gabrielle" },
    { email: "hugo.fournier@example.com", mot_de_passe: "mdp555", nom: "Fournier", prenom: "Hugo" },
    { email: "ines.leclerc@example.com", mot_de_passe: "mdp666", nom: "Leclerc", prenom: "Inès" },
    { email: "julien.lambert@example.com", mot_de_passe: "mdp777", nom: "Lambert", prenom: "Julien" },
    { email: "karine.rousseau@example.com", mot_de_passe: "mdp888", nom: "Rousseau", prenom: "Karine" },
    { email: "laurent.perrin@example.com", mot_de_passe: "mdp999", nom: "Perrin", prenom: "Laurent" },
    { email: "manon.dumont@example.com", mot_de_passe: "mdp000", nom: "Dumont", prenom: "Manon" },
    { email: "nathan.girard@example.com", mot_de_passe: "mdp112", nom: "Girard", prenom: "Nathan" },
    { email: "olivia.morel@example.com", mot_de_passe: "mdp223", nom: "Morel", prenom: "Olivia" },
    { email: "pierre.andre@example.com", mot_de_passe: "mdp334", nom: "André", prenom: "Pierre" },
    { email: "quentin.noel@example.com", mot_de_passe: "mdp445", nom: "Noël", prenom: "Quentin" },
    { email: "romane.dupont@example.com", mot_de_passe: "mdp556", nom: "Dupont", prenom: "Romane" },
    { email: "sebastien.renaud@example.com", mot_de_passe: "mdp667", nom: "Renaud", prenom: "Sébastien" },
    { email: "tiffany.lefevre@example.com", mot_de_passe: "mdp778", nom: "Lefèvre", prenom: "Tiffany" },
    { email: "ugo.duval@example.com", mot_de_passe: "mdp889", nom: "Duval", prenom: "Ugo" },
    { email: "valerie.baron@example.com", mot_de_passe: "mdp990", nom: "Baron", prenom: "Valérie" },
    { email: "william.fernandez@example.com", mot_de_passe: "mdp101", nom: "Fernandez", prenom: "William" },
    { email: "xavier.vidal@example.com", mot_de_passe: "mdp202", nom: "Vidal", prenom: "Xavier" },
    { email: "yasmine.guillaume@example.com", mot_de_passe: "mdp303", nom: "Guillaume", prenom: "Yasmine" },
    { email: "zacharie.masson@example.com", mot_de_passe: "mdp404", nom: "Masson", prenom: "Zacharie" },
    { email: "amelie.meyer@example.com", mot_de_passe: "mdp505", nom: "Meyer", prenom: "Amélie" },
    { email: "benoit.berger@example.com", mot_de_passe: "mdp606", nom: "Berger", prenom: "Benoît" },
    { email: "celia.fontaine@example.com", mot_de_passe: "mdp707", nom: "Fontaine", prenom: "Célia" },
    { email: "damien.roux@example.com", mot_de_passe: "mdp808", nom: "Roux", prenom: "Damien" },
    { email: "elodie.gauthier@example.com", mot_de_passe: "mdp909", nom: "Gauthier", prenom: "Élodie" },
    { email: "florian.blanchard@example.com", mot_de_passe: "mdp1111", nom: "Blanchard", prenom: "Florian" },
    { email: "geraldine.boyer@example.com", mot_de_passe: "mdp2222", nom: "Boyer", prenom: "Géraldine" },
    { email: "henri.roche@example.com", mot_de_passe: "mdp3333", nom: "Roche", prenom: "Henri" },
    { email: "isabelle.legros@example.com", mot_de_passe: "mdp4444", nom: "Legros", prenom: "Isabelle" },
    { email: "jacques.pelletier@example.com", mot_de_passe: "mdp5555", nom: "Pelletier", prenom: "Jacques" },
    { email: "kelly.marchand@example.com", mot_de_passe: "mdp6666", nom: "Marchand", prenom: "Kelly" },
    { email: "leo.martinez@example.com", mot_de_passe: "mdp7777", nom: "Martinez", prenom: "Léo" },
    { email: "mathilde.germain@example.com", mot_de_passe: "mdp8888", nom: "Germain", prenom: "Mathilde" },
    { email: "nicolas.lemaitre@example.com", mot_de_passe: "mdp9999", nom: "Lemaître", prenom: "Nicolas" },
    { email: "oceane.dupuis@example.com", mot_de_passe: "mdp0000", nom: "Dupuis", prenom: "Océane" },
    { email: "paul.deschamps@example.com", mot_de_passe: "mdp1122", nom: "Deschamps", prenom: "Paul" },
    { email: "quentine.vincent@example.com", mot_de_passe: "mdp2233", nom: "Vincent", prenom: "Quentine" },
    { email: "raphael.hubert@example.com", mot_de_passe: "mdp3344", nom: "Hubert", prenom: "Raphaël" },
    { email: "sylvie.bergeron@example.com", mot_de_passe: "mdp4455", nom: "Bergeron", prenom: "Sylvie" },
    { email: "theo.renaud@example.com", mot_de_passe: "mdp5566", nom: "Renaud", prenom: "Théo" },
    { email: "ursula.henry@example.com", mot_de_passe: "mdp6677", nom: "Henry", prenom: "Ursula" },
    { email: "victor.leblanc@example.com", mot_de_passe: "mdp7788", nom: "Leblanc", prenom: "Victor" },
    { email: "willy.renard@example.com", mot_de_passe: "mdp8899", nom: "Renard", prenom: "Willy" },
    { email: "xena.malot@example.com", mot_de_passe: "mdp9900", nom: "Malot", prenom: "Xena" }
];


// Si l'utilisateur exite, ca va update.
// Si l'utilisateur existe pas, ca va insert
for (const utilisateur of utilisateurs) {
    await utilisateursCollection.updateOne(
        { email: utilisateur.email }, 
        { $set: utilisateur },
        { upsert: true }
    );
}

console.log("Utilisateurs insérés/mis à jour avec succès !");
