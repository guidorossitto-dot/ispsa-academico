// admin.js
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
        return null;
      }

      const session = await window.App.auth.getSession();

      if (!session) {
        window.location.href = "./index.html";
        return null;
      }

      const profile = await window.App.auth.getCurrentProfile();

      if (!profile) {
        window.location.href = "./index.html";
        return null;
      }

      if (profile.role !== "admin") {
        alert("No tenés permisos para acceder al panel administrador.");
        window.location.href = "./index.html";
        return null;
      }

      return profile;
    } catch (error) {
      console.error(error);
      window.location.href = "./index.html";
      return null;
    }
  }

  function renderWelcome(profile) {
    const page = document.body?.dataset?.adminPage;
    const name = profile.full_name || profile.email || "Administrador";

    if (page === "students") {
      setWelcome(
        `Bienvenido/a, ${name}. Desde acá podés administrar altas, edición, consulta y estado de alumnos.`
      );
      return;
    }

    if (page === "teachers") {
      setWelcome(
        `Bienvenido/a, ${name}. Desde acá podés administrar altas, edición, consulta y estado de docentes.`
      );
      return;
    }

    if (page === "subjects") {
      setWelcome(
        `Bienvenido/a, ${name}. Desde acá podés administrar materias, espacios curriculares y asignación docente.`
      );
      return;
    }


    setWelcome(
      `Bienvenido/a, ${name}. Desde este panel podés administrar alumnos, docentes, materias, inscripciones, notas y reportes.`
    );
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

  function bindAdminModules() {
    document.querySelectorAll("[data-admin-module]").forEach((button) => {
      button.addEventListener("click", () => {
        const moduleName = button.dataset.adminModule;

        if (moduleName === "students") {
          window.location.href = "./students.html";
          return;
        }

        if (moduleName === "teachers") {
          window.location.href = "./teachers.html";
        }

        if (moduleName === "subjects") {
        window.location.href = "./subjects.html";
        return;
        }

      });
    });
  }

function renderCurrentPageModule() {
  const page = document.body?.dataset?.adminPage;

  if (page === "students") {
    if (!window.App?.studentsUI) {
      alert("El módulo de alumnos no está disponible.");
      return;
    }

    window.App.studentsUI.renderStudentsModule();
    return;
  }

  if (page === "teachers") {
    if (!window.App?.teachersUI) {
      alert("El módulo de docentes no está disponible.");
      return;
    }

    window.App.teachersUI.renderTeachersModule();
    return;
  }

  if (page === "subjects") {
    if (!window.App?.subjectsUI) {
      alert("El módulo de materias no está disponible.");
      return;
    }

    window.App.subjectsUI.renderSubjectsModule();
    return;
  }
}

  async function initAdminPage() {
    if (logoutBtn) {
      logoutBtn.addEventListener("click", handleLogout);
    }

    bindAdminModules();

    const profile = await protectAdminPage();

    if (!profile) return;

    renderWelcome(profile);
    renderCurrentPageModule();
  }

  initAdminPage();
})();