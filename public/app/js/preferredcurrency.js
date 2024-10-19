export async function getPreferredCurrency() {
    let preferredcurrency = '€';
    
    try {
        const response = await fetch('/preferred-currency');
    
        if(!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
    
        const data = await response.json();
        preferredcurrency = data.currency;
    
    } catch (err) {
        console.error('Erreur lors de la récupération de la devise préférée:', err);        
    } finally {
        return preferredcurrency;
    }
}