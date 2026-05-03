// students-ui.js
(() => {
  "use strict";

  const App = window.App = window.App || {};

  let studentsCache = [];
  let editingStudentId = null;

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

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function renderStudentsModule() {
    const workspace = getWorkspace();

    if (!workspace) return;

    editingStudentId = null;

    workspace.innerHTML = `
      <div class="moduleHeader">
        <div>
          <p class="dashboardEyebrow">Módulo académico</p>
          <h2>Alumnos</h2>
          <p>
            Alta, consulta y edición de estudiantes registrados en la plataforma.
          </p>
        </div>
      </div>

      <form id="studentForm" class="studentForm">
        <input type="hidden" name="student_id" id="studentIdInput" />

        <div class="studentFormTop">
          <div>
            <h3 id="studentFormTitle">Nuevo alumno</h3>
            <p id="studentFormSubtitle">
              Cargá los datos básicos del estudiante.
            </p>
          </div>
        </div>

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
  Carrera / Trayecto
  <input
    type="text"
    name="program_name"
    placeholder="Ej: Tecnicatura en Psicología Social"
  />
</label>

      <label>
        Cohorte / Año de ingreso
        <input
          type="text"
          name="cohort"
          placeholder="Ej: 2026"
        />
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
          <button id="studentSubmitBtn" type="submit">Guardar alumno</button>
          <button id="cancelEditStudentBtn" type="button" class="secondaryBtn" hidden>
            Cancelar edición
          </button>
          <p id="studentFormStatus" class="formStatus"></p>
        </div>
      </form>

      <section id="studentDetailPanel" class="studentDetailPanel" hidden></section>

      <div class="studentsListHeader">
        <div>
          <h3>Listado de alumnos</h3>
          <p id="studentsCountText" class="studentsCountText"></p>
        </div>

        <div class="studentsListActions">
          <input
            id="studentsSearchInput"
            type="search"
            placeholder="Buscar por nombre, apellido, DNI o email"
            aria-label="Buscar alumnos"
          />

          <select id="studentsStatusFilter" aria-label="Filtrar por estado">
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="pausado">Pausado</option>
            <option value="egresado">Egresado</option>
            <option value="baja">Baja</option>
          </select>

          <select id="studentsCohortFilter" aria-label="Filtrar por cohorte">
            <option value="">Todas las cohortes</option>
          </select>

          <button id="clearStudentsFiltersBtn" type="button" class="secondaryBtn">
            Limpiar
          </button>

          <button id="refreshStudentsBtn" type="button">Actualizar</button>
        </div>
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
    const searchInput = document.getElementById("studentsSearchInput");
    const statusFilter = document.getElementById("studentsStatusFilter");
    const cohortFilter = document.getElementById("studentsCohortFilter");
    const clearFiltersBtn = document.getElementById("clearStudentsFiltersBtn");
    const cancelEditBtn = document.getElementById("cancelEditStudentBtn");
    const list = document.getElementById("studentsList");
    const detailPanel = document.getElementById("studentDetailPanel");

    if (form) {
      form.addEventListener("submit", handleSubmitStudent);
    }

    if (refreshBtn) {
      refreshBtn.addEventListener("click", loadStudents);
    }

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        renderStudentsList(getFilteredStudents());
      });
    }

        if (statusFilter) {
      statusFilter.addEventListener("change", () => {
        renderStudentsList(getFilteredStudents());
      });
    }

    if (cohortFilter) {
      cohortFilter.addEventListener("change", () => {
        renderStudentsList(getFilteredStudents());
      });
    }

    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener("click", clearStudentFilters);
    }

    if (cancelEditBtn) {
      cancelEditBtn.addEventListener("click", resetStudentForm);
    }

    if (list) {
      list.addEventListener("click", handleStudentsListClick);
    }

    if (detailPanel) {
      detailPanel.addEventListener("click", handleStudentDetailClick);
    }
  }

  function readStudentForm() {
    const form = document.getElementById("studentForm");

    if (!form) return null;

    const formData = new FormData(form);

    return {
      first_name: normalizeText(formData.get("first_name")),
      last_name: normalizeText(formData.get("last_name")),
      dni: normalizeText(formData.get("dni")),
      email: normalizeText(formData.get("email")),
      phone: normalizeText(formData.get("phone")),
      program_name: normalizeText(formData.get("program_name")),
      cohort: normalizeText(formData.get("cohort")),
      status: normalizeText(formData.get("status")) || "activo",
      notes: normalizeText(formData.get("notes"))
    };
  }

  async function handleSubmitStudent(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const status = document.getElementById("studentFormStatus");
    const submitBtn = document.getElementById("studentSubmitBtn");
    const student = readStudentForm();

    if (!student) return;

    if (!student.first_name || !student.last_name) {
      setStatus(status, "Nombre y apellido son obligatorios.", true);
      return;
    }

    try {
      setStatus(status, editingStudentId ? "Actualizando..." : "Guardando...");

      if (submitBtn) {
        submitBtn.disabled = true;
      }

      if (editingStudentId) {
        await App.studentsService.updateStudent(editingStudentId, student);
        setStatus(status, "Alumno actualizado correctamente.");
      } else {
        await App.studentsService.createStudent(student);
        setStatus(status, "Alumno guardado correctamente.");
      }

      form.reset();
      resetStudentFormMode();

      await loadStudents();
    } catch (error) {
      console.error(error);
      setStatus(status, getFriendlyErrorMessage(error), true);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
      }
    }
  }

  async function loadStudents() {
    const list = document.getElementById("studentsList");

    if (!list) return;

    try {
      list.innerHTML = `<p class="adminWorkspaceEmpty">Cargando alumnos...</p>`;

        studentsCache = await App.studentsService.listStudents();

        renderCohortFilterOptions();
        renderStudentsList(getFilteredStudents());
    } catch (error) {
      console.error(error);

      list.innerHTML = `
        <p class="adminWorkspaceEmpty errorText">
          No se pudieron cargar los alumnos: ${escapeHTML(error.message)}
        </p>
      `;
    }
  }

  function getFilteredStudents() {
  const searchInput = document.getElementById("studentsSearchInput");
  const statusFilter = document.getElementById("studentsStatusFilter");
  const cohortFilter = document.getElementById("studentsCohortFilter");

  const term = normalizeText(searchInput?.value).toLowerCase();
  const selectedStatus = normalizeText(statusFilter?.value);
  const selectedCohort = normalizeText(cohortFilter?.value);

  return studentsCache.filter((student) => {
    const studentStatus = normalizeText(student.status || "activo");
    const studentCohort = normalizeText(student.cohort);

    if (selectedStatus && studentStatus !== selectedStatus) {
      return false;
    }

    if (selectedCohort && studentCohort !== selectedCohort) {
      return false;
    }

    if (!term) {
      return true;
    }

    const searchable = [
      student.first_name,
      student.last_name,
      student.dni,
      student.email,
      student.phone,
      student.program_name,
      student.cohort,
      student.status
    ]
      .map((value) => String(value || "").toLowerCase())
      .join(" ");

    return searchable.includes(term);
  });
}

function renderCohortFilterOptions() {
  const cohortFilter = document.getElementById("studentsCohortFilter");

  if (!cohortFilter) return;

  const currentValue = cohortFilter.value;

  const cohorts = [...new Set(
    studentsCache
      .map((student) => normalizeText(student.cohort))
      .filter(Boolean)
  )].sort((a, b) =>
    String(b).localeCompare(String(a), "es", {
      numeric: true,
      sensitivity: "base"
    })
  );

  cohortFilter.innerHTML = `
    <option value="">Todas las cohortes</option>
    ${cohorts
      .map((cohort) => `
        <option value="${escapeHTML(cohort)}">
          ${escapeHTML(cohort)}
        </option>
      `)
      .join("")}
  `;

  if (currentValue && cohorts.includes(currentValue)) {
    cohortFilter.value = currentValue;
  }
}

function clearStudentFilters() {
  const searchInput = document.getElementById("studentsSearchInput");
  const statusFilter = document.getElementById("studentsStatusFilter");
  const cohortFilter = document.getElementById("studentsCohortFilter");

  if (searchInput) {
    searchInput.value = "";
  }

  if (statusFilter) {
    statusFilter.value = "";
  }

  if (cohortFilter) {
    cohortFilter.value = "";
  }

  renderStudentsList(getFilteredStudents());
}

  function renderStudentsList(students) {
    const list = document.getElementById("studentsList");
    const countText = document.getElementById("studentsCountText");

    if (!list) return;

    if (countText) {
      const total = studentsCache.length;
      const visible = students.length;

    countText.textContent =
      total === visible
        ? `${total} alumno${total === 1 ? "" : "s"} cargado${total === 1 ? "" : "s"}.`
        : `${visible} resultado${visible === 1 ? "" : "s"} de ${total} alumno${total === 1 ? "" : "s"}.`;
    }

    if (!students.length) {
      list.innerHTML = `
        <p class="adminWorkspaceEmpty">
          No hay alumnos para mostrar.
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
          <span>Acciones</span>
        </div>

        ${students.map(renderStudentRow).join("")}
      </div>
    `;
  }

  function renderStudentRow(student) {
  const fullName = `${student.last_name || ""}, ${student.first_name || ""}`;
  const isEditing = editingStudentId === student.id;
  const status = student.status || "activo";
  const isInactive = status === "baja";

  return `
    <div class="studentsTableRow ${isEditing ? "isEditing" : ""}" data-student-id="${escapeHTML(student.id)}">
      <span>${escapeHTML(fullName)}</span>
      <span>${escapeHTML(student.dni || "-")}</span>
      <span>${escapeHTML(student.email || "-")}</span>
      <span>${escapeHTML(student.phone || "-")}</span>
      <span>
        <strong class="statusPill statusPill--${escapeHTML(status)}">
          ${escapeHTML(status)}
        </strong>
      </span>
            <span class="studentsRowActions">
        <button type="button" data-student-action="details">Ficha</button>
        <button type="button" data-student-action="edit">Editar</button>

        ${
          isInactive
            ? `<button type="button" data-student-action="reactivate">Reactivar</button>`
            : `<button type="button" data-student-action="archive">Baja</button>`
        }

        <button type="button" data-student-action="delete" class="dangerBtn">Borrar</button>
      </span>
    </div>
  `;
}

  async function handleStudentsListClick(event) {
    const button = event.target.closest("[data-student-action]");

    if (!button) return;

    const row = button.closest("[data-student-id]");
    const studentId = row?.dataset.studentId;
    const action = button.dataset.studentAction;

    if (!studentId || !action) return;

    const student = studentsCache.find((item) => item.id === studentId);

    if (!student) {
      alert("No se encontró el alumno seleccionado.");
      return;
    }

    if (action === "details") {
      renderStudentDetail(student);
      return;
    }

    if (action === "edit") {
      startEditStudent(student);
      return;
    }

    if (action === "archive") {
      await archiveStudent(student);
      return;
    }

    if (action === "reactivate") {
      await reactivateStudent(student);
      return;
    }

    if (action === "delete") {
      await deleteStudent(student);
    }
  }

  function startEditStudent(student) {
    const form = document.getElementById("studentForm");
    const title = document.getElementById("studentFormTitle");
    const subtitle = document.getElementById("studentFormSubtitle");
    const submitBtn = document.getElementById("studentSubmitBtn");
    const cancelBtn = document.getElementById("cancelEditStudentBtn");
    const status = document.getElementById("studentFormStatus");

    if (!form) return;

    editingStudentId = student.id;

      form.elements.first_name.value = student.first_name || "";
      form.elements.last_name.value = student.last_name || "";
      form.elements.dni.value = student.dni || "";
      form.elements.email.value = student.email || "";
      form.elements.phone.value = student.phone || "";
      form.elements.program_name.value = student.program_name || "";
      form.elements.cohort.value = student.cohort || "";
      form.elements.status.value = student.status || "activo";
      form.elements.notes.value = student.notes || "";

    if (title) {
      title.textContent = "Editar alumno";
    }

    if (subtitle) {
      subtitle.textContent = `Editando ficha de ${student.first_name || ""} ${student.last_name || ""}.`;
    }

    if (submitBtn) {
      submitBtn.textContent = "Guardar cambios";
    }

    if (cancelBtn) {
      cancelBtn.hidden = false;
    }

    setStatus(status, "");

    renderStudentsList(getFilteredStudents());

    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function formatDateTime(value) {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch (error) {
    return "-";
  }
}

function formatMultilineText(value) {
  const text = String(value || "").trim();

  if (!text) {
    return "<em>Sin observaciones cargadas.</em>";
  }

  return escapeHTML(text).replaceAll("\n", "<br>");
}

function renderStudentDetail(student) {
  const panel = document.getElementById("studentDetailPanel");

  if (!panel) return;

  const fullName = `${student.first_name || ""} ${student.last_name || ""}`.trim();
  const status = student.status || "activo";

  panel.hidden = false;

  panel.innerHTML = `
    <div class="studentDetailHeader">
      <div>
        <p class="dashboardEyebrow">Ficha individual</p>
        <h3>${escapeHTML(fullName || "Alumno sin nombre")}</h3>
        <p>
          Consulta rápida de datos administrativos y observaciones internas.
        </p>
      </div>

      <div class="studentDetailActions">
        <button type="button" data-student-detail-action="edit">Editar ficha</button>
        <button type="button" data-student-detail-action="close" class="secondaryBtn">Cerrar</button>
      </div>
    </div>

    <div class="studentDetailGrid">
      <article class="studentDetailCard">
        <h4>Datos personales</h4>

        <dl>
          <div>
            <dt>Apellido</dt>
            <dd>${escapeHTML(student.last_name || "-")}</dd>
          </div>

          <div>
            <dt>Nombre</dt>
            <dd>${escapeHTML(student.first_name || "-")}</dd>
          </div>

          <div>
            <dt>DNI</dt>
            <dd>${escapeHTML(student.dni || "-")}</dd>
          </div>

          <div>
            <dt>Email</dt>
            <dd>${escapeHTML(student.email || "-")}</dd>
          </div>

          <div>
            <dt>Teléfono</dt>
            <dd>${escapeHTML(student.phone || "-")}</dd>
          </div>
        </dl>
      </article>

      <article class="studentDetailCard">
        <h4>Estado administrativo</h4>

        <dl>
          <div>
            <dt>Estado</dt>
            <dd>
              <strong class="statusPill statusPill--${escapeHTML(status)}">
                ${escapeHTML(status)}
              </strong>
            </dd>
          </div>

          <div>
            <dt>Fecha de alta</dt>
            <dd>${escapeHTML(formatDateTime(student.created_at))}</dd>
          </div>

          <div>
            <dt>Última modificación</dt>
            <dd>${escapeHTML(formatDateTime(student.updated_at))}</dd>
          </div>
        </dl>
      </article>
      <article class="studentDetailCard">
  <h4>Datos académicos</h4>

  <dl>
    <div>
      <dt>Carrera / Trayecto</dt>
      <dd>${escapeHTML(student.program_name || "-")}</dd>
    </div>

    <div>
      <dt>Cohorte / Año</dt>
      <dd>${escapeHTML(student.cohort || "-")}</dd>
    </div>
  </dl>
</article>
    </div>

    <article class="studentDetailCard studentDetailNotes">
      <h4>Observaciones</h4>
      <p>${formatMultilineText(student.notes)}</p>
    </article>
  `;

  panel.dataset.currentStudentId = student.id;

  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function handleStudentDetailClick(event) {
  const button = event.target.closest("[data-student-detail-action]");

  if (!button) return;

  const action = button.dataset.studentDetailAction;
  const panel = document.getElementById("studentDetailPanel");
  const studentId = panel?.dataset?.currentStudentId;

  if (action === "close") {
    if (panel) {
      panel.hidden = true;
      panel.innerHTML = "";
      delete panel.dataset.currentStudentId;
    }

    return;
  }

  if (action === "edit") {
    const student = studentsCache.find((item) => item.id === studentId);

    if (!student) {
      alert("No se encontró el alumno seleccionado.");
      return;
    }

    startEditStudent(student);
  }
}

  function resetStudentForm() {
    const form = document.getElementById("studentForm");
    const status = document.getElementById("studentFormStatus");

    if (form) {
      form.reset();
    }

    resetStudentFormMode();
    setStatus(status, "");
    renderStudentsList(getFilteredStudents());
  }

  function resetStudentFormMode() {
    const title = document.getElementById("studentFormTitle");
    const subtitle = document.getElementById("studentFormSubtitle");
    const submitBtn = document.getElementById("studentSubmitBtn");
    const cancelBtn = document.getElementById("cancelEditStudentBtn");

    editingStudentId = null;

    if (title) {
      title.textContent = "Nuevo alumno";
    }

    if (subtitle) {
      subtitle.textContent = "Cargá los datos básicos del estudiante.";
    }

    if (submitBtn) {
      submitBtn.textContent = "Guardar alumno";
    }

    if (cancelBtn) {
      cancelBtn.hidden = true;
    }
  }

  async function archiveStudent(student) {
    const fullName = `${student.first_name || ""} ${student.last_name || ""}`.trim();

    const confirmed = confirm(
      `¿Querés marcar como baja a ${fullName || "este alumno"}?`
    );

    if (!confirmed) return;

    try {
      await App.studentsService.updateStudentStatus(student.id, "baja");

      if (editingStudentId === student.id) {
        resetStudentForm();
      }

      await loadStudents();
    } catch (error) {
      console.error(error);
      alert(getFriendlyErrorMessage(error));
    }
  }

  async function reactivateStudent(student) {
  const fullName = `${student.first_name || ""} ${student.last_name || ""}`.trim();

  const confirmed = confirm(
    `¿Querés reactivar a ${fullName || "este alumno"}?`
  );

  if (!confirmed) return;

  try {
    await App.studentsService.updateStudentStatus(student.id, "activo");

    if (editingStudentId === student.id) {
      resetStudentForm();
    }

    await loadStudents();
  } catch (error) {
    console.error(error);
    alert(getFriendlyErrorMessage(error));
  }
}

  async function deleteStudent(student) {
    const fullName = `${student.first_name || ""} ${student.last_name || ""}`.trim();

    const confirmed = confirm(
      `Esto va a borrar definitivamente a ${fullName || "este alumno"}.\n\n¿Querés continuar?`
    );

    if (!confirmed) return;

    try {
      await App.studentsService.deleteStudent(student.id);

      if (editingStudentId === student.id) {
        resetStudentForm();
      }

      await loadStudents();
    } catch (error) {
      console.error(error);
      alert(getFriendlyErrorMessage(error));
    }
  }

  function setStatus(element, message, isError = false) {
    if (!element) return;

    element.textContent = message;
    element.classList.toggle("isError", isError);
  }

  function getFriendlyErrorMessage(error) {
    const message = String(error?.message || "Ocurrió un error inesperado.");

    if (
      error?.code === "23505" ||
      message.toLowerCase().includes("duplicate") ||
      message.toLowerCase().includes("unique")
    ) {
      return "No se pudo guardar: ya existe un alumno con ese DNI.";
    }

    if (message.toLowerCase().includes("permission denied")) {
      return "No tenés permisos suficientes para realizar esta acción.";
    }

    return `No se pudo completar la operación: ${message}`;
  }

  App.studentsUI = {
    renderStudentsModule,
    loadStudents
  };
})();