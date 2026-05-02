(() => {
  "use strict";

  const adminWelcome = document.getElementById("adminWelcome");
  const logoutBtn = document.getElementById("logoutBtn");

  function setWelcome(message) {
    if (!adminWelcome) return;
    adminWelcome.textContent = message;
  }

  async function protectAdminPage() {
    try {
      if (!window.App?.auth) {
        window.location.href = "./index.html";
        return;
      }

      const session = await window.App.auth.getSession();

      if (!session) {
        window.location.href = "./index.html";
        return;
      }

      const profile = await window.App.auth.getCurrentProfile();

      if (!profile) {
        window.location.href = "./index.html";
        return;
      }

      if (profile.role !== "admin") {
        alert("No tenés permisos para acceder al panel administrador.");
        window.location.href = "./index.html";
        return;
      }

      const name = profile.full_name || profile.email || "Administrador";

      setWelcome(
        `Bienvenido/a, ${name}. Desde este panel podés administrar alumnos, docentes, materias, inscripciones, notas y reportes.`
      );
    } catch (error) {
      console.error(error);
      window.location.href = "./index.html";
    }
  }

  async function handleLogout() {
    try {
      if (window.App?.auth) {
        await window.App.auth.signOut();
      }

      window.location.href = "./index.html";
    } catch (error) {
      console.error(error);
      alert("No se pudo cerrar sesión.");
    }
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }

  protectAdminPage();
})();