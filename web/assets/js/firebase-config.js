/**
 * Portal Avalon — configuração Firebase da Liga
 *
 * SDK: Firebase JavaScript modular via CDN.
 * Hospedagem do Portal: Cloudflare Pages / Live Server.
 *
 * COMO CONFIGURAR
 * 1. No Firebase Console, abra:
 *    Configurações do projeto → Seus apps → Portal Avalon — Liga.
 * 2. Copie os valores do objeto firebaseConfig.
 * 3. Substitua SOMENTE os valores marcados com "SUBSTITUA_...".
 * 4. Durante os testes, mantenha leagueDocumentId como "dev_local".
 * 5. Na produção, altere para "liga_atual".
 *
 * O firebaseConfig identifica o projeto no frontend, mas NÃO concede acesso
 * administrativo. A proteção real depende do Firebase Authentication e das
 * Security Rules do Firestore.
 */

import {
  getApp,
  getApps,
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

export const FIREBASE_SDK_VERSION = "12.14.0";

export const firebaseConfig = Object.freeze({
  apiKey: "AIzaSyAxISjCZEL-043b07RCsR0oceimI0lRFjI",
  authDomain: "portal-avalon-liga.firebaseapp.com",
  projectId: "portal-avalon-liga",
  storageBucket: "portal-avalon-liga.firebasestorage.app",
  messagingSenderId: "296658926560",
  appId: "1:296658926560:web:4745d81eaa0c7064320985"
});

/**
 * Configurações funcionais da integração.
 *
 * Durante o desenvolvimento:
 *   leagueDocumentId: "dev_local"
 *
 * Depois da validação:
 *   leagueDocumentId: "liga_atual"
 */
export const AVALON_FIREBASE_SETTINGS = Object.freeze({
  adminCollection: "admins",
  leagueCollection: "ligas",
  leagueDocumentId: "liga_atual",
  leagueSchemaVersion: 1,

  // Chave utilizada pela Liga V7.6.1 no localStorage.
  localStorageKey: "portal_avalon_liga_v531",

  // Mantém a escolha Participante/Organizador apenas na sessão atual.
  roleSessionKey: "portal_avalon_liga_access_role",

  // Pequeno atraso para agrupar várias alterações consecutivas depois
  // que a Liga for publicada oficialmente.
  publishDebounceMs: 750,

  // Endereço relativo do Salão quando a integração está em pages/liga.html.
  salaoUrl: "../index.html",

  // A primeira publicação exige modalidade, participantes e chaves geradas.
  requireBracketBeforePublish: true,

  // Define se o seletor de perfil será mostrado automaticamente.
  openRoleGatewayOnLoad: true
});

function containsPlaceholder(value) {
  return typeof value !== "string"
    || value.trim() === ""
    || value.includes("SUBSTITUA_");
}

export const firebaseConfigured = ![
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.messagingSenderId,
  firebaseConfig.appId
].some(containsPlaceholder);

export let firebaseApp = null;
export let firebaseAuth = null;
export let firebaseDb = null;

if (firebaseConfigured) {
  firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  firebaseAuth = getAuth(firebaseApp);
  firebaseDb = getFirestore(firebaseApp);
} else {
  console.warn(
    "[Portal Avalon] Firebase ainda não configurado. " +
    "Preencha web/assets/js/firebase-config.js antes de testar a Liga online."
  );
}

export function getLeagueDocumentPath() {
  return `${AVALON_FIREBASE_SETTINGS.leagueCollection}/${AVALON_FIREBASE_SETTINGS.leagueDocumentId}`;
}
