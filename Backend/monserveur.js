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

const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const { verifConnection } = require('./models/Internaute.js')


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

app.get('/api/posts', async (req, res) => {});