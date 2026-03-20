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
        const email = normalizeEmail(user.email);
        if (!isAllowedStaff(email)) {
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

  function isAllowedStaff(email) {
    const allowed = Array.isArray(config.auth && config.auth.allowedEmails) ? config.auth.allowedEmails : [];
    const target = normalizeEmail(email);
    return allowed.map((value) => normalizeEmail(value)).includes(target);
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function redirectToLauncher() {
    window.location.replace("/system/");
  }
})();
