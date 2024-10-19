const fs = require('fs');
const path = require('path');

function formatUrlToFilename(url) {
    return url
        .replace(/[^a-zA-Z0-9]/g, '_')  // Remplacer tous les caractères non alphanumériques par "_"
        .toLowerCase();                 // Convertir en minuscules pour plus de cohérence
}

async function getFavicon(faviconDirectory, url) {
    const formattedFilename = formatUrlToFilename(url);
    const faviconPngPath = path.join(faviconDirectory, `${formattedFilename}.png`);
    const faviconIcoPath = path.join(faviconDirectory, `${formattedFilename}.ico`);

    if (fs.existsSync(faviconPngPath)) {
        return faviconPngPath;
    }
    if (fs.existsSync(faviconIcoPath)) {
        return faviconIcoPath;
    }

    let faviconPath = path.join(faviconDirectory, `unknown.png`);;
    // Sinon, récupérer et sauvegarder le favicon
    try {
        const response = await fetch(`https://api.microlink.io/?url=${url}&filter=logo`);
        const data = await response.json();

        if (data.status === 'success') {
            if(data.data.logo.url) {
                const imageUrl = data.data.logo.url;
                const extension = imageUrl.split('.').pop();  // Extraire l'extension du fichier
                const imageResponse = await fetch(imageUrl);                
                const arrayBuffer = await imageResponse.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                
                if (extension === 'ico') {
                    faviconPath = faviconIcoPath;  // Sauvegarder en .ico
                } else {
                    faviconPath = faviconPngPath;  // Sauvegarder en .png
                }
                
                // Sauvegarder l'image et la renvoyer
                fs.writeFileSync(faviconPath, buffer);
            } else {
                throw new Error(`Favicon not found`);
            }
        } else {
            throw new Error(`${data.status} - ${data.message}`);
        }
    } catch (error) {
        // console.error('Fetch logo from microlink', error);
        throw new Error(error);
    } finally {
        return faviconPath;
    }
}

module.exports = {
    getFavicon
};