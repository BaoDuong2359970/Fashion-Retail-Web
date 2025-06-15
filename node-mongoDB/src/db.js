// Import MongoDB client
import { MongoClient } from 'mongodb';
import { config } from "dotenv";

config();

const uri = process.env.DB_URI;

// Fonction pour se connecter à la bd
export async function connectToMongo() {
    let mongoClient;
    try {
        mongoClient = new MongoClient(uri);

        await mongoClient.connect();
        
        console.log("Connecté à MongoDB!");
        return mongoClient.db("mongo-site-vetement");

    } catch (error) {
        console.error("Erreur de connexion à MongoDB!", error);
        process.exit();
    }
}


// Fonction pour fermer la bd en cas où
export async function closeMongoConnection(){
    if (client) {
        await client.close();
        console.log("Connection à MongoDB fermée :(");
    }
}