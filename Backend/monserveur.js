const express = require('express');
const app = express();
const HttpPort = 3126;
const HttpsPort = 3127;
const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');
const cors = require('cors');
const sql = require('./utils/dbConnection');
const { connectMongo } = require('./utils/mongoConnection');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const { verifConnection } = require('./models/Internaute.js');
const { url } = require('inspector');


//importing des fichiers ssl pour la création du serveur https
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, 'cert', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'cert', 'cert.pem'))
};

//creation de la collection pour stocker les sessions dans la base de données MongoDB
const store = new MongoDBStore({
  uri: 'mongodb://127.0.0.1:27017/CERISoNet',
  collection: 'MySession3127'
});


//gestion des erreurs de la collection de sessions
store.on('error', function(error) {
  console.log('Session Store Error', error);
});

//listen sur le port défini pour http et affiche un message dans la console lorsque le serveur est en cours d'exécution
http.createServer(app).listen(HttpPort, () => {
    console.log(`Server is running on http://pedago.univ-avignon.fr:${HttpPort}`);
});



//Creation du serveur https avec les options de ssl et l'application express, et écoute sur le port défini pour https
https.createServer(sslOptions, app).listen(HttpsPort, () => {
    console.log(`Server is running on https://pedago.univ-avignon.fr:${HttpsPort}`);
});

// Middleware pour parser JSON et servir les fichiers statiques
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: ['http://localhost:4200', 'https://localhost:4200', 'https://pedago.univ-avignon.fr:3127', 'http://pedago.univ-avignon.fr:3126'],
  credentials: true
}));

// Servir les fichiers statiques Angular
app.use(express.static(path.join(__dirname, '../Frontend/dist/Frontend/browser')));


app.use(
  session({
    secret: 'cerisonet_secret_key_3127',
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
      secure: true, // obligatoire car HTTPS
      sameSite: 'none', // nécessaire pour que le cookie soit envoyé en cross-origin
      maxAge: 1000 * 60 * 60 // 1 heure
    }
  })
);



// Route API pour l'authentification
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        const user = await verifConnection(email, password);
        if (user) {
            req.session.userId = user.id;
            req.session.email = email;
            // Sauvegarder la session explicitement avant de répondre
            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    return res.status(500).json({ error: 'Erreur de session' });
                }
                console.log(`Login successful for: ${email}, userId: ${user.id}`);
                res.json({ success: true, message: 'Login successful', user: user });
            });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});


// Route protégée : mur d'accueil (accessible uniquement si session active)
app.get('/api/wall', (req, res) => {
    if (req.session.userId) {
        // Session valide → accès autorisé
        res.json({ success: true, message: 'Bienvenue sur le mur !', userId: req.session.userId });
    } else {
        // Pas de session → accès refusé
        res.status(401).json({ error: 'Unauthorized: veuillez vous connecter' });
    }
});

/*
// Route pour servir l'application Angular (doit être en dernier)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../Frontend/dist/Frontend/browser/index.html'));
});
*/


// Route de test pour la base de données
app.get('/api/testdb', async (req, res) => {
    try {
        const result = await sql`SELECT * FROM fredouil.compte where pseudo = 'Fourmi'`;
        res.json(result);
    } catch (error) {
        console.error('Database query error:', error);
        res.status(500).json({ error: 'Database query failed' });
    }
});

app.get('/api/posts', async (req, res) => {
    //si il est pas connectée , on le fait rediriger vers la page de connection
    if(!req.session.userId) {
        return res.status(401).json({ error: 'Unauthorized: veuillez vous connecter' });
    }

    try {
        const page = parseInt(req.query.page) || 0;
        const postsPerPage = 20;
        const skipAmount = page * postsPerPage;

        const db = await connectMongo();
        const collection = db.collection('CERISoNet');

        //  Requête MongoDB avec tri et pagination
        const posts = await collection.find()
            .sort({ date: -1, hour: -1 })
            .skip(skipAmount)
            .limit(postsPerPage)
            .toArray();

        //  Extraction de tous les identifiants uniques (auteurs des posts + auteurs des commentaires)
        const userIds = new Set();
        posts.forEach(post => {
            if (post.createdBy) userIds.add(post.createdBy);
            if (post.comments) {
                post.comments.forEach(comment => {
                    if (comment.commentedBy) userIds.add(comment.commentedBy);
                });
            }
        });

        const idsArray = Array.from(userIds);
        let usersMap = {};

        //  Requête PostgreSQL pour faire la correspondance ID -> Pseudo
        // On s'assure d'abord qu'il y a bien des IDs à chercher pour éviter une erreur SQL
        if (idsArray.length > 0) {
            const users = await sql`
                SELECT id, pseudo 
                FROM fredouil.compte 
                WHERE id IN ${sql(idsArray)}
            `;
            
            // On crée un dictionnaire { "1": "fourmis", "2": "Chien" } pour aller très vite
            users.forEach(user => {
                usersMap[user.id] = user.pseudo;
            });
        }

        //  On enrichit les posts avec les pseudos avant de les envoyer au front-end
        const enrichedPosts = posts.map(post => {
            return {
                ...post,
                // On ajoute le pseudo, ou "Inconnu" si l'utilisateur a été supprimé de la BD
                authorPseudo: usersMap[post.createdBy] || `Inconnu (${post.createdBy})`,
                comments: post.comments ? post.comments.map(c => ({
                    ...c,
                    authorPseudo: usersMap[c.commentedBy] || `Inconnu (${c.commentedBy})`
                })) : []
            };
        });

        //  Renvoi des données enrichies
        res.json({ 
            success: true, 
            page: page,
            count: enrichedPosts.length,
            posts: enrichedPosts 
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des posts:', error);
        res.status(500).json({ error: 'Erreur serveur lors de la récupération des posts' });
    }

});

//Route "Catch-all" pour servir l'application Angular
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../Frontend/dist/Frontend/browser/index.html'));
});

app.post('/api/posts', async (req, res) => {
    if(!req.session.userId) {
        return res.status(401).json({ error: 'Unauthorized: veuillez vous connecter' });
    }

    try {
        
        const body = req.body.body;
        const hashtags = req.body.hashtags || "";
        const imageUrl = req.body.imageUrl || "";
        const imageTitle = req.body.imageTitle || "";
        const now= new Date();
        const date = now.toISOString().split('T')[0];
        const hour = now.toTimeString().split(' ')[0];

        //netptoyage et formatage des hashtags
        let tagsArray = [];
        if (hashtags && hashtags.trim() !== '') {
            tagsArray = hashtags.split(' ').map(tag => tag.startsWith('#') ? tag : '#' + tag);
        }
        
        //Structure du post à insérer
        const newPost ={
            date:date,
            hour:hour,
            body:body,
            createdBy: req.session.userId,
            hashtags: tagsArray,
            comments: [],
            shared: null,
            likes: 0,
            image: { url: imageUrl, title: imageTitle },//on peut faire des posts sans images 
        };
        
        //inserer le post produit dans la DB
        const db = await connectMongo();
        const collection = db.collection('CERISoNet');
        const result = await collection.insertOne(newPost);

        //recuperation du pseudo qui est dans la base donneée sql 
        const userResult = await sql`SELECT pseudo FROM fredouil.compte WHERE id = ${req.session.userId}`;
        //comparer avec celui qui est connectée 
        const pseudo = userResult.length > 0 ? userResult[0].pseudo : `User ${req.session.userId}`;

        // On renvoie le post complet au Front-end
        const createdPost = { 
            ...newPost, 
            _id: result.insertedId, 
            authorPseudo: pseudo 
        };
        res.json({ success: true, post: createdPost });
    }

     catch (error) {
        console.error('Erreur lors de la création du post:', error);
        res.status(500).json({ error: 'Erreur serveur lors de la publication' });
    }
});

// Route pour la déconnexion
app.post('/api/logout', async (req, res) => {
    try {
        if (req.session.userId) {
            //  Mise à jour du statut dans PostgreSQL (0 = déconnecté) 
            await sql`UPDATE fredouil.compte SET statut_connexion = 0 WHERE id = ${req.session.userId}`;
            
            //  Destruction de la session côté serveur 
            req.session.destroy((err) => {
                if (err) {
                    console.error('Erreur lors de la destruction de la session:', err);
                    return res.status(500).json({ error: 'Erreur lors de la déconnexion' });
                }
                
                // Suppression du cookie de session côté client
                res.clearCookie('connect.sid'); 
                res.json({ success: true, message: 'Déconnexion réussie' });
            });
        } else {
            // L'utilisateur était déjà déconnecté ou la session avait expiré
            res.json({ success: true, message: 'Déjà déconnecté' });
        }
    } catch (error) {
        console.error('Erreur lors du logout:', error);
        res.status(500).json({ error: 'Erreur serveur lors de la déconnexion' });
    }
});