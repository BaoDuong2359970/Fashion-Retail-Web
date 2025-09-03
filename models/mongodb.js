import { MongoClient } from "mongodb";
import { config } from "dotenv";
import mongoose from "mongoose";

export async function connectToMongo() {
    await mongoose.connect(process.env.MONGO_URI, {});
    console.log("Connexion à MongoDB réussi!!");
}

export function getMongoDB() {
    return mongoose.connection.db;
}