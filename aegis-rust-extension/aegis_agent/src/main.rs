use axum::{
    routing::{post, get},
    Router,
    Json,
    http::Method,
};
use serde::{Deserialize, Serialize};
use tower_http::cors::{Any, CorsLayer};
use regex::Regex;
use std::net::SocketAddr;
use std::fs;

// ==========================================
// 1. STRUCTURES DE DONNÉES (MODÈLES API)
// ==========================================

// --- Pour l'extension Chrome (Anonymisation) ---
#[derive(Deserialize)]
struct AegisRequest {
    prompt: String,
}

#[derive(Serialize)]
struct AegisResponseData {
    debug_masked: String,
}

#[derive(Serialize)]
struct AegisResponse {
    success: bool,
    data: AegisResponseData,
}

// --- Pour le tableau de bord v0 (Mise à jour de la politique) ---
#[derive(Deserialize)]
struct PolicyRequest {
    policy_text: String,
}

#[derive(Serialize)]
struct PolicyResponse {
    success: bool,
}


// ==========================================
// 2. LE MOTEUR DE POLITIQUE DYNAMIQUE
// ==========================================

fn apply_corporate_policy(text: &str) -> String {
    let mut safe_text = text.to_string();

    // Lecture du fichier de politique généré par l'app v0
    // Si le fichier n'existe pas encore, on traite le texte sans le modifier
    let policy_content = fs::read_to_string("policy.txt").unwrap_or_default();

    // Analyse des règles ligne par ligne
    for line in policy_content.lines() {
        let clean_line = line.trim();

        // Règle : NAS / SSN (Format XXX-XXX-XXX ou XXX-XX-XXXX)
        if clean_line.starts_with("REDACT all Social Security") {
            let re_nas = Regex::new(r"\b\d{3}[-\s]?\d{2,3}[-\s]?\d{3,4}\b").unwrap();
            safe_text = re_nas.replace_all(&safe_text, "[SSN/NAS_REDACTED]").to_string();
        }

        // Règle : Courriels
        if clean_line.starts_with("REDACT email addresses") {
            let re_email = Regex::new(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b").unwrap();
            safe_text = re_email.replace_all(&safe_text, "[EMAIL_REDACTED]").to_string();
        }

        // Règle : Cartes de crédit
        if clean_line.starts_with("REDACT credit card") {
            let re_cc = Regex::new(r"\b(?:\d[ -]*?){13,16}\b").unwrap();
            safe_text = re_cc.replace_all(&safe_text, "[CREDIT_CARD_REDACTED]").to_string();
        }

        // Règle : Clés API (Tokens longs)
        if clean_line.starts_with("REDACT API keys") {
            let re_api = Regex::new(r"\b(?:[A-Za-z0-9_-]{32,})\b").unwrap();
            safe_text = re_api.replace_all(&safe_text, "[API_KEY_REDACTED]").to_string();
        }
    }

    safe_text
}


// ==========================================
// 3. LES GESTIONNAIRES D'API (HANDLERS)
// ==========================================

// Handler A : Reçoit le texte de l'extension Chrome et l'anonymise
async fn anonymize_handler(Json(payload): Json<AegisRequest>) -> Json<AegisResponse> {
    println!("🛡️ [EXTENSION] Requête brute reçue : {}", payload.prompt);

    let safe_text = apply_corporate_policy(&payload.prompt);

    if safe_text != payload.prompt {
        println!("✅ [EXTENSION] PII détecté et masqué !");
    } else {
        println!("✅ [EXTENSION] Aucun PII détecté, texte validé.");
    }

    Json(AegisResponse {
        success: true,
        data: AegisResponseData {
            debug_masked: safe_text,
        },
    })
}

// Handler B1 : Renvoie la politique actuelle au dashboard v0 (GET)
async fn get_policy_handler() -> String {
    fs::read_to_string("policy.txt").unwrap_or_default()
}

// Handler B2 : Reçoit la nouvelle politique depuis le dashboard v0 (Next.js)
async fn update_policy_handler(Json(payload): Json<PolicyRequest>) -> Json<PolicyResponse> {
    println!("📝 [DASHBOARD] Nouvelle politique reçue !");

    match fs::write("policy.txt", &payload.policy_text) {
        Ok(_) => {
            println!("✅ [DASHBOARD] Fichier 'policy.txt' mis à jour avec succès.");
            Json(PolicyResponse { success: true })
        }
        Err(e) => {
            eprintln!("🚨 [DASHBOARD] Erreur d'écriture de la politique : {}", e);
            Json(PolicyResponse { success: false })
        }
    }
}


// ==========================================
// 4. POINT D'ENTRÉE DU SERVEUR
// ==========================================

#[tokio::main]
async fn main() {
    // Configuration du CORS (Indispensable pour que le navigateur accepte de parler au port 3000)
    let cors = CorsLayer::new()
        .allow_origin(Any)
        // On autorise POST (pour envoyer les données) et OPTIONS (pour les vérifications de sécurité du navigateur)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(Any);

    // Définition des routes de l'API
    let app = Router::new()
        .route("/api/anonymize", post(anonymize_handler))
        .route("/api/policy", get(get_policy_handler).post(update_policy_handler))
        .layer(cors);

    // Lancement du serveur sur le port 3000
    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    println!("🚀 Agent Aegis (Policy Engine v2.4) démarré sur http://{}", addr);
    println!("   -> Écoute l'extension Chrome sur /api/anonymize");
    println!("   -> Écoute le dashboard React sur /api/policy\n");

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
