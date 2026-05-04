// teachers-ui.js
(() => {
  "use strict";

  const App = window.App = window.App || {};

  let teachersCache = [];
  let editingTeacherId = null;

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

  function renderTeachersModule() {
    const workspace = getWorkspace();

    if (!workspace) return;

    editingTeacherId = null;

    workspace.innerHTML = `
      <div class="moduleHeader">
        <div>
          <p class="dashboardEyebrow">Módulo académico</p>
          <h2>Docentes</h2>
          <p>
            Alta, consulta y edición de docentes registrados en la plataforma.
          </p>
        </div>
      </div>

      <form id="teacherForm" class="studentForm">
        <div class="studentFormTop">
          <div>
            <h3 id="teacherFormTitle">Nuevo docente</h3>
            <p id="teacherFormSubtitle">
              Cargá los datos básicos del docente.
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
            Área / Materia
            <input
              type="text"
              name="subject_area"
              placeholder="Ej: Psicología Social, Grupos, Práctica"
            />
          </label>

          <label>
            Cargo / Función
            <input
              type="text"
              name="role_title"
              placeholder="Ej: Docente titular, ayudante, coordinación"
            />
          </label>

          <label>
            Estado
            <select name="status">
              <option value="activo">Activo</option>
              <option value="licencia">Licencia</option>
              <option value="baja">Baja</option>
            </select>
          </label>
        </div>

        <label>
          Observaciones
          <textarea name="notes" rows="3"></textarea>
        </label>

        <div class="formActions">
          <button id="teacherSubmitBtn" type="submit">Guardar docente</button>
          <button id="cancelEditTeacherBtn" type="button" class="secondaryBtn" hidden>
            Cancelar edición
          </button>
          <p id="teacherFormStatus" class="formStatus"></p>
        </div>
      </form>

      <section id="teacherDetailPanel" class="studentDetailPanel" hidden></section>

      <div class="studentsListHeader">
        <div>
          <h3>Listado de docentes</h3>
          <p id="teachersCountText" class="studentsCountText"></p>
        </div>

        <div class="studentsListActions">
          <input
            id="teachersSearchInput"
            type="search"
            placeholder="Buscar por nombre, apellido, DNI, email o área"
            aria-label="Buscar docentes"
          />

          <select id="teachersStatusFilter" aria-label="Filtrar por estado">
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="licencia">Licencia</option>
            <option value="baja">Baja</option>
          </select>

          <button id="clearTeachersFiltersBtn" type="button" class="secondaryBtn">
            Limpiar
          </button>

          <button id="refreshTeachersBtn" type="button">Actualizar</button>
        </div>
      </div>

      <div id="teachersList" class="studentsList">
        <p class="adminWorkspaceEmpty">Cargando docentes...</p>
      </div>
    `;

    bindTeacherForm();
    loadTeachers();
  }

  function bindTeacherForm() {
    const form = document.getElementById("teacherForm");
    const refreshBtn = document.getElementById("refreshTeachersBtn");
    const searchInput = document.getElementById("teachersSearchInput");
    const statusFilter = document.getElementById("teachersStatusFilter");
    const clearFiltersBtn = document.getElementById("clearTeachersFiltersBtn");
    const cancelEditBtn = document.getElementById("cancelEditTeacherBtn");
    const list = document.getElementById("teachersList");
    const detailPanel = document.getElementById("teacherDetailPanel");

    if (form) {
      form.addEventListener("submit", handleSubmitTeacher);
    }

    if (refreshBtn) {
      refreshBtn.addEventListener("click", loadTeachers);
    }

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        renderTeachersList(getFilteredTeachers());
      });
    }

    if (statusFilter) {
      statusFilter.addEventListener("change", () => {
        renderTeachersList(getFilteredTeachers());
      });
    }

    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener("click", clearTeacherFilters);
    }

    if (cancelEditBtn) {
      cancelEditBtn.addEventListener("click", resetTeacherForm);
    }

    if (list) {
      list.addEventListener("click", handleTeachersListClick);
    }

    if (detailPanel) {
      detailPanel.addEventListener("click", handleTeacherDetailClick);
    }
  }

  function readTeacherForm() {
    const form = document.getElementById("teacherForm");

    if (!form) return null;

    const formData = new FormData(form);

    return {
      first_name: normalizeText(formData.get("first_name")),
      last_name: normalizeText(formData.get("last_name")),
      dni: normalizeText(formData.get("dni")),
      email: normalizeText(formData.get("email")),
      phone: normalizeText(formData.get("phone")),
      subject_area: normalizeText(formData.get("subject_area")),
      role_title: normalizeText(formData.get("role_title")),
      status: normalizeText(formData.get("status")) || "activo",
      notes: normalizeText(formData.get("notes"))
    };
  }

  async function handleSubmitTeacher(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const status = document.getElementById("teacherFormStatus");
    const submitBtn = document.getElementById("teacherSubmitBtn");
    const teacher = readTeacherForm();

    if (!teacher) return;

    if (!teacher.first_name || !teacher.last_name) {
      setStatus(status, "Nombre y apellido son obligatorios.", true);
      return;
    }

    try {
      setStatus(status, editingTeacherId ? "Actualizando..." : "Guardando...");

      if (submitBtn) {
        submitBtn.disabled = true;
      }

      if (editingTeacherId) {
        await App.teachersService.updateTeacher(editingTeacherId, teacher);
        setStatus(status, "Docente actualizado correctamente.");
      } else {
        await App.teachersService.createTeacher(teacher);
        setStatus(status, "Docente guardado correctamente.");
      }

      form.reset();
      resetTeacherFormMode();

      await loadTeachers();
    } catch (error) {
      console.error(error);
      setStatus(status, getFriendlyErrorMessage(error), true);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
      }
    }
  }

  async function loadTeachers() {
    const list = document.getElementById("teachersList");

    if (!list) return;

    try {
      list.innerHTML = `<p class="adminWorkspaceEmpty">Cargando docentes...</p>`;

      teachersCache = await App.teachersService.listTeachers();

      renderTeachersList(getFilteredTeachers());
    } catch (error) {
      console.error(error);

      list.innerHTML = `
        <p class="adminWorkspaceEmpty errorText">
          No se pudieron cargar los docentes: ${escapeHTML(error.message)}
        </p>
      `;
    }
  }

  function getFilteredTeachers() {
    const searchInput = document.getElementById("teachersSearchInput");
    const statusFilter = document.getElementById("teachersStatusFilter");

    const term = normalizeText(searchInput?.value).toLowerCase();
    const selectedStatus = normalizeText(statusFilter?.value);

    return teachersCache.filter((teacher) => {
      const teacherStatus = normalizeText(teacher.status || "activo");

      if (selectedStatus && teacherStatus !== selectedStatus) {
        return false;
      }

      if (!term) {
        return true;
      }

      const searchable = [
        teacher.first_name,
        teacher.last_name,
        teacher.dni,
        teacher.email,
        teacher.phone,
        teacher.subject_area,
        teacher.role_title,
        teacher.status
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      return searchable.includes(term);
    });
  }

  function clearTeacherFilters() {
    const searchInput = document.getElementById("teachersSearchInput");
    const statusFilter = document.getElementById("teachersStatusFilter");

    if (searchInput) {
      searchInput.value = "";
    }

    if (statusFilter) {
      statusFilter.value = "";
    }

    renderTeachersList(getFilteredTeachers());
  }

  function renderTeachersList(teachers) {
    const list = document.getElementById("teachersList");
    const countText = document.getElementById("teachersCountText");

    if (!list) return;

    if (countText) {
      const total = teachersCache.length;
      const visible = teachers.length;

      countText.textContent =
        total === visible
          ? `${total} docente${total === 1 ? "" : "s"} cargado${total === 1 ? "" : "s"}.`
          : `${visible} resultado${visible === 1 ? "" : "s"} de ${total} docente${total === 1 ? "" : "s"}.`;
    }

    if (!teachers.length) {
      list.innerHTML = `
        <p class="adminWorkspaceEmpty">
          No hay docentes para mostrar.
        </p>
      `;
      return;
    }

    list.innerHTML = `
      <div class="studentsTable">
        <div class="studentsTableRow studentsTableHead">
          <span>Apellido y nombre</span>
          <span>DNI</span>
          <span>Área</span>
          <span>Email</span>
          <span>Estado</span>
          <span>Acciones</span>
        </div>

        ${teachers.map(renderTeacherRow).join("")}
      </div>
    `;
  }

  function renderTeacherRow(teacher) {
    const fullName = `${teacher.last_name || ""}, ${teacher.first_name || ""}`;
    const isEditing = editingTeacherId === teacher.id;
    const status = teacher.status || "activo";
    const isInactive = status === "baja";

    return `
      <div class="studentsTableRow ${isEditing ? "isEditing" : ""}" data-teacher-id="${escapeHTML(teacher.id)}">
        <span>${escapeHTML(fullName)}</span>
        <span>${escapeHTML(teacher.dni || "-")}</span>
        <span>${escapeHTML(teacher.subject_area || "-")}</span>
        <span>${escapeHTML(teacher.email || "-")}</span>
        <span>
          <strong class="statusPill statusPill--${escapeHTML(status)}">
            ${escapeHTML(formatTeacherStatus(status))}
          </strong>
        </span>
        <span class="studentsRowActions">
          <button type="button" data-teacher-action="details">Ficha</button>
          <button type="button" data-teacher-action="edit">Editar</button>

          ${
            isInactive
              ? `<button type="button" data-teacher-action="reactivate">Reactivar</button>`
              : `<button type="button" data-teacher-action="archive">Baja</button>`
          }

          <button type="button" data-teacher-action="delete" class="dangerBtn">Borrar</button>
        </span>
      </div>
    `;
  }

  async function handleTeachersListClick(event) {
    const button = event.target.closest("[data-teacher-action]");

    if (!button) return;

    const row = button.closest("[data-teacher-id]");
    const teacherId = row?.dataset.teacherId;
    const action = button.dataset.teacherAction;

    if (!teacherId || !action) return;

    const teacher = teachersCache.find((item) => item.id === teacherId);

    if (!teacher) {
      alert("No se encontró el docente seleccionado.");
      return;
    }

    if (action === "details") {
      renderTeacherDetail(teacher);
      return;
    }

    if (action === "edit") {
      startEditTeacher(teacher);
      return;
    }

    if (action === "archive") {
      await archiveTeacher(teacher);
      return;
    }

    if (action === "reactivate") {
      await reactivateTeacher(teacher);
      return;
    }

    if (action === "delete") {
      await deleteTeacher(teacher);
    }
  }

  function startEditTeacher(teacher) {
    const form = document.getElementById("teacherForm");
    const title = document.getElementById("teacherFormTitle");
    const subtitle = document.getElementById("teacherFormSubtitle");
    const submitBtn = document.getElementById("teacherSubmitBtn");
    const cancelBtn = document.getElementById("cancelEditTeacherBtn");
    const status = document.getElementById("teacherFormStatus");

    if (!form) return;

    editingTeacherId = teacher.id;

    form.elements.first_name.value = teacher.first_name || "";
    form.elements.last_name.value = teacher.last_name || "";
    form.elements.dni.value = teacher.dni || "";
    form.elements.email.value = teacher.email || "";
    form.elements.phone.value = teacher.phone || "";
    form.elements.subject_area.value = teacher.subject_area || "";
    form.elements.role_title.value = teacher.role_title || "";
    form.elements.status.value = teacher.status || "activo";
    form.elements.notes.value = teacher.notes || "";

    if (title) {
      title.textContent = "Editar docente";
    }

    if (subtitle) {
      subtitle.textContent = `Editando ficha de ${teacher.first_name || ""} ${teacher.last_name || ""}.`;
    }

    if (submitBtn) {
      submitBtn.textContent = "Guardar cambios";
    }

    if (cancelBtn) {
      cancelBtn.hidden = false;
    }

    setStatus(status, "");

    renderTeachersList(getFilteredTeachers());

    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetTeacherForm() {
    const form = document.getElementById("teacherForm");
    const status = document.getElementById("teacherFormStatus");

    if (form) {
      form.reset();
    }

    resetTeacherFormMode();
    setStatus(status, "");
    renderTeachersList(getFilteredTeachers());
  }

  function resetTeacherFormMode() {
    const title = document.getElementById("teacherFormTitle");
    const subtitle = document.getElementById("teacherFormSubtitle");
    const submitBtn = document.getElementById("teacherSubmitBtn");
    const cancelBtn = document.getElementById("cancelEditTeacherBtn");

    editingTeacherId = null;

    if (title) {
      title.textContent = "Nuevo docente";
    }

    if (subtitle) {
      subtitle.textContent = "Cargá los datos básicos del docente.";
    }

    if (submitBtn) {
      submitBtn.textContent = "Guardar docente";
    }

    if (cancelBtn) {
      cancelBtn.hidden = true;
    }
  }

  function renderTeacherDetail(teacher) {
    const panel = document.getElementById("teacherDetailPanel");

    if (!panel) return;

    const fullName = `${teacher.first_name || ""} ${teacher.last_name || ""}`.trim();
    const status = teacher.status || "activo";

    panel.hidden = false;

    panel.innerHTML = `
      <div class="studentDetailHeader">
        <div>
          <p class="dashboardEyebrow">Ficha docente</p>
          <h3>${escapeHTML(fullName || "Docente sin nombre")}</h3>
          <p>
            Consulta rápida de datos institucionales y observaciones internas.
          </p>
        </div>

        <div class="studentDetailActions">
          <button type="button" data-teacher-detail-action="print">Imprimir ficha</button>
          <button type="button" data-teacher-detail-action="edit">Editar ficha</button>
          <button type="button" data-teacher-detail-action="close" class="secondaryBtn">Cerrar</button>
        </div>
      </div>

      <div class="studentDetailGrid">
        <article class="studentDetailCard">
          <h4>Datos personales</h4>

          <dl>
            <div>
              <dt>Apellido</dt>
              <dd>${escapeHTML(teacher.last_name || "-")}</dd>
            </div>

            <div>
              <dt>Nombre</dt>
              <dd>${escapeHTML(teacher.first_name || "-")}</dd>
            </div>

            <div>
              <dt>DNI</dt>
              <dd>${escapeHTML(teacher.dni || "-")}</dd>
            </div>

            <div>
              <dt>Email</dt>
              <dd>${escapeHTML(teacher.email || "-")}</dd>
            </div>

            <div>
              <dt>Teléfono</dt>
              <dd>${escapeHTML(teacher.phone || "-")}</dd>
            </div>
          </dl>
        </article>

        <article class="studentDetailCard">
          <h4>Datos institucionales</h4>

          <dl>
            <div>
              <dt>Área / Materia</dt>
              <dd>${escapeHTML(teacher.subject_area || "-")}</dd>
            </div>

            <div>
              <dt>Cargo / Función</dt>
              <dd>${escapeHTML(teacher.role_title || "-")}</dd>
            </div>

            <div>
              <dt>Estado</dt>
              <dd>
                <strong class="statusPill statusPill--${escapeHTML(status)}">
                  ${escapeHTML(formatTeacherStatus(status))}
                </strong>
              </dd>
            </div>
          </dl>
        </article>

        <article class="studentDetailCard">
          <h4>Registro</h4>

          <dl>
            <div>
              <dt>Fecha de alta</dt>
              <dd>${escapeHTML(formatDateTime(teacher.created_at))}</dd>
            </div>

            <div>
              <dt>Última modificación</dt>
              <dd>${escapeHTML(formatDateTime(teacher.updated_at))}</dd>
            </div>
          </dl>
        </article>
      </div>

      <article class="studentDetailCard studentDetailNotes">
        <h4>Observaciones</h4>
        <p>${formatMultilineText(teacher.notes)}</p>
      </article>
    `;

    panel.dataset.currentTeacherId = teacher.id;

    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleTeacherDetailClick(event) {
    const button = event.target.closest("[data-teacher-detail-action]");

    if (!button) return;

    const action = button.dataset.teacherDetailAction;
    const panel = document.getElementById("teacherDetailPanel");
    const teacherId = panel?.dataset?.currentTeacherId;

    if (action === "close") {
      if (panel) {
        panel.hidden = true;
        panel.innerHTML = "";
        delete panel.dataset.currentTeacherId;
      }

      return;
    }

    if (action === "print") {
      printTeacherDetail();
      return;
    }

    if (action === "edit") {
      const teacher = teachersCache.find((item) => item.id === teacherId);

      if (!teacher) {
        alert("No se encontró el docente seleccionado.");
        return;
      }

      startEditTeacher(teacher);
    }
  }

  function printTeacherDetail() {
    const panel = document.getElementById("teacherDetailPanel");

    if (!panel || panel.hidden) {
      alert("Primero abrí la ficha de un docente.");
      return;
    }

    document.body.classList.add("isPrintingStudentDetail");
    window.print();
  }

  async function archiveTeacher(teacher) {
    const fullName = `${teacher.first_name || ""} ${teacher.last_name || ""}`.trim();

    const confirmed = confirm(
      `¿Querés marcar como baja a ${fullName || "este docente"}?`
    );

    if (!confirmed) return;

    try {
      await App.teachersService.updateTeacherStatus(teacher.id, "baja");

      if (editingTeacherId === teacher.id) {
        resetTeacherForm();
      }

      await loadTeachers();
    } catch (error) {
      console.error(error);
      alert(getFriendlyErrorMessage(error));
    }
  }

  async function reactivateTeacher(teacher) {
    const fullName = `${teacher.first_name || ""} ${teacher.last_name || ""}`.trim();

    const confirmed = confirm(
      `¿Querés reactivar a ${fullName || "este docente"}?`
    );

    if (!confirmed) return;

    try {
      await App.teachersService.updateTeacherStatus(teacher.id, "activo");

      if (editingTeacherId === teacher.id) {
        resetTeacherForm();
      }

      await loadTeachers();
    } catch (error) {
      console.error(error);
      alert(getFriendlyErrorMessage(error));
    }
  }

  async function deleteTeacher(teacher) {
    const fullName = `${teacher.first_name || ""} ${teacher.last_name || ""}`.trim();

    const confirmed = confirm(
      `Esto va a borrar definitivamente a ${fullName || "este docente"}.\n\n¿Querés continuar?`
    );

    if (!confirmed) return;

    try {
      await App.teachersService.deleteTeacher(teacher.id);

      if (editingTeacherId === teacher.id) {
        resetTeacherForm();
      }

      await loadTeachers();
    } catch (error) {
      console.error(error);
      alert(getFriendlyErrorMessage(error));
    }
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

  function formatTeacherStatus(value) {
    const labels = {
      activo: "Activo",
      licencia: "Licencia",
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
      return "No se pudo guardar: ya existe un docente con ese DNI.";
    }

    if (message.toLowerCase().includes("permission denied")) {
      return "No tenés permisos suficientes para realizar esta acción.";
    }

    return `No se pudo completar la operación: ${message}`;
  }

  window.addEventListener("afterprint", () => {
    document.body.classList.remove("isPrintingStudentDetail");
  });

  App.teachersUI = {
    renderTeachersModule,
    loadTeachers
  };
})();