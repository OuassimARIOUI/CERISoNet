//ce fichier sert a la connexion a la base de données et à la création du modèle Internaute
const sql = require('../utils/dbConnection');
const crypto = require('crypto');

function hashPassword(password) {
    // SHA-1 est un algorithme de hachage (non réversible) — on hache pour comparer
    return crypto.createHash('sha1').update(password).digest('hex');
}

async function verifConnection(email, password) {
    const hashedPassword = hashPassword(password);
    const result = await sql`
        SELECT id FROM fredouil.compte
        WHERE mail = ${email} AND motpasse = ${hashedPassword}
        LIMIT 1
    `;
    return result.length > 0 ? result[0] : null;
}

module.exports = { verifConnection };