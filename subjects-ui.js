// subjects-ui.js
(() => {
  "use strict";

  const App = window.App = window.App || {};

  let subjectsCache = [];
  let teachersCache = [];
  let editingSubjectId = null;

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function getWorkspace() {
    return document.getElementById("adminWorkspace");
  }

  function renderSubjectsModule() {
    const workspace = getWorkspace();

    if (!workspace) return;

    editingSubjectId = null;

    workspace.innerHTML = `
      <div class="moduleHeader">
        <div>
          <p class="dashboardEyebrow">Módulo académico</p>
          <h2>Materias</h2>
          <p>
            Alta, consulta y edición de materias o espacios curriculares.
          </p>
        </div>
      </div>

      <form id="subjectForm" class="studentForm">
        <div class="studentFormTop">
          <div>
            <h3 id="subjectFormTitle">Nueva materia</h3>
            <p id="subjectFormSubtitle">
              Cargá los datos básicos del espacio curricular.
            </p>
          </div>
        </div>

        <div class="formGrid">
          <label>
            Nombre de la materia *
            <input
              type="text"
              name="name"
              required
              placeholder="Ej: Psicología Social I"
            />
          </label>

          <label>
            Código interno
            <input
              type="text"
              name="code"
              placeholder="Ej: PSI-001"
            />
          </label>

          <label>
            Año / Nivel
            <input
              type="text"
              name="year_level"
              placeholder="Ej: 1º año, 2º año, Inicial"
            />
          </label>

          <label>
            Carga horaria
            <input
              type="number"
              name="workload_hours"
              min="0"
              step="1"
              placeholder="Ej: 64"
            />
          </label>

          <label>
            Docente titular
            <select name="teacher_id" id="subjectTeacherSelect">
              <option value="">Sin docente asignado</option>
            </select>
          </label>

          <label>
            Estado
            <select name="status">
              <option value="activo">Activo</option>
              <option value="pausado">Pausado</option>
              <option value="baja">Baja</option>
            </select>
          </label>
        </div>

        <label>
          Observaciones
          <textarea name="notes" rows="3"></textarea>
        </label>

        <div class="formActions">
          <button id="subjectSubmitBtn" type="submit">Guardar materia</button>
          <button id="cancelEditSubjectBtn" type="button" class="secondaryBtn" hidden>
            Cancelar edición
          </button>
          <p id="subjectFormStatus" class="formStatus"></p>
        </div>
      </form>

      <section id="subjectDetailPanel" class="studentDetailPanel" hidden></section>

      <div class="studentsListHeader">
        <div>
          <h3>Listado de materias</h3>
          <p id="subjectsCountText" class="studentsCountText"></p>
        </div>

        <div class="studentsListActions">
          <input
            id="subjectsSearchInput"
            type="search"
            placeholder="Buscar por nombre, código, año o docente"
            aria-label="Buscar materias"
          />

          <select id="subjectsStatusFilter" aria-label="Filtrar por estado">
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="pausado">Pausado</option>
            <option value="baja">Baja</option>
          </select>

          <button id="clearSubjectsFiltersBtn" type="button" class="secondaryBtn">
            Limpiar
          </button>

          <button id="refreshSubjectsBtn" type="button">Actualizar</button>
        </div>
      </div>

      <div id="subjectsList" class="studentsList">
        <p class="adminWorkspaceEmpty">Cargando materias...</p>
      </div>
    `;

    bindSubjectForm();
    loadInitialData();
  }

  function bindSubjectForm() {
    const form = document.getElementById("subjectForm");
    const refreshBtn = document.getElementById("refreshSubjectsBtn");
    const searchInput = document.getElementById("subjectsSearchInput");
    const statusFilter = document.getElementById("subjectsStatusFilter");
    const clearFiltersBtn = document.getElementById("clearSubjectsFiltersBtn");
    const cancelEditBtn = document.getElementById("cancelEditSubjectBtn");
    const list = document.getElementById("subjectsList");
    const detailPanel = document.getElementById("subjectDetailPanel");

    if (form) {
      form.addEventListener("submit", handleSubmitSubject);
    }

    if (refreshBtn) {
      refreshBtn.addEventListener("click", loadInitialData);
    }

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        renderSubjectsList(getFilteredSubjects());
      });
    }

    if (statusFilter) {
      statusFilter.addEventListener("change", () => {
        renderSubjectsList(getFilteredSubjects());
      });
    }

    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener("click", clearSubjectFilters);
    }

    if (cancelEditBtn) {
      cancelEditBtn.addEventListener("click", resetSubjectForm);
    }

    if (list) {
      list.addEventListener("click", handleSubjectsListClick);
    }

    if (detailPanel) {
      detailPanel.addEventListener("click", handleSubjectDetailClick);
    }
  }

  async function loadInitialData() {
    const list = document.getElementById("subjectsList");

    if (!list) return;

    try {
      list.innerHTML = `<p class="adminWorkspaceEmpty">Cargando materias...</p>`;

      const [subjects, teachers] = await Promise.all([
        App.subjectsService.listSubjects(),
        loadTeachersForSubjects()
      ]);

      subjectsCache = subjects;
      teachersCache = teachers;

      renderTeacherSelectOptions();
      renderSubjectsList(getFilteredSubjects());
    } catch (error) {
      console.error(error);

      list.innerHTML = `
        <p class="adminWorkspaceEmpty errorText">
          No se pudieron cargar las materias: ${escapeHTML(error.message)}
        </p>
      `;
    }
  }

  async function loadTeachersForSubjects() {
    if (!App.teachersService) {
      console.warn("App.teachersService no está disponible. No se podrán asignar docentes.");
      return [];
    }

    return App.teachersService.listTeachers();
  }

  function renderTeacherSelectOptions() {
    const select = document.getElementById("subjectTeacherSelect");

    if (!select) return;

    const currentValue = select.value;

    const activeTeachers = teachersCache.filter((teacher) => {
      return (teacher.status || "activo") !== "baja";
    });

    select.innerHTML = `
      <option value="">Sin docente asignado</option>
      ${activeTeachers.map((teacher) => `
        <option value="${escapeHTML(teacher.id)}">
          ${escapeHTML(getTeacherFullName(teacher))}
        </option>
      `).join("")}
    `;

    if (currentValue) {
      select.value = currentValue;
    }
  }

  function readSubjectForm() {
    const form = document.getElementById("subjectForm");

    if (!form) return null;

    const formData = new FormData(form);

    return {
      name: normalizeText(formData.get("name")),
      code: normalizeText(formData.get("code")),
      year_level: normalizeText(formData.get("year_level")),
      workload_hours: normalizeText(formData.get("workload_hours")),
      teacher_id: normalizeText(formData.get("teacher_id")),
      status: normalizeText(formData.get("status")) || "activo",
      notes: normalizeText(formData.get("notes"))
    };
  }

  async function handleSubmitSubject(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const status = document.getElementById("subjectFormStatus");
    const submitBtn = document.getElementById("subjectSubmitBtn");
    const subject = readSubjectForm();

    if (!subject) return;

    if (!subject.name) {
      setStatus(status, "El nombre de la materia es obligatorio.", true);
      return;
    }

    try {
      setStatus(status, editingSubjectId ? "Actualizando..." : "Guardando...");

      if (submitBtn) {
        submitBtn.disabled = true;
      }

      if (editingSubjectId) {
        await App.subjectsService.updateSubject(editingSubjectId, subject);
        setStatus(status, "Materia actualizada correctamente.");
      } else {
        await App.subjectsService.createSubject(subject);
        setStatus(status, "Materia guardada correctamente.");
      }

      form.reset();
      resetSubjectFormMode();

      await loadInitialData();
    } catch (error) {
      console.error(error);
      setStatus(status, getFriendlyErrorMessage(error), true);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
      }
    }
  }

  function getFilteredSubjects() {
    const searchInput = document.getElementById("subjectsSearchInput");
    const statusFilter = document.getElementById("subjectsStatusFilter");

    const term = normalizeText(searchInput?.value).toLowerCase();
    const selectedStatus = normalizeText(statusFilter?.value);

    return subjectsCache.filter((subject) => {
      const subjectStatus = normalizeText(subject.status || "activo");

      if (selectedStatus && subjectStatus !== selectedStatus) {
        return false;
      }

      if (!term) {
        return true;
      }

      const teacher = getTeacherById(subject.teacher_id);

      const searchable = [
        subject.name,
        subject.code,
        subject.year_level,
        subject.workload_hours,
        subject.status,
        subject.notes,
        getTeacherFullName(teacher)
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      return searchable.includes(term);
    });
  }

  function clearSubjectFilters() {
    const searchInput = document.getElementById("subjectsSearchInput");
    const statusFilter = document.getElementById("subjectsStatusFilter");

    if (searchInput) {
      searchInput.value = "";
    }

    if (statusFilter) {
      statusFilter.value = "";
    }

    renderSubjectsList(getFilteredSubjects());
  }

  function renderSubjectsList(subjects) {
    const list = document.getElementById("subjectsList");
    const countText = document.getElementById("subjectsCountText");

    if (!list) return;

    if (countText) {
      const total = subjectsCache.length;
      const visible = subjects.length;

      countText.textContent =
        total === visible
          ? `${total} materia${total === 1 ? "" : "s"} cargada${total === 1 ? "" : "s"}.`
          : `${visible} resultado${visible === 1 ? "" : "s"} de ${total} materia${total === 1 ? "" : "s"}.`;
    }

    if (!subjects.length) {
      list.innerHTML = `
        <p class="adminWorkspaceEmpty">
          No hay materias para mostrar.
        </p>
      `;
      return;
    }

    list.innerHTML = `
      <div class="studentsTable">
        <div class="studentsTableRow studentsTableHead">
          <span>Materia</span>
          <span>Código</span>
          <span>Año / Nivel</span>
          <span>Docente</span>
          <span>Estado</span>
          <span>Acciones</span>
        </div>

        ${subjects.map(renderSubjectRow).join("")}
      </div>
    `;
  }

  function renderSubjectRow(subject) {
    const teacher = getTeacherById(subject.teacher_id);
    const isEditing = editingSubjectId === subject.id;
    const status = subject.status || "activo";
    const isInactive = status === "baja";

    return `
      <div class="studentsTableRow ${isEditing ? "isEditing" : ""}" data-subject-id="${escapeHTML(subject.id)}">
        <span>${escapeHTML(subject.name || "-")}</span>
        <span>${escapeHTML(subject.code || "-")}</span>
        <span>${escapeHTML(subject.year_level || "-")}</span>
        <span>${escapeHTML(getTeacherFullName(teacher) || "Sin asignar")}</span>
        <span>
          <strong class="statusPill statusPill--${escapeHTML(status)}">
            ${escapeHTML(formatSubjectStatus(status))}
          </strong>
        </span>
        <span class="studentsRowActions">
          <button type="button" data-subject-action="details">Ficha</button>
          <button type="button" data-subject-action="edit">Editar</button>

          ${
            isInactive
              ? `<button type="button" data-subject-action="reactivate">Reactivar</button>`
              : `<button type="button" data-subject-action="archive">Baja</button>`
          }

          <button type="button" data-subject-action="delete" class="dangerBtn">Borrar</button>
        </span>
      </div>
    `;
  }

  async function handleSubjectsListClick(event) {
    const button = event.target.closest("[data-subject-action]");

    if (!button) return;

    const row = button.closest("[data-subject-id]");
    const subjectId = row?.dataset.subjectId;
    const action = button.dataset.subjectAction;

    if (!subjectId || !action) return;

    const subject = subjectsCache.find((item) => item.id === subjectId);

    if (!subject) {
      alert("No se encontró la materia seleccionada.");
      return;
    }

    if (action === "details") {
      renderSubjectDetail(subject);
      return;
    }

    if (action === "edit") {
      startEditSubject(subject);
      return;
    }

    if (action === "archive") {
      await archiveSubject(subject);
      return;
    }

    if (action === "reactivate") {
      await reactivateSubject(subject);
      return;
    }

    if (action === "delete") {
      await deleteSubject(subject);
    }
  }

  function startEditSubject(subject) {
    const form = document.getElementById("subjectForm");
    const title = document.getElementById("subjectFormTitle");
    const subtitle = document.getElementById("subjectFormSubtitle");
    const submitBtn = document.getElementById("subjectSubmitBtn");
    const cancelBtn = document.getElementById("cancelEditSubjectBtn");
    const status = document.getElementById("subjectFormStatus");

    if (!form) return;

    editingSubjectId = subject.id;

    form.elements.name.value = subject.name || "";
    form.elements.code.value = subject.code || "";
    form.elements.year_level.value = subject.year_level || "";
    form.elements.workload_hours.value = subject.workload_hours ?? "";
    form.elements.teacher_id.value = subject.teacher_id || "";
    form.elements.status.value = subject.status || "activo";
    form.elements.notes.value = subject.notes || "";

    if (title) {
      title.textContent = "Editar materia";
    }

    if (subtitle) {
      subtitle.textContent = `Editando ${subject.name || "materia"}.`;
    }

    if (submitBtn) {
      submitBtn.textContent = "Guardar cambios";
    }

    if (cancelBtn) {
      cancelBtn.hidden = false;
    }

    setStatus(status, "");

    renderSubjectsList(getFilteredSubjects());

    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetSubjectForm() {
    const form = document.getElementById("subjectForm");
    const status = document.getElementById("subjectFormStatus");

    if (form) {
      form.reset();
    }

    resetSubjectFormMode();
    setStatus(status, "");
    renderSubjectsList(getFilteredSubjects());
  }

  function resetSubjectFormMode() {
    const title = document.getElementById("subjectFormTitle");
    const subtitle = document.getElementById("subjectFormSubtitle");
    const submitBtn = document.getElementById("subjectSubmitBtn");
    const cancelBtn = document.getElementById("cancelEditSubjectBtn");

    editingSubjectId = null;

    if (title) {
      title.textContent = "Nueva materia";
    }

    if (subtitle) {
      subtitle.textContent = "Cargá los datos básicos del espacio curricular.";
    }

    if (submitBtn) {
      submitBtn.textContent = "Guardar materia";
    }

    if (cancelBtn) {
      cancelBtn.hidden = true;
    }
  }

  function renderSubjectDetail(subject) {
    const panel = document.getElementById("subjectDetailPanel");

    if (!panel) return;

    const teacher = getTeacherById(subject.teacher_id);
    const status = subject.status || "activo";

    panel.hidden = false;

    panel.innerHTML = `
      <div class="studentDetailHeader">
        <div>
          <p class="dashboardEyebrow">Ficha de materia</p>
          <h3>${escapeHTML(subject.name || "Materia sin nombre")}</h3>
          <p>
            Consulta rápida del espacio curricular y su asignación docente.
          </p>
        </div>

        <div class="studentDetailActions">
          <button type="button" data-subject-detail-action="edit">Editar materia</button>
          <button type="button" data-subject-detail-action="close" class="secondaryBtn">Cerrar</button>
        </div>
      </div>

      <div class="studentDetailGrid">
        <article class="studentDetailCard">
          <h4>Datos de la materia</h4>

          <dl>
            <div>
              <dt>Nombre</dt>
              <dd>${escapeHTML(subject.name || "-")}</dd>
            </div>

            <div>
              <dt>Código</dt>
              <dd>${escapeHTML(subject.code || "-")}</dd>
            </div>

            <div>
              <dt>Año / Nivel</dt>
              <dd>${escapeHTML(subject.year_level || "-")}</dd>
            </div>

            <div>
              <dt>Carga horaria</dt>
              <dd>${escapeHTML(formatWorkload(subject.workload_hours))}</dd>
            </div>
          </dl>
        </article>

        <article class="studentDetailCard">
          <h4>Docente asignado</h4>

          <dl>
            <div>
              <dt>Docente titular</dt>
              <dd>${escapeHTML(getTeacherFullName(teacher) || "Sin asignar")}</dd>
            </div>

            <div>
              <dt>Email</dt>
              <dd>${escapeHTML(teacher?.email || "-")}</dd>
            </div>

            <div>
              <dt>Área</dt>
              <dd>${escapeHTML(teacher?.subject_area || "-")}</dd>
            </div>
          </dl>
        </article>

        <article class="studentDetailCard">
          <h4>Estado</h4>

          <dl>
            <div>
              <dt>Estado</dt>
              <dd>
                <strong class="statusPill statusPill--${escapeHTML(status)}">
                  ${escapeHTML(formatSubjectStatus(status))}
                </strong>
              </dd>
            </div>

            <div>
              <dt>Fecha de alta</dt>
              <dd>${escapeHTML(formatDateTime(subject.created_at))}</dd>
            </div>

            <div>
              <dt>Última modificación</dt>
              <dd>${escapeHTML(formatDateTime(subject.updated_at))}</dd>
            </div>
          </dl>
        </article>
      </div>

      <article class="studentDetailCard studentDetailNotes">
        <h4>Observaciones</h4>
        <p>${formatMultilineText(subject.notes)}</p>
      </article>
    `;

    panel.dataset.currentSubjectId = subject.id;

    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleSubjectDetailClick(event) {
    const button = event.target.closest("[data-subject-detail-action]");

    if (!button) return;

    const action = button.dataset.subjectDetailAction;
    const panel = document.getElementById("subjectDetailPanel");
    const subjectId = panel?.dataset?.currentSubjectId;

    if (action === "close") {
      if (panel) {
        panel.hidden = true;
        panel.innerHTML = "";
        delete panel.dataset.currentSubjectId;
      }

      return;
    }

    if (action === "edit") {
      const subject = subjectsCache.find((item) => item.id === subjectId);

      if (!subject) {
        alert("No se encontró la materia seleccionada.");
        return;
      }

      startEditSubject(subject);
    }
  }

  async function archiveSubject(subject) {
    const confirmed = confirm(
      `¿Querés marcar como baja la materia "${subject.name || "sin nombre"}"?`
    );

    if (!confirmed) return;

    try {
      await App.subjectsService.updateSubjectStatus(subject.id, "baja");

      if (editingSubjectId === subject.id) {
        resetSubjectForm();
      }

      await loadInitialData();
    } catch (error) {
      console.error(error);
      alert(getFriendlyErrorMessage(error));
    }
  }

  async function reactivateSubject(subject) {
    const confirmed = confirm(
      `¿Querés reactivar la materia "${subject.name || "sin nombre"}"?`
    );

    if (!confirmed) return;

    try {
      await App.subjectsService.updateSubjectStatus(subject.id, "activo");

      if (editingSubjectId === subject.id) {
        resetSubjectForm();
      }

      await loadInitialData();
    } catch (error) {
      console.error(error);
      alert(getFriendlyErrorMessage(error));
    }
  }

  async function deleteSubject(subject) {
    const confirmed = confirm(
      `Esto va a borrar definitivamente la materia "${subject.name || "sin nombre"}".\n\n¿Querés continuar?`
    );

    if (!confirmed) return;

    try {
      await App.subjectsService.deleteSubject(subject.id);

      if (editingSubjectId === subject.id) {
        resetSubjectForm();
      }

      await loadInitialData();
    } catch (error) {
      console.error(error);
      alert(getFriendlyErrorMessage(error));
    }
  }

  function getTeacherById(teacherId) {
    if (!teacherId) return null;

    return teachersCache.find((teacher) => teacher.id === teacherId) || null;
  }

  function getTeacherFullName(teacher) {
    if (!teacher) return "";

    const firstName = teacher.first_name || "";
    const lastName = teacher.last_name || "";

    return `${lastName}, ${firstName}`.replace(/^,\s*/, "").trim();
  }

  function formatWorkload(value) {
    if (value === null || value === undefined || value === "") {
      return "-";
    }

    return `${value} hs.`;
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

  function formatSubjectStatus(value) {
    const labels = {
      activo: "Activo",
      pausado: "Pausado",
      baja: "Baja"
    };

    return labels[value] || value || "-";
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
      return "No se pudo guardar: ya existe una materia con ese código.";
    }

    if (message.toLowerCase().includes("permission denied")) {
      return "No tenés permisos suficientes para realizar esta acción.";
    }

    return `No se pudo completar la operación: ${message}`;
  }

  App.subjectsUI = {
    renderSubjectsModule,
    loadInitialData
  };
})();