import mysql from "mysql2/promise";
import bcrypt from "bcrypt";

// Connexion à ta base de données
const db = await mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "oracle",
  database: "site_db"
});

try {
  const [utilisateurs] = await db.execute("SELECT id_utilisateur, mot_de_passe FROM utilisateur");

  for (const user of utilisateurs) {
    const { id_utilisateur, mot_de_passe } = user;

    // Vérifie si c'est déjà un mot de passe bcrypté (commence par $2)
    if (!mot_de_passe.startsWith("$2")) {
      const hashed = await bcrypt.hash(mot_de_passe, 10);
      await db.execute("UPDATE utilisateur SET mot_de_passe = ? WHERE id_utilisateur = ?", [hashed, id_utilisateur]);
      console.log(`Mot de passe de l'utilisateur ${id_utilisateur} a été hashé.`);
    } else {
      console.log(`ℹ Utilisateur ${id_utilisateur} déjà sécurisé.`);
    }
  }

  console.log(" Conversion terminée !");
} catch (err) {
  console.error("Erreur pendant la conversion :", err);
} finally {
  await db.end();
}
