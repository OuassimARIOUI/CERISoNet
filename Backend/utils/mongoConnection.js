const { MongoClient } = require('mongodb');

// URI de connexion local (sur le serveur pedago)
const uri = 'mongodb://127.0.0.1:27017';
const client = new MongoClient(uri);

let dbInstance = null;

async function connectMongo() {
    // On utilise le pattern Singleton pour ne pas rouvrir une connexion à chaque requête
    if (!dbInstance) {
        try {
            await client.connect();
            
            dbInstance = client.db('db-CERI'); 
            console.log('Connecté avec succès à MongoDB (db-CERI)');
        } catch (error) {
            console.error('Erreur de connexion à MongoDB:', error);
            throw error;
        }
    }
    return dbInstance;
}

module.exports = { connectMongo };