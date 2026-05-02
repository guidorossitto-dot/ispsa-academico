//app.js
(() => {
  "use strict";

  const loginForm = document.getElementById("loginForm");
  const emailInput = document.getElementById("emailInput");
  const passwordInput = document.getElementById("passwordInput");
  const loginStatus = document.getElementById("loginStatus");

  const dashboard = document.getElementById("dashboard");
  const dashboardTitle = document.getElementById("dashboardTitle");
  const dashboardContent = document.getElementById("dashboardContent");
  const logoutBtn = document.getElementById("logoutBtn");

  const roleModules = {
    admin: {
      title: "Panel administrador",
      modules: [
        {
          title: "Alumnos",
          description: "Alta, edición y consulta de fichas de alumnos."
        },
        {
          title: "Docentes",
          description: "Gestión de docentes y datos institucionales."
        },
        {
          title: "Materias",
          description: "Creación de espacios curriculares y asignación docente."
        },
        {
          title: "Inscripciones",
          description: "Vinculación de alumnos con materias y ciclos lectivos."
        },
        {
          title: "Notas",
          description: "Consulta general y administración de calificaciones."
        },
        {
          title: "Reportes",
          description: "Listados académicos para secretaría y dirección."
        }
      ]
    },

    secretaria: {
      title: "Panel secretaría",
      modules: [
        {
          title: "Alumnos",
          description: "Carga, búsqueda y actualización de datos de estudiantes."
        },
        {
          title: "Inscripciones",
          description: "Gestión de cursadas, materias y estados académicos."
        },
        {
          title: "Notas",
          description: "Consulta de calificaciones cargadas por docentes."
        }
      ]
    },

    docente: {
      title: "Panel docente",
      modules: [
        {
          title: "Mis materias",
          description: "Listado de espacios curriculares asignados."
        },
        {
          title: "Mis alumnos",
          description: "Consulta de estudiantes por materia o curso."
        },
        {
          title: "Cargar notas",
          description: "Registro básico de evaluaciones y observaciones."
        }
      ]
    },

    alumno: {
      title: "Panel alumno",
      modules: [
        {
          title: "Mis materias",
          description: "Consulta de materias inscriptas durante el ciclo lectivo."
        },
        {
          title: "Mis notas",
          description: "Visualización de calificaciones y observaciones docentes."
        },
        {
          title: "Avisos",
          description: "Comunicaciones académicas e institucionales."
        }
      ]
    }
  };

  function renderDashboard(role) {
    const config = roleModules[role];

    if (!config) {
      showStatus("Rol no reconocido.", true);
      return;
    }

    dashboardTitle.textContent = config.title;

    dashboardContent.innerHTML = config.modules
      .map((module) => {
        return `
          <article class="moduleCard">
            <h3>${module.title}</h3>
            <p>${module.description}</p>
          </article>
        `;
      })
      .join("");

    dashboard.classList.remove("isHidden");

    window.scrollTo({
      top: dashboard.offsetTop - 20,
      behavior: "smooth"
    });
  }

  function showStatus(message, isError = false) {
    if (!loginStatus) return;

    loginStatus.textContent = message;
    loginStatus.style.color = isError ? "#b42318" : "#667085";
  }

  function guessRoleByEmail(email) {
    const cleanEmail = email.toLowerCase().trim();

    if (cleanEmail.includes("admin")) return "admin";
    if (cleanEmail.includes("secretaria")) return "secretaria";
    if (cleanEmail.includes("docente")) return "docente";
    if (cleanEmail.includes("alumno")) return "alumno";

    return "alumno";
  }

  async function handleLogin(event) {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    showStatus("Completá email y contraseña.", true);
    return;
  }

  if (!window.App?.auth) {
    showStatus("El servicio de autenticación no está disponible.", true);
    return;
  }

  try {
    showStatus("Ingresando...");

    const { profile } = await window.App.auth.signIn(email, password);

    if (!profile) {
      showStatus("Ingreso correcto, pero no se encontró el perfil.", true);
      return;
    }

    if (profile.role === "admin") {
      window.location.href = "./admin.html";
      return;
    }

    showStatus("Ingreso correcto.");
    renderDashboard(profile.role);
  } catch (error) {
    console.error(error);

    showStatus(
      "No se pudo ingresar. Revisá el email, la contraseña o el perfil del usuario.",
      true
    );
  }
}

async function handleLogout() {
  try {
    if (window.App?.auth) {
      await window.App.auth.signOut();
    }

    dashboard.classList.add("isHidden");

    if (emailInput) emailInput.value = "";
    if (passwordInput) passwordInput.value = "";

    showStatus("Sesión cerrada.");
  } catch (error) {
    console.error(error);
    showStatus("No se pudo cerrar sesión.", true);
  }
}

async function restoreSession() {
  if (!window.App?.auth) return;

  try {
    const session = await window.App.auth.getSession();

    if (!session) return;

    const profile = await window.App.auth.getCurrentProfile();

    if (!profile) return;

    if (profile.role === "admin") {
      window.location.href = "./admin.html";
      return;
    }

    showStatus("Sesión activa.");
    renderDashboard(profile.role);
  } catch (error) {
    console.error(error);
    showStatus("No se pudo restaurar la sesión.", true);
  }
}

if (loginForm) {
  loginForm.addEventListener("submit", handleLogin);
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", handleLogout);
}

restoreSession();
})();