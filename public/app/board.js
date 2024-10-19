// board.js
import { getPreferredCurrency } from './js/preferredcurrency.js'
import { fetchConversionRate } from './js/currency.js'

let subscriptions = [];  // Variable globale pour stocker les abonnements

let isEditMode = false;             // Pour différencier la modale en mode ajout ou edit
let currentSubscriptionId = null;   // Alimenté avec l'id du sub pour le mode edit

let preferredcurrency = null; // Lecture dans .env
let conversionRate = null;    // Conversion USD<->EUR via l'api open.er-api

async function fetchSubscriptions() {
    try {
        const response = await fetch('/get');
        subscriptions = await response.json();

         // Calculer le total mensuel dans la devise préférée
        let totalMonthly = 0;
        subscriptions.forEach(sub => {
            let price = parseFloat(sub.price);  // Convertir en nombre
            let frequency = sub.frequency.toLowerCase();  // Convertir en minuscule pour la cohérence

            // Si la devise est différente de celle par défaut
            if (sub.currency !== preferredcurrency) {
                price = price * conversionRate;
            }
            // Ajustement selon la fréquence
            if (frequency === 'daily') {
                price = price * 30;
            } else if (frequency === 'annual') {
                price = price / 12;
            }
            // Ajouter au total mensuel
            totalMonthly += price;
        });
        const totalMonthlySpan = document.getElementById('total-monthly');        
        totalMonthlySpan.innerText = `${preferredcurrency}${totalMonthly.toFixed(2)}`;

        await displaySubscriptions(subscriptions);            // Appel la fonction pour afficher les cartes
    } catch (err) {
        console.error('Failed to fetch subscriptions:', err);
    }
}

async function returnReminderValue(reminder) {
    // Vérifier si une date de rappel (reminder) est saisie
    let returnReminder = (reminder === '' || isNaN(new Date(reminder).getTime())) 
        ? null 
        : reminder;

    return returnReminder;
}

async function updateSubscription(id, name, price, currency, frequency, url, pReminder) {
    const reminder = await returnReminderValue(pReminder);
    const subscriptionData = {
        name,
        url,
        price,
        currency,
        frequency,
        reminder
    };        

    const response = await fetch(`/subscriptions/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscriptionData),
    });

    if (response.ok) {
        const data = await response.json();
        await fetchSubscriptions();
    } else {
        console.error('Error updating subscription');
    }
}

async function deleteSubscription(id) {
    try {
        const response = await fetch(`/subscriptions/${id}`, {
            method: 'DELETE',
        });

        if (response.ok) {
            // Suppression réussie, retirer la carte du DOM
            await fetchSubscriptions();
            console.log(`Subscription with id ${id} has been deleted.`);
        } else {
            console.error('Failed to delete subscription.');
        }
    } catch (error) {
        console.error('Error deleting subscription:', error);
    }
};

async function addSubscription() {
    // Récupérer les valeurs du formulaire
    const name = document.getElementById('name').value;
    const price = document.getElementById('price').value;
    const currency = document.getElementById('currency').value;
    const frequency = document.getElementById('frequency').value;
    const url = document.getElementById('url').value;
    const reminderValue = document.getElementById('reminder').value;
    const reminder = await returnReminderValue(reminderValue);

    const subscriptionData = {
        name,
        url,
        price,
        currency,
        frequency,
        reminder
    };
    
    // Envoyer la requête POST pour ajouter la souscription
    try {
        const response = await fetch('/subscriptions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(subscriptionData),
        });

        if (response.ok) {
            // Fermer la modale et mettre à jour la liste des abonnements
            document.getElementById('modal').style.display = 'none';
            await fetchSubscriptions();
            console.log('New subscription added successfully.');
        } else {
            console.error('Failed to add subscription.');
        }
    } catch (error) {
        console.error('Error adding subscription:', error);
    }
};

async function getReminderStatus(reminderDate, frequencySub) {
    if (!reminderDate) return null;  // Pas de reminder, pas de cloche

    const today = new Date();
    const reminder = new Date(reminderDate);

    // Calculer la différence en millisecondes entre aujourd'hui et le reminder
    const timeDiff = reminder.getTime() - today.getTime();
    
    // Calculer la différence en jours
    const dayDiff = timeDiff / (1000 * 3600 * 24);

    let dayAlarm = frequencySub === 'month' ? 5 : frequencySub === 'annual' ? 31 : frequencySub === 'daily' ? 1 : 5;

    if (dayDiff > dayAlarm) {
        return 'empty';  // Reminder présent mais non dépassé
    } else if (dayDiff <= dayAlarm  && dayDiff >= 0) {
        return 'normal';
    } else if (dayDiff < 0) {
        return 'red';
    } else {
        return null;
    }
}

function convertToMonthlyPrice(price, frequency, conversionRate) {
    const monthlyPrice = 
    frequency === 'annual'  ? price / 12 
    : frequency === 'daily' ? price * 30 
    : parseFloat(price);
    return monthlyPrice * conversionRate;
}

// Fonction pour générer les cartes d'abonnement et les ajouter à la page
async function displaySubscriptions(subscriptions) {
    const subscriptionsContainer = document.getElementById('subscriptions');
    subscriptions.sort((a, b) => a.name.localeCompare(b.name));
    console.log("List of subscriptions:", subscriptions); // Affiche ou utilise les abonnements
    // Vider le conteneur des anciennes cartes avant d'ajouter les nouvelles
    subscriptionsContainer.innerHTML = '';

    subscriptions.forEach(async sub => {
        // Créer une card pour chaque abonnement
        const card = document.createElement('div');
        card.classList.add('card');

        // Ajouter les attributs data- à la carte
        card.setAttribute('data-id', sub.id);
        card.setAttribute('data-name', sub.name);
        card.setAttribute('data-price', sub.price);
        card.setAttribute('data-currency', sub.currency);
        card.setAttribute('data-frequency', sub.frequency);
        card.setAttribute('data-url', sub.url);
        card.setAttribute('data-reminder', sub.reminder);

        const frequencyLabel = sub.frequency === 'monthly' ? 'mo' : sub.frequency === 'annual' ? 'yr' : 'day';
        const formattedPrice = parseFloat(sub.price).toFixed(2); // Formater le prix avec 2 chiffres après la virgule
        
        // Obtenir le statut du reminder ('normal', 'red', ou null)
        const reminderStatus = await getReminderStatus(sub.reminder, sub.frequency);
        let reminderIcon = '';
        let tooltipTextColor = 'white';
        if (reminderStatus === 'empty') {
            reminderIcon = `<span class="material-icons reminder-icon" style="color: white;">notifications_none</span>`;
        } else if (reminderStatus === 'normal') {
            tooltipTextColor = '#ffaf09';
            reminderIcon = `<span class="material-icons reminder-icon" style="color: #ffaf09;">notifications_active</span>`;
        } else if (reminderStatus === 'red') {
            tooltipTextColor = '#ff4d4f';
            reminderIcon = `<span class="material-icons reminder-icon" style="color: #ff4d4f;">notifications_active</span>`;
        }
        
        reminderIcon = reminderIcon !== '' ? reminderIcon + `<div class="tooltip"><p style="color: ${tooltipTextColor};">${sub.reminder}</p></div>` : '';

        // Appeler la route du serveur Node.js pour récupérer l'icône
        const faviconUrl = `/favicon?url=${encodeURIComponent(sub.url)}`;
        card.innerHTML = `
            <div class="subscription-header">
                <img src="${faviconUrl}" alt="${sub.name} logo" class="company-logo">
                <h2>${sub.name}</h2>
                ${reminderIcon}
            </div>
            <p class="price">${sub.currency} ${formattedPrice}/${frequencyLabel}</p>
            <a href="${sub.url}" class="visit" target="_blank">Visit site</a>            
            <div class="icons">                
                <span class="edit-icon" data-id="${sub.id}">
                    <span class="material-icons">edit</span>
                </span>
                <span class="delete-icon" data-id="${sub.id}">
                    <span class="material-icons">delete</span>
                </span>
            </div>
        `;

        // Ajouter la carte au conteneur
        subscriptionsContainer.appendChild(card);

        // Ajouter l'événement onClick pour la conversion si différent de preferredcurrency (€) ou différent de frenquency (monthly)
        if(sub.currency !== preferredcurrency || sub.frequency !== 'monthly') {
            const addConvertIcon = ' <span class="material-icons convert-icon" style="font-size:16px;">currency_yen</span>';
            const priceElement = card.querySelector('.price');
            priceElement.innerHTML += addConvertIcon;
            priceElement.style.cursor = 'pointer';
            priceElement.addEventListener('click', function () {
                if (this.classList.contains('converted')) {
                    // Revenir à l'affichage normal
                    this.innerHTML = `${sub.currency} ${formattedPrice}/${frequencyLabel}`;
                    this.innerHTML += addConvertIcon;
                    this.classList.remove('converted');
                } else {
                    // Afficher le prix converti par mois
                    const priceInPreferredCurrency = convertToMonthlyPrice(sub.price, sub.frequency, conversionRate);
                    this.innerHTML = `${preferredcurrency} ${priceInPreferredCurrency.toFixed(2)}/mo`;
                    this.classList.add('converted');
                }
            });
        }                 
    });

    const totalSubscriptionsSpan = document.getElementById('total-subscriptions');        
    totalSubscriptionsSpan.innerText = `#${subscriptions.length}`;
    
    // Ajouter le taux de conversion après toutes les cartes
    const conversionRateContainer = document.getElementById('conversion-rate-container');
    const conversionRateCurrency = preferredcurrency === '€' ? '$' : '€';
    conversionRateContainer.innerHTML = `Conversion Rate: 1${conversionRateCurrency}=${conversionRate}${preferredcurrency}`;
}

// Click new subscription
document.getElementById('add-subscription-btn').addEventListener('click', () => {
    openAddModal();
});

// // Click edit or delete icon
document.getElementById('subscriptions').addEventListener('click', (event) => {
    
    // Vérifier si l'élément cliqué est une icône d'édition
    const editIcon = event.target.closest('.edit-icon');
    if (editIcon) {
        const card = editIcon.closest('.card');  // Trouver la carte parente
        if (card) {
            openUpdateModal(card);
        }
    }

    // Vérifier si l'élément cliqué est une icône de suppression
    const deleteIcon = event.target.closest('.delete-icon');
    if (deleteIcon) {
        const card = deleteIcon.closest('.card');  // Trouver la carte parente
        if (card) {
            const id = card.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this subscription?')) {
                deleteSubscription(id);
            }
        }
    }
});


// Sélection des éléments nécessaires
const modal = document.getElementById('modal');
const closeModalBtn = document.querySelector('.close-btn');
const editForm = document.getElementById('edit-form');

const nameInput = document.getElementById('name');
const urlInput = document.getElementById('url');
const priceInput = document.getElementById('price');
const frequencyInput = document.getElementById('frequency');
const currencyInput = document.getElementById('currency');
const reminderInput = document.getElementById('reminder');

function openAddModal() {
    isEditMode = false;  // Mode ajout
    currentSubscriptionId = null;  // Réinitialise l'ID

    // Vider les champs de la modale
    document.getElementById('name').value = '';
    document.getElementById('price').value = '';
    document.getElementById('currency').value = '€';  // Par défaut
    document.getElementById('frequency').value = 'monthly';  // Par défaut
    document.getElementById('url').value = '';
    document.getElementById('reminder').value = '';

    // Modifier le bouton pour indiquer l'ajout
    document.getElementById('modal-title').innerText = 'Add Subscription';
    const actionBtn = document.getElementById('action-btn');
    actionBtn.innerText = 'Add';

    document.getElementById('modal').style.display = 'flex';
}

// Fonction pour ouvrir la modale avec les données d'une carte
function openUpdateModal(card) {    
    const name = card.getAttribute('data-name');
    const url = card.getAttribute('data-url');
    const price = card.getAttribute('data-price');
    const frequency = card.getAttribute('data-frequency');
    const currency = card.getAttribute('data-currency');
    const reminder = card.getAttribute('data-reminder');
    const id = card.getAttribute('data-id');

    isEditMode = true;  // Mode édition
    currentSubscriptionId = id;

    // Remplir les champs avec les données existantes
    nameInput.value = name;
    urlInput.value = url;
    priceInput.value = price;
    const frequencySelect = document.getElementById('frequency');
    frequencySelect.value = frequency;
    const currencySelect = document.getElementById('currency');
    currencySelect.value = currency;
    reminderInput.value = reminder;

    document.getElementById('modal-title').innerText = 'Edit Subscription';
    const actionBtn = document.getElementById('action-btn');
    actionBtn.innerText = 'Update';

    modal.style.display = 'flex';
}

// Fermer la modale
closeModalBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

// Fermer la modale si on clique à l'extérieur
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

document.addEventListener('click', function (event) {
    // Vérifie si l'élément cliqué est une icône de reminder
    if (event.target.classList.contains('reminder-icon')) {
        const tooltip = event.target.parentElement.querySelector('.tooltip');
        if (tooltip) {
            if (tooltip.classList.contains('show')) {
                tooltip.classList.remove('show');
            } else {
                tooltip.classList.add('show');
            }
        } else {
            console.error('Tooltip not found for the clicked reminder icon');
        }
    }
});

// Gestion du formulaire d'édition
editForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const updatedName = nameInput.value;
    const updatedUrl = urlInput.value;
    const updatedPrice = priceInput.value;
    const updatedFrequency = frequencyInput.value;
    const updatedCurrency = currencyInput.value;
    const updatedReminder = reminderInput.value;

    if(!updatedName || !updatedUrl || !updatedPrice || !updatedFrequency || !updatedCurrency) {
        console.error('error in values');
    } else {
        if (isEditMode && currentSubscriptionId) {
            updateSubscription(currentSubscriptionId, updatedName, updatedPrice, updatedCurrency, updatedFrequency, updatedUrl, updatedReminder);
        } else {
            addSubscription(updatedName, updatedPrice, updatedCurrency, updatedFrequency, updatedUrl, updatedReminder);
        }
        modal.style.display = 'none';
    }
});

// Fonction asynchrone pour initialiser les données
async function initialize() {
    try {
        preferredcurrency = await getPreferredCurrency();
        conversionRate = await fetchConversionRate(preferredcurrency);

        // Utilise les valeurs récupérées comme tu le souhaites, par exemple :
        console.log(`Devise ${preferredcurrency} - Taux de conversion : ${conversionRate}`);
        
        fetchSubscriptions();

    } catch (err) {
        console.error('Erreur lors de l\'initialisation :', err);
    }
}

initialize();