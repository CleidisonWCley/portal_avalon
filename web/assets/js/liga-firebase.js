/**
 * Portal Avalon — Liga Firebase
 *
 * Responsabilidades:
 * - apresentar a escolha Participante / Organizador;
 * - autenticar organizadores por e-mail e senha;
 * - validar o UID em admins/{uid};
 * - manter participantes em modo somente leitura;
 * - preservar o rascunho local antes da publicação;
 * - iniciar a transmissão somente após “Publicar Liga”;
 * - sincronizar automaticamente as mudanças posteriores;
 * - proteger a navegação enquanto uma Liga estiver ao vivo;
 * - permitir sair mantendo a Liga ou encerrá-la antes de navegar;
 * - oferecer encerramento explícito da transmissão;
 * - ouvir a Liga em tempo real com onSnapshot();
 * - preservar o localStorage como cache e contingência.
 *
 * INTEGRAÇÃO MÍNIMA NO liga.html
 *
 * Após liga.js, adicione:
 *
 * <script type="module" src="../assets/js/liga-firebase.js"></script>
 *
 * Este módulo foi preparado para a estrutura atual da V7.6.1. Ele aproveita
 * as funções globais applySavedLiga(), renderAll(), saveLiga() e resetLeague()
 * existentes em liga.js.
 */

import {
  AVALON_FIREBASE_SETTINGS,
  firebaseAuth,
  firebaseConfigured,
  firebaseDb
} from "./firebase-config.js";

import {
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

import {
  doc,
  getDoc,
  increment,
  onSnapshot,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const ACCESS_ROLES = Object.freeze({
  PENDING: "pending",
  PARTICIPANT: "participant",
  ORGANIZER: "organizer"
});

const SYNC_STATUS = Object.freeze({
  IDLE: "idle",
  DRAFT: "draft",
  PUBLISHING: "publishing",
  SYNCED: "synced",
  ERROR: "error",
  OFFLINE: "offline"
});

// Controles que alteram o torneio. Eles recebem data-liga-admin-only
// dinamicamente para que downloads e ações públicas não sejam ocultados.
const ADMIN_ONLY_SOURCE_SELECTOR = [
  ".league-add-grid",
  ".league-actions-row",
  "#league-team-controls",
  "#member-search",
  "#guest-name",
  "#add-guest",
  "#shuffle-participants",
  "#generate-bracket",
  "#draw-all-maps",
  "#reset-league",
  "[data-add-member]",
  "[data-remove-participant]",
  "[data-add-manual-team]",
  "[data-remove-manual-team]",
  "[data-add-manual-member]",
  "[data-remove-manual-member]",
  "[data-save-manual-teams]",
  "[data-shuffle-teams]",
  "[data-randomize-remaining]",
  "[data-draw-phase-map]",
  "[data-undo-match]",
  "[data-clear-survival]",
  "[data-reset-league-final]"
].join(",");

// Elementos de consulta permanecem visíveis para participantes, mas não
// podem ser acionados fora do modo organizador. Isso inclui modalidades,
// nomes/times das chaves ainda não decididas e participantes do Survival.
const ADMIN_LOCKED_SOURCE_SELECTOR = [
  "[data-mode-id]",
  "[data-winner-match]",
  "[data-survival-pick]"
].join(",");
const ADMIN_ACTION_SELECTOR = "[data-liga-admin-only], [data-liga-admin-locked]";

const runtime = {
  role: ACCESS_ROLES.PENDING,
  user: null,
  adminProfile: null,
  remoteDocument: null,
  unsubscribeLeague: null,
  unsubscribeAuth: null,
  publishTimer: null,
  publishing: false,
  applyingRemote: false,
  suppressAutoSync: false,
  initialized: false,
  hasPublished: false,
  isDirty: false,
  lastSyncedAt: null,
  syncStatus: SYNC_STATUS.IDLE,
  localDraftSnapshot: null,
  controlsObserver: null,
  portalNavigationHandler: null,
  beforeUnloadHandler: null,
  originalSaveLiga: null,
  originalResetLeague: null
};

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getStoredRole() {
  try {
    const role = sessionStorage.getItem(AVALON_FIREBASE_SETTINGS.roleSessionKey);
    return Object.values(ACCESS_ROLES).includes(role)
      ? role
      : ACCESS_ROLES.PENDING;
  } catch (error) {
    console.warn("[Portal Avalon] sessionStorage indisponível:", error);
    return runtime.role || ACCESS_ROLES.PENDING;
  }
}

function storeRole(role) {
  runtime.role = role;

  try {
    if (role === ACCESS_ROLES.PENDING) {
      sessionStorage.removeItem(AVALON_FIREBASE_SETTINGS.roleSessionKey);
    } else {
      sessionStorage.setItem(AVALON_FIREBASE_SETTINGS.roleSessionKey, role);
    }
  } catch (error) {
    console.warn("[Portal Avalon] Não foi possível persistir o perfil de acesso:", error);
  }
}

function getLeagueRef() {
  if (!firebaseDb) return null;
  return doc(
    firebaseDb,
    AVALON_FIREBASE_SETTINGS.leagueCollection,
    AVALON_FIREBASE_SETTINGS.leagueDocumentId
  );
}

function getAdminRef(uid) {
  if (!firebaseDb || !uid) return null;
  return doc(firebaseDb, AVALON_FIREBASE_SETTINGS.adminCollection, uid);
}

function normalizeLeagueState(value) {
  const source = value?.state ?? value?.ligaState ?? value;

  if (!source || typeof source !== "object") return null;

  return {
    modoId: typeof source.modoId === "string" ? source.modoId : "",
    participantes: Array.isArray(source.participantes)
      ? clone(source.participantes)
      : [],
    ordem: Array.isArray(source.ordem)
      ? clone(source.ordem)
      : [],
    teamMode: source.teamMode === "manual" ? "manual" : "auto",
    manualTeams: Array.isArray(source.manualTeams)
      ? clone(source.manualTeams)
      : [],
    bracket: source.bracket && typeof source.bracket === "object"
      ? clone(source.bracket)
      : null,
    phaseIndex: Number.isFinite(Number(source.phaseIndex))
      ? Number(source.phaseIndex)
      : 0,
    battleStarted: Boolean(source.battleStarted),
    savedAt: source.savedAt || null
  };
}

function readLocalLeagueState() {
  try {
    const raw = localStorage.getItem(AVALON_FIREBASE_SETTINGS.localStorageKey);
    if (!raw) return null;
    return normalizeLeagueState(JSON.parse(raw));
  } catch (error) {
    console.warn("[Portal Avalon] Falha ao ler a Liga local:", error);
    return null;
  }
}

function writeLocalLeagueState(state) {
  try {
    localStorage.setItem(
      AVALON_FIREBASE_SETTINGS.localStorageKey,
      JSON.stringify(state)
    );
    return true;
  } catch (error) {
    console.warn("[Portal Avalon] Falha ao salvar a Liga local:", error);
    return false;
  }
}

function inferLeagueStatus(state) {
  if (!state?.bracket) return "rascunho";

  const podium = state.bracket?.podium;
  const hasPodium = podium && Object.values(podium).some(Boolean);

  return hasPodium ? "finalizada" : "em_andamento";
}

function setAccessMessage(message = "", type = "info") {
  const target = document.querySelector("[data-liga-access-message]");
  if (!target) return;

  target.textContent = message;
  target.dataset.type = type;
}

function ensureStyles() {
  if (document.querySelector("#avalon-liga-firebase-styles")) return;

  const style = document.createElement("style");
  style.id = "avalon-liga-firebase-styles";
  style.textContent = `
    .liga-access-gateway {
      position: relative;
      z-index: 6;
      width: min(900px, 100%);
      margin: 0 auto clamp(1.25rem, 3vw, 2rem);
    }

    .liga-access-gateway[hidden],
    .liga-live-state[hidden],
    .liga-access-login[hidden],
    .liga-live-toolbar[hidden],
    .liga-live-toolbar [hidden] {
      display: none !important;
    }

    .liga-access-card {
      width: 100%;
      padding: clamp(1.25rem, 3vw, 1.8rem);
      text-align: center;
    }

    .liga-access-card h2 {
      margin: 0.25rem 0 0.45rem;
    }

    .liga-access-card > p {
      max-width: 580px;
      margin: 0 auto;
      color: var(--text-soft, rgba(215, 217, 226, 0.84));
      line-height: 1.55;
    }

    .liga-access-options {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.9rem;
      margin-top: 1.15rem;
    }

    .liga-access-option {
      min-height: 126px;
      padding: 1rem;
      border: 1px solid rgba(242, 199, 102, 0.26);
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.04);
      color: inherit;
      cursor: pointer;
      transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
    }

    .liga-access-option:hover,
    .liga-access-option:focus-visible {
      transform: translateY(-3px);
      border-color: rgba(242, 199, 102, 0.64);
      background: rgba(242, 199, 102, 0.08);
      outline: none;
    }

    .liga-access-option .material-symbols-outlined {
      display: block;
      margin-bottom: 0.45rem;
      color: var(--gold, #f2c766);
      font-size: 2rem;
    }

    .liga-access-option strong,
    .liga-access-option span {
      display: block;
    }

    .liga-access-option span:last-child {
      margin-top: 0.35rem;
      color: var(--text-soft, rgba(215, 217, 226, 0.84));
      font-size: 0.88rem;
      line-height: 1.45;
    }

    .liga-access-login {
      max-width: 500px;
      margin: 1.15rem auto 0;
      text-align: left;
    }

    .liga-access-login label {
      display: block;
      margin-bottom: 0.8rem;
      font-weight: 700;
    }

    .liga-access-login input[type="email"],
    .liga-access-login input[type="password"] {
      width: 100%;
      margin-top: 0.35rem;
    }

    .liga-access-remember {
      display: flex !important;
      align-items: center;
      gap: 0.55rem;
      font-weight: 500 !important;
    }

    .liga-access-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.75rem;
      margin-top: 1rem;
    }

    .liga-access-message {
      min-height: 1.35em;
      margin: 0.85rem 0 0;
      text-align: center;
      font-size: 0.92rem;
    }

    .liga-access-message[data-type="error"] {
      color: #ff9f9f;
    }

    .liga-access-message[data-type="success"] {
      color: #9ef3b2;
    }

    .liga-live-toolbar {
      position: relative;
      z-index: 5;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 1rem 1.25rem;
      width: 100%;
      margin: 0 0 clamp(1.25rem, 3vw, 2rem);
      padding: clamp(1rem, 2.5vw, 1.3rem);
      border: 1px solid rgba(242, 199, 102, 0.28);
      border-radius: 20px;
      background:
        linear-gradient(135deg, rgba(17, 27, 48, 0.96), rgba(7, 12, 24, 0.96));
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.26);
      backdrop-filter: blur(12px);
    }

    .liga-live-toolbar__status {
      display: flex;
      align-items: flex-start;
      gap: 0.85rem;
      min-width: 0;
    }

    .liga-live-toolbar__status > .material-symbols-outlined {
      flex: 0 0 auto;
      margin-top: 0.05rem;
      color: var(--gold, #f2c766);
      font-size: 2rem;
    }

    .liga-live-toolbar__copy {
      min-width: 0;
    }

    .liga-live-toolbar__copy strong,
    .liga-live-toolbar__copy span {
      display: block;
    }

    .liga-live-toolbar__copy strong {
      margin-bottom: 0.25rem;
      font-family: "Cinzel", serif;
      letter-spacing: 0.035em;
    }

    .liga-live-toolbar__copy span {
      color: var(--text-soft, rgba(215, 217, 226, 0.84));
      font-size: 0.92rem;
      line-height: 1.5;
      white-space: normal;
    }

    .liga-live-toolbar__actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 0.65rem;
      max-width: 560px;
    }

    .liga-live-toolbar__actions .btn {
      min-height: 42px;
    }

    .liga-live-toolbar [data-live-end] {
      border-color: rgba(255, 126, 126, 0.48);
      color: #ffd2d2;
    }

    .liga-live-toolbar [data-live-end]:hover,
    .liga-live-toolbar [data-live-end]:focus-visible {
      border-color: rgba(255, 126, 126, 0.82);
      background: rgba(152, 38, 38, 0.2);
    }

    .liga-live-state {
      width: min(900px, 100%);
      margin: 0 auto clamp(1.25rem, 3vw, 2rem);
      padding: 1.25rem;
      text-align: center;
    }

    body.liga-access-pending main > section:not(.page-title-stage):not(#liga-access-gateway) {
      display: none !important;
    }

    body.liga-access-pending #liga-live-toolbar,
    body.liga-access-pending #liga-live-state {
      display: none !important;
    }

    body.liga-readonly [data-liga-admin-only] {
      display: none !important;
    }

    body.liga-readonly [data-liga-admin-locked] {
      cursor: default !important;
      pointer-events: none !important;
    }

    body.liga-readonly [data-mode-id][data-liga-admin-locked]:not(.active) {
      opacity: 0.62;
    }

    body.liga-readonly [data-winner-match][data-liga-admin-locked],
    body.liga-readonly [data-survival-pick][data-liga-admin-locked] {
      opacity: 1 !important;
      transform: none !important;
      filter: none !important;
    }

    body.liga-no-live-tournament main > section:not(.page-title-stage):not(#liga-live-state) {
      display: none !important;
    }

    .liga-live-toolbar [data-live-publish][data-sync-state="error"] {
      border-color: rgba(255, 130, 130, 0.55);
    }

    .liga-live-toolbar [data-live-publish][data-sync-state="publishing"],
    .liga-live-toolbar [data-live-end]:disabled {
      cursor: wait;
      opacity: 0.72;
    }

    @media (max-width: 900px) {
      .liga-live-toolbar {
        grid-template-columns: 1fr;
      }

      .liga-live-toolbar__actions {
        justify-content: flex-start;
        max-width: none;
      }
    }

    @media (max-width: 720px) {
      .liga-access-options {
        grid-template-columns: 1fr;
      }

      .liga-access-card,
      .liga-live-toolbar {
        border-radius: 18px;
      }

      .liga-live-toolbar__actions {
        display: grid;
        grid-template-columns: 1fr;
      }

      .liga-live-toolbar__actions .btn {
        width: 100%;
      }
    }
  `;

  document.head.appendChild(style);
}

function ensureGateway() {
  let gateway = document.querySelector("#liga-access-gateway");
  if (gateway) return gateway;

  gateway = document.createElement("section");
  gateway.id = "liga-access-gateway";
  gateway.className = "liga-access-gateway";
  gateway.setAttribute("aria-labelledby", "liga-access-title");
  gateway.innerHTML = `
    <div class="liga-access-card medieval-card gold-frame">
      <p class="eyebrow">Liga Avalon em tempo real</p>
      <h2 id="liga-access-title">Acesso à Liga</h2>
      <p>Escolha como deseja acompanhar a competição.</p>

      <div class="liga-access-options" data-liga-access-options>
        <button class="liga-access-option" type="button" data-access-participant>
          <span class="material-symbols-outlined" aria-hidden="true">visibility</span>
          <strong>Participante</strong>
          <span>Acompanhar chaves, mapas, resultados e downloads.</span>
        </button>

        <button class="liga-access-option" type="button" data-access-organizer>
          <span class="material-symbols-outlined" aria-hidden="true">admin_panel_settings</span>
          <strong>Organizador</strong>
          <span>Entrar para configurar e administrar a Liga.</span>
        </button>
      </div>

      <form class="liga-access-login" data-liga-access-login hidden>
        <label>
          E-mail do organizador
          <input type="email" name="email" autocomplete="username" required />
        </label>

        <label>
          Senha
          <input type="password" name="password" autocomplete="current-password" required />
        </label>

        <label class="liga-access-remember">
          <input type="checkbox" name="remember" />
          Manter acesso neste dispositivo
        </label>

        <div class="liga-access-actions">
          <button class="btn btn-ghost" type="button" data-access-back>Voltar</button>
          <button class="btn btn-primary" type="submit">
            <span class="material-symbols-outlined" aria-hidden="true">login</span>
            Entrar como organizador
          </button>
        </div>
      </form>

      <p class="liga-access-message" data-liga-access-message aria-live="polite"></p>
    </div>
  `;

  const main = document.querySelector("main");
  const titleSection = main?.querySelector(".page-title-stage");

  if (titleSection) {
    titleSection.insertAdjacentElement("afterend", gateway);
  } else {
    main?.prepend(gateway);
  }

  gateway.querySelector("[data-access-participant]")?.addEventListener("click", enterParticipantMode);
  gateway.querySelector("[data-access-organizer]")?.addEventListener("click", () => toggleOrganizerForm(true));
  gateway.querySelector("[data-access-back]")?.addEventListener("click", () => toggleOrganizerForm(false));
  gateway.querySelector("[data-liga-access-login]")?.addEventListener("submit", handleOrganizerLogin);

  return gateway;
}

function toggleOrganizerForm(show) {
  const gateway = ensureGateway();
  gateway.querySelector("[data-liga-access-options]")?.toggleAttribute("hidden", show);
  gateway.querySelector("[data-liga-access-login]")?.toggleAttribute("hidden", !show);
  setAccessMessage("");

  if (show) {
    gateway.querySelector('input[name="email"]')?.focus();
  }
}

function showGateway() {
  const gateway = ensureGateway();
  setNoLiveTournament(false);
  document.body.classList.add("liga-access-pending");
  gateway.hidden = false;
  toggleOrganizerForm(false);

  const toolbar = document.querySelector("#liga-live-toolbar");
  if (toolbar) toolbar.hidden = true;
}

function hideGateway() {
  const gateway = ensureGateway();
  document.body.classList.remove("liga-access-pending");
  gateway.hidden = true;

  const toolbar = document.querySelector("#liga-live-toolbar");
  if (toolbar) toolbar.hidden = false;
}

function ensureToolbar() {
  let toolbar = document.querySelector("#liga-live-toolbar");
  if (toolbar) return toolbar;

  toolbar = document.createElement("aside");
  toolbar.id = "liga-live-toolbar";
  toolbar.className = "liga-live-toolbar medieval-card gold-frame";
  toolbar.setAttribute("aria-live", "polite");
  toolbar.hidden = true;
  toolbar.innerHTML = `
    <div class="liga-live-toolbar__status">
      <span class="material-symbols-outlined" aria-hidden="true" data-live-icon>sensors</span>
      <div class="liga-live-toolbar__copy">
        <strong data-live-role>Liga em tempo real</strong>
        <span data-live-detail>Aguardando conexão...</span>
      </div>
    </div>

    <div class="liga-live-toolbar__actions">
      <button class="btn btn-primary" type="button" data-live-publish hidden>
        Publicar Liga
      </button>
      <button class="btn btn-ghost danger" type="button" data-live-end hidden>
        Encerrar Liga
      </button>
      <button class="btn btn-ghost" type="button" data-live-change-access>
        Mudar de acesso
      </button>
      <button class="btn btn-ghost" type="button" data-live-salao>
        Voltar ao Salão
      </button>
    </div>
  `;

  const gateway = ensureGateway();
  gateway.insertAdjacentElement("afterend", toolbar);

  toolbar.querySelector("[data-live-change-access]")?.addEventListener("click", changeAccessMode);
  toolbar.querySelector("[data-live-salao]")?.addEventListener("click", goToSalo);
  toolbar.querySelector("[data-live-publish]")?.addEventListener("click", handlePublishButton);
  toolbar.querySelector("[data-live-end]")?.addEventListener("click", handleEndLeagueButton);

  return toolbar;
}

function getSyncDetail() {
  if (runtime.role === ACCESS_ROLES.PARTICIPANT) {
    return runtime.hasPublished
      ? "Liga em andamento. Acompanhe chaves, mapas e resultados em tempo real."
      : "Nenhum torneio em andamento. Quando uma Liga for publicada, ela aparecerá automaticamente.";
  }

  if (runtime.role !== ACCESS_ROLES.ORGANIZER) {
    return "Escolha o modo de acesso.";
  }

  if (runtime.syncStatus === SYNC_STATUS.OFFLINE) {
    return "Sem conexão. As alterações permanecem salvas neste navegador.";
  }

  if (runtime.syncStatus === SYNC_STATUS.ERROR) {
    return "Não foi possível sincronizar as últimas alterações. A última versão publicada permanece disponível aos participantes.";
  }

  if (runtime.syncStatus === SYNC_STATUS.PUBLISHING) {
    return runtime.hasPublished
      ? "Sincronizando alterações..."
      : "Publicando a Liga...";
  }

  if (!runtime.hasPublished) {
    if (runtime.remoteDocument?.status === "encerrada") {
      return "Liga encerrada. O rascunho local foi preservado.";
    }

    return runtime.isDirty
      ? "Rascunho local. Revise participantes, modalidade e chaves antes de publicar."
      : "Rascunho local. Prepare participantes, modalidade e chaves antes de publicar.";
  }

  if (runtime.isDirty) {
    return "Existem alterações aguardando sincronização.";
  }

  return runtime.lastSyncedAt
    ? `Liga ao vivo. Sincronizada às ${runtime.lastSyncedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`
    : "Liga ao vivo. As alterações são transmitidas automaticamente aos participantes.";
}

function updateToolbar(detail = "") {
  const toolbar = ensureToolbar();
  const roleTarget = toolbar.querySelector("[data-live-role]");
  const detailTarget = toolbar.querySelector("[data-live-detail]");
  const iconTarget = toolbar.querySelector("[data-live-icon]");
  const publishButton = toolbar.querySelector("[data-live-publish]");
  const endButton = toolbar.querySelector("[data-live-end]");

  toolbar.dataset.role = runtime.role;
  toolbar.dataset.syncStatus = runtime.syncStatus;

  if (runtime.role === ACCESS_ROLES.ORGANIZER) {
    roleTarget.textContent = "ORGANIZAÇÃO DA LIGA";
    detailTarget.textContent = detail || getSyncDetail();
    iconTarget.textContent = "admin_panel_settings";

    publishButton.hidden = false;
    publishButton.disabled = runtime.publishing;
    publishButton.dataset.syncState = runtime.syncStatus;

    endButton.hidden = !runtime.hasPublished;
    endButton.disabled = runtime.publishing;

    if (!runtime.hasPublished) {
      publishButton.textContent = runtime.syncStatus === SYNC_STATUS.ERROR
        ? "Tentar publicar"
        : "Publicar Liga";
    } else if (runtime.syncStatus === SYNC_STATUS.ERROR || runtime.syncStatus === SYNC_STATUS.OFFLINE) {
      publishButton.textContent = "Tentar sincronizar";
    } else {
      publishButton.textContent = "Sincronizar agora";
    }

    return;
  }

  endButton.hidden = true;
  publishButton.hidden = true;

  if (runtime.role === ACCESS_ROLES.PARTICIPANT) {
    roleTarget.textContent = "MODO PARTICIPANTE";
    detailTarget.textContent = detail || getSyncDetail();
    iconTarget.textContent = "visibility";
  } else {
    roleTarget.textContent = "LIGA EM TEMPO REAL";
    detailTarget.textContent = detail || "Escolha o modo de acesso.";
    iconTarget.textContent = "sensors";
  }
}

function getSaloUrl() {
  return AVALON_FIREBASE_SETTINGS.salaoUrl || "../index.html";
}

function navigateToUrl(destination) {
  window.location.href = destination;
}

function goToSaloWithoutEnding() {
  navigateToUrl(getSaloUrl());
}

function isModifiedNavigationEvent(event) {
  return event.button !== 0
    || event.ctrlKey
    || event.shiftKey
    || event.altKey
    || event.metaKey;
}

function resolveInternalNavigation(anchor) {
  if (!anchor || !anchor.href) return null;
  if (anchor.hasAttribute("download")) return null;
  if (anchor.target && anchor.target.toLowerCase() === "_blank") return null;

  const rawHref = anchor.getAttribute("href") || "";
  if (!rawHref || rawHref.startsWith("#")) return null;
  if (/^(mailto:|tel:|javascript:)/i.test(rawHref)) return null;

  let destination;
  try {
    destination = new URL(anchor.href, window.location.href);
  } catch (error) {
    return null;
  }

  if (destination.origin !== window.location.origin) return null;

  const current = new URL(window.location.href);
  const sameDocument = destination.pathname === current.pathname
    && destination.search === current.search;

  if (sameDocument) return null;

  return destination.href;
}

async function goToSalo() {
  return requestPortalNavigation(getSaloUrl());
}

async function requestPortalNavigation(destination) {
  if (!destination) {
    return { ok: false, reason: "missing-destination" };
  }

  if (!isOrganizer() || !runtime.hasPublished) {
    navigateToUrl(destination);
    return { ok: true, action: "leave" };
  }

  const decision = await confirmNavigationDuringLiveLeague();

  if (decision === "cancel") {
    return { ok: false, reason: "cancelled" };
  }

  if (decision === "keep") {
    return leaveAndKeepLeague(destination);
  }

  return endLeagueAndNavigate(destination);
}

async function leaveAndKeepLeague(destination) {
  window.clearTimeout(runtime.publishTimer);
  runtime.publishTimer = null;

  if (runtime.isDirty) {
    if (!navigator.onLine) {
      window.AvalonUI?.showActionFeedback?.({
        title: "Não foi possível sincronizar",
        message: "A última versão publicada continua ao vivo. Verifique a conexão antes de sair.",
        type: "error"
      });

      return { ok: false, reason: "offline" };
    }

    const syncResult = await syncLeagueNow({ automatic: false });

    if (!syncResult.ok) {
      window.AvalonUI?.showActionFeedback?.({
        title: "Não foi possível sincronizar",
        message: "A última versão publicada continua ao vivo. Verifique a conexão antes de sair.",
        type: "error"
      });

      return { ok: false, reason: "sync-failed", result: syncResult };
    }
  }

  navigateToUrl(destination);
  return { ok: true, action: "leave-live" };
}

async function endLeagueAndNavigate(destination) {
  const result = await unpublishLeague({
    skipConfirmation: true,
    showCompletion: false
  });

  if (result.ok) {
    navigateToUrl(destination);
  }

  return result;
}

function installPortalNavigationGuard() {
  if (runtime.portalNavigationHandler) return;

  runtime.portalNavigationHandler = async (event) => {
    const anchor = event.target.closest?.("a[href]");
    if (!anchor || isModifiedNavigationEvent(event)) return;

    const destination = resolveInternalNavigation(anchor);
    if (!destination) return;

    if (!isOrganizer() || !runtime.hasPublished) return;

    event.preventDefault();
    event.stopPropagation();
    await requestPortalNavigation(destination);
  };

  document.addEventListener("click", runtime.portalNavigationHandler, true);
}

function installBeforeUnloadGuard() {
  if (runtime.beforeUnloadHandler) return;

  runtime.beforeUnloadHandler = (event) => {
    if (!isOrganizer() || !runtime.isDirty) return;

    event.preventDefault();
    event.returnValue = "";
  };

  window.addEventListener("beforeunload", runtime.beforeUnloadHandler);
}

function ensureLiveStateCard() {
  let card = document.querySelector("#liga-live-state");
  if (card) return card;

  card = document.createElement("section");
  card.id = "liga-live-state";
  card.className = "liga-live-state medieval-card blue-frame";
  card.hidden = true;

  const toolbar = ensureToolbar();
  toolbar.insertAdjacentElement("afterend", card);

  return card;
}

function showLiveState(title, message, icon = "hourglass_empty") {
  const card = ensureLiveStateCard();
  card.innerHTML = `
    <span class="material-symbols-outlined" aria-hidden="true">${escapeHtml(icon)}</span>
    <h2>${escapeHtml(title)}</h2>
    <p>${escapeHtml(message)}</p>
  `;
  card.hidden = false;
}

function hideLiveState() {
  ensureLiveStateCard().hidden = true;
}

function setReadonlyMode(enabled) {
  document.body.classList.toggle("liga-readonly", enabled);
  document.body.dataset.ligaAccessRole = enabled ? "participant" : "organizer";

  document.querySelectorAll("[data-liga-admin-locked]").forEach((element) => {
    if (enabled) {
      element.setAttribute("aria-disabled", "true");
    } else {
      element.removeAttribute("aria-disabled");
    }
  });
}

function isOrganizer() {
  return runtime.role === ACCESS_ROLES.ORGANIZER
    && Boolean(runtime.user)
    && runtime.adminProfile?.ativo === true;
}

async function verifyAdministrator(user) {
  const adminRef = getAdminRef(user?.uid);
  if (!adminRef) return null;

  const snapshot = await getDoc(adminRef);
  if (!snapshot.exists()) return null;

  const profile = snapshot.data();
  return profile?.ativo === true
    ? { id: snapshot.id, ...profile }
    : null;
}

async function handleOrganizerLogin(event) {
  event.preventDefault();

  if (!firebaseConfigured || !firebaseAuth) {
    setAccessMessage(
      "Firebase ainda não configurado. Preencha firebase-config.js.",
      "error"
    );
    return;
  }

  const form = event.currentTarget;
  const email = form.elements.email.value.trim();
  const password = form.elements.password.value;
  const remember = Boolean(form.elements.remember.checked);
  const submitButton = form.querySelector('button[type="submit"]');

  submitButton.disabled = true;
  setAccessMessage("Validando acesso...", "info");

  try {
    await setPersistence(
      firebaseAuth,
      remember ? browserLocalPersistence : browserSessionPersistence
    );

    const credential = await signInWithEmailAndPassword(
      firebaseAuth,
      email,
      password
    );

    const profile = await verifyAdministrator(credential.user);

    if (!profile) {
      await signOut(firebaseAuth);
      throw new Error("Esta conta não possui permissão de organizador.");
    }

    await enterOrganizerMode(credential.user, profile);
    form.reset();
  } catch (error) {
    console.error("[Portal Avalon] Falha no login:", error);

    const friendlyMessage = {
      "auth/invalid-credential": "E-mail ou senha inválidos.",
      "auth/invalid-email": "Informe um e-mail válido.",
      "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos.",
      "auth/network-request-failed": "Falha de rede. Verifique sua conexão."
    }[error.code] || error.message || "Não foi possível entrar.";

    setAccessMessage(friendlyMessage, "error");
  } finally {
    submitButton.disabled = false;
  }
}

function setNoLiveTournament(enabled) {
  document.body.classList.toggle("liga-no-live-tournament", enabled);
}

async function restoreLocalDraftToView() {
  const draft = readLocalLeagueState();
  runtime.localDraftSnapshot = clone(draft);

  if (!draft) return false;

  const runtimeReady = await waitForLeagueRuntime();
  if (!runtimeReady) return false;

  runtime.applyingRemote = true;
  try {
    window.applySavedLiga(draft);
    window.renderAll();
    return true;
  } finally {
    window.setTimeout(() => {
      runtime.applyingRemote = false;
    }, 0);
  }
}

async function clearLeagueViewForParticipant() {
  const emptyState = {
    modoId: "",
    participantes: [],
    ordem: [],
    teamMode: "auto",
    manualTeams: [],
    bracket: null,
    phaseIndex: 0,
    battleStarted: false,
    savedAt: null
  };

  const runtimeReady = await waitForLeagueRuntime();
  if (!runtimeReady) return;

  runtime.applyingRemote = true;
  try {
    window.applySavedLiga(emptyState);
    window.renderAll();
  } finally {
    window.setTimeout(() => {
      runtime.applyingRemote = false;
    }, 0);
  }
}

async function enterParticipantMode() {
  if (firebaseAuth?.currentUser) {
    try {
      await signOut(firebaseAuth);
    } catch (error) {
      console.warn("[Portal Avalon] Não foi possível encerrar a sessão anterior:", error);
    }
  }

  runtime.user = null;
  runtime.adminProfile = null;
  runtime.isDirty = false;
  runtime.syncStatus = SYNC_STATUS.IDLE;
  storeRole(ACCESS_ROLES.PARTICIPANT);
  setReadonlyMode(true);
  hideGateway();
  updateToolbar();
  startRealtimeLeagueListener();
}

async function enterOrganizerMode(user, profile) {
  runtime.user = user;
  runtime.adminProfile = profile;
  runtime.syncStatus = runtime.hasPublished
    ? SYNC_STATUS.SYNCED
    : SYNC_STATUS.DRAFT;
  storeRole(ACCESS_ROLES.ORGANIZER);
  setReadonlyMode(false);
  setNoLiveTournament(false);
  hideGateway();
  updateToolbar();
  startRealtimeLeagueListener();
}

async function organizerSignOut() {
  try {
    if (firebaseAuth) await signOut(firebaseAuth);
  } finally {
    runtime.user = null;
    runtime.adminProfile = null;
    runtime.hasPublished = false;
    runtime.isDirty = false;
    runtime.syncStatus = SYNC_STATUS.IDLE;
    storeRole(ACCESS_ROLES.PENDING);
    setReadonlyMode(true);
    stopRealtimeLeagueListener();
    updateToolbar("Sessão administrativa encerrada.");
    showGateway();
  }
}

async function changeAccessMode() {
  if (runtime.role === ACCESS_ROLES.ORGANIZER && firebaseAuth?.currentUser) {
    await organizerSignOut();
    return;
  }

  stopRealtimeLeagueListener();
  storeRole(ACCESS_ROLES.PENDING);
  runtime.hasPublished = false;
  runtime.isDirty = false;
  runtime.syncStatus = SYNC_STATUS.IDLE;
  setNoLiveTournament(false);
  updateToolbar();
  showGateway();
}

function waitForLeagueRuntime(timeoutMs = 8000) {
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const check = () => {
      const ready = typeof window.applySavedLiga === "function"
        && typeof window.renderAll === "function";

      if (ready || Date.now() - startedAt >= timeoutMs) {
        resolve(ready);
        return;
      }

      window.setTimeout(check, 80);
    };

    check();
  });
}

async function applyRemoteLeagueState(state, metadata = {}) {
  const normalized = normalizeLeagueState(state);
  if (!normalized) return;

  runtime.applyingRemote = true;

  try {
    writeLocalLeagueState(normalized);

    const runtimeReady = await waitForLeagueRuntime();

    if (runtimeReady) {
      window.applySavedLiga(normalized);
      window.renderAll();
      markAdministrativeControls();
    }

    setNoLiveTournament(false);
    hideLiveState();
    runtime.isDirty = false;
    runtime.syncStatus = SYNC_STATUS.SYNCED;

    updateToolbar(
      metadata.status === "finalizada"
        ? "Torneio finalizado. Resultados sincronizados."
        : "Liga sincronizada em tempo real."
    );

    document.dispatchEvent(new CustomEvent("avalon:liga:remote-state", {
      detail: {
        state: clone(normalized),
        metadata: clone(metadata)
      }
    }));
  } finally {
    window.setTimeout(() => {
      runtime.applyingRemote = false;
    }, 0);
  }
}

async function handleRemoteLeagueUnavailable(remoteData = null) {
  runtime.hasPublished = false;
  runtime.remoteDocument = remoteData;
  runtime.lastSyncedAt = null;

  if (isOrganizer()) {
    runtime.syncStatus = SYNC_STATUS.DRAFT;
    await restoreLocalDraftToView();
    setNoLiveTournament(false);
    const wasClosed = remoteData?.status === "encerrada";
    showLiveState(
      wasClosed ? "Liga encerrada" : "Nenhuma Liga publicada",
      wasClosed
        ? "A transmissão foi encerrada. O rascunho local foi preservado para consulta ou nova publicação."
        : "Prepare a competição localmente e use “Publicar Liga” para iniciar a transmissão.",
      wasClosed ? "stop_circle" : "edit_calendar"
    );
    updateToolbar();
  } else {
    runtime.syncStatus = SYNC_STATUS.IDLE;
    await clearLeagueViewForParticipant();
    setNoLiveTournament(true);
    showLiveState(
      "Nenhum torneio em andamento",
      "Quando os organizadores publicarem uma Liga, as chaves aparecerão aqui automaticamente.",
      "emoji_events"
    );
    updateToolbar();
  }

  document.dispatchEvent(new CustomEvent("avalon:liga:remote-empty"));
}

function startRealtimeLeagueListener() {
  stopRealtimeLeagueListener();

  if (!firebaseConfigured || !firebaseDb) {
    showLiveState(
      "Firebase ainda não configurado",
      "Preencha firebase-config.js para ativar a Liga em tempo real.",
      "settings"
    );
    return;
  }

  const leagueRef = getLeagueRef();
  if (!leagueRef) return;

  updateToolbar("Conectando ao torneio...");
  showLiveState(
    "Conectando à Liga",
    "Aguarde enquanto o Portal consulta o torneio atual.",
    "sync"
  );

  runtime.unsubscribeLeague = onSnapshot(
    leagueRef,
    async (snapshot) => {
      if (!snapshot.exists()) {
        await handleRemoteLeagueUnavailable(null);
        return;
      }

      const data = snapshot.data();
      runtime.remoteDocument = data;

      const published = data.publicada === true
        && data.state
        && typeof data.state === "object";

      if (!published) {
        await handleRemoteLeagueUnavailable(data);
        return;
      }

      runtime.hasPublished = true;
      runtime.syncStatus = SYNC_STATUS.SYNCED;
      runtime.lastSyncedAt = data.updatedAt?.toDate?.() || new Date();

      await applyRemoteLeagueState(data.state, {
        publicada: true,
        status: data.status || "",
        nome: data.nome || "",
        revision: data.revision || 0,
        schemaVersion: data.schemaVersion || 1,
        updatedByUid: data.updatedByUid || ""
      });
    },
    (error) => {
      console.error("[Portal Avalon] Listener da Liga falhou:", error);
      runtime.syncStatus = navigator.onLine
        ? SYNC_STATUS.ERROR
        : SYNC_STATUS.OFFLINE;
      showLiveState(
        "Falha ao acompanhar a Liga",
        "Não foi possível carregar as atualizações em tempo real. Verifique a conexão e as regras do Firestore.",
        "cloud_off"
      );
      updateToolbar();
    }
  );
}

function stopRealtimeLeagueListener() {
  if (typeof runtime.unsubscribeLeague === "function") {
    runtime.unsubscribeLeague();
  }
  runtime.unsubscribeLeague = null;
}

function validateLeagueForPublication(state) {
  const errors = [];

  if (!state?.modoId) {
    errors.push("selecione uma modalidade");
  }

  if (!Array.isArray(state?.participantes) || state.participantes.length < 2) {
    errors.push("adicione participantes suficientes");
  }

  if (
    AVALON_FIREBASE_SETTINGS.requireBracketBeforePublish
    && (!state?.bracket || typeof state.bracket !== "object")
  ) {
    errors.push("gere as chaves ou a estrutura da competição");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function showPublicationValidation(validation) {
  const message = validation.errors.length
    ? `Antes de publicar, ${validation.errors.join(", ")}.`
    : "Conclua a preparação da Liga antes de iniciar a transmissão.";

  window.AvalonUI?.showActionFeedback?.({
    title: "Liga ainda não está pronta",
    message,
    type: "warning"
  });

  showLiveState(
    "Liga ainda não está pronta",
    message,
    "warning"
  );
}

function confirmFirebaseAction(title, message, confirmLabel = "Confirmar") {
  const showFeedback = window.AvalonUI?.showActionFeedback;

  if (typeof showFeedback !== "function") {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }

  return new Promise((resolve) => {
    const overlay = showFeedback({
      title,
      message,
      type: "warning",
      persistent: true,
      dismissOnBackdrop: false,
      role: "alertdialog",
      actions: `
        <button class="btn btn-ghost" type="button" data-firebase-cancel>Cancelar</button>
        <button class="btn btn-primary" type="button" data-firebase-confirm>${escapeHtml(confirmLabel)}</button>
      `
    });

    if (!overlay) {
      resolve(window.confirm(`${title}\n\n${message}`));
      return;
    }

    overlay.querySelector("[data-firebase-cancel]")?.addEventListener("click", () => {
      overlay.remove();
      resolve(false);
    });

    overlay.querySelector("[data-firebase-confirm]")?.addEventListener("click", () => {
      overlay.remove();
      resolve(true);
    });
  });
}

function confirmNavigationDuringLiveLeague() {
  const title = "Deseja sair da Liga?";
  const message = "A Liga continua sendo transmitida em tempo real. Escolha como deseja prosseguir.";
  const showFeedback = window.AvalonUI?.showActionFeedback;

  if (typeof showFeedback !== "function") {
    const continueChoice = window.confirm(
      `${title}\n\n${message}\n\nOK para escolher como sair. Cancelar para permanecer na Liga.`
    );

    if (!continueChoice) {
      return Promise.resolve("cancel");
    }

    const shouldEnd = window.confirm(
      "Encerrar a Liga antes de sair?\n\nOK: encerrar a Liga e sair.\nCancelar: sair e manter a Liga ao vivo."
    );

    return Promise.resolve(shouldEnd ? "end" : "keep");
  }

  return new Promise((resolve) => {
    const overlay = showFeedback({
      title,
      message,
      type: "warning",
      persistent: true,
      dismissOnBackdrop: false,
      role: "alertdialog",
      actions: `
        <button class="btn btn-ghost" type="button" data-firebase-nav-cancel>Cancelar</button>
        <button class="btn btn-ghost" type="button" data-firebase-nav-keep>Sair e manter a Liga</button>
        <button class="btn btn-primary" type="button" data-firebase-nav-end>Encerrar Liga e sair</button>
      `
    });

    if (!overlay) {
      resolve("cancel");
      return;
    }

    const finish = (decision) => {
      overlay.remove();
      resolve(decision);
    };

    overlay.querySelector("[data-firebase-nav-cancel]")?.addEventListener("click", () => finish("cancel"));
    overlay.querySelector("[data-firebase-nav-keep]")?.addEventListener("click", () => finish("keep"));
    overlay.querySelector("[data-firebase-nav-end]")?.addEventListener("click", () => finish("end"));
  });
}

// Alias mantido para compatibilidade com integrações anteriores.
function confirmExitDuringLiveLeague() {
  return confirmNavigationDuringLiveLeague();
}

async function endLeagueAndGoToSalo() {
  return endLeagueAndNavigate(getSaloUrl());
}

function markLeagueDirty() {
  if (!isOrganizer() || runtime.applyingRemote || runtime.suppressAutoSync) return;

  runtime.isDirty = true;

  if (!runtime.hasPublished) {
    runtime.syncStatus = SYNC_STATUS.DRAFT;
    updateToolbar();
    return;
  }

  if (!navigator.onLine) {
    runtime.syncStatus = SYNC_STATUS.OFFLINE;
    updateToolbar();
    return;
  }

  scheduleAutoSync();
}

function scheduleAutoSync() {
  if (
    !isOrganizer()
    || !runtime.hasPublished
    || runtime.applyingRemote
    || runtime.suppressAutoSync
  ) {
    return;
  }

  window.clearTimeout(runtime.publishTimer);
  runtime.publishTimer = window.setTimeout(
    () => syncLeagueNow({ automatic: true }),
    AVALON_FIREBASE_SETTINGS.publishDebounceMs
  );
}

async function writeLeagueState({ firstPublication = false, automatic = false } = {}) {
  if (!isOrganizer()) {
    return { ok: false, reason: "not-admin" };
  }

  if (runtime.publishing) {
    return { ok: false, reason: "already-publishing" };
  }

  const state = readLocalLeagueState();
  if (!state) {
    showLiveState(
      "Nada para publicar",
      "Crie ou restaure uma Liga antes de enviar o estado ao Firebase.",
      "info"
    );
    return { ok: false, reason: "empty-state" };
  }

  const validation = validateLeagueForPublication(state);
  if (!validation.valid) {
    runtime.syncStatus = runtime.hasPublished
      ? SYNC_STATUS.ERROR
      : SYNC_STATUS.DRAFT;
    updateToolbar();

    if (!automatic) {
      showPublicationValidation(validation);
    }

    return {
      ok: false,
      reason: "invalid-state",
      validation
    };
  }

  const leagueRef = getLeagueRef();
  if (!leagueRef) {
    return { ok: false, reason: "firebase-not-ready" };
  }

  runtime.publishing = true;
  runtime.syncStatus = SYNC_STATUS.PUBLISHING;
  updateToolbar();

  try {
    const payload = {
      nome: "Liga Avalon",
      publicada: true,
      status: inferLeagueStatus(state),
      schemaVersion: AVALON_FIREBASE_SETTINGS.leagueSchemaVersion,
      revision: increment(1),
      state: clone(state),
      updatedAt: serverTimestamp(),
      updatedByUid: runtime.user.uid
    };

    if (firstPublication || !runtime.remoteDocument?.publishedAt) {
      payload.publishedAt = serverTimestamp();
    }

    if (!runtime.remoteDocument?.createdAt) {
      payload.createdAt = serverTimestamp();
    }

    await setDoc(leagueRef, payload, { merge: true });

    runtime.hasPublished = true;
    runtime.isDirty = false;
    runtime.syncStatus = SYNC_STATUS.SYNCED;
    runtime.lastSyncedAt = new Date();
    setNoLiveTournament(false);
    hideLiveState();
    updateToolbar(
      firstPublication
        ? "Liga publicada. Sincronização automática ativada."
        : "Alterações sincronizadas."
    );

    document.dispatchEvent(new CustomEvent("avalon:liga:published", {
      detail: {
        firstPublication,
        automatic,
        state: clone(state)
      }
    }));

    return { ok: true };
  } catch (error) {
    console.error("[Portal Avalon] Falha ao publicar a Liga:", error);
    runtime.isDirty = true;
    runtime.syncStatus = navigator.onLine
      ? SYNC_STATUS.ERROR
      : SYNC_STATUS.OFFLINE;
    updateToolbar();

    if (!automatic) {
      window.AvalonUI?.showActionFeedback?.({
        title: "Alterações não sincronizadas",
        message: "A Liga continua salva neste navegador. Verifique a conexão e tente novamente.",
        type: "error"
      });
    }

    return { ok: false, reason: "firestore-error", error };
  } finally {
    runtime.publishing = false;
    updateToolbar();
  }
}

async function publishLeagueFirstTime() {
  if (runtime.hasPublished) {
    return syncLeagueNow({ automatic: false });
  }

  return writeLeagueState({ firstPublication: true, automatic: false });
}

async function syncLeagueNow({ automatic = false } = {}) {
  if (!runtime.hasPublished) {
    return publishLeagueFirstTime();
  }

  return writeLeagueState({ firstPublication: false, automatic });
}

async function handlePublishButton() {
  return runtime.hasPublished
    ? syncLeagueNow({ automatic: false })
    : publishLeagueFirstTime();
}

async function handleEndLeagueButton() {
  return unpublishLeague({
    skipConfirmation: false,
    showCompletion: true
  });
}

async function unpublishLeague({ skipConfirmation = false, showCompletion = true } = {}) {
  if (!isOrganizer() || !runtime.hasPublished) {
    return { ok: false, reason: "not-published" };
  }

  if (!skipConfirmation) {
    const confirmed = await confirmFirebaseAction(
      "Encerrar transmissão?",
      "Os participantes deixarão de visualizar o torneio ao vivo. O estado local será preservado.",
      "Encerrar Liga"
    );

    if (!confirmed) {
      return { ok: false, reason: "cancelled" };
    }
  }

  const leagueRef = getLeagueRef();
  if (!leagueRef) {
    return { ok: false, reason: "firebase-not-ready" };
  }

  runtime.publishing = true;
  runtime.syncStatus = SYNC_STATUS.PUBLISHING;
  updateToolbar("Encerrando transmissão...");

  try {
    await setDoc(leagueRef, {
      publicada: false,
      status: "encerrada",
      revision: increment(1),
      encerradaEm: serverTimestamp(),
      encerradaPorUid: runtime.user.uid,
      updatedAt: serverTimestamp(),
      updatedByUid: runtime.user.uid
    }, { merge: true });

    runtime.hasPublished = false;
    runtime.remoteDocument = {
      ...(runtime.remoteDocument || {}),
      publicada: false,
      status: "encerrada"
    };
    runtime.syncStatus = SYNC_STATUS.DRAFT;
    runtime.isDirty = Boolean(readLocalLeagueState());
    runtime.lastSyncedAt = null;

    if (showCompletion) {
      showLiveState(
        "Liga encerrada",
        "A Liga deixou de ser exibida aos participantes. O estado local do organizador foi preservado.",
        "stop_circle"
      );
    }
    updateToolbar();

    document.dispatchEvent(new CustomEvent("avalon:liga:unpublished"));
    return { ok: true };
  } catch (error) {
    console.error("[Portal Avalon] Falha ao encerrar transmissão:", error);
    runtime.syncStatus = SYNC_STATUS.ERROR;
    updateToolbar();
    return { ok: false, reason: "firestore-error", error };
  } finally {
    runtime.publishing = false;
    updateToolbar();
  }
}

function handleOnlineStatus() {
  if (!navigator.onLine) {
    if (isOrganizer() && runtime.hasPublished) {
      runtime.syncStatus = SYNC_STATUS.OFFLINE;
      updateToolbar();
    }
    return;
  }

  if (isOrganizer() && runtime.hasPublished && runtime.isDirty) {
    runtime.syncStatus = SYNC_STATUS.DRAFT;
    updateToolbar("Conexão restaurada. Reenviando alterações...");
    scheduleAutoSync();
  }
}

function markAdministrativeControls(root = document) {
  root.querySelectorAll?.(ADMIN_ONLY_SOURCE_SELECTOR).forEach((element) => {
    element.setAttribute("data-liga-admin-only", "");
  });

  root.querySelectorAll?.(ADMIN_LOCKED_SOURCE_SELECTOR).forEach((element) => {
    element.setAttribute("data-liga-admin-locked", "");

    if (runtime.role !== ACCESS_ROLES.ORGANIZER) {
      element.setAttribute("aria-disabled", "true");
    } else {
      element.removeAttribute("aria-disabled");
    }
  });
}

function observeAdministrativeControls() {
  if (runtime.controlsObserver || !document.body) return;

  runtime.controlsObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;

        if (node.matches?.(ADMIN_ONLY_SOURCE_SELECTOR)) {
          node.setAttribute("data-liga-admin-only", "");
        }

        if (node.matches?.(ADMIN_LOCKED_SOURCE_SELECTOR)) {
          node.setAttribute("data-liga-admin-locked", "");
        }

        markAdministrativeControls(node);
      });
    }
  });

  runtime.controlsObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function installAdminActionGuard() {
  markAdministrativeControls();
  observeAdministrativeControls();

  document.addEventListener("click", (event) => {
    if (isOrganizer()) return;

    const target = event.target.closest(ADMIN_ACTION_SELECTOR);
    if (!target) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    window.AvalonUI?.showActionFeedback?.({
      title: "Visualização da Liga",
      message: "Somente organizadores autorizados podem alterar o torneio.",
      type: "warning"
    });
  }, true);
}

function patchLegacyLeagueRuntime() {
  // O localStorage permanece como rascunho e contingência. O modal legado
  // é desativado porque a escolha de perfil controla a restauração: o
  // organizador recupera o rascunho automaticamente e o participante recebe
  // somente a Liga oficialmente publicada.
  if (typeof window.promptRestoreSavedLiga === "function") {
    window.promptRestoreSavedLiga = () => {};
  }

  if (
    typeof window.saveLiga === "function"
    && !window.saveLiga.__firebasePatched
  ) {
    runtime.originalSaveLiga = window.saveLiga;

    const patchedSaveLiga = function (...args) {
      const result = runtime.originalSaveLiga.apply(this, args);
      markLeagueDirty();
      markAdministrativeControls();
      return result;
    };

    patchedSaveLiga.__firebasePatched = true;
    window.saveLiga = patchedSaveLiga;
  }

  if (
    typeof window.resetLeague === "function"
    && !window.resetLeague.__firebasePatched
  ) {
    runtime.originalResetLeague = window.resetLeague;

    const patchedResetLeague = async function (...args) {
      runtime.suppressAutoSync = true;

      try {
        const result = await runtime.originalResetLeague.apply(this, args);

        if (isOrganizer()) {
          runtime.isDirty = true;
          runtime.syncStatus = runtime.hasPublished
            ? SYNC_STATUS.ERROR
            : SYNC_STATUS.DRAFT;

          updateToolbar(
            runtime.hasPublished
              ? "A Liga local foi limpa, mas a transmissão continua com a última versão válida. Ao voltar ao Salão, escolha encerrar a Liga para retirá-la do ar."
              : "Rascunho local limpo."
          );
        }

        return result;
      } finally {
        runtime.suppressAutoSync = false;
        markAdministrativeControls();
      }
    };

    patchedResetLeague.__firebasePatched = true;
    window.resetLeague = patchedResetLeague;
  }
}

async function restorePreviousAccess() {
  const storedRole = getStoredRole();

  if (storedRole === ACCESS_ROLES.PARTICIPANT) {
    await enterParticipantMode();
    return;
  }

  if (
    storedRole === ACCESS_ROLES.ORGANIZER
    && firebaseAuth?.currentUser
  ) {
    const profile = await verifyAdministrator(firebaseAuth.currentUser);

    if (profile) {
      await enterOrganizerMode(firebaseAuth.currentUser, profile);
      return;
    }
  }

  storeRole(ACCESS_ROLES.PENDING);
  setReadonlyMode(true);

  if (AVALON_FIREBASE_SETTINGS.openRoleGatewayOnLoad) {
    showGateway();
  }
}

async function initLigaFirebase() {
  if (runtime.initialized) return;
  runtime.initialized = true;

  ensureStyles();
  ensureGateway();
  ensureToolbar();
  ensureLiveStateCard();
  installAdminActionGuard();
  installPortalNavigationGuard();
  installBeforeUnloadGuard();
  patchLegacyLeagueRuntime();
  window.addEventListener("online", handleOnlineStatus);
  window.addEventListener("offline", handleOnlineStatus);

  if (!firebaseConfigured) {
    setReadonlyMode(true);
    showGateway();
    setAccessMessage(
      "Preencha firebase-config.js para ativar a integração.",
      "error"
    );
    updateToolbar("Firebase ainda não configurado.");
    return;
  }

  runtime.unsubscribeAuth = onAuthStateChanged(
    firebaseAuth,
    async (user) => {
      runtime.user = user;

      if (
        user
        && getStoredRole() === ACCESS_ROLES.ORGANIZER
      ) {
        const profile = await verifyAdministrator(user);

        if (profile) {
          await enterOrganizerMode(user, profile);
          return;
        }

        await signOut(firebaseAuth);
      }

      if (!runtime.initialized) return;

      if (runtime.role === ACCESS_ROLES.PENDING) {
        await restorePreviousAccess();
      }
    },
    (error) => {
      console.error("[Portal Avalon] Falha ao observar autenticação:", error);
      showGateway();
      setAccessMessage(
        "Não foi possível consultar a autenticação do Firebase.",
        "error"
      );
    }
  );

  await restorePreviousAccess();
}

window.AvalonLigaFirebase = Object.freeze({
  roles: ACCESS_ROLES,
  syncStatuses: SYNC_STATUS,

  get role() {
    return runtime.role;
  },

  get user() {
    return runtime.user;
  },

  get adminProfile() {
    return runtime.adminProfile;
  },

  get remoteDocument() {
    return clone(runtime.remoteDocument);
  },

  get hasPublished() {
    return runtime.hasPublished;
  },

  get isDirty() {
    return runtime.isDirty;
  },

  get syncStatus() {
    return runtime.syncStatus;
  },

  isOrganizer,
  enterParticipantMode,
  showAccessGateway: showGateway,
  publishLeagueFirstTime,
  syncLeagueNow,
  unpublishLeague,
  confirmNavigationDuringLiveLeague,
  confirmExitDuringLiveLeague,
  requestPortalNavigation,
  leaveAndKeepLeague,
  endLeagueAndNavigate,
  goToSaloWithoutEnding,
  endLeagueAndGoToSalo,
  startRealtimeLeagueListener,
  stopRealtimeLeagueListener,
  goToSalo,

  async changeAccess() {
    await changeAccessMode();
  },

  destroy() {
    stopRealtimeLeagueListener();

    if (typeof runtime.unsubscribeAuth === "function") {
      runtime.unsubscribeAuth();
    }

    if (runtime.controlsObserver) {
      runtime.controlsObserver.disconnect();
    }

    if (runtime.portalNavigationHandler) {
      document.removeEventListener("click", runtime.portalNavigationHandler, true);
    }

    if (runtime.beforeUnloadHandler) {
      window.removeEventListener("beforeunload", runtime.beforeUnloadHandler);
    }

    window.removeEventListener("online", handleOnlineStatus);
    window.removeEventListener("offline", handleOnlineStatus);
    window.clearTimeout(runtime.publishTimer);
  }
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLigaFirebase, { once: true });
} else {
  initLigaFirebase();
}
