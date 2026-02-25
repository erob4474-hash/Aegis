// content-main.js
(function() {
    console.log("🛡️ Aegis Shield : Arme Finale (Communication Native) activée.");

    let activeEditor = null;
    let aegisWidget = null;

    // --- 1. FRAPPE FANTÔME (Mise à jour anti-fusion) ---
    const typePhantomText = (element, text) => {
        // 1. On s'assure d'avoir le focus sur la case
        element.focus();

        // 2. L'astuce magique : On simule "Ctrl+A" (Sélectionner tout)
        document.execCommand('selectAll', false, null);
        
        // 3. On écrase toute la sélection avec le nouveau texte
        document.execCommand('insertText', false, text);
        
        // 4. Fallback forcé pour réveiller React
        const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
        const prototype = Object.getPrototypeOf(element);
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
        
        if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
            prototypeValueSetter.call(element, text);
        } else if (valueSetter) {
            valueSetter.call(element, text);
        } else if (element.value !== undefined) {
            element.value = text;
        } else {
            element.textContent = text;
        }

        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    };

    // --- 2. CRÉATION DU WIDGET ---
    const initWidget = () => {
        if (!document.body || document.getElementById('aegis-global-widget')) return;

        aegisWidget = document.createElement('button');
        aegisWidget.id = 'aegis-global-widget';
        
        const iconNode = document.createTextNode('🛡️ ');
        const textSpan = document.createElement('span');
        textSpan.className = 'aegis-text';
        textSpan.textContent = 'Anonymiser PII';
        
        aegisWidget.appendChild(iconNode);
        aegisWidget.appendChild(textSpan);
        
        aegisWidget.style.cssText = `
            position: fixed !important; bottom: 30px !important; right: 30px !important;
            background: #0f172a !important; color: #10b981 !important;
            border: 2px solid #10b981 !important; border-radius: 50px !important;
            box-shadow: 0 8px 16px rgba(0,0,0,0.4), 0 0 10px rgba(16, 185, 129, 0.2) !important;
            padding: 12px 24px !important; font-size: 14px !important; font-weight: bold !important;
            z-index: 2147483647 !important; cursor: pointer !important; display: none;
            align-items: center !important; gap: 8px !important;
            transition: all 0.2s ease-in-out !important; font-family: sans-serif !important;
        `;

        aegisWidget.onmouseover = () => { aegisWidget.style.transform = 'scale(1.05)'; };
        aegisWidget.onmouseout = () => { aegisWidget.style.transform = 'scale(1)'; };

        aegisWidget.onclick = (e) => {
            e.preventDefault(); e.stopPropagation();
            if (!activeEditor) return;
            
            const text = activeEditor.value || activeEditor.innerText || activeEditor.textContent;
            if (text && text.trim()) {
                textSpan.textContent = '⏳ Traitement...';
                
                // --- PONT NATIVIF CHROME VERS LE BACKGROUND ---
                chrome.runtime.sendMessage({ type: "AEGIS_REQ", prompt: text }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error("Erreur de communication :", chrome.runtime.lastError);
                        textSpan.textContent = 'Erreur serveur';
                        setTimeout(() => { textSpan.textContent = 'Anonymiser PII'; }, 2000);
                        return;
                    }
                    if (response && response.success) {
                        activeEditor.focus();
                        typePhantomText(activeEditor, response.data.debug_masked);
                        textSpan.textContent = 'SÉCURISÉ ✅';
                        setTimeout(() => { textSpan.textContent = 'Anonymiser PII'; }, 2000);
                    }
                });
            }
        };

        document.body.appendChild(aegisWidget);
    };

    // --- 3. LE RADAR DYNAMIQUE ---
    const isEditorElement = (el) => {
        if (!el || !el.tagName) return false;
        return el.tagName === 'TEXTAREA' || 
               (el.tagName === 'INPUT' && el.type === 'text') ||
               el.isContentEditable || 
               el.getAttribute?.('role') === 'textbox' || 
               el.getAttribute?.('role') === 'combobox';
    };

    const detectEditorFromEvent = (e) => {
        const path = e.composedPath ? e.composedPath() : [e.target];
        for (let target of path) {
            if (isEditorElement(target)) {
                activeEditor = target;
                if (aegisWidget) aegisWidget.style.display = 'flex';
                break;
            }
        }
    };

    document.addEventListener('focusin', detectEditorFromEvent, true);
    document.addEventListener('click', detectEditorFromEvent, true);
    document.addEventListener('input', detectEditorFromEvent, true);

    const findPrimaryEditorPassively = () => {
        if (activeEditor) return;
        const textareas = document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]');
        if (textareas.length > 0) {
            activeEditor = textareas[textareas.length - 1]; 
            if (aegisWidget) aegisWidget.style.display = 'flex';
        }
    };

    // --- 4. DÉTECTION DES MENACES ---
    const hasUnsafeData = () => {
        if (!activeEditor) return false;
        const text = activeEditor.value || activeEditor.innerText || activeEditor.textContent || "";
        const sensitivePattern = /\d{3}-\d{3}-\d{3}|[A-Z]{4}\s?\d{4}\s?\d{4}/;
        return sensitivePattern.test(text) && !text.includes('[');
    };

    // --- 5. LA FORTERESSE ÉTENDUE ---
    const shieldBlock = (e) => {
        if (!hasUnsafeData()) return;
        
        const path = e.composedPath ? e.composedPath() : [e.target];
        const actualTarget = path[0];

        if (actualTarget.closest && actualTarget.closest('#aegis-global-widget')) return;

        const isEnter = e.type === 'keydown' && e.key === 'Enter' && !e.shiftKey;
        
        let isButtonInteraction = false;
        if (e.type !== 'keydown') {
            for (let node of path) {
                if (node && node.tagName) {
                    if (node.tagName === 'BUTTON' || node.tagName === 'SVG' || 
                        node.getAttribute?.('role') === 'button' || 
                        (node.tagName === 'INPUT' && node.type === 'submit')) {
                        isButtonInteraction = true;
                        break;
                    }
                }
            }
        }

        if (isEnter || isButtonInteraction) {
            console.warn("🚨 AEGIS FIREWALL : Action bloquée.");
            e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
            
            if (aegisWidget) {
                aegisWidget.style.backgroundColor = '#7f1d1d';
                aegisWidget.style.borderColor = '#ef4444';
                setTimeout(() => {
                    aegisWidget.style.backgroundColor = '#0f172a';
                    aegisWidget.style.borderColor = '#10b981';
                }, 2000);
            }
            alert(`🚨 SÉCURITÉ AEGIS : Envoi verrouillé !\n\nUn NAS ou RAMQ en clair est présent.\nCliquez sur le widget Aegis pour débloquer.`);
        }
    };

    window.addEventListener('keydown', shieldBlock, true);
    window.addEventListener('click', shieldBlock, true);
    window.addEventListener('mousedown', shieldBlock, true);
    window.addEventListener('pointerdown', shieldBlock, true);

    // --- 6. LA SENTINELLE ANTI-SPA (MUTATION OBSERVER) ---
    const maintainAegis = () => {
        initWidget();
        
        if (!activeEditor || !document.body.contains(activeEditor)) {
            const textareas = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]'))
                .filter(el => el.offsetParent !== null);
            
            if (textareas.length > 0) {
                activeEditor = textareas[textareas.length - 1];
                if (aegisWidget) aegisWidget.style.display = 'flex';
            }
        }
    };

    const observer = new MutationObserver(() => {
        maintainAegis();
    });

    const startObserver = setInterval(() => {
        if (document.body) {
            clearInterval(startObserver);
            maintainAegis();
            findPrimaryEditorPassively();
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }, 100);

})();