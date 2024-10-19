// index.js
const sqlite3 = require('sqlite3').verbose();

// Ouvrir une connexion à la base de données SQLite (ou créer la base de données si elle n'existe pas)
const db = new sqlite3.Database('./subscriptions.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the subscriptions.db SQLite database.');
});

// Créer une table pour les abonnements
db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    currency TEXT NOT NULL,
    frequency TEXT NOT NULL,
    url TEXT,
    reminder TEXT
)`);

// Fonction pour insérer un nouvel abonnement
function addSubscription(name, price, currency, frequency, url, reminder) {
    return new Promise((resolve, reject) => {
        try {
            const sql = `INSERT INTO subscriptions (name, price, currency, frequency, url, reminder) VALUES (?, ?, ?, ?, ?, ?)`;
            db.run(sql, [name, price, currency, frequency, url, reminder], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(`A subscription has been inserted with id ${this.lastID}`);
                }
            });    
        } catch (error) {
            reject(error);
        }
    });
}

// Fonction pour mettre à jour un abonnement existant
function updateSubscription(id, name, price, currency, frequency, url, reminder) {
    return new Promise((resolve, reject) => {
        try {
            const sql = `UPDATE subscriptions 
                         SET name = ?, price = ?, currency = ?, frequency = ?, url = ?, reminder = ?
                         WHERE id = ?`;
            db.run(sql, [name, price, currency, frequency, url, reminder, id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(`Subscription with id ${id} has been updated`);  // Succès de la mise à jour
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}

// Fonction pour mettre à jour un abonnement existant
function deleteSubscription(id) {
    return new Promise((resolve, reject) => {
        try {
            const sql = `DELETE FROM subscriptions WHERE id = ?`;
            db.run(sql, [id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(`Subscription with id ${id} has been updated`);
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}

// Fonction pour récupérer tous les abonnements avec une Promise
function getAllSubscriptions() {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM subscriptions`;
        try {
            db.all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        } catch (error) {
            reject(error)
        }
        
    });
}

process.on('SIGINT', () => {
    console.log('Signal SIGINT reçu : Fermeture du serveur proprement...');
    db.close((err) => {
        if (err) {
            console.error('Erreur lors de la fermeture de la base de données:', err.message);
        } else {
            console.log('Connexion à la base de données fermée proprement.');
        }
        process.exit(0);  // Quitter proprement le processus
    });
});

// Exporter la fonction pour pouvoir l'utiliser dans d'autres fichiers
module.exports = {
    addSubscription,
    getAllSubscriptions,
    updateSubscription,
    deleteSubscription
};

