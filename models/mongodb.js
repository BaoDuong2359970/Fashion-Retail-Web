import { MongoClient } from "mongodb";
import { config } from "dotenv";

config();


const uri = process.env.DB_URI;
let db;

export async function connectToMongo() {
    try {
        const client = new MongoClient(uri);
        await client.connect();
        console.log("Connexion à MongoDB réussi!!");
        db = client.db("mongo-site-vetement");
        return db;
    } catch (error) {
        console.error("Erreur de connexion à MongoDB: ", error);
        process.exit();
    }
}

export function getMongoDB() {
    return db;
}