(() => {
  "use strict";

  const App = window.App = window.App || {};

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getWorkspace() {
    return document.getElementById("adminWorkspace");
  }

  function renderStudentsModule() {
    const workspace = getWorkspace();

    if (!workspace) return;

    workspace.innerHTML = `
      <div class="moduleHeader">
        <div>
          <p class="dashboardEyebrow">Módulo académico</p>
          <h2>Alumnos</h2>
          <p>
            Alta y consulta básica de estudiantes registrados en la plataforma.
          </p>
        </div>
      </div>

      <form id="studentForm" class="studentForm">
        <div class="formGrid">
          <label>
            Nombre *
            <input type="text" name="first_name" required />
          </label>

          <label>
            Apellido *
            <input type="text" name="last_name" required />
          </label>

          <label>
            DNI
            <input type="text" name="dni" />
          </label>

          <label>
            Email
            <input type="email" name="email" />
          </label>

          <label>
            Teléfono
            <input type="text" name="phone" />
          </label>

          <label>
            Estado
            <select name="status">
              <option value="activo">Activo</option>
              <option value="pausado">Pausado</option>
              <option value="egresado">Egresado</option>
              <option value="baja">Baja</option>
            </select>
          </label>
        </div>

        <label>
          Observaciones
          <textarea name="notes" rows="3"></textarea>
        </label>

        <div class="formActions">
          <button type="submit">Guardar alumno</button>
          <p id="studentFormStatus" class="formStatus"></p>
        </div>
      </form>

      <div class="studentsListHeader">
        <h3>Listado de alumnos</h3>
        <button id="refreshStudentsBtn" type="button">Actualizar</button>
      </div>

      <div id="studentsList" class="studentsList">
        <p class="adminWorkspaceEmpty">Cargando alumnos...</p>
      </div>
    `;

    bindStudentForm();
    loadStudents();
  }

  function bindStudentForm() {
    const form = document.getElementById("studentForm");
    const refreshBtn = document.getElementById("refreshStudentsBtn");

    if (form) {
      form.addEventListener("submit", handleCreateStudent);
    }

    if (refreshBtn) {
      refreshBtn.addEventListener("click", loadStudents);
    }
  }

  async function handleCreateStudent(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const status = document.getElementById("studentFormStatus");
    const formData = new FormData(form);

    const student = {
      first_name: String(formData.get("first_name") || "").trim(),
      last_name: String(formData.get("last_name") || "").trim(),
      dni: String(formData.get("dni") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      status: String(formData.get("status") || "activo").trim(),
      notes: String(formData.get("notes") || "").trim()
    };

    if (!student.first_name || !student.last_name) {
      setStatus(status, "Nombre y apellido son obligatorios.", true);
      return;
    }

    try {
      setStatus(status, "Guardando...");

      await App.studentsService.createStudent(student);

      form.reset();

      setStatus(status, "Alumno guardado correctamente.");

      await loadStudents();
    } catch (error) {
      console.error(error);
      setStatus(status, `No se pudo guardar: ${error.message}`, true);
    }
  }

  async function loadStudents() {
    const list = document.getElementById("studentsList");

    if (!list) return;

    try {
      list.innerHTML = `<p class="adminWorkspaceEmpty">Cargando alumnos...</p>`;

      const students = await App.studentsService.listStudents();

      renderStudentsList(students);
    } catch (error) {
      console.error(error);

      list.innerHTML = `
        <p class="adminWorkspaceEmpty errorText">
          No se pudieron cargar los alumnos: ${escapeHTML(error.message)}
        </p>
      `;
    }
  }

  function renderStudentsList(students) {
    const list = document.getElementById("studentsList");

    if (!list) return;

    if (!students.length) {
      list.innerHTML = `
        <p class="adminWorkspaceEmpty">
          Todavía no hay alumnos cargados.
        </p>
      `;
      return;
    }

    list.innerHTML = `
      <div class="studentsTable">
        <div class="studentsTableRow studentsTableHead">
          <span>Apellido y nombre</span>
          <span>DNI</span>
          <span>Email</span>
          <span>Teléfono</span>
          <span>Estado</span>
        </div>

        ${students.map((student) => {
          const fullName = `${student.last_name || ""}, ${student.first_name || ""}`;

          return `
            <div class="studentsTableRow">
              <span>${escapeHTML(fullName)}</span>
              <span>${escapeHTML(student.dni || "-")}</span>
              <span>${escapeHTML(student.email || "-")}</span>
              <span>${escapeHTML(student.phone || "-")}</span>
              <span>
                <strong class="statusPill">${escapeHTML(student.status || "activo")}</strong>
              </span>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function setStatus(element, message, isError = false) {
    if (!element) return;

    element.textContent = message;
    element.classList.toggle("isError", isError);
  }

  App.studentsUI = {
    renderStudentsModule,
    loadStudents
  };
})();