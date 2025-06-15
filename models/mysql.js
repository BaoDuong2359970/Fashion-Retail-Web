import mysql from "mysql2";

// Configuration de la connexion MySQL
const db = mysql.createConnection({
    host: "127.0.0.1",  // Adresse locale
    port: 3306,         // Port MySQL 
    user: "root",       // Nom d'utilisateur MySQL
    password: "oracle", // Mot de passe 
    database: "site_db", // Nom de ta base de données
    charset: "utf8mb4"
});

db.connect((err) => {
    if (err) {
      console.error("Erreur de connexion à MySQL :", err);
      return;
    }
    console.log("Connecté à la base de données MySQL !");
});

export default db;