import APP_CONFIG from './config.js';

(function launcherBootstrap() {
  const config = APP_CONFIG;
  const elements = {
    loading: document.getElementById("launcher-loading"),
    error: document.getElementById("launcher-error"),
    errorMessage: document.getElementById("launcher-error-message"),
    shell: document.getElementById("launcher-shell"),
    loginButton: document.getElementById("launcher-login-btn"),
    logoutButton: document.getElementById("launcher-logout-btn"),
    serviceButtons: document.getElementById("service-buttons")
  };

  const state = {
    auth: null,
    loginInFlight: false,
    manualLoginOnly: false,
    autoLoginAttempted: false
  };
  const autoLoginStorageKey = "system_auto_login_attempted_v1";

  void init();

  async function init() {
    try {
      validateConfig(config);
      if (!window.firebase) {
        throw new Error("Firebase SDK 로드에 실패했습니다.");
      }
      if (firebase.apps.length === 0) {
        firebase.initializeApp(config.firebase.config);
      }
      initOptionalAppCheck();
      state.auth = firebase.auth();

      elements.loginButton.addEventListener("click", () => {
        state.manualLoginOnly = false;
        void startLogin({ interactive: true });
      });

      elements.logoutButton.addEventListener("click", () => {
        void handleLogout();
      });

      renderServiceButtons();

      try {
        await state.auth.getRedirectResult();
      } catch (error) {
        state.manualLoginOnly = true;
        showError("로그인 실패: " + toMessage(error));
      }

      state.auth.onAuthStateChanged((user) => {
        void onAuthStateChanged(user);
      });
    } catch (error) {
      showError("초기화 실패: " + toMessage(error));
    }
  }

  function validateConfig(appConfig) {
    if (!appConfig || !appConfig.firebase || !appConfig.firebase.config) {
      throw new Error("config.js의 Firebase 설정이 필요합니다.");
    }
  }

  async function onAuthStateChanged(user) {
    if (!user) {
      const attemptedInSession = readAutoLoginAttemptFlag();
      if (state.manualLoginOnly || state.autoLoginAttempted || attemptedInSession) {
        showError(buildMissingSessionMessage());
        return;
      }
      state.autoLoginAttempted = true;
      writeAutoLoginAttemptFlag(true);
      await startLogin({ interactive: false });
      return;
    }

    const staffAccess = await resolveStaffAccess(user);
    if (!staffAccess.ok) {
      state.manualLoginOnly = true;
      await state.auth.signOut();
      showError("권한 확인 실패: " + staffAccess.reason);
      return;
    }
    if (!staffAccess.isStaff) {
      const email = normalizeEmail(user.email);
      state.manualLoginOnly = true;
      await state.auth.signOut();
      showError(
        "권한이 없는 계정입니다: " + email +
        " (관리자에게 Firebase custom claim staff=true 부여 요청)"
      );
      return;
    }

    showShell();
  }

  async function startLogin(options) {
    if (!state.auth || state.loginInFlight) {
      return;
    }
    const interactive = Boolean(options && options.interactive === true);
    state.loginInFlight = true;
    showLoading(interactive ? "Google 로그인 창을 여는 중..." : "Google 로그인 화면으로 이동 중...");

    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      if (interactive) {
        try {
          await state.auth.signInWithPopup(provider);
          return;
        } catch (error) {
          const code = String(error && error.code ? error.code : "").toLowerCase();
          // Popup이 막힌 환경에서는 redirect로 한 번 더 시도한다.
          if (
            code === "auth/popup-blocked" ||
            code === "auth/cancelled-popup-request" ||
            code === "auth/operation-not-supported-in-this-environment"
          ) {
            await state.auth.signInWithRedirect(provider);
            return;
          }
          throw error;
        }
      }
      await state.auth.signInWithRedirect(provider);
    } catch (error) {
      state.loginInFlight = false;
      state.manualLoginOnly = true;
      showError("로그인 실패: " + toAuthErrorMessage(error));
    }
  }

  async function handleLogout() {
    if (!state.auth) {
      return;
    }
    try {
      state.manualLoginOnly = true;
      await state.auth.signOut();
      showError("로그아웃되었습니다. 다시 로그인하려면 버튼을 누르세요.");
    } catch (error) {
      showError("로그아웃 실패: " + toMessage(error));
    }
  }

  function renderServiceButtons() {
    const services = resolveServices();
    const html = services.map((service) => {
      const label = escapeHtml(service.label || "서비스");
      const description = escapeHtml(service.description || "");
      const href = String(service.href || "#");
      const toneClass = resolveToneClass(service.tone);
      const isDisabled = service.disabled === true || !href || href === "#";
      if (isDisabled) {
        return (
          "<button type='button' class='service-link " + toneClass + "' disabled>" +
            "<strong>" + label + "</strong>" +
            "<span>" + description + "</span>" +
          "</button>"
        );
      }
      const target = service.newTab ? " target='_blank' rel='noopener noreferrer'" : "";
      return (
        "<a class='service-link " + toneClass + "' href='" + escapeHtml(href) + "'" + target + ">" +
          "<strong>" + label + "</strong>" +
          "<span>" + description + "</span>" +
        "</a>"
      );
    });
    elements.serviceButtons.innerHTML = html.join("");
  }

  function resolveServices() {
    const launcherConfig = config.launcher && typeof config.launcher === "object" ? config.launcher : {};
    const configured = Array.isArray(launcherConfig.services) ? launcherConfig.services : [];
    if (configured.length > 0) {
      return configured;
    }
    return [
      {
        label: "선거구 지도 서비스",
        description: "동 경계와 혼잡 지점을 관리합니다.",
        href: "/map/",
        tone: "slate"
      }
    ];
  }

  function resolveToneClass(value) {
    const tone = String(value || "").trim().toLowerCase();
    if (tone === "sage" || tone === "sand") {
      return "tone-" + tone;
    }
    return "tone-slate";
  }

  function showLoading(message) {
    if (elements.loading) {
      elements.loading.classList.remove("hidden");
      const messageNode = elements.loading.querySelector(".launcher-muted");
      if (messageNode) {
        messageNode.textContent = message;
      }
    }
    if (elements.error) {
      elements.error.classList.add("hidden");
    }
    if (elements.shell) {
      elements.shell.classList.add("hidden");
    }
  }

  function showError(message) {
    if (elements.loading) {
      elements.loading.classList.add("hidden");
    }
    if (elements.shell) {
      elements.shell.classList.add("hidden");
    }
    if (elements.error) {
      elements.error.classList.remove("hidden");
    }
    if (elements.errorMessage) {
      elements.errorMessage.textContent = message;
    }
  }

  function showShell() {
    state.loginInFlight = false;
    state.manualLoginOnly = false;
    state.autoLoginAttempted = false;
    writeAutoLoginAttemptFlag(false);
    if (elements.loading) {
      elements.loading.classList.add("hidden");
    }
    if (elements.error) {
      elements.error.classList.add("hidden");
    }
    if (elements.shell) {
      elements.shell.classList.remove("hidden");
    }
  }

  async function resolveStaffAccess(user) {
    if (!user || typeof user.getIdTokenResult !== "function") {
      return {
        ok: false,
        isStaff: false,
        reason: "인증 토큰을 확인할 수 없습니다."
      };
    }

    try {
      const cached = await user.getIdTokenResult(false);
      if (hasStaffClaim(cached && cached.claims)) {
        return { ok: true, isStaff: true, reason: "" };
      }
      const refreshed = await user.getIdTokenResult(true);
      return {
        ok: true,
        isStaff: hasStaffClaim(refreshed && refreshed.claims),
        reason: ""
      };
    } catch (error) {
      return {
        ok: false,
        isStaff: false,
        reason: toMessage(error)
      };
    }
  }

  function hasStaffClaim(claims) {
    const raw = claims ? claims.staff : undefined;
    return raw === true || raw === "true" || raw === 1 || raw === "1";
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function toMessage(error) {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  function toAuthErrorMessage(error) {
    const code = String(error && error.code ? error.code : "").toLowerCase();
    if (code === "auth/popup-closed-by-user") {
      return "로그인 창이 닫혀 인증이 완료되지 않았습니다. 다시 시도하세요.";
    }
    if (code === "auth/popup-blocked") {
      return "브라우저가 로그인 팝업을 차단했습니다. 팝업 허용 후 다시 시도하세요.";
    }
    if (code === "auth/unauthorized-domain") {
      return "Firebase Authentication Authorized domains에 현재 도메인이 등록되지 않았습니다.";
    }
    if (code === "auth/network-request-failed") {
      return "네트워크 오류로 인증 요청에 실패했습니다. 네트워크/보안 확장 기능을 확인하세요.";
    }
    if (code === "auth/cancelled-popup-request") {
      return "이미 로그인 요청이 진행 중입니다. 잠시 후 다시 시도하세요.";
    }
    return toMessage(error);
  }

  function buildMissingSessionMessage() {
    return (
      "로그인 세션을 확인하지 못했습니다. " +
      "1) Firebase Authentication Authorized domains에 현재 도메인이 등록되어 있는지, " +
      "2) 계정에 Firebase custom claim staff=true가 부여되어 있는지, " +
      "3) 시크릿 모드의 쿠키/사이트데이터 차단 또는 보안 확장 기능이 인증을 막고 있지 않은지 확인하세요."
    );
  }

  function initOptionalAppCheck() {
    const firebaseConfig = config && typeof config.firebase === "object" ? config.firebase : null;
    const rawAppCheck = firebaseConfig && typeof firebaseConfig.appCheck === "object"
      ? firebaseConfig.appCheck
      : null;
    if (!rawAppCheck || rawAppCheck.enabled !== true) {
      return;
    }
    if (!window.firebase || typeof firebase.appCheck !== "function") {
      console.warn("[app-check] firebase-app-check-compat.js가 로드되지 않아 App Check를 건너뜁니다.");
      return;
    }

    const siteKey = String(rawAppCheck.siteKey || "").trim();
    if (!siteKey) {
      console.warn("[app-check] siteKey가 비어 있어 App Check를 건너뜁니다.");
      return;
    }

    try {
      const autoRefresh = rawAppCheck.autoRefresh !== false;
      firebase.appCheck().activate(siteKey, autoRefresh);
    } catch (error) {
      console.warn("[app-check] activate 실패:", toMessage(error));
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function readAutoLoginAttemptFlag() {
    try {
      return window.sessionStorage.getItem(autoLoginStorageKey) === "1";
    } catch (error) {
      return false;
    }
  }

  function writeAutoLoginAttemptFlag(value) {
    try {
      if (value) {
        window.sessionStorage.setItem(autoLoginStorageKey, "1");
        return;
      }
      window.sessionStorage.removeItem(autoLoginStorageKey);
    } catch (error) {
      // no-op
    }
  }
})();
