import { config } from 'dotenv'; 
config(); 

import "./utilisateurCrud.js";
import "./produitCrud.js";
//import "./panierCrud.js";
//import "./paiementCrud.js";
//import "./sessionCrud.js";


console.log("DB_URI :", process.env.DB_URI); 
