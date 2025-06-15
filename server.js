/* 
Importation des modules requis 
*/
import db from "./models/mysql.js";
import { connectToMongo, getMongoDB } from "./models/mongodb.js";
import { ObjectId } from "mongodb";
import express from "express";
import session from "express-session";
import path, { parse, resolve } from "path";
import { fileURLToPath } from "url"; // API payment stripe
import Stripe from 'stripe';
import dotenv from 'dotenv';
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from 'uuid';
import nodemailer from "nodemailer";
import { check } from "express-validator";

const saltRounds = 10;

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// require("dotenv").config();

// auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
// }

// import mysql from "mysql2"; 
// import { body, param, validationResult } from "express-validator"; 
// import dateFormat from "dateformat"; 

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Initialise Stripe avec une clé secret
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-03-31.basil',
});

// SOURCE DE L'INSTALLATION DU API: https://docs.stripe.com/checkout/custom/quickstart?client=html

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Pour lire les données POST
app.use(express.static('public'));

function getRandom(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


/*Pour la gestion des sessions*/
app.use(session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 30 * 60 * 1000 // 30 minutes en millisecondes
    },
    rolling: true
}));

/* 
    Configuration de EJS 
*/
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
// app.set('views', './views');

/* 
    Importation de Bootstrap 
*/
app.use("/js", express.static(__dirname + "/node_modules/bootstrap/dist/js"));
app.use("/css", express.static(__dirname + "/node_modules/bootstrap/dist/css"));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));


// ------------------------------------------ PAGE D'ACCUEIL ------------------------------------------
app.get("/", function (req, res) {
    console.log("Route /index appelée !");
    res.render("pages/index");
});

// ------------------------------------------ PAGE LIST PRODUITS ------------------------------------------
app.get("/listProduits/:category?/:subcategory?", function (req, res) {
    const category = req.params.category;
    const subcategory = req.params.subcategory;
    const prixMinFiltre = req.query.prixMin || null;
    const prixMaxFiltre = req.query.prixMax || null;
    const searchQuery = req.query.query || null;
    const taillesFiltre = req.query.tailles;

    let sql;
    let params = [];

    console.log(`Route /listProduits/${category}/${subcategory} appelée !`);

    // Construction de la requête SQL de base
    if (!category) {
        sql = "SELECT id_produit, nom, prix, image_url1, type, sous_categorie FROM produit";
    } else if (category === "autre") {
        sql = "SELECT id_produit, nom, prix, image_url1, type, sous_categorie FROM produit WHERE type IN (?, ?)";
        params.push("accessoire", "sac");
        if (subcategory) {
            sql += " AND sous_categorie = ?";
            params.push(subcategory);
        }
    } else if (category === "accessoire" || category === "Sac") {
        sql = `SELECT id_produit, nom, prix, image_url1, type, sous_categorie FROM produit WHERE type = ? AND (genre = 'Homme' OR genre = 'Femme' OR genre = 'Unisexe')`;
        params.push(category);
        if (subcategory) {
            sql += " AND sous_categorie = ?";
            params.push(subcategory);
        }
    } else if (category === "Homme" || category === "Femme") {
        sql = `SELECT id_produit, nom, prix, image_url1, type, sous_categorie FROM produit WHERE (genre = ? OR genre = 'Unisexe')`;
        params.push(category);
        if (subcategory) {
            if (["Haut", "Bas", "accessoire", "Sac"].includes(subcategory)) {
                sql += " AND type = ?";
                params.push(subcategory);
            } else {
                sql += " AND sous_categorie = ?";
                params.push(subcategory);
            }
        }
    } else if (category === "Outerwear" || category === "Sportwear") {
        sql = "SELECT id_produit, nom, prix, image_url1, type, sous_categorie FROM produit WHERE sous_categorie = ?";
        params.push(category);
    } else {
        sql = "SELECT id_produit, nom, prix, image_url1, type, sous_categorie FROM produit WHERE type = ?";
        params.push(category);
        if (subcategory) {
            sql += " AND sous_categorie = ?";
            params.push(subcategory);
        }
    }

    if (prixMinFiltre) {
        sql += (sql.includes("WHERE") ? " AND " : " WHERE ") + "prix >= ?";
        params.push(prixMinFiltre);
    }

    if (prixMaxFiltre) {
        sql += (sql.includes("WHERE") ? " AND " : " WHERE ") + "prix <= ?";
        params.push(prixMaxFiltre);
    }

    // Ajout filtre recherche
    if (searchQuery) {
        const like = `%${searchQuery.toLowerCase()}%`;
        sql += (sql.includes("WHERE") ? " AND (" : " WHERE (");
        sql += `
            LOWER(nom) LIKE ?
            OR LOWER(type) LIKE ?
            OR LOWER(sous_categorie) LIKE ?
            OR LOWER(genre) LIKE ?
        )`;
        params.push(like, like, like, like);
    }

    if (taillesFiltre) {
        const taillesArray = taillesFiltre.split(",");
        const conditions = [];

        taillesArray.forEach(taille => {
            switch (taille) {
                case 'XS':
                    conditions.push("tailleXS > 0");
                    break;
                case 'S':
                    conditions.push("tailleS > 0");
                    break;
                case 'M':
                    conditions.push("tailleM > 0");
                    break;
                case 'L':
                    conditions.push("tailleL > 0");
                    break;
                case 'XL':
                    conditions.push("tailleXL > 0");
                    break;
            }
        });

        if (conditions.length > 0) {
            sql += (sql.includes("WHERE") ? " AND (" : " WHERE (") + conditions.join(" OR ") + ")";
        }
    }


    // Exécution de la requête
    db.query(sql, params, (err, products) => {
        if (err) {
            console.error("Erreur récupération produits:", err);
            return res.status(500).send("Erreur serveur: produits non disponibles");
        }

        // Requête pour les bornes min/max du prix
        const prixQuery = `SELECT MIN(prix) AS prixMin, MAX(prix) AS prixMax FROM produit`;

        db.query(prixQuery, (err2, result) => {
            if (err2) {
                console.error("Erreur récupération prix min/max:", err2);
                return res.status(500).send("Erreur serveur: prix non disponibles");
            }

            const { prixMin, prixMax } = result[0];

            res.render("pages/listProduits", {
                products,
                category,
                subcategory,
                prixMin,
                prixMax,
                prixMinFiltre,
                prixMaxFiltre,
                searchQuery,
                aucunResultat: products.length === 0,
                taillesFiltre: taillesFiltre ? taillesFiltre.split(",") : []
            });
        });
    });
});




// ------------------------------------------ PAGES CONNEXION INSCRIPTION ------------------------------------------
app.get("/connexion", function (req, res) {
    console.log("Route /connexion appelée !");
    if (req.session.user && !req.session.isTemporaryUser) {

        // Si déjà connecté, rediriger vers son compte
        return res.redirect("/mon-compte");
    }
    res.render("pages/connexion");
});

app.get("/modifier-details", (req, res) => {
    if (!req.session.userId) return res.redirect("/connexion");

    const sql = "SELECT nom, prenom, email FROM utilisateur WHERE id_utilisateur = ?";
    db.query(sql, [req.session.userId], (err, result) => {
        if (err) return res.status(500).send("Erreur serveur");
        if (result.length === 0) return res.redirect("/connexion");

        res.render("pages/modifier-details", { user: result[0] });
    });
});
app.post("/modifier-details", (req, res) => {
    const { prenom, nom, email } = req.body;
    const userId = req.session.userId;

    const sql = "UPDATE utilisateur SET prenom = ?, nom = ?, email = ? WHERE id_utilisateur = ?";
    db.query(sql, [prenom, nom, email, userId], (err, result) => {
        if (err) {
            console.error("Erreur lors de la modification :", err);
            return res.status(500).send("Erreur serveur");
        }

        // Met à jour la session pour afficher les nouvelles infos
        req.session.user.prenom = prenom;
        req.session.user.nom = nom;
        req.session.user.email = email;

        res.redirect("/mon-compte");
    });
});


app.get("/password-change", function (req, res) {
    console.log("Route /password-change appelée !");
    const email = req.query.email;
    res.render("pages/password-change", {
        email: email || ""
    });
})

app.post("/password-change", async (req, res) => {
    const { email, password, confirm_password } = req.body;

    // Vérification simple du mot de passe
    if (password !== confirm_password) {
        return res.send("Les mots de passe ne correspondent pas !");
    }
    try {
        const hash = await bcrypt.hash(password, 10);
        const sql = "update utilisateur SET mot_de_passe = ? WHERE email = ?";

        db.query(sql, [hash, email], (err, result) => {
            if (err) {
                console.error("Erreur lors de la mise à jour du mot de passe :", err);
                return res.status(500).send("Erreur serveur lors de la modification du mot de passe.");
            }

            if (result.affectedRows === 0) {
                return res.send("Aucun utilisateur trouvé avec cet email.")
            }

            console.log("Mot de passe mis à jour avec succès pour :", email);
            res.redirect("/connexion"); // Redirection après inscription
        });
    } catch (err) {
        console.error("Erreur bcrypt :", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get("/inscription", function (req, res) {
    console.log("Route /inscription appelée !");
    res.render("pages/inscription");
});

app.post("/inscription", async (req, res) => {
    const { nom, prenom, email, password, confirm_password } = req.body;



    // Vérification simple du mot de passe
    if (password !== confirm_password) {
        return res.send("Les mots de passe ne correspondent pas !");
    }
    try {
        // 1. Vérifier si l'email est déjà utilisé
        const checkEmailSql = "SELECT * FROM utilisateur WHERE email = ?";
        db.query(checkEmailSql, [email], async (err, results) => {
            if (err) {
                console.error("Erreur lors de la vérification de l'email :", err);
                return res.status(500).send("Erreur serveur.");
            }

            if (results.length > 0) {
                return res.render("pages/inscription", {
                    erreur: "Cet email est déjà utilisé.",
                    nom,
                    prenom,
                    email
                });
            }

            // 2. Si email libre, continuer l'inscription
           const hashedPassword = await bcrypt.hash(password, 10);
            const insertSql = "INSERT INTO utilisateur (nom, prenom, email, mot_de_passe) VALUES (?, ?, ?, ?)";
            db.query(insertSql, [nom, prenom, email, hashedPassword], (err, result) => {
                if (err) {
                    console.error("Erreur lors de l'insertion :", err);
                    return res.status(500).send("Erreur serveur lors de l'inscription.");
                }

                console.log("Utilisateur inscrit avec succès :", result);
                res.redirect("/connexion");
            });
        });
        } catch (err) {
            console.error("Erreur de hachage :", err);
            res.status(500).send("Erreur serveur.");
        }
    });

app.post("/connexion", (req, res) => {
    console.log("Données reçues :", req.body);
    const { email, password } = req.body;

    const sql = "SELECT id_utilisateur, nom, prenom, email, mot_de_passe FROM utilisateur WHERE email = ?";

    db.query(sql, [email], async (err, results) => {
        if (err) {
            console.error("Erreur lors de la connexion :", err);
            return res.status(500).send("Erreur serveur");
        }

        if (results.length === 0) {
            // Si l'email est incorrect
            return res.json({ success: false, message: "Email ou mot de passe incorrect", field: "email" });
        }
        const user = results[0];
        const match = await bcrypt.compare(password, user.mot_de_passe);

        if (!match) {
            // Si le mot de passe est incorrect
            return res.json({ success: false, message: "Email ou mot de passe incorrect", field: "password" });
        }

        // Connexion réussie, définir la session utilisateur
        req.session.userId = user.id_utilisateur;
        req.session.user = { nom: user.nom, prenom: user.prenom, email: user.email };

        // **Supprimer la variable isTemporaryUser lors de la connexion**
        delete req.session.isTemporaryUser;

        return res.json({ success: true });
    });
});

// ------------------------------ Page "Mon compte" ------------------------------
app.get("/mon-compte", (req, res) => {
    if (!req.session.user || req.session.isTemporaryUser) {

        return res.redirect("/connexion");
    }

    const sql = "SELECT nom, prenom, email, points FROM utilisateur WHERE id_utilisateur = ?";

    db.query(sql, [req.session.userId], (err, results) => {
        if (err) {
            console.error("Erreur lors de la récupération des informations de l'utilisateur :", err);
            return res.status(500).send("Erreur serveur");
        }

        if (results.length === 0) {
            return res.redirect("/connexion");
        }

        res.render("pages/mon-compte", { user: results[0] });
    });
});

// Page historique de commandes
app.get("/commandes", async (req, res) => {
    try {
        const MongoDB = getMongoDB();
        const commandesCollection = MongoDB.collection("commandes");

        const utilisateur_id = req.session.userId || "utilisateur-temp";

        const commandes = await commandesCollection.find({ utilisateur_id }).toArray();

        if (commandes.length === 0) {
            return res.render("pages/commandes", { commandes: [] });
        }

        res.render("pages/commandes", { commandes });
    } catch (err) {
        console.error("Error fetching orders: ", err);
        res.status(500).send("Error fetching orders from the database");
    }
});

app.post('/annuler-commande', async (req, res) => {
    try {
        const MongoDB = getMongoDB();
        const commandes = MongoDB.collection("commandes");
        const annulations = MongoDB.collection("annulations");

        const { id, raison } = req.body;
        const utilisateur_id = req.session.userId;

        const commande = await commandes.findOne({ _id: ObjectId.createFromHexString(id) });

        if (!commande) {
            return res.status(404).send("Commande non trouvée");
        }

        await commandes.updateOne(
            { _id: ObjectId.createFromHexString(id) },
            { $set: { status: "Annulee" } }
        );

        await annulations.insertOne({
            commande_id: id,
            utilisateur_id: utilisateur_id,
            raison: raison,
            produits: commande.produits || [],
            date_annulation: new Date()
        });

        res.sendStatus(200);

    } catch (err) {
        console.error("Erreur suppression commande: ", err);
        res.sendStatus(500);
    }
})

// Page des produits des points de fidélité
app.get("/produits-points", (req, res) => {
    const sql = 'SELECT * FROM produits_points';

    db.query(sql, (err, result) => {
        if (err) {
            console.error('Erreur SQL: ', err);
            return res.status(500).send('Erreur lors de la récupération des produits');
        }

        const produits = result;

        // Filtrer produits selon catégories de points
        const produits100_300 = produits.filter(p => p.points_requis >= 100 && p.points_requis <= 300);
        const produits300_400 = produits.filter(p => p.points_requis > 300 && p.points_requis <= 400);
        const produits400_600 = produits.filter(p => p.points_requis > 400 && p.points_requis <= 600);
        const produits600_900 = produits.filter(p => p.points_requis > 600 && p.points_requis <= 900);


        if (req.session.userId) {
            const sqlPoints = 'SELECT points FROM utilisateur WHERE id_utilisateur = ?';

            db.query(sqlPoints, [req.session.userId], (err2, result2) => {
                if (err2) {
                    console.error('Erreur SQL utilisateur.points: ', err2);
                    return res.status(500).send('Erreur lors de la récupération des points');
                }

                const pointsUtilisateur = result2.length > 0 ? result2[0].points : 0;

                res.render('pages/produits-points', {
                    produits100_300,
                    produits300_400,
                    produits400_600,
                    produits600_900,
                    pointsUtilisateur
                });
            });
        } else {
            res.render("pages/connexion");
        }
    });
});


// Send email for password change
app.get("/forgot-password", (req, res) => {
    res.render("pages/forgot-password");
});

app.post("/forgot-password", (req, res) => {
    const { email } = req.body;

    const sql = "SELECT * FROM utilisateur WHERE email = ?";
    db.query(sql, [email], async (err, result) => {
        if (err) return res.status(500).send("Erreur serveur");
        if (result.length === 0) return res.send("Aucun compte trouvé");

        const token = uuidv4();
        const lien = `http://localhost:4000/password-change?token=${token}&email=${encodeURIComponent(email)}`;

        const mailOptions = {
            from: '"Maison Dhalia" <maisondhalia@gmail.com>',
            to: email,
            subject: "Réinitialisation du mot de passe",
            html: `<p>Bonjour,</p>
                    <p>Pour réinitialiser votre mot de passe, cliquez sur ce lien : </p>
                    <a href="${lien}">${lien}</a><br><br>
                    <p>Si vous n'avez pas demandé cela, ignorez ce message.</p>`
        };

        try {
            await transporter.sendMail(mailOptions);
            res.send("Un corriel de réinitialisation a été envoyé !");
        } catch (err) {
            console.error("Erreur envoi mail:", err);
            res.status(500).send("Erreur lors de l'envoi du courriel.");
        }
    });
});

// Déconnexion
app.get("/deconnexion", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/connexion");
    });
});


// ------------------------------------------ PAGE DESCRIPTION DES PRODUITS ------------------------------------------

app.get("/description/:id?", async function (req, res) {
    const productId = req.params.id;
    const userId = req.session.userId || "utilisateur-temp"; // Get user ID or use a temporary ID
    const isUserLoggedIn = !!req.session.userId; // Vérification si l'utilisateur est connecté

    let sql = "SELECT id_produit, nom, prix, details, type, sous_categorie, genre, tailleXS, tailleS, tailleM, tailleL, tailleXL, image_url1, image_url2, image_url3, quantite FROM produit WHERE id_produit = ?";
    let params = [productId];

    console.log(`Route /description/${productId} appelée !`);

    try {
        // Requête SQL pour récupérer le produit
        const product = await new Promise((resolve, reject) => {
            db.query(sql, params, (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        if (product.length === 0) {
            return res.status(404).send("Produit non trouvé.");
        }

        // Récupération de la wishlist de l'utilisateur
        const MongoDB = getMongoDB();
        const wishlists = MongoDB.collection("wishlist");
        const wishlist = await wishlists.findOne({ utilisateur_id: userId });

        // Récupération des avis du produit
        const avisCollection = MongoDB.collection("avis");
        const avis = await avisCollection.find({ produit_id: parseInt(productId) })
            .sort({ date: -1 })
            .toArray();

        // Vérification si le produit est dans la wishlist
        const isInWishlist = wishlist && wishlist.produits.some(item => item.produit_id === parseInt(productId));

        // Vérification si l'utilisateur a acheté ce produit
        const commandesCollection = MongoDB.collection("commandes"); // Définition de la variable commandesCollection ici
        const userHasPurchasedProduct = await commandesCollection.find({
            utilisateur_id: req.session.userId,
            "produits.produit_id": parseInt(productId) // Vérification si le produit existe dans les commandes de l'utilisateur
        }).toArray();

        // Affichage de la page description avec les informations du produit et l'état de la wishlist
        res.render("pages/description", {
            produit: product[0],
            isInWishlist,
            avis,
            isUserLoggedIn,
            userHasPurchasedProduct: userHasPurchasedProduct.length > 0 // true ou false
        });

    } catch (err) {
        console.error("Erreur lors de la récupération du produit: ", err);
        res.status(500).send("Erreur serveur: Impossible de récupérer le produit");
    }
});


//gestion des favoris
app.post("/update-favori", async function (req, res) {
    try {
        // Vérifier la session utilisateur
        if (!req.session.userId) {
            return res.status(401).json({ error: "Connectez-vous pour gérer vos favoris" });
        }

        const { productId, favoriStatus } = req.body;
        const userId = req.session.userId;

        // 1. Mettre à jour MySQL (comme avant)
        const sql = "UPDATE produit SET favori = ? WHERE id_produit = ?";
        const params = [favoriStatus, productId];

        await new Promise((resolve, reject) => {
            db.query(sql, params, (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        // 2. Mettre à jour MongoDB
        const MongoDB = getMongoDB();
        const favorisCollection = MongoDB.collection("wishlist");

        if (favoriStatus === "active") {
            // Ajouter aux favoris dans MongoDB
            await favorisCollection.updateOne(
                { userId },
                {
                    $addToSet: {
                        products: {
                            productId: parseInt(productId),
                            addedAt: new Date()
                        }
                    }
                },
                { upsert: true }
            );
        } else {
            // Retirer des favoris dans MongoDB
            await favorisCollection.updateOne(
                { userId },
                { $pull: { products: { productId: parseInt(productId) } } }
            );
        }

        res.status(200).json({
            success: true,
            message: "Favori mis à jour avec succès"
        });

    } catch (err) {
        console.error("Erreur lors de la mise à jour du favori: ", err);
        res.status(500).json({
            error: "Erreur serveur",
            details: err.message
        });
    }
});


// ------------------------------------------ PAGE WISHLIST ------------------------------------------
app.post("/ajouter-a-wishlist", async (req, res) => {
    try {
        console.log(req.session.isTemporaryUser);
        if (!req.session.userId || req.session.isTemporaryUser) {
            return res.status(401).json({ error: "Vous devez être connecté pour ajouter des produits à votre liste de souhaits." });
        }

        const MongoDB = getMongoDB();
        const wishlists = MongoDB.collection("wishlist");

        const { produit_id, isFavori, taille } = req.body;
        const utilisateur_id = req.session.userId;

        const produitItem = {
            produit_id: parseInt(produit_id),
            taille: taille
        };

        const wishlist = await wishlists.findOne({ utilisateur_id: utilisateur_id });

        if (wishlist) {

            const existingProductIndex = wishlist.produits.findIndex(p => p.produit_id === parseInt(produit_id));
            // Mise à jour de la wishlist (ajout)
            if (existingProductIndex !== -1) {
                // Update le produit isFavori statut
                wishlist.produits[existingProductIndex].isFavori = isFavori;
                wishlist.produits[existingProductIndex].taille = taille;
                await wishlists.updateOne(
                    { utilisateur_id: utilisateur_id },
                    { $set: { produits: wishlist.produits } }
                );
            } else {
                // ajouter produit au wishlist
                await wishlists.updateOne(
                    { utilisateur_id: utilisateur_id },
                    { $push: { produits: produitItem } }
                );
            }
        } else {
            // Crée nouvelle wishlist si pas encore faite
            await wishlists.insertOne({
                utilisateur_id: utilisateur_id,
                produits: [produitItem]
            });
        }

        res.status(200).json({ message: "Produit ajouté à la wishlist avec succès" });

    } catch (err) {
        console.error("Erreur lors de l'ajout à la wishlist: ", err);
        res.status(500).json({ error: "Erreur serveur lors de l'ajout à la wishlist" });
    }
});

app.post("/retirer-de-wishlist", async (req, res) => {
    try {
        const MongoDB = getMongoDB();
        const wishlists = MongoDB.collection("wishlist");

        const { id } = req.body;
        const utilisateur_id = req.session.userId || "utilisateur-temp";

        const wishlistAvant = await wishlists.findOne({ utilisateur_id });

        await wishlists.updateOne(
            { utilisateur_id: utilisateur_id },
            { $pull: { produits: { produit_id: parseInt(id) } } }
        );

        console.log(`Produit ${id} retiré de la wishlist`);
        res.sendStatus(200);

    } catch (err) {
        console.error("Erreur en retirant produit de la wishlist", err);
        res.sendStatus(500);
    }
});

app.get("/wishlist", async (req, res) => {
    try {
        // Récupère bd Mongo et la collection wishlist
        const MongoDB = getMongoDB();
        const favoris = MongoDB.collection("wishlist");

        // Récupère ID du user à partir de la session
        // Si pas de connexion, crée user temporaire et marque-le comme temporaire
        let utilisateur_id = req.session.userId;
        if (!utilisateur_id) {
            utilisateur_id = req.session.userId = uuidv4(); // Générer et stocker si absent
            req.session.isTemporaryUser = true; // Marquer l'utilisateur comme temporaire
        }
        // Récupère wishlist de l'utilisateur
        const favori = await favoris.findOne({ utilisateur_id: utilisateur_id });

        // Si wishlist vide
        if (!favori || !favori.produits || favori.produits.length === 0) {
            return res.render("pages/wishlist", { produitsWishlist: [] });
        }

        // tableau pour stocker produits
        const produitsWishlist = [];

        // Cherche chaque produit dans wishlist du MongoDB
        for (const item of favori.produits) {
            // Convertir callback en Promise temporairement pour utiliser await
            const rows = await new Promise((resolve, reject) => {
                db.query(
                    "SELECT id_produit, nom, prix, image_url1 FROM produit WHERE id_produit = ?",
                    [item.produit_id],
                    (err, result) => {
                        if (err) return reject(err);
                        resolve(result);
                    }
                );
            });

            //Crée objet et ajouter à produitsWishlist
            if (rows.length > 0) {
                const produit = rows[0];

                produitsWishlist.push({
                    produit_id: item.produit_id,
                    nom: produit.nom,
                    prix: produit.prix,
                    image: produit.image_url1,
                    taille: item.taille
                });
            }
        }

        // Envoit à wishlist.ejs
        res.render("pages/wishlist", { produitsWishlist });
        console.log("wishlist updated");

    } catch (err) {
        console.error("Erreur lors du changement de la wishlist: ", err);
        res.status(500).send("Erreur serveur");
    }
});

// ------------------------------------------ PAGES DU PANIER ------------------------------------------
app.post("/ajouter-au-panier", async (req, res) => {
    try {
        const MongoDB = getMongoDB();
        const paniers = MongoDB.collection("panier");

        const { produit_id, taille, quantite: quantiteToAdd, isProduitPoint } = req.body;
        let utilisateur_id = req.session.userId;

        if (!utilisateur_id) {
            utilisateur_id = uuidv4();
            req.session.userId = utilisateur_id; // Stocker l'ID temporaire dans la session
            req.session.isTemporaryUser = true;
        }

        let produitInfos = null;

        // si le produit est un produit de récompenses
        if (isProduitPoint) {
            produitInfos = await new Promise((resolve, reject) => {
                db.query(
                    "SELECT nom, points_requis, image_url FROM produits_points WHERE id_produit = ?",
                    [produit_id],
                    (err, result) => {
                        if (err) return reject(err);
                        resolve(result[0]);
                    }
                );
            });
        } else {
            // produits reguliers
            produitInfos = await new Promise((resolve, reject) => {
                db.query(
                    "SELECT nom, prix, image_url1 FROM produit WHERE id_produit = ?",
                    [produit_id],
                    (err, result) => {
                        if (err) return reject(err);
                        resolve(result[0]);
                    }
                );
            });
        }

        if (!produitInfos) {
            return res.status(404).json({ error: "Produit non trouvé" });
        }

        const produitItemToAdd = {
            produit_id: parseInt(produit_id),
            taille,
            quantite: parseInt(quantiteToAdd),
            nom: produitInfos.nom,
            prix: isProduitPoint ? produitInfos.points_requis : produitInfos.prix,
            image: isProduitPoint ? produitInfos.image_url : produitInfos.image_url1,
            isProduitPoint: isProduitPoint
        };

        const panier = await paniers.findOne({ utilisateur_id });

        if (panier) {
            // Vérifier si le produit avec la même taille existe déjà dans le panier
            const existingProductIndex = panier.produits.findIndex(
                p => p.produit_id === parseInt(produit_id) && p.taille === taille
            );

            if (existingProductIndex !== -1) {
                // Si le produit existe avec la même taille, incrémenter la quantité
                await paniers.updateOne(
                    { utilisateur_id, "produits.produit_id": parseInt(produit_id), "produits.taille": taille },
                    { $inc: { "produits.$.quantite": parseInt(quantiteToAdd) } }
                );
                res.status(200).json({ message: "Quantité du produit mise à jour dans le panier", added: true });
            } else {
                // Si le produit n'existe pas avec cette taille, l'ajouter au panier
                await paniers.updateOne(
                    { utilisateur_id },
                    { $push: { produits: produitItemToAdd } }
                );
                res.status(200).json({ message: "Produit ajouté au panier avec succès", added: true });
            }
        } else {
            // Crée nouveau panier si pas encore fait
            await paniers.insertOne({
                utilisateur_id,
                produits: [produitItemToAdd],
            });
            res.status(200).json({ message: "Produit ajouté au panier avec succès", added: true });
        }

    } catch (err) {
        console.error("Erreur lors de l'ajout au panier: ", err);
        res.status(500).json({ error: "Erreur serveur lors de l'ajout au panier", added: true });
    }
});

app.post('/retirer-du-panier', async (req, res) => {
    try {
        const MongoDB = getMongoDB();
        const paniers = MongoDB.collection("panier");

        const { id } = req.body;
        const utilisateur_id = req.session.userId;

        const panierAvant = await paniers.findOne({ utilisateur_id });

        await paniers.updateOne(
            { utilisateur_id },
            { $pull: { produits: { produit_id: parseInt(id) } } }
        );

        console.log(`Produit ${id} retiré du panier`);
        res.sendStatus(200);
    } catch (err) {
        console.error("Erreur en retirant produit du panier", err);
        res.sendStatus(500);
    }
});

app.post('/update-quantite', async (req, res) => {
    try {
        const MongoDB = getMongoDB();
        const paniers = MongoDB.collection("panier");

        const { id, quantite, taille } = req.body; // Récupérer l'ID du produit, la quantité et la taille
        const utilisateur_id = req.session.userId;
        const newQuantite = parseInt(quantite, 10);
        const productId = parseInt(id, 10); // Assurez-vous que l'ID est un nombre

        // Requête SQL pour récupérer les informations du produit
        let sql = "SELECT id_produit, nom, prix, details, type, sous_categorie, genre, tailleXS, tailleS, tailleM, tailleL, tailleXL, image_url1, image_url2, image_url3, quantite, tailleXS, tailleS, tailleM, tailleL, tailleXL FROM produit WHERE id_produit = ?";
        let params = [productId];

        // Exécuter la requête SQL (en supposant que 'db' est votre connexion à la base de données SQL)
        db.query(sql, params, async (err, results) => {
            if (err) {
                console.error("Erreur lors de la requête SQL:", err);
                return res.sendStatus(500);
            }

            if (results.length === 0) {
                return res.status(404).json({ error: "Produit non trouvé dans la base de données SQL." });
            }

            const produitEnBase = results[0];
            console.log("produit en base (SQL)", produitEnBase);

            let stockDisponible;
            if (taille && ["XS", "S", "M", "L", "XL"].includes(taille)) {
                stockDisponible = produitEnBase[`taille${taille.toUpperCase()}`];
            } else {
                stockDisponible = produitEnBase.quantite; // Pour les produits sans taille
            }

            if (isNaN(newQuantite) || newQuantite < 1) {
                return res.status(400).json({ error: "Quantité invalide." });
            }

            if (newQuantite > stockDisponible) {
                return res.status(400).json({ error: `Stock insuffisant pour la taille ${taille}. Il ne reste que ${stockDisponible} unités.` });
            }

            const updateResult = await paniers.updateOne(
                { utilisateur_id, "produits.produit_id": productId, "produits.taille": taille },
                { $set: { "produits.$.quantite": newQuantite } }
            );

            if (updateResult.modifiedCount > 0) {
                console.log(`Quantité mise à jour pour produit ${productId} (taille: ${taille}) à ${newQuantite}`);
                res.sendStatus(200);
            } else {
                console.log(`Aucun produit trouvé avec l'ID ${productId} et la taille ${taille} pour cet utilisateur, ou la quantité n'a pas changé.`);
                res.sendStatus(200);
            }
        });

    } catch (err) {
        console.error("Erreur update quantite:", err);
        res.sendStatus(500);
    }
});
app.post('/deplacer-vers-favoris', async (req, res) => {
    try {
        const MongoDB = getMongoDB();
        const paniers = MongoDB.collection("panier");
        const wishlists = MongoDB.collection("wishlist");

        const { id, taille } = req.body;
        const utilisateur_id = req.session.userId;

        // retire du panier
        await paniers.updateOne(
            { utilisateur_id },
            { $pull: { produits: { produit_id: parseInt(id) } } }
        );

        // add au wishlist
        const produitItem = {
            produit_id: parseInt(id),
            taille
        };

        await wishlists.updateOne(
            { utilisateur_id },
            { $push: { produits: { produits: produitItem } } },
            { upsert: true }
        );

        console.log(`Produit ${id} déplacé vers wishlist`);
        res.sendStatus(200);

    } catch (err) {
        console.error("Erreur de déplacement vers favoris du panier:", err);
        res.sendStatus(500);
    }
})

app.get("/panier", async (req, res) => {
    try {
        // Récupère bd Mongo et la collection panier
        const MongoDB = getMongoDB();
        const paniers = MongoDB.collection("panier");

        // Récupère ID du user à partir de la session
        // Si pas de connexion, crée user temporaire
        let utilisateur_id = req.session.userId;
        if (!utilisateur_id) {
            utilisateur_id = req.session.userId = uuidv4(); // Générer et stocker si absent
        }

        // Récupère panier de l'utilisateur
        const panier = await paniers.findOne({ utilisateur_id });

        // Si panier vide
        if (!panier || !panier.produits || panier.produits.length === 0) {
            return res.render("pages/panier", { produitsPanier: [], total: 0 });
        }

        // tableau pour stocker produits
        const produitsPanier = [];
        let total = 0;
        let totalPoints = 0;
        let nbProduitsNormaux = 0;

        // Cherche chaque produit dans panier du MongoDB
        for (const item of panier.produits) {
            let produit = null;

            if (item.isProduitPoint) {
                const rows = await new Promise((resolve, reject) => {
                    db.query(
                        "SELECT id_produit, nom, points_requis, image_url FROM produits_points WHERE id_produit = ?",
                        [item.produit_id],
                        (err, result) => {
                            if (err) return reject(err);
                            resolve(result);
                        }
                    );
                });

                if (rows.length > 0) {
                    produit = {
                        produit_id: item.produit_id,
                        nom: rows[0].nom,
                        prix: rows[0].points_requis,
                        image: rows[0].image_url
                    };
                }
            } else {
                // Convertir callback en Promise temporairement poour utiliser await
                const rows = await new Promise((resolve, reject) => {
                    db.query(
                        "SELECT id_produit, nom, prix, image_url1 FROM produit WHERE id_produit = ?",
                        [item.produit_id],
                        (err, result) => {
                            if (err) return reject(err);
                            resolve(result);
                        }
                    );
                });

                if (rows.length > 0) {
                    produit = {
                        produit_id: item.produit_id,
                        nom: rows[0].nom,
                        prix: rows[0].prix,
                        image: rows[0].image_url1
                    };
                }
            }

            //Crée objet et ajouter à produitsPanier
            if (produit) {
                let sousTotal = 0;

                if (!item.isProduitPoint) {
                    sousTotal = produit.prix * item.quantite;
                    total += sousTotal;
                    nbProduitsNormaux += 1;
                } else {
                    totalPoints += produit.prix * item.quantite;
                }

                let stockMax = 0;

                if (item.taille && ["XS", "S", "M", "L", "XL"].includes(item.taille)) {
                    const colTaille = "taille" + item.taille.toUpperCase();
                    stockMax = produit[colTaille];
                } else {
                    stockMax = produit.quantite; // pour accessoire et sac
                }

                produitsPanier.push({
                    produit_id: item.produit_id,
                    nom: produit.nom,
                    prix: produit.prix,
                    image: produit.image,
                    quantite: item.quantite,
                    taille: item.taille,
                    sousTotal: sousTotal.toFixed(2),
                    stockMax,
                    isProduitPoint: item.isProduitPoint
                });
            }
        }

        if (nbProduitsNormaux === 0 && produitsPanier.length > 0) {
            total = 0.50;
        }

        const tvq = total * 0.09975;
        const tps = total * 0.05;
        const totalAvecTaxes = total + tvq + tps;

        // Envoit à panier.ejs
        res.render("pages/panier", {
            produitsPanier,
            total: total.toFixed(2),
            totalPoints: totalPoints.toFixed(0),
            tvq: tvq.toFixed(2),
            tps: tps.toFixed(2),
            totalAvecTaxes: totalAvecTaxes.toFixed(2),
            user: req.session.user || null
        });

        console.log("panier updated");

    } catch (err) {
        console.error("Erreur lors du changement du panier: ", err);
        res.status(500).send("Erreur serveur");
    }
});


// ------------------------------------------ CHECKOUT SESSION  ------------------------------------------
app.get('/checkout', (req, res) => {
    res.render('pages/checkout');
})

app.post('/create-checkout-session', async (req, res) => {
    try {
        const MongoDB = getMongoDB();
        const panierCollection = MongoDB.collection("panier");

        const utilisateur_id = req.session.userId || "utilisateur-temp";

        if (!utilisateur_id) {
            return res.status(400).send("Erreur: utilisateur non connecté.")
        }

        const panier = await panierCollection.findOne({ utilisateur_id });

        if (!panier || !panier.produits || panier.produits.length === 0) {
            return res.status(400).json({ error: "Panier vide ou introuvable" });
        }

        const line_items = [];
        const produitsPayants = panier.produits.filter(p => !p.isProduitPoint);

        if (produitsPayants.length === 0) {
            line_items.push({
                price_data: {
                    currency: 'cad',
                    product_data: {
                        name: "Commande de points",
                        description: "Commande 100% en points",
                    },
                    unit_amount: 50,// 0.50$
                },
                quantity: 1
            });
        }

        for (const produit of produitsPayants) {
            line_items.push({
                price_data: {
                    currency: 'cad',
                    product_data: {
                        name: produit.isProduitPoint ? `${produit.nom} (GRATUIT)` : produit.nom,
                        description: produit.isProduitPoint ? "Produit offert gratuitement avec points" : `Taille: ${produit.taille}`,
                    },
                    unit_amount: produit.isProduitPoint ? 0 : Math.round(produit.prix * 100),
                },
                quantity: produit.quantite || 1,
            });
        }

        // utilisateur stripe consistant
        let customerId = null;
        const email = req.session.user?.email;

        if (email) {
            const customers = await stripe.customers.list({
                email: email,
                limit: 1
            });

            if (customers.data.length > 0) {
                customerId = customers.data[0].id;
            } else {
                const customer = await stripe.customers.create({
                    email: email,
                    name: req.session.user?.prenom + " " + req.session.user?.nom
                });
                customerId = customer.id;
            }
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items,
            allow_promotion_codes: true,
            metadata: {
                utilisateur_id: utilisateur_id.toString()
            },

            shipping_address_collection: {
                allowed_countries: ['CA', 'US'],
            },

            customer: customerId,
            customer_update: {
                shipping: "auto"
            },

            automatic_tax: { enabled: true },
            shipping_options: [
                { shipping_rate: 'shr_1R86rY4ednZ7Sn44wEQEmLTA' },
                { shipping_rate: 'shr_1R86r54ednZ7Sn44POyvtD3i' }
            ],
            success_url: 'http://localhost:4000/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'http://localhost:4000/panier',
        });

        res.json({ url: session.url });

    } catch (err) {
        console.error("Erreur création session Stripe: ", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Page succès
// Enregistre adresses de livraison des utilisateurs
// Insérer Table Commande dans MongoDB
app.get('/success', async (req, res) => {
    try {
        const sessionId = req.query.session_id;
        const panierUtilisateurId = req.session.userId || "utilisateur-temp";

        if (!sessionId) {
            return res.status(400).send("Session non valide.");
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['payment_intent', 'customer', 'shipping']
        });

        if (!session || !session.amount_total) {
            return res.status(400).send("Détails de session Stripe non valides");
        }

        const montantTotal = session.amount_total / 100;

        const MongoDB = getMongoDB();
        const panierCollection = MongoDB.collection("panier");
        const commandesCollection = MongoDB.collection("commandes");

        const panier = await panierCollection.findOne({ utilisateur_id: panierUtilisateurId });

        if (!panier || !panier.produits || panier.produits.length === 0) {
            return res.status(400).send("Panier introuvable");
        }

        let montantPayant = 0;
        let montantPoints = 0;

        // Mise à jour du stock dans la base de données SQL
        for (const item of panier.produits) {
            const productId = parseInt(item.produit_id);
            const quantiteAchetee = parseInt(item.quantite);
            const taille = item.taille;

            if (!isNaN(productId) && !isNaN(quantiteAchetee)) {
                let sql;
                let params;

                if (taille && ["XS", "S", "M", "L", "XL"].includes(taille)) {
                    const colonneTaille = `taille${taille.toUpperCase()}`;
                    sql = `UPDATE produit SET ${colonneTaille} = ${colonneTaille} - ? WHERE id_produit = ?`;
                    params = [quantiteAchetee, productId];
                } else {
                    sql = `UPDATE produit SET quantite = quantite - ? WHERE id_produit = ?`;
                    params = [quantiteAchetee, productId];
                }

                // Exécuter la requête SQL de mise à jour du stock
                db.query(sql, params, (err, result) => {
                    if (err) {
                        console.error("Erreur lors de la mise à jour du stock:", err);
                        // Gérer l'erreur ici, peut-être logguer et continuer ou annuler la commande
                    } else {
                        console.log(`Stock mis à jour pour le produit ${productId}, taille ${taille || 'unique'}: -${quantiteAchetee}`);
                    }
                });

                if (item.isProduitPoint) {
                    montantPoints += item.prix * item.quantite;
                } else {
                    montantPayant += item.prix * item.quantite;
                }
            }
        }

        // Retirer points utilisés
        if (!req.session.isTemporaryUser && montantPoints > 0) {
            const sqlRemovePoints = "UPDATE utilisateur SET points = points - ? WHERE id_utilisateur = ?";
            db.query(sqlRemovePoints, [montantPoints, req.session.userId], (err, result) => {
                if (err) {
                    console.error("Erreur retrait des points:", err);
                } else {
                    console.log(`-${montantPoints} points retirés à l'utilisateur ${req.session.userId}`);
                }
            });
        }

        // Ajouter points gagnés
        if (!req.session.isTemporaryUser) {
            const points = Math.floor(montantPayant);
            const sql = "UPDATE utilisateur SET points = points + ? WHERE id_utilisateur = ?";

            db.query(sql, [points, req.session.userId], (err, result) => {
                if (err) {
                    console.error("Erreur mise à jour des points: ", err);
                } else {
                    console.log(`+${points} points ajoutés à l'utilisateur ${req.session.userId}`);
                }
            });
        }

        // Insérer la commande dans la collection "commandes"
        const paymentIntent = session.payment_intent;
        const paymentMethodId = paymentIntent.payment_method;
        const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

        const shippingRateId = session.shipping_cost?.shipping_rate;
        let methodeLivraison = "Livraison standard (3-10 jours ouvrables)";

        if (shippingRateId === 'shr_1R86r54ednZ7Sn44POyvtD3i') {
            methodeLivraison = "Livraison express (1-3 jours ouvrables)";
        }

        const nouvelleCommande = {
            utilisateur_id: panierUtilisateurId,
            date_commande: new Date(),
            total: montantTotal,
            totalPoints: montantPoints,
            stripe_session_id: sessionId,
            status: "En attente",
            email: session.customer_details.email,
            nom_complet: session.customer_details.name,
            adresse: session.customer_details.address,
            methode_livraison: methodeLivraison,
            paiement: {
                type: paymentMethod.card.brand,
                numero: `**** ${paymentMethod.card.last4}`,
                expiration: `${paymentMethod.card.exp_month}/${paymentMethod.card.exp_year}`,
            },
            produits: panier.produits,
        };

        const commandeResult = await commandesCollection.insertOne(nouvelleCommande);


        // Envoyer un courriel avec facture
        const emailHTML = `
            <h2>Merci pour avoir choisit Maison Dhalia, ${nouvelleCommande.nom_complet} !</h2>
            <p><strong>Numéro de commande:</strong> ${commandeResult.insertedId}</p>
            <p><strong>Total:</strong> ${nouvelleCommande.total}$CAD</p>

            <br>

            <p><strong>Méthode de paiement:</strong>
            <ul style="list-style: none; padding-left: 0;">
                <li>Carte: ${nouvelleCommande.paiement.type.toUpperCase()} ${nouvelleCommande.paiement.numero}</li>
                <li>Expiration: ${nouvelleCommande.paiement.expiration}</li>
            </ul>

            <br>

            <p><strong>Méthode de livraison:</strong> ${nouvelleCommande.methode_livraison}</p>

            <br>

            <p><strong>Adresse de livraison:</strong> </p>
            <ul style="list-style: none; padding-left: 0;">
                <li>${nouvelleCommande.adresse.line1}</li>
                ${nouvelleCommande.adresse.line2 ? `<li>${nouvelleCommande.adresse.line2}</li>` : ""}
                <li>${nouvelleCommande.adresse.postal_code} ${nouvelleCommande.adresse.city}</li>
                <li>${nouvelleCommande.adresse.country}</li>
            </ul>

            <br>

            <h3>Détails des produits :</h3>
            <ul style="list-style: none; padding-left: 0;">
                ${nouvelleCommande.produits.map(p => `
                    <div style="display: flex; align-items: center; margin-bottom: 15px;">
                        <img src="http://localhost:4000/${p.image} alt="${p.nom}" width="80" style="margin-right: 15px; border-radius: 10px;">
                        <div>
                            <p style="margin: 0; font-weight: bold;">${p.nom}</p>
                            <p style="margin: 0;">Qty: ${p.quantite}</p>
                            <p style="margin: 0;">Taille: ${p.taille || "unique"}</p>
                        </div>
                    </div>
                `).join("")}
            </ul>
            <p>Merci pour votre achat avec Maison Dhalia.</p>
        `;

        await transporter.sendMail({
            from: '"Maison Dhalia" <maisondhalia@gmail.com>',
            to: nouvelleCommande.email,
            subject: "Confirmation de commande Maison Dhalia",
            html: emailHTML
        });


        // Vider le panier après la commande
        await panierCollection.deleteOne({ utilisateur_id: panierUtilisateurId });

        console.log(`Commande placée: ${nouvelleCommande._id}`);

        const toMs = (minutes) => minutes * 60 * 1000;
        const isExpress = shippingRateId === 'shr_1R86r54ednZ7Sn44POyvtD3i';
        const attenteMinutes = isExpress ? 1 : 3;
        const livraisonMinutes = isExpress ? getRandom(2, 3) : getRandom(4, 10);

        setTimeout(async () => {
            const currentCommande = await commandesCollection.findOne({ _id: commandeResult.insertedId });
            if (currentCommande?.status !== "Annulee") {
                await commandesCollection.updateOne(
                    { _id: commandeResult.insertedId },
                    { $set: { status: "Expediee" } }
                );
                console.log("Commande expédiée");
                setTimeout(async () => {
                    await commandesCollection.updateOne(
                        { _id: commandeResult.insertedId },
                        { $set: { status: "Livree" } }
                    );
                    console.log("Commande livrée");
                }, toMs(livraisonMinutes));
            }
        }, toMs(attenteMinutes));

        res.render("pages/success", { orderId: commandeResult.insertedId });

    } catch (err) {
        console.error("Erreur lors de la finalisation de la commande : ", err);
        res.status(500).send("Erreur serveur lors du traitement de la commande");
    }
});

app.get("/api/statut-commande/:id", async (req, res) => {
    try {
        const MongoDB = getMongoDB();
        const commandes = MongoDB.collection("commandes");
        const commande = await commandes.findOne({ _id: ObjectId.createFromHexString(req.params.id) });

        if (!commande) {
            return res.status(400).json({ status: "Inconnue" });
        }

        res.json({ status: commande.status });
    } catch (err) {
        console.error("Erreur récupération statut commande : ", err);
        res.status(500).json({ status: "Erreur" });
    }
});

app.get("/detail-commande/:id", async (req, res) => {
    try {
        const MongoDB = getMongoDB();
        const commandes = MongoDB.collection("commandes");

        const commande = await commandes.findOne({ _id: ObjectId.createFromHexString(req.params.id) });

        if (!commande) {
            return res.status(404).send("Commande introuvable");
        }

        res.render("pages/detail-commande", { commande });
    } catch (err) {
        console.error("Erreur détail commande: ", err);
        res.status(500).send("Erreur serveur");
    }
});

// ------------------------------------------ PAGES DU FOOTER ------------------------------------------
app.get("/a-propos", function (req, res) {
    res.render("pages/a-propos");
});

app.get("/livraison", function (req, res) {
    res.render("pages/livraison");
});

app.get("/politique-retour", function (req, res) {
    res.render("pages/politique-retour");
});

app.get("/politique-confidentialite", function (req, res) {
    res.render("pages/politique-confidentialite");
});

app.get("/conditions", function (req, res) {
    res.render("pages/conditions");
});

// ------------------------------------------ BARRE DE RECHERCHE -----------------------------

app.get("/api/suggestions", (req, res) => {
    const searchTerm = req.query.query;

    if (!searchTerm || searchTerm.trim() === "") {
        return res.json([]);
    }

    const like = `%${searchTerm}%`;

    const sql = `
      SELECT id_produit, nom, type, sous_categorie, genre
      FROM produit
      WHERE LOWER(nom) LIKE LOWER(?)
         OR LOWER(type) LIKE LOWER(?)
         OR LOWER(sous_categorie) LIKE LOWER(?)
         OR LOWER(genre) LIKE LOWER(?)
      LIMIT 15
    `;

    db.query(sql, [like, like, like, like], (err, results) => {
        if (err) {
            console.error("Erreur suggestions AJAX:", err);
            return res.status(500).json([]);
        }

        const suggestions = new Map();

        results.forEach(row => {
            const searchLC = searchTerm.toLowerCase();

            // Produit
            if (row.nom.toLowerCase().includes(searchLC)) {
                suggestions.set(`produit-${row.id_produit}`, {
                    type: "produit",
                    label: row.nom,
                    url: `/description/${row.id_produit}`
                });
            }

            // Type
            const typeKey = row.type.toLowerCase();
            if (typeKey.includes(searchLC) && !suggestions.has(`type-${typeKey}`)) {
                suggestions.set(`type-${typeKey}`, {
                    type: "type",
                    label: capitalize(row.type),
                    url: `/listProduits/${capitalize(row.type)}`
                });
            }

            // Sous-catégorie
            const sousCatKey = row.sous_categorie.toLowerCase();
            if (sousCatKey.includes(searchLC) && !suggestions.has(`sous-${sousCatKey}`)) {
                const typeCategory = capitalize(row.type); // ex: sac → Sac
                suggestions.set(`sous-${sousCatKey}`, {
                    type: "sous_categorie",
                    label: capitalize(row.sous_categorie),
                    url: `/listProduits/${typeCategory}/${row.sous_categorie}`
                });
            }

            // Genre
            const genreKey = row.genre.toLowerCase();
            if (genreKey.includes(searchLC) && !suggestions.has(`genre-${genreKey}`)) {
                suggestions.set(`genre-${genreKey}`, {
                    type: "genre",
                    label: capitalize(row.genre),
                    url: `/listProduits/${capitalize(row.genre)}`
                });
            }
        });

        res.json(Array.from(suggestions.values()));
    });

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }
});
app.get("/recherche", (req, res) => {
    const searchTerm = req.query.query;

    if (!searchTerm || searchTerm.trim() === "") {
        return res.redirect("/listProduits");
    }

    res.redirect(`/listProduits?query=${encodeURIComponent(searchTerm)}`);
});

// ------------------------------------------ SECTION AVIS ------------------------------------------
// Route pour soumettre un avis
app.post('/api/avis', async (req, res) => {
    try {
        // Vérifier si l'utilisateur est connecté
        if (!req.session.user || !req.session.userId) {
            return res.status(401).json({ error: "Vous devez être connecté pour poster un avis" });
        }
        const MongoDB = getMongoDB();
        const avisCollection = MongoDB.collection("avis");

        const { produitId, note, commentaire, titre } = req.body;

        // Validation basique
        if (!produitId || !note || !commentaire || !titre) {
            return res.status(400).json({ error: "Tous les champs sont requis" });
        }
        // Vérifier si l'utilisateur a acheté ce produit
        const commandesCollection = MongoDB.collection("commandes");
        const commandes = await commandesCollection.find({
            utilisateur_id: req.session.userId,
            "produits.produit_id": parseInt(produitId)  // Vérifier si le produit existe dans les commandes de l'utilisateur
        }).toArray();

        if (commandes.length === 0) {
            return res.status(403).json({ error: "" });
        }

        // Récupérer les infos utilisateur
        const user = await new Promise((resolve, reject) => {
            db.query(
                "SELECT nom, prenom FROM utilisateur WHERE id_utilisateur = ?",
                [req.session.userId],
                (err, result) => {
                    if (err) return reject(err);
                    resolve(result[0]);
                }
            );
        });
        const nouvelAvis = {
            produit_id: parseInt(produitId),
            auteur: `${user.prenom} ${user.nom}`, // Nom automatique
            note: parseInt(note),
            commentaire,
            titre,  // Ajout du titre ici
            date: new Date()
        };

        const result = await avisCollection.insertOne(nouvelAvis);

        res.status(201).json({
            message: "Avis ajouté avec succès",
            avisId: result.insertedId
        });

    } catch (err) {
        console.error("Erreur lors de l'ajout de l'avis:", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Route pour récupérer les avis d'un produit
app.get('/api/avis/:produitId', async (req, res) => {
    try {
        const MongoDB = getMongoDB();
        const avisCollection = MongoDB.collection("avis");

        const produitId = parseInt(req.params.produitId);

        const avis = await avisCollection.find({ produit_id: produitId })
            .sort({ date: -1 })
            .toArray();

        res.json(avis);

    } catch (err) {
        console.error("Erreur lors de la récupération des avis:", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// ------------------------------------------ SECTION POPUP NEWSLETTER ------------------------------------------
app.post("/newsletter", (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: "Email requis" });
    }

    const checkSql = "SELECT * FROM newsletter WHERE email = ?";
    db.query(checkSql, [email], (err, results) => {
        if (err) {
            console.error("Erreur lors de la vérification d'email:", err);
            return res.status(500).json({ success: false, message: "Erreur serveur" });
        }

        if (results.length > 0) {
            return res.status(409).json({ success: false, message: "Vous êtes déjà inscrit à la newsletter." });
        }

        const insertSql = "INSERT INTO newsletter (email) VALUES (?)";

        db.query(insertSql, [email], (err, result) => {
            if (err) {
                console.error("Erreur lors de l'insertion dans newsletter: ", err);
                return res.status(500).json({ success: false, message: "Erreur serveur" });
            }

            res.json({ success: true });
        });
    });
});


// ------------------------------------------ CONNEXION AU SERVEURS ------------------------------------------
async function main() {
    try {
        // Connexion MongoDB
        await connectToMongo();

        // note: pas de await pour mysql connexion puisque ça utilise un callback et non des promesses!

        // Lancement du serveur
        app.listen(4000, () => {
            console.log("Serveur fonctionne sur http://localhost:4000");
        });
    } catch (err) {
        console.error("Erreur lors de l'initiation du serveur: ", err);
    }
}

// Appel la fonction
main();