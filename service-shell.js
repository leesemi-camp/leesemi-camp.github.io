"use strict";

(function serviceShellBootstrap() {
  const config = window.APP_CONFIG;
  const logoutButton = document.getElementById("service-logout-btn");

  void init();

  async function init() {
    try {
      if (!config || !config.firebase || !config.firebase.config) {
        throw new Error("Firebase 설정이 없습니다.");
      }
      if (!window.firebase) {
        throw new Error("Firebase SDK 로드에 실패했습니다.");
      }
      if (firebase.apps.length === 0) {
        firebase.initializeApp(config.firebase.config);
      }
      initOptionalAppCheck();
      const auth = firebase.auth();

      if (logoutButton) {
        logoutButton.addEventListener("click", () => {
          void handleLogout(auth);
        });
      }

      auth.onAuthStateChanged(async (user) => {
        if (!user) {
          redirectToLauncher();
          return;
        }
        const staffAccess = await resolveStaffAccess(user);
        if (!staffAccess.ok || !staffAccess.isStaff) {
          await auth.signOut();
          redirectToLauncher();
        }
      });
    } catch (error) {
      redirectToLauncher();
    }
  }

  async function handleLogout(auth) {
    try {
      await auth.signOut();
    } finally {
      redirectToLauncher();
    }
  }

  async function resolveStaffAccess(user) {
    if (!user || typeof user.getIdTokenResult !== "function") {
      return { ok: false, isStaff: false };
    }
    try {
      const cached = await user.getIdTokenResult(false);
      if (hasStaffClaim(cached && cached.claims)) {
        return { ok: true, isStaff: true };
      }
      const refreshed = await user.getIdTokenResult(true);
      return { ok: true, isStaff: hasStaffClaim(refreshed && refreshed.claims) };
    } catch (error) {
      return { ok: false, isStaff: false };
    }
  }

  function hasStaffClaim(claims) {
    const raw = claims ? claims.staff : undefined;
    return raw === true || raw === "true" || raw === 1 || raw === "1";
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
      console.warn("[app-check] activate 실패:", error && error.message ? error.message : String(error));
    }
  }

  function redirectToLauncher() {
    window.location.replace("/system/");
  }
})();
