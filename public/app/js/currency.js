let conversionRate = 0.9; // conversion USD->EUR par défaut

// Fonction pour récupérer le taux de conversion EUR -> USD
export async function fetchConversionRate(currency) {
    try {
        const get_devise = currency === '$' ? 'EUR' : 'USD';
        const devise = currency === '$' ? 'USD' : 'EUR';
        
        const response = await fetch(`https://open.er-api.com/v6/latest/${devise}`);
        
        if(!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();

        if (data && data.rates && data.rates[get_devise]) {
            conversionRate = data.rates[get_devise];
        }  else {
            console.error('Taux de conversion non trouvé dans la réponse de l\'API');
        }
    } catch (error) {
        console.error('Erreur lors de la récupération du taux de conversion:', error);
    } finally {
        return conversionRate;
    }
}