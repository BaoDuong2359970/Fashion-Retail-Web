import mysql from "mysql2/promise";
import fs from "fs";

function getSslConfig(){
  if (process.env.MYSQL_SSL === 'true') {
    const caPath = process.env.MYSQL_CA_PATH;
    return caPath ? {ca: fs.readFileSync(caPath)} : {};
  }
  return undefined;
}

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "oracle",
  database: process.env.MYSQL_DATABASE || "site_db",
  waitForConnections: true,
  connectionLimit: 10,
  charset: "utf8mb4",
  ssl: getSslConfig(),
});

// quick connectivity test on boot
(async () => {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log("Connected to MySQL");
  } catch (err) {
    console.error("MySQL connection error:", err.message);
  }
})();

export default pool;

// Configuration de la connexion MySQL
// const db = mysql.createConnection({
//     host: "127.0.0.1",  // Adresse locale
//     port: 3306,         // Port MySQL 
//     user: "root",       // Nom d'utilisateur MySQL
//     password: "oracle", // Mot de passe 
//     database: "site_db", // Nom de ta base de données
//     charset: "utf8mb4"
// });

// db.connect((err) => {
//     if (err) {
//       console.error("Erreur de connexion à MySQL :", err);
//       return;
//     }
//     console.log("Connecté à la base de données MySQL !");
// });

// export default db;