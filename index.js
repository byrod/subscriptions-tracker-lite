// index.js
const { addSubscription, updateSubscription, deleteSubscription, getAllSubscriptions } = require('./utils/sql');
const { getFavicon } = require('./utils/favicon');
const express = require('express');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Créer le dossier des favicons s'il n'existe pas
const faviconDirectory = path.join(__dirname, 'favicons');
if (!fs.existsSync(faviconDirectory)) {
    fs.mkdirSync(faviconDirectory);
}

// Middleware pour parser les données JSON
app.use(express.json());

// Middleware pour rendre les statics
app.use(express.static('public'));

// Route pour récupérer le favicon
app.get('/favicon', async (req, res) => {
    const { url } = req.query;
    try {
        if (!url) {
            return res.status(400).send('URL is required');
        }
    
        const faviconPath = await getFavicon(faviconDirectory, url);
    
        if (faviconPath) {
            return res.sendFile(faviconPath);
        } else {
            res.status(404).send(`Unable to get favicon from ${url}`);
        }      
    } catch (err) {
        res.status(500).send(`Unable to get favicon from ${url} - error :`, error);
    }
});

// Route pour récupérer tous les abonnements
app.get('/get', async (req, res) => {
    try {
        const subscriptions = await getAllSubscriptions();
        res.status(201).json(subscriptions);
    } catch (error) {
        res.status(500).send('Unable to connect to the database:', error);
    }
});

// Route pour récupérer la devise du .env
app.get('/preferred-currency', (req, res) => {
    const preferredCurrency = process.env.PREFERRED_CURRENCY || '€';
    res.json({ currency: preferredCurrency });
});

// Route pour ajouter un nouvel abonnement
app.post('/subscriptions', async (req, res) => {
    const { name, price, currency, frequency, url, reminder } = req.body;
    try {
        // Validation basique des données d'entrée
        if (!name || !price || !currency || !frequency) {
            return res.status(400).json({ error: 'Invalid input data' });
        }
        const subscription = await addSubscription(name, price, currency, frequency, url, reminder);
        res.status(201).json(subscription);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create subscription' });
    }
});

// Route pour mettre à jour un abonnement
app.put('/subscriptions/:id', async (req, res) => {
    const { id } = req.params;
    const { name, price, currency, frequency, url, reminder } = req.body;
    
    try {
        const message = await updateSubscription(id, name, price, currency, frequency, url, reminder);
        res.json({ message });
    } catch (err) {
        res.status(500).json({ error: 'Error updating subscription' });
    }
});

// Route pour supprimer un abonnement
app.delete('/subscriptions/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const message = await deleteSubscription(id);
        res.json({ message });
    } catch (err) {
        res.status(500).json({ error: 'An error occurred while deleting the subscription' });
    }
});

// Catch-all pour les routes inexistantes
app.use((req, res, next) => {
    res.status(404).redirect('/');
});

// Démarre le serveur
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
