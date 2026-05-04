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
      Fecha de nacimiento
      <input type="date" name="birth_date" />
    </label>

    <label>
      Domicilio
      <input
        type="text"
        name="address"
        placeholder="Calle, número, piso/depto"
      />
    </label>

    <label>
      Localidad
      <input
        type="text"
        name="city"
        placeholder="Ej: CABA, Avellaneda, Quilmes"
      />
    </label>

    <label>
      Nº de legajo
      <input
        type="text"
        name="file_number"
        placeholder="Ej: 2026-001"
      />
    </label>

    <label>
      Fecha de inscripción
      <input type="date" name="enrollment_date" />
    </label>

    <label>
      Estado de documentación
      <select name="documentation_status">
        <option value="pendiente">Pendiente</option>
        <option value="parcial">Parcial</option>
        <option value="completa">Completa</option>
        <option value="no_aplica">No aplica</option>
      </select>
    </label>

    <label>
      Contacto de emergencia
      <input
        type="text"
        name="emergency_contact_name"
        placeholder="Nombre y vínculo"
      />
    </label>

    <label>
      Teléfono de emergencia
      <input
        type="text"
        name="emergency_contact_phone"
        placeholder="Teléfono de contacto"
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
      detailPanel.addEventListener("click", handleStudentDocumentClick);
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

      birth_date: normalizeText(formData.get("birth_date")),
      address: normalizeText(formData.get("address")),
      city: normalizeText(formData.get("city")),
      emergency_contact_name: normalizeText(formData.get("emergency_contact_name")),
      emergency_contact_phone: normalizeText(formData.get("emergency_contact_phone")),

      enrollment_date: normalizeText(formData.get("enrollment_date")),
      file_number: normalizeText(formData.get("file_number")),
      documentation_status:
        normalizeText(formData.get("documentation_status")) || "pendiente",

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
      student.birth_date,
      student.address,
      student.city,
      student.emergency_contact_name,
      student.emergency_contact_phone,
      student.enrollment_date,
      student.file_number,
      student.documentation_status,
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

    form.elements.birth_date.value = student.birth_date || "";
    form.elements.address.value = student.address || "";
    form.elements.city.value = student.city || "";
    form.elements.emergency_contact_name.value =
      student.emergency_contact_name || "";
    form.elements.emergency_contact_phone.value =
      student.emergency_contact_phone || "";

    form.elements.enrollment_date.value = student.enrollment_date || "";
    form.elements.file_number.value = student.file_number || "";
    form.elements.documentation_status.value =
      student.documentation_status || "pendiente";

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

function formatDateOnly(value) {
  if (!value) return "-";

  const dateText = String(value).slice(0, 10);
  const parts = dateText.split("-");

  if (parts.length !== 3) return "-";

  const [year, month, day] = parts;

  return `${day}/${month}/${year}`;
}

function formatDocumentationStatus(value) {
  const status = String(value || "pendiente");

  const labels = {
    pendiente: "Pendiente",
    parcial: "Parcial",
    completa: "Completa",
    no_aplica: "No aplica"
  };

  return labels[status] || status;
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
        <button type="button" data-student-detail-action="print">Imprimir ficha</button>
        <button type="button" data-student-detail-action="edit">Editar ficha</button>
        <button type="button" data-student-detail-action="close" class="secondaryBtn">Cerrar</button>
      </div>
    </div>

    <div class="studentDetailGrid">
      <article class="studentDetailCard studentDetailCard--wide">
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
            <dt>Fecha de nacimiento</dt>
            <dd>${escapeHTML(formatDateOnly(student.birth_date))}</dd>
          </div>

          <div>
            <dt>Email</dt>
            <dd>${escapeHTML(student.email || "-")}</dd>
          </div>

          <div>
            <dt>Teléfono</dt>
            <dd>${escapeHTML(student.phone || "-")}</dd>
          </div>

          <div>
            <dt>Domicilio</dt>
            <dd>${escapeHTML(student.address || "-")}</dd>
          </div>

          <div>
            <dt>Localidad</dt>
            <dd>${escapeHTML(student.city || "-")}</dd>
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
            <dt>Nº de legajo</dt>
            <dd>${escapeHTML(student.file_number || "-")}</dd>
          </div>

          <div>
            <dt>Fecha de inscripción</dt>
            <dd>${escapeHTML(formatDateOnly(student.enrollment_date))}</dd>
          </div>

          <div>
            <dt>Documentación</dt>
            <dd>${escapeHTML(formatDocumentationStatus(student.documentation_status))}</dd>
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

      <article class="studentDetailCard">
        <h4>Contacto de emergencia</h4>

        <dl>
          <div>
            <dt>Contacto</dt>
            <dd>${escapeHTML(student.emergency_contact_name || "-")}</dd>
          </div>

          <div>
            <dt>Teléfono</dt>
            <dd>${escapeHTML(student.emergency_contact_phone || "-")}</dd>
          </div>
        </dl>
      </article>
    </div>

    <article class="studentDetailCard studentDetailNotes studentDocumentsCard">
  <div class="documentsHeader">
    <div>
      <h4>Documentación del alumno</h4>
      <p>Subí y consultá archivos del legajo del estudiante.</p>
    </div>
  </div>

  <form id="studentDocumentForm" class="documentUploadForm">
    <div class="documentsGrid">
      <label>
        Tipo de documento
        <select name="document_type" required>
          ${renderDocumentTypeOptions("student")}
        </select>
      </label>

      <label>
        Archivo
        <input
          type="file"
          name="document_file"
          accept=".pdf,image/jpeg,image/png,image/webp"
          required
        />
      </label>

      <label>
        Título / descripción breve
        <input
          type="text"
          name="title"
          placeholder="Ej: DNI, título secundario, ficha firmada"
        />
      </label>
    </div>

    <label>
      Observaciones del documento
      <textarea
        name="notes"
        rows="2"
        placeholder="Opcional"
      ></textarea>
    </label>

    <div class="formActions">
      <button id="studentDocumentSubmitBtn" type="submit">
        Subir documento
      </button>
      <p id="studentDocumentStatus" class="formStatus"></p>
    </div>
  </form>

  <div id="studentDocumentsList" class="documentsList">
    <p class="adminWorkspaceEmpty">Cargando documentación...</p>
  </div>
</article>

    <article class="studentDetailCard studentDetailNotes">
      <h4>Observaciones</h4>
      <p>${formatMultilineText(student.notes)}</p>
    </article>
  `;

    panel.dataset.currentStudentId = student.id;

    bindStudentDocumentForm(student.id);
    loadStudentDocuments(student.id);

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

  if (action === "print") {
    printStudentDetail();
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

function printStudentDetail() {
  const panel = document.getElementById("studentDetailPanel");

  if (!panel || panel.hidden) {
    alert("Primero abrí la ficha de un alumno.");
    return;
  }

  document.body.classList.add("isPrintingStudentDetail");

  window.print();
}

function renderDocumentTypeOptions(personType) {
  if (!App.documentsService) {
    console.warn("App.documentsService no está disponible. Revisar carga de documents-service.js.");

    return `
      <option value="" disabled selected>
        Documentos no disponibles
      </option>
    `;
  }

  const types = App.documentsService.getDocumentTypes(personType);

  if (!types.length) {
    return `
      <option value="" disabled selected>
        No hay tipos de documento configurados
      </option>
    `;
  }

  return types
    .map((item) => `
      <option value="${escapeHTML(item.value)}">
        ${escapeHTML(item.label)}
      </option>
    `)
    .join("");
}

function bindStudentDocumentForm(studentId) {
  const form = document.getElementById("studentDocumentForm");

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const status = document.getElementById("studentDocumentStatus");
    const submitBtn = document.getElementById("studentDocumentSubmitBtn");
    const formData = new FormData(form);
    const file = formData.get("document_file");

    try {
      if (!App.documentsService) {
        throw new Error("El servicio de documentos no está disponible.");
      }

      setStatus(status, "Subiendo documento...");

      if (submitBtn) {
        submitBtn.disabled = true;
      }

      await App.documentsService.uploadDocument({
        personType: "student",
        personId: studentId,
        documentType: normalizeText(formData.get("document_type")),
        title: normalizeText(formData.get("title")),
        notes: normalizeText(formData.get("notes")),
        file
      });

      form.reset();
      setStatus(status, "Documento subido correctamente.");

      await loadStudentDocuments(studentId);
    } catch (error) {
      console.error(error);
      setStatus(status, getFriendlyErrorMessage(error), true);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
      }
    }
  });
}

async function loadStudentDocuments(studentId) {
  const list = document.getElementById("studentDocumentsList");

  if (!list) return;

  try {
    if (!App.documentsService) {
      throw new Error("El servicio de documentos no está disponible.");
    }

    list.innerHTML = `<p class="adminWorkspaceEmpty">Cargando documentación...</p>`;

    const documents = await App.documentsService.listDocuments("student", studentId);

    renderStudentDocumentsList(documents);
  } catch (error) {
    console.error(error);

    list.innerHTML = `
      <p class="adminWorkspaceEmpty errorText">
        No se pudo cargar la documentación: ${escapeHTML(error.message)}
      </p>
    `;
  }
}

function renderStudentDocumentsList(documents) {
  const list = document.getElementById("studentDocumentsList");

  if (!list) return;

  if (!documents.length) {
    list.innerHTML = `
      <p class="adminWorkspaceEmpty">
        Todavía no hay documentación cargada.
      </p>
    `;
    return;
  }

  list.innerHTML = `
    <div class="documentsItems">
      ${documents.map(renderStudentDocumentItem).join("")}
    </div>
  `;
}

function renderStudentDocumentItem(studentDocument) {
  const typeLabel = App.documentsService
    ? App.documentsService.getDocumentTypeLabel("student", studentDocument.document_type)
    : studentDocument.document_type;

  return `
    <article class="documentItem" data-document-id="${escapeHTML(studentDocument.id)}">
      <div>
        <strong>${escapeHTML(typeLabel)}</strong>
        <span>${escapeHTML(studentDocument.title || studentDocument.file_name || "Documento")}</span>
        <small>
          ${escapeHTML(formatDateTime(studentDocument.created_at))}
          ${studentDocument.file_size ? ` · ${escapeHTML(formatFileSize(studentDocument.file_size))}` : ""}
        </small>
      </div>

      <div class="documentItemActions">
        <button type="button" data-document-action="open">
          Abrir
        </button>
        <button type="button" data-document-action="delete" class="dangerBtn">
          Borrar
        </button>
      </div>
    </article>
  `;
}

function formatFileSize(size) {
  const bytes = Number(size || 0);

  if (!bytes) return "-";

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function handleStudentDocumentClick(event) {
  const button = event.target.closest("[data-document-action]");

  if (!button) return;

  const item = button.closest("[data-document-id]");
  const documentId = item?.dataset.documentId;
  const action = button.dataset.documentAction;

  if (!documentId || !action) return;

  const panel = window.document.getElementById("studentDetailPanel");
  const studentId = panel?.dataset?.currentStudentId;

  if (action === "open") {
    await openStudentDocument(documentId);
    return;
  }

  if (action === "delete") {
    await deleteStudentDocument(documentId, studentId);
  }
}

async function openStudentDocument(documentId) {
  const newTab = window.open("about:blank", "_blank");

  try {
    const panel = window.document.getElementById("studentDetailPanel");
    const studentId = panel?.dataset?.currentStudentId;

    if (!studentId) {
      throw new Error("No se encontró el alumno actual.");
    }

    const documents = await App.documentsService.listDocuments("student", studentId);
    const selectedDocument = documents.find((item) => item.id === documentId);

    if (!selectedDocument) {
      throw new Error("No se encontró el documento.");
    }

    const signedUrl = await App.documentsService.createSignedUrl(
      selectedDocument.file_path
    );

    if (newTab) {
      newTab.location.href = signedUrl;
      return;
    }

    window.location.href = signedUrl;
  } catch (error) {
    console.error(error);

    if (newTab) {
      newTab.close();
    }

    alert(getFriendlyErrorMessage(error));
  }
}

async function deleteStudentDocument(documentId, studentId) {
  const confirmed = confirm(
    "Esto va a borrar el documento del legajo.\n\n¿Querés continuar?"
  );

  if (!confirmed) return;

  try {
    await App.documentsService.deleteDocument(documentId);
    await loadStudentDocuments(studentId);
  } catch (error) {
    console.error(error);
    alert(getFriendlyErrorMessage(error));
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

  window.addEventListener("afterprint", () => {
  document.body.classList.remove("isPrintingStudentDetail");
});

  App.studentsUI = {
    renderStudentsModule,
    loadStudents
  };
})();