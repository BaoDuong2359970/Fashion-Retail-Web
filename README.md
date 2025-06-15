## Avant de pouvoir exécuter l'application, vous devez installer Node.js, un logiciel essentiel.

1- Téléchargez et installez **Node.js**:
Allez sur le site officiel : <u>https://nodejs.org/</u>
Téléchargez la version **LTS** et installez-la.

2- Après l'installation, ouvrez un terminal et tapez : **node -v**
Cela doit afficher un numéro de version, confirmant que Node.js est bien installé.

3- Dans le terminal, accédez au dossier où vous avez placé le projet : **cd chemin/vers/le/dossier/GitHub/App_Trans/Projet_web**
et exécutez : **npm init -y** (Cela va créer un fichier package.json qui gère les dépendances du projet.)

4- Toujours dans le terminal, exécutez la commande suivante: **npm install express express-session mysql2 express-validator dateformat**
(Ces outils sont nécessaires au bon fonctionnement de l'application.)

# Déploiement de l'Application

### PREMIERE ETAPE : Création de la Base de Données MySQL avec Docker.
L'application a besoin d'une base de données pour fonctionner. Nous allons utiliser Docker pour la créer.

1- Ouvrez l’invite de commande (CMD) et exécutez cette commande pour créer un conteneur MySQL :
**docker run --name mysql-site_vetement -e MYSQL_ROOT_PASSWORD=oracle -e MYSQL_DATABASE=site_db -p 3306:3306 -d mysql:latest**

2- Connexion au serveur MySQL:
Après le lancement du conteneur, exécutez cette commande pour vous connecter à MySQL :
**docker exec -it mysql-site_vetement mysql -u root -p**

Lorsque demandé, entrez le mot de passe : **oracle** (et appuyez sur Entrée).

Ensuite, tapez cette commande pour sélectionner la base de données: **USE site_db;**

### DEUXIEME ETAPE : Création de la Base de Données MongoDB avec Docker.
1. Ouvrez l'invite de commande (CMD) et executez cette commande pour creer un conteneur MongoDB:
**docker run --name mongo-site-vetement -d -p 27017:27017 mongodb/mongodb-community-server:latest**

2. Deplacez-vous vers le fichier node-mongoDB:
**cd [VOTRE CHEMIN]\App_Trans\Projet_Web\node-mongoDB**

3. Installez les node modules:
**npm install**

###  TROISIEME ETAPE: Création des Tables
Pour créer les tables nécessaires, exécutez le script suivant dans MySQL : ([text](creation_tables)) 


### QUATRIEME ETAPE: Insertion des Données
Ajoutez des utilisateurs et des produits dans la base de données en exécutant le script suivant : ([text](insertion_tables)) 


### CINQUIEME ETAPE: Lancer le serveur
 Maintenant que la base de données est prête, nous pouvons démarrer le serveur de l'application. 
1- Ouvrez un terminal
2- Accédez au dossier du projet où se trouve server.js : **cd chemin/vers/le/dossier/GitHub/App_Trans**
3- Exécutez cette commande pour démarrer le serveur : **node server.js**

 Si tout fonctionne bien, le serveur est maintenant actif 


### FINALEMENT: Accéder au site
Une fois le serveur lancé, ouvrez un navigateur web (Chrome, Firefox, Edge...) et entrez cette adresse dans la barre de recherche : http://localhost:4000

Vous pouvez maintenant utiliser l'application! 🎉


