// background.js
console.log("🛡️ Aegis Background Worker : Connecté à l'Agent Rust.");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "AEGIS_REQ") {
        console.log("Texte brut reçu du front-end, envoi à l'Agent Rust :", request.prompt);

        // Appel réseau vers ton serveur local en Rust
        fetch('http://127.0.0.1:3000/api/anonymize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt: request.prompt })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erreur HTTP de l'Agent ! statut : ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Réponse de l'Agent Rust reçue :", data);
            // On renvoie exactement la structure JSON générée par Rust vers le content-main.js
            sendResponse(data); 
        })
        .catch(error => {
            console.error("🚨 Impossible de joindre l'Agent Rust :", error);
            // On renvoie une erreur propre pour que le front-end ne reste pas bloqué sur "Traitement..."
            sendResponse({
                success: false,
                error: "Le serveur local est injoignable. L'Agent Rust tourne-t-il sur le port 3000 ?"
            });
        });

        // Cette ligne est CRUCIALE. 
        // Elle indique à Chrome de garder le canal de communication ouvert 
        // le temps que la requête fetch (asynchrone) se termine.
        return true; 
    }
});