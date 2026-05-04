// courses-ui.js
(() => {
  "use strict";

  const App = window.App = window.App || {};

  let coursesCache = [];
  let subjectsCache = [];
  let teachersCache = [];
  let editingCourseId = null;

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

  function renderCoursesModule() {
    const workspace = getWorkspace();

    if (!workspace) return;

    editingCourseId = null;

    workspace.innerHTML = `
      <div class="moduleHeader">
        <div>
          <p class="dashboardEyebrow">Módulo académico</p>
          <h2>Cursadas / Comisiones</h2>
          <p>
            Organización de materias por ciclo lectivo, comisión, docente, modalidad y horario.
          </p>
        </div>
      </div>

      <form id="courseForm" class="studentForm">
        <div class="studentFormTop">
          <div>
            <h3 id="courseFormTitle">Nueva cursada</h3>
            <p id="courseFormSubtitle">
              Cargá la comisión o cursada de una materia.
            </p>
          </div>
        </div>

        <div class="formGrid">
          <label>
            Materia *
            <select name="subject_id" id="courseSubjectSelect" required>
              <option value="">Seleccionar materia</option>
            </select>
          </label>

          <label>
            Ciclo lectivo *
            <input
              type="text"
              name="academic_year"
              required
              placeholder="Ej: 2026"
            />
          </label>

          <label>
            Período
            <select name="term">
              <option value="">Sin especificar</option>
              <option value="anual">Anual</option>
              <option value="primer_cuatrimestre">1º cuatrimestre</option>
              <option value="segundo_cuatrimestre">2º cuatrimestre</option>
              <option value="intensivo">Intensivo</option>
              <option value="otro">Otro</option>
            </select>
          </label>

          <label>
            Comisión
            <input
              type="text"
              name="commission_name"
              placeholder="Ej: A, B, Noche, Sábado"
            />
          </label>

          <label>
            Docente
            <select name="teacher_id" id="courseTeacherSelect">
              <option value="">Sin docente asignado</option>
            </select>
          </label>

          <label>
            Modalidad
            <select name="modality">
              <option value="presencial">Presencial</option>
              <option value="virtual">Virtual</option>
              <option value="hibrida">Híbrida</option>
            </select>
          </label>

          <label>
            Turno
            <select name="shift">
              <option value="">Sin especificar</option>
              <option value="manana">Mañana</option>
              <option value="tarde">Tarde</option>
              <option value="noche">Noche</option>
              <option value="otro">Otro</option>
            </select>
          </label>

          <label>
            Día
            <select name="weekday">
              <option value="">Sin especificar</option>
              <option value="lunes">Lunes</option>
              <option value="martes">Martes</option>
              <option value="miercoles">Miércoles</option>
              <option value="jueves">Jueves</option>
              <option value="viernes">Viernes</option>
              <option value="sabado">Sábado</option>
              <option value="domingo">Domingo</option>
            </select>
          </label>

          <label>
            Hora de inicio
            <input type="time" name="start_time" />
          </label>

          <label>
            Hora de fin
            <input type="time" name="end_time" />
          </label>

          <label>
            Aula / Sede
            <input
              type="text"
              name="classroom"
              placeholder="Ej: Aula 1, Sede central, Zoom"
            />
          </label>

          <label>
            Estado
            <select name="status">
              <option value="activo">Activa</option>
              <option value="pausado">Pausada</option>
              <option value="finalizada">Finalizada</option>
              <option value="baja">Baja</option>
            </select>
          </label>
        </div>

        <label>
          Observaciones
          <textarea name="notes" rows="3"></textarea>
        </label>

        <div class="formActions">
          <button id="courseSubmitBtn" type="submit">Guardar cursada</button>
          <button id="cancelEditCourseBtn" type="button" class="secondaryBtn" hidden>
            Cancelar edición
          </button>
          <p id="courseFormStatus" class="formStatus"></p>
        </div>
      </form>

      <section id="courseDetailPanel" class="studentDetailPanel" hidden></section>

      <div class="studentsListHeader">
        <div>
          <h3>Listado de cursadas</h3>
          <p id="coursesCountText" class="studentsCountText"></p>
        </div>

        <div class="studentsListActions">
          <input
            id="coursesSearchInput"
            type="search"
            placeholder="Buscar por materia, comisión, docente o año"
            aria-label="Buscar cursadas"
          />

          <select id="coursesStatusFilter" aria-label="Filtrar por estado">
            <option value="">Todos los estados</option>
            <option value="activo">Activas</option>
            <option value="pausado">Pausadas</option>
            <option value="finalizada">Finalizadas</option>
            <option value="baja">Baja</option>
          </select>

          <button id="clearCoursesFiltersBtn" type="button" class="secondaryBtn">
            Limpiar
          </button>

          <button id="refreshCoursesBtn" type="button">Actualizar</button>
        </div>
      </div>

      <div id="coursesList" class="studentsList">
        <p class="adminWorkspaceEmpty">Cargando cursadas...</p>
      </div>
    `;

    bindCourseForm();
    loadInitialData();
  }

  function bindCourseForm() {
    const form = document.getElementById("courseForm");
    const refreshBtn = document.getElementById("refreshCoursesBtn");
    const searchInput = document.getElementById("coursesSearchInput");
    const statusFilter = document.getElementById("coursesStatusFilter");
    const clearFiltersBtn = document.getElementById("clearCoursesFiltersBtn");
    const cancelEditBtn = document.getElementById("cancelEditCourseBtn");
    const list = document.getElementById("coursesList");
    const detailPanel = document.getElementById("courseDetailPanel");

    if (form) {
      form.addEventListener("submit", handleSubmitCourse);
    }

    if (refreshBtn) {
      refreshBtn.addEventListener("click", loadInitialData);
    }

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        renderCoursesList(getFilteredCourses());
      });
    }

    if (statusFilter) {
      statusFilter.addEventListener("change", () => {
        renderCoursesList(getFilteredCourses());
      });
    }

    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener("click", clearCourseFilters);
    }

    if (cancelEditBtn) {
      cancelEditBtn.addEventListener("click", resetCourseForm);
    }

    if (list) {
      list.addEventListener("click", handleCoursesListClick);
    }

    if (detailPanel) {
      detailPanel.addEventListener("click", handleCourseDetailClick);
    }
  }

  async function loadInitialData() {
    const list = document.getElementById("coursesList");

    if (!list) return;

    try {
      list.innerHTML = `<p class="adminWorkspaceEmpty">Cargando cursadas...</p>`;

      const [courses, subjects, teachers] = await Promise.all([
        App.coursesService.listCourses(),
        loadSubjectsForCourses(),
        loadTeachersForCourses()
      ]);

      coursesCache = courses;
      subjectsCache = subjects;
      teachersCache = teachers;

      renderSubjectSelectOptions();
      renderTeacherSelectOptions();
      renderCoursesList(getFilteredCourses());
    } catch (error) {
      console.error(error);

      list.innerHTML = `
        <p class="adminWorkspaceEmpty errorText">
          No se pudieron cargar las cursadas: ${escapeHTML(error.message)}
        </p>
      `;
    }
  }

  async function loadSubjectsForCourses() {
    if (!App.subjectsService) {
      console.warn("App.subjectsService no está disponible.");
      return [];
    }

    return App.subjectsService.listSubjects();
  }

  async function loadTeachersForCourses() {
    if (!App.teachersService) {
      console.warn("App.teachersService no está disponible.");
      return [];
    }

    return App.teachersService.listTeachers();
  }

  function renderSubjectSelectOptions() {
    const select = document.getElementById("courseSubjectSelect");

    if (!select) return;

    const currentValue = select.value;

    const activeSubjects = subjectsCache.filter((subject) => {
      return (subject.status || "activo") !== "baja";
    });

    select.innerHTML = `
      <option value="">Seleccionar materia</option>
      ${activeSubjects.map((subject) => `
        <option value="${escapeHTML(subject.id)}">
          ${escapeHTML(subject.name || "Materia sin nombre")}
        </option>
      `).join("")}
    `;

    if (currentValue) {
      select.value = currentValue;
    }
  }

  function renderTeacherSelectOptions() {
    const select = document.getElementById("courseTeacherSelect");

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

  function readCourseForm() {
    const form = document.getElementById("courseForm");

    if (!form) return null;

    const formData = new FormData(form);

    return {
      subject_id: normalizeText(formData.get("subject_id")),
      teacher_id: normalizeText(formData.get("teacher_id")),
      academic_year: normalizeText(formData.get("academic_year")),
      term: normalizeText(formData.get("term")),
      commission_name: normalizeText(formData.get("commission_name")),
      modality: normalizeText(formData.get("modality")) || "presencial",
      shift: normalizeText(formData.get("shift")),
      weekday: normalizeText(formData.get("weekday")),
      start_time: normalizeText(formData.get("start_time")),
      end_time: normalizeText(formData.get("end_time")),
      classroom: normalizeText(formData.get("classroom")),
      status: normalizeText(formData.get("status")) || "activo",
      notes: normalizeText(formData.get("notes"))
    };
  }

  async function handleSubmitCourse(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const status = document.getElementById("courseFormStatus");
    const submitBtn = document.getElementById("courseSubmitBtn");
    const course = readCourseForm();

    if (!course) return;

    if (!course.subject_id) {
      setStatus(status, "La materia es obligatoria.", true);
      return;
    }

    if (!course.academic_year) {
      setStatus(status, "El ciclo lectivo es obligatorio.", true);
      return;
    }

    try {
      setStatus(status, editingCourseId ? "Actualizando..." : "Guardando...");

      if (submitBtn) {
        submitBtn.disabled = true;
      }

      if (editingCourseId) {
        await App.coursesService.updateCourse(editingCourseId, course);
        setStatus(status, "Cursada actualizada correctamente.");
      } else {
        await App.coursesService.createCourse(course);
        setStatus(status, "Cursada guardada correctamente.");
      }

      form.reset();
      resetCourseFormMode();

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

  function getFilteredCourses() {
    const searchInput = document.getElementById("coursesSearchInput");
    const statusFilter = document.getElementById("coursesStatusFilter");

    const term = normalizeText(searchInput?.value).toLowerCase();
    const selectedStatus = normalizeText(statusFilter?.value);

    return coursesCache.filter((course) => {
      const courseStatus = normalizeText(course.status || "activo");

      if (selectedStatus && courseStatus !== selectedStatus) {
        return false;
      }

      if (!term) {
        return true;
      }

      const subject = getSubjectById(course.subject_id);
      const teacher = getTeacherById(course.teacher_id);

      const searchable = [
        subject?.name,
        subject?.code,
        course.academic_year,
        course.term,
        course.commission_name,
        course.modality,
        course.shift,
        course.weekday,
        course.start_time,
        course.end_time,
        course.classroom,
        getTeacherFullName(teacher),
        course.status,
        course.notes
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      return searchable.includes(term);
    });
  }

  function clearCourseFilters() {
    const searchInput = document.getElementById("coursesSearchInput");
    const statusFilter = document.getElementById("coursesStatusFilter");

    if (searchInput) {
      searchInput.value = "";
    }

    if (statusFilter) {
      statusFilter.value = "";
    }

    renderCoursesList(getFilteredCourses());
  }

  function renderCoursesList(courses) {
    const list = document.getElementById("coursesList");
    const countText = document.getElementById("coursesCountText");

    if (!list) return;

    if (countText) {
      const total = coursesCache.length;
      const visible = courses.length;

      countText.textContent =
        total === visible
          ? `${total} cursada${total === 1 ? "" : "s"} cargada${total === 1 ? "" : "s"}.`
          : `${visible} resultado${visible === 1 ? "" : "s"} de ${total} cursada${total === 1 ? "" : "s"}.`;
    }

    if (!courses.length) {
      list.innerHTML = `
        <p class="adminWorkspaceEmpty">
          No hay cursadas para mostrar.
        </p>
      `;
      return;
    }

    list.innerHTML = `
      <div class="studentsTable">
        <div class="studentsTableRow studentsTableHead">
          <span>Materia</span>
          <span>Ciclo / Comisión</span>
          <span>Día y horario</span>
          <span>Docente</span>
          <span>Estado</span>
          <span>Acciones</span>
        </div>

        ${courses.map(renderCourseRow).join("")}
      </div>
    `;
  }

  function renderCourseRow(course) {
    const subject = getSubjectById(course.subject_id);
    const teacher = getTeacherById(course.teacher_id);
    const isEditing = editingCourseId === course.id;
    const status = course.status || "activo";
    const isInactive = status === "baja";

    return `
      <div class="studentsTableRow ${isEditing ? "isEditing" : ""}" data-course-id="${escapeHTML(course.id)}">
        <span>${escapeHTML(subject?.name || "Materia no encontrada")}</span>
        <span>${escapeHTML(formatCourseCycle(course))}</span>
        <span>${escapeHTML(formatCourseSchedule(course))}</span>
        <span>${escapeHTML(getTeacherFullName(teacher) || "Sin asignar")}</span>
        <span>
          <strong class="statusPill statusPill--${escapeHTML(status)}">
            ${escapeHTML(formatCourseStatus(status))}
          </strong>
        </span>
        <span class="studentsRowActions">
          <button type="button" data-course-action="details">Ficha</button>
          <button type="button" data-course-action="edit">Editar</button>

          ${
            isInactive
              ? `<button type="button" data-course-action="reactivate">Reactivar</button>`
              : `<button type="button" data-course-action="archive">Baja</button>`
          }

          <button type="button" data-course-action="delete" class="dangerBtn">Borrar</button>
        </span>
      </div>
    `;
  }

  async function handleCoursesListClick(event) {
    const button = event.target.closest("[data-course-action]");

    if (!button) return;

    const row = button.closest("[data-course-id]");
    const courseId = row?.dataset.courseId;
    const action = button.dataset.courseAction;

    if (!courseId || !action) return;

    const course = coursesCache.find((item) => item.id === courseId);

    if (!course) {
      alert("No se encontró la cursada seleccionada.");
      return;
    }

    if (action === "details") {
      renderCourseDetail(course);
      return;
    }

    if (action === "edit") {
      startEditCourse(course);
      return;
    }

    if (action === "archive") {
      await archiveCourse(course);
      return;
    }

    if (action === "reactivate") {
      await reactivateCourse(course);
      return;
    }

    if (action === "delete") {
      await deleteCourse(course);
    }
  }

  function startEditCourse(course) {
    const form = document.getElementById("courseForm");
    const title = document.getElementById("courseFormTitle");
    const subtitle = document.getElementById("courseFormSubtitle");
    const submitBtn = document.getElementById("courseSubmitBtn");
    const cancelBtn = document.getElementById("cancelEditCourseBtn");
    const status = document.getElementById("courseFormStatus");

    if (!form) return;

    editingCourseId = course.id;

    form.elements.subject_id.value = course.subject_id || "";
    form.elements.teacher_id.value = course.teacher_id || "";
    form.elements.academic_year.value = course.academic_year || "";
    form.elements.term.value = course.term || "";
    form.elements.commission_name.value = course.commission_name || "";
    form.elements.modality.value = course.modality || "presencial";
    form.elements.shift.value = course.shift || "";
    form.elements.weekday.value = course.weekday || "";
    form.elements.start_time.value = course.start_time || "";
    form.elements.end_time.value = course.end_time || "";
    form.elements.classroom.value = course.classroom || "";
    form.elements.status.value = course.status || "activo";
    form.elements.notes.value = course.notes || "";

    if (title) {
      title.textContent = "Editar cursada";
    }

    if (subtitle) {
      subtitle.textContent = `Editando ${formatCourseTitle(course)}.`;
    }

    if (submitBtn) {
      submitBtn.textContent = "Guardar cambios";
    }

    if (cancelBtn) {
      cancelBtn.hidden = false;
    }

    setStatus(status, "");

    renderCoursesList(getFilteredCourses());

    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetCourseForm() {
    const form = document.getElementById("courseForm");
    const status = document.getElementById("courseFormStatus");

    if (form) {
      form.reset();
    }

    resetCourseFormMode();
    setStatus(status, "");
    renderCoursesList(getFilteredCourses());
  }

  function resetCourseFormMode() {
    const title = document.getElementById("courseFormTitle");
    const subtitle = document.getElementById("courseFormSubtitle");
    const submitBtn = document.getElementById("courseSubmitBtn");
    const cancelBtn = document.getElementById("cancelEditCourseBtn");

    editingCourseId = null;

    if (title) {
      title.textContent = "Nueva cursada";
    }

    if (subtitle) {
      subtitle.textContent = "Cargá la comisión o cursada de una materia.";
    }

    if (submitBtn) {
      submitBtn.textContent = "Guardar cursada";
    }

    if (cancelBtn) {
      cancelBtn.hidden = true;
    }
  }

  function renderCourseDetail(course) {
    const panel = document.getElementById("courseDetailPanel");

    if (!panel) return;

    const subject = getSubjectById(course.subject_id);
    const teacher = getTeacherById(course.teacher_id);
    const status = course.status || "activo";

    panel.hidden = false;

    panel.innerHTML = `
      <div class="studentDetailHeader">
        <div>
          <p class="dashboardEyebrow">Ficha de cursada</p>
          <h3>${escapeHTML(formatCourseTitle(course))}</h3>
          <p>
            Consulta rápida de la comisión, horario y asignación docente.
          </p>
        </div>

        <div class="studentDetailActions">
          <button type="button" data-course-detail-action="edit">Editar cursada</button>
          <button type="button" data-course-detail-action="close" class="secondaryBtn">Cerrar</button>
        </div>
      </div>

      <div class="studentDetailGrid">
        <article class="studentDetailCard">
          <h4>Materia</h4>

          <dl>
            <div>
              <dt>Materia</dt>
              <dd>${escapeHTML(subject?.name || "Materia no encontrada")}</dd>
            </div>

            <div>
              <dt>Código</dt>
              <dd>${escapeHTML(subject?.code || "-")}</dd>
            </div>

            <div>
              <dt>Año / Nivel</dt>
              <dd>${escapeHTML(subject?.year_level || "-")}</dd>
            </div>
          </dl>
        </article>

        <article class="studentDetailCard">
          <h4>Cursada</h4>

          <dl>
            <div>
              <dt>Ciclo lectivo</dt>
              <dd>${escapeHTML(course.academic_year || "-")}</dd>
            </div>

            <div>
              <dt>Período</dt>
              <dd>${escapeHTML(formatTerm(course.term))}</dd>
            </div>

            <div>
              <dt>Comisión</dt>
              <dd>${escapeHTML(course.commission_name || "-")}</dd>
            </div>

            <div>
              <dt>Modalidad</dt>
              <dd>${escapeHTML(formatModality(course.modality))}</dd>
            </div>

            <div>
              <dt>Turno</dt>
              <dd>${escapeHTML(formatShift(course.shift))}</dd>
            </div>
          </dl>
        </article>

        <article class="studentDetailCard">
          <h4>Horario y sede</h4>

          <dl>
            <div>
              <dt>Día</dt>
              <dd>${escapeHTML(formatWeekday(course.weekday))}</dd>
            </div>

            <div>
              <dt>Horario</dt>
              <dd>${escapeHTML(formatTimeRange(course.start_time, course.end_time))}</dd>
            </div>

            <div>
              <dt>Aula / Sede</dt>
              <dd>${escapeHTML(course.classroom || "-")}</dd>
            </div>
          </dl>
        </article>

        <article class="studentDetailCard">
          <h4>Docente y estado</h4>

          <dl>
            <div>
              <dt>Docente</dt>
              <dd>${escapeHTML(getTeacherFullName(teacher) || "Sin asignar")}</dd>
            </div>

            <div>
              <dt>Email</dt>
              <dd>${escapeHTML(teacher?.email || "-")}</dd>
            </div>

            <div>
              <dt>Estado</dt>
              <dd>
                <strong class="statusPill statusPill--${escapeHTML(status)}">
                  ${escapeHTML(formatCourseStatus(status))}
                </strong>
              </dd>
            </div>

            <div>
              <dt>Última modificación</dt>
              <dd>${escapeHTML(formatDateTime(course.updated_at))}</dd>
            </div>
          </dl>
        </article>
      </div>

      <article class="studentDetailCard studentDetailNotes">
        <h4>Observaciones</h4>
        <p>${formatMultilineText(course.notes)}</p>
      </article>
    `;

    panel.dataset.currentCourseId = course.id;

    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleCourseDetailClick(event) {
    const button = event.target.closest("[data-course-detail-action]");

    if (!button) return;

    const action = button.dataset.courseDetailAction;
    const panel = document.getElementById("courseDetailPanel");
    const courseId = panel?.dataset?.currentCourseId;

    if (action === "close") {
      if (panel) {
        panel.hidden = true;
        panel.innerHTML = "";
        delete panel.dataset.currentCourseId;
      }

      return;
    }

    if (action === "edit") {
      const course = coursesCache.find((item) => item.id === courseId);

      if (!course) {
        alert("No se encontró la cursada seleccionada.");
        return;
      }

      startEditCourse(course);
    }
  }

  async function archiveCourse(course) {
    const confirmed = confirm(
      `¿Querés marcar como baja la cursada "${formatCourseTitle(course)}"?`
    );

    if (!confirmed) return;

    try {
      await App.coursesService.updateCourseStatus(course.id, "baja");

      if (editingCourseId === course.id) {
        resetCourseForm();
      }

      await loadInitialData();
    } catch (error) {
      console.error(error);
      alert(getFriendlyErrorMessage(error));
    }
  }

  async function reactivateCourse(course) {
    const confirmed = confirm(
      `¿Querés reactivar la cursada "${formatCourseTitle(course)}"?`
    );

    if (!confirmed) return;

    try {
      await App.coursesService.updateCourseStatus(course.id, "activo");

      if (editingCourseId === course.id) {
        resetCourseForm();
      }

      await loadInitialData();
    } catch (error) {
      console.error(error);
      alert(getFriendlyErrorMessage(error));
    }
  }

  async function deleteCourse(course) {
    const confirmed = confirm(
      `Esto va a borrar definitivamente la cursada "${formatCourseTitle(course)}".\n\n¿Querés continuar?`
    );

    if (!confirmed) return;

    try {
      await App.coursesService.deleteCourse(course.id);

      if (editingCourseId === course.id) {
        resetCourseForm();
      }

      await loadInitialData();
    } catch (error) {
      console.error(error);
      alert(getFriendlyErrorMessage(error));
    }
  }

  function getSubjectById(subjectId) {
    if (!subjectId) return null;

    return subjectsCache.find((subject) => subject.id === subjectId) || null;
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

  function formatCourseTitle(course) {
    const subject = getSubjectById(course.subject_id);
    const pieces = [
      subject?.name || "Materia no encontrada",
      course.academic_year,
      course.commission_name ? `Comisión ${course.commission_name}` : ""
    ].filter(Boolean);

    return pieces.join(" · ");
  }

  function formatCourseCycle(course) {
    const pieces = [
      course.academic_year,
      formatTerm(course.term),
      course.commission_name ? `Com. ${course.commission_name}` : ""
    ].filter((value) => value && value !== "-");

    return pieces.join(" · ") || "-";
  }

  function formatCourseSchedule(course) {
    const pieces = [
      formatWeekday(course.weekday),
      formatTimeRange(course.start_time, course.end_time)
    ].filter((value) => value && value !== "-");

    return pieces.join(" · ") || "-";
  }

  function formatTimeRange(startTime, endTime) {
    const start = formatTime(startTime);
    const end = formatTime(endTime);

    if (start && end) {
      return `${start} a ${end}`;
    }

    if (start) {
      return start;
    }

    return "-";
  }

  function formatTime(value) {
    if (!value) return "";

    return String(value).slice(0, 5);
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

  function formatCourseStatus(value) {
    const labels = {
      activo: "Activa",
      pausado: "Pausada",
      finalizada: "Finalizada",
      baja: "Baja"
    };

    return labels[value] || value || "-";
  }

  function formatTerm(value) {
    const labels = {
      anual: "Anual",
      primer_cuatrimestre: "1º cuatrimestre",
      segundo_cuatrimestre: "2º cuatrimestre",
      intensivo: "Intensivo",
      otro: "Otro"
    };

    return labels[value] || "-";
  }

  function formatModality(value) {
    const labels = {
      presencial: "Presencial",
      virtual: "Virtual",
      hibrida: "Híbrida"
    };

    return labels[value] || "-";
  }

  function formatShift(value) {
    const labels = {
      manana: "Mañana",
      tarde: "Tarde",
      noche: "Noche",
      otro: "Otro"
    };

    return labels[value] || "-";
  }

  function formatWeekday(value) {
    const labels = {
      lunes: "Lunes",
      martes: "Martes",
      miercoles: "Miércoles",
      jueves: "Jueves",
      viernes: "Viernes",
      sabado: "Sábado",
      domingo: "Domingo"
    };

    return labels[value] || "-";
  }

  function setStatus(element, message, isError = false) {
    if (!element) return;

    element.textContent = message;
    element.classList.toggle("isError", isError);
  }

  function getFriendlyErrorMessage(error) {
    const message = String(error?.message || "Ocurrió un error inesperado.");

    if (message.toLowerCase().includes("permission denied")) {
      return "No tenés permisos suficientes para realizar esta acción.";
    }

    return `No se pudo completar la operación: ${message}`;
  }

  App.coursesUI = {
    renderCoursesModule,
    loadInitialData
  };
})();