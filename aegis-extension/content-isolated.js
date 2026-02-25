// content-isolated.js
window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data.type || event.data.type !== "AEGIS_REQ") return;

    // On relaie la demande au background.js
    chrome.runtime.sendMessage({ action: "fetch_aegis", prompt: event.data.prompt }, (response) => {
        // On renvoie la réponse vers le monde MAIN
        window.postMessage({ type: "AEGIS_RES", response: response }, "*");
    });
});