// enrollments-ui.js
(() => {
  "use strict";

  const App = window.App = window.App || {};

    let enrollmentsCache = [];
    let studentsCache = [];
    let coursesCache = [];
    let subjectsCache = [];
    let teachersCache = [];
    let editingEnrollmentId = null;
    let enrollmentViewMode = "student";

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

  function renderEnrollmentsModule() {
    const workspace = getWorkspace();

    if (!workspace) return;

    editingEnrollmentId = null;

    workspace.innerHTML = `
      <div class="moduleHeader">
        <div>
          <p class="dashboardEyebrow">Módulo académico</p>
          <h2>Inscripciones</h2>
          <p>
            Vinculación de alumnos con cursadas y comisiones activas.
          </p>
        </div>
      </div>

      <form id="enrollmentForm" class="studentForm">
        <div class="studentFormTop">
          <div>
            <h3 id="enrollmentFormTitle">Nueva inscripción</h3>
            <p id="enrollmentFormSubtitle">
              Seleccioná un alumno y una cursada.
            </p>
          </div>
        </div>

        <div class="formGrid">
          <label>
            Alumno *
            <select name="student_id" id="enrollmentStudentSelect" required>
              <option value="">Seleccionar alumno</option>
            </select>
          </label>

          <label>
            Cursada / Comisión *
            <select name="course_id" id="enrollmentCourseSelect" required>
              <option value="">Seleccionar cursada</option>
            </select>
          </label>

          <label>
            Fecha de inscripción
            <input
              type="date"
              name="enrollment_date"
              id="enrollmentDateInput"
            />
          </label>

          <label>
            Estado
            <select name="status">
              <option value="inscripto">Inscripto</option>
              <option value="regular">Regular</option>
              <option value="libre">Libre</option>
              <option value="aprobado">Aprobado</option>
              <option value="baja">Baja</option>
            </select>
          </label>
        </div>

        <label>
          Observaciones
          <textarea name="notes" rows="3"></textarea>
        </label>

        <div class="formActions">
          <button id="enrollmentSubmitBtn" type="submit">Guardar inscripción</button>
          <button id="cancelEditEnrollmentBtn" type="button" class="secondaryBtn" hidden>
            Cancelar edición
          </button>
          <p id="enrollmentFormStatus" class="formStatus"></p>
        </div>
      </form>

      <section id="enrollmentDetailPanel" class="studentDetailPanel" hidden></section>

      <div class="studentsListHeader">
        <div>
          <h3>Listado de inscripciones</h3>
          <p id="enrollmentsCountText" class="studentsCountText"></p>
        </div>

        <div class="studentsListActions">
          <input
            id="enrollmentsSearchInput"
            type="search"
            placeholder="Buscar por alumno, materia, comisión o año"
            aria-label="Buscar inscripciones"
          />

          <select id="enrollmentsStatusFilter" aria-label="Filtrar por estado">
            <option value="">Todos los estados</option>
            <option value="inscripto">Inscripto</option>
            <option value="regular">Regular</option>
            <option value="libre">Libre</option>
            <option value="aprobado">Aprobado</option>
            <option value="baja">Baja</option>
            </select>

            <select id="enrollmentsViewMode" aria-label="Cambiar vista de inscripciones">
            <option value="student">Vista por alumno</option>
            <option value="course">Vista por cursada</option>
            </select>

            <button id="clearEnrollmentsFiltersBtn" type="button" class="secondaryBtn">
            Limpiar
            </button>

          <button id="refreshEnrollmentsBtn" type="button">Actualizar</button>
        </div>
      </div>

      <div id="enrollmentsList" class="studentsList">
        <p class="adminWorkspaceEmpty">Cargando inscripciones...</p>
      </div>
    `;

    setDefaultEnrollmentDate();
    bindEnrollmentForm();
    loadInitialData();
  }

  function setDefaultEnrollmentDate() {
    const input = document.getElementById("enrollmentDateInput");

    if (!input) return;

    input.value = new Date().toISOString().slice(0, 10);
  }

  function bindEnrollmentForm() {
    const form = document.getElementById("enrollmentForm");
    const refreshBtn = document.getElementById("refreshEnrollmentsBtn");
    const searchInput = document.getElementById("enrollmentsSearchInput");
    const statusFilter = document.getElementById("enrollmentsStatusFilter");
    const viewModeSelect = document.getElementById("enrollmentsViewMode");
    const clearFiltersBtn = document.getElementById("clearEnrollmentsFiltersBtn");
    const cancelEditBtn = document.getElementById("cancelEditEnrollmentBtn");
    const list = document.getElementById("enrollmentsList");
    const detailPanel = document.getElementById("enrollmentDetailPanel");

    if (form) {
      form.addEventListener("submit", handleSubmitEnrollment);
    }

    if (refreshBtn) {
      refreshBtn.addEventListener("click", loadInitialData);
    }

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        renderEnrollmentsList(getFilteredEnrollments());
      });
    }

    if (statusFilter) {
      statusFilter.addEventListener("change", () => {
        renderEnrollmentsList(getFilteredEnrollments());
      });
    }

    if (viewModeSelect) {
    viewModeSelect.value = enrollmentViewMode;

    viewModeSelect.addEventListener("change", () => {
      enrollmentViewMode = viewModeSelect.value || "student";
        renderEnrollmentsList(getFilteredEnrollments());
      });
    }

    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener("click", clearEnrollmentFilters);
    }

    if (cancelEditBtn) {
      cancelEditBtn.addEventListener("click", resetEnrollmentForm);
    }

    if (list) {
      list.addEventListener("click", handleEnrollmentsListClick);
    }

    if (detailPanel) {
      detailPanel.addEventListener("click", handleEnrollmentDetailClick);
    }
  }

  async function loadInitialData() {
    const list = document.getElementById("enrollmentsList");

    if (!list) return;

    try {
      list.innerHTML = `<p class="adminWorkspaceEmpty">Cargando inscripciones...</p>`;

      const [enrollments, students, courses, subjects, teachers] = await Promise.all([
        App.enrollmentsService.listEnrollments(),
        App.studentsService.listStudents(),
        App.coursesService.listCourses(),
        App.subjectsService.listSubjects(),
        App.teachersService.listTeachers()
      ]);

      enrollmentsCache = enrollments;
      studentsCache = students;
      coursesCache = courses;
      subjectsCache = subjects;
      teachersCache = teachers;

      renderStudentSelectOptions();
      renderCourseSelectOptions();
      renderEnrollmentsList(getFilteredEnrollments());
    } catch (error) {
      console.error(error);

      list.innerHTML = `
        <p class="adminWorkspaceEmpty errorText">
          No se pudieron cargar las inscripciones: ${escapeHTML(error.message)}
        </p>
      `;
    }
  }

  function renderStudentSelectOptions() {
    const select = document.getElementById("enrollmentStudentSelect");

    if (!select) return;

    const currentValue = select.value;

    const activeStudents = studentsCache.filter((student) => {
      return (student.status || "activo") !== "baja";
    });

    select.innerHTML = `
      <option value="">Seleccionar alumno</option>
      ${activeStudents.map((student) => `
        <option value="${escapeHTML(student.id)}">
          ${escapeHTML(getStudentFullName(student))}
        </option>
      `).join("")}
    `;

    if (currentValue) {
      select.value = currentValue;
    }
  }

  function renderCourseSelectOptions() {
    const select = document.getElementById("enrollmentCourseSelect");

    if (!select) return;

    const currentValue = select.value;

    const activeCourses = coursesCache.filter((course) => {
      return (course.status || "activo") !== "baja";
    });

    select.innerHTML = `
      <option value="">Seleccionar cursada</option>
      ${activeCourses.map((course) => `
        <option value="${escapeHTML(course.id)}">
          ${escapeHTML(formatCourseTitle(course))}
        </option>
      `).join("")}
    `;

    if (currentValue) {
      select.value = currentValue;
    }
  }

  function readEnrollmentForm() {
    const form = document.getElementById("enrollmentForm");

    if (!form) return null;

    const formData = new FormData(form);

    return {
      student_id: normalizeText(formData.get("student_id")),
      course_id: normalizeText(formData.get("course_id")),
      enrollment_date: normalizeText(formData.get("enrollment_date")),
      status: normalizeText(formData.get("status")) || "inscripto",
      notes: normalizeText(formData.get("notes"))
    };
  }

  async function handleSubmitEnrollment(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const status = document.getElementById("enrollmentFormStatus");
    const submitBtn = document.getElementById("enrollmentSubmitBtn");
    const enrollment = readEnrollmentForm();

    if (!enrollment) return;

    if (!enrollment.student_id) {
      setStatus(status, "El alumno es obligatorio.", true);
      return;
    }

    if (!enrollment.course_id) {
      setStatus(status, "La cursada es obligatoria.", true);
      return;
    }

    try {
      setStatus(status, editingEnrollmentId ? "Actualizando..." : "Guardando...");

      if (submitBtn) {
        submitBtn.disabled = true;
      }

      if (editingEnrollmentId) {
        await App.enrollmentsService.updateEnrollment(editingEnrollmentId, enrollment);
        setStatus(status, "Inscripción actualizada correctamente.");
      } else {
        await App.enrollmentsService.createEnrollment(enrollment);
        setStatus(status, "Inscripción guardada correctamente.");
      }

      form.reset();
      resetEnrollmentFormMode();
      setDefaultEnrollmentDate();

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

  function getFilteredEnrollments() {
    const searchInput = document.getElementById("enrollmentsSearchInput");
    const statusFilter = document.getElementById("enrollmentsStatusFilter");

    const term = normalizeText(searchInput?.value).toLowerCase();
    const selectedStatus = normalizeText(statusFilter?.value);

    return enrollmentsCache.filter((enrollment) => {
      const enrollmentStatus = normalizeText(enrollment.status || "inscripto");

      if (selectedStatus && enrollmentStatus !== selectedStatus) {
        return false;
      }

      if (!term) {
        return true;
      }

      const student = getStudentById(enrollment.student_id);
      const course = getCourseById(enrollment.course_id);
      const subject = getSubjectById(course?.subject_id);
      const teacher = getTeacherById(course?.teacher_id);

      const searchable = [
        getStudentFullName(student),
        student?.dni,
        subject?.name,
        subject?.code,
        course?.academic_year,
        course?.commission_name,
        course?.weekday,
        getTeacherFullName(teacher),
        enrollment.status,
        enrollment.notes
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      return searchable.includes(term);
    });
  }

  function clearEnrollmentFilters() {
  const searchInput = document.getElementById("enrollmentsSearchInput");
  const statusFilter = document.getElementById("enrollmentsStatusFilter");
  const viewModeSelect = document.getElementById("enrollmentsViewMode");

  if (searchInput) {
    searchInput.value = "";
  }

  if (statusFilter) {
    statusFilter.value = "";
  }

  if (viewModeSelect) {
    viewModeSelect.value = enrollmentViewMode;
  }

  renderEnrollmentsList(getFilteredEnrollments());
}

  function renderEnrollmentsList(enrollments) {
  const list = document.getElementById("enrollmentsList");
  const countText = document.getElementById("enrollmentsCountText");

  if (!list) return;

  const isCourseView = enrollmentViewMode === "course";

  const groupedEnrollments = isCourseView
    ? groupEnrollmentsByCourse(enrollments)
    : groupEnrollmentsByStudent(enrollments);

  if (countText) {
    const total = enrollmentsCache.length;
    const visible = enrollments.length;
    const groupCount = groupedEnrollments.length;
    const groupLabel = isCourseView ? "cursada" : "alumno";

    countText.textContent =
      total === visible
        ? `${total} inscripción${total === 1 ? "" : "es"} cargada${total === 1 ? "" : "s"} en ${groupCount} ${groupLabel}${groupCount === 1 ? "" : "s"}.`
        : `${visible} resultado${visible === 1 ? "" : "s"} de ${total} inscripción${total === 1 ? "" : "es"} en ${groupCount} ${groupLabel}${groupCount === 1 ? "" : "s"}.`;
  }

  if (!enrollments.length) {
    list.innerHTML = `
      <p class="adminWorkspaceEmpty">
        No hay inscripciones para mostrar.
      </p>
    `;
    return;
  }

  list.innerHTML = `
    <div class="enrollmentsAccordion enrollmentsAccordion--${escapeHTML(enrollmentViewMode)}">
      ${groupedEnrollments
        .map((group) =>
          isCourseView
            ? renderCourseEnrollmentGroup(group)
            : renderStudentEnrollmentGroup(group)
        )
        .join("")}
    </div>
  `;
}

function groupEnrollmentsByStudent(enrollments) {
  const groupsMap = new Map();

  enrollments.forEach((enrollment) => {
    const studentId = enrollment.student_id || "unknown";
    const student = getStudentById(studentId);
    const studentName = getStudentFullName(student) || "Alumno no encontrado";

    if (!groupsMap.has(studentId)) {
      groupsMap.set(studentId, {
        studentId,
        student,
        studentName,
        enrollments: []
      });
    }

    groupsMap.get(studentId).enrollments.push(enrollment);
  });

  return [...groupsMap.values()].sort((a, b) =>
    a.studentName.localeCompare(b.studentName, "es", {
      sensitivity: "base"
    })
  );
}

function renderStudentEnrollmentGroup(group) {
  const activeCount = group.enrollments.filter((enrollment) => {
    return enrollment.status !== "baja";
  }).length;

  const totalCount = group.enrollments.length;

  const student = group.student;

  return `
        <details class="enrollmentStudentGroup">
      <summary>
        <div class="enrollmentStudentSummaryMain">
          <strong>${escapeHTML(group.studentName)}</strong>
          <span>
            ${escapeHTML(student?.dni ? `DNI ${student.dni}` : "Sin DNI cargado")}
          </span>
        </div>

        <div class="enrollmentStudentSummaryMeta">
          <span>${totalCount} inscripción${totalCount === 1 ? "" : "es"}</span>
          <span>${activeCount} activa${activeCount === 1 ? "" : "s"}</span>
        </div>
      </summary>

      <div class="enrollmentStudentItems">
        ${group.enrollments.map(renderEnrollmentItem).join("")}
      </div>
    </details>
  `;
}

function groupEnrollmentsByCourse(enrollments) {
  const groupsMap = new Map();

  enrollments.forEach((enrollment) => {
    const courseId = enrollment.course_id || "unknown";
    const course = getCourseById(courseId);
    const courseName = formatCourseTitle(course);

    if (!groupsMap.has(courseId)) {
      groupsMap.set(courseId, {
        courseId,
        course,
        courseName,
        enrollments: []
      });
    }

    groupsMap.get(courseId).enrollments.push(enrollment);
  });

  return [...groupsMap.values()].sort((a, b) =>
    a.courseName.localeCompare(b.courseName, "es", {
      sensitivity: "base"
    })
  );
}

function renderCourseEnrollmentGroup(group) {
  const totalCount = group.enrollments.length;

  const activeCount = group.enrollments.filter((enrollment) => {
    return enrollment.status !== "baja";
  }).length;

  const course = group.course;
  const subject = getSubjectById(course?.subject_id);
  const teacher = getTeacherById(course?.teacher_id);

  return `
    <details class="enrollmentStudentGroup enrollmentCourseGroup">
      <summary>
        <div class="enrollmentStudentSummaryMain">
          <strong>${escapeHTML(group.courseName)}</strong>
          <span>
            ${escapeHTML(formatCourseGroupMeta(course, subject, teacher))}
          </span>
        </div>

        <div class="enrollmentStudentSummaryMeta">
          <span>${totalCount} inscripción${totalCount === 1 ? "" : "es"}</span>
          <span>${activeCount} activa${activeCount === 1 ? "" : "s"}</span>
        </div>
      </summary>

      <div class="enrollmentStudentItems">
        ${group.enrollments.map(renderCourseEnrollmentItem).join("")}
      </div>
    </details>
  `;
}

function renderCourseEnrollmentItem(enrollment) {
  const student = getStudentById(enrollment.student_id);
  const status = enrollment.status || "inscripto";
  const isInactive = status === "baja";

  return `
    <article class="enrollmentItem" data-enrollment-id="${escapeHTML(enrollment.id)}">
      <div class="enrollmentItemMain">
        <strong>${escapeHTML(getStudentFullName(student) || "Alumno no encontrado")}</strong>

        <span>
          ${escapeHTML(student?.dni ? `DNI ${student.dni}` : "Sin DNI cargado")}
          ${student?.cohort ? ` · Cohorte ${escapeHTML(student.cohort)}` : ""}
        </span>

        <small>
          Fecha de inscripción: ${escapeHTML(formatDateOnly(enrollment.enrollment_date))}
        </small>
      </div>

      <div class="enrollmentItemStatus">
        <strong class="statusPill statusPill--${escapeHTML(status)}">
          ${escapeHTML(formatEnrollmentStatus(status))}
        </strong>
      </div>

      <div class="studentsRowActions enrollmentItemActions">
        <button type="button" data-enrollment-action="details">Ficha</button>
        <button type="button" data-enrollment-action="edit">Editar</button>

        ${
          isInactive
            ? `<button type="button" data-enrollment-action="reactivate">Reactivar</button>`
            : `<button type="button" data-enrollment-action="archive">Baja</button>`
        }

        <button type="button" data-enrollment-action="delete" class="dangerBtn">Borrar</button>
      </div>
    </article>
  `;
}

function formatCourseGroupMeta(course, subject, teacher) {
  if (!course) return "Cursada no encontrada";

  const pieces = [
    subject?.code ? `Código ${subject.code}` : "",
    course.academic_year,
    course.commission_name ? `Comisión ${course.commission_name}` : "",
    formatCourseSchedule(course),
    getTeacherFullName(teacher) ? `Docente: ${getTeacherFullName(teacher)}` : ""
  ].filter((value) => value && value !== "-");

  return pieces.join(" · ") || "-";
}

function renderEnrollmentItem(enrollment) {
  const course = getCourseById(enrollment.course_id);
  const subject = getSubjectById(course?.subject_id);
  const teacher = getTeacherById(course?.teacher_id);
  const status = enrollment.status || "inscripto";
  const isInactive = status === "baja";

  return `
    <article class="enrollmentItem" data-enrollment-id="${escapeHTML(enrollment.id)}">
      <div class="enrollmentItemMain">
        <strong>${escapeHTML(subject?.name || "Materia no encontrada")}</strong>

        <span>
          ${escapeHTML(formatEnrollmentCourseMeta(course))}
        </span>

        <small>
          Fecha de inscripción: ${escapeHTML(formatDateOnly(enrollment.enrollment_date))}
          ${teacher ? ` · Docente: ${escapeHTML(getTeacherFullName(teacher))}` : ""}
        </small>
      </div>

      <div class="enrollmentItemStatus">
        <strong class="statusPill statusPill--${escapeHTML(status)}">
          ${escapeHTML(formatEnrollmentStatus(status))}
        </strong>
      </div>

      <div class="studentsRowActions enrollmentItemActions">
        <button type="button" data-enrollment-action="details">Ficha</button>
        <button type="button" data-enrollment-action="edit">Editar</button>

        ${
          isInactive
            ? `<button type="button" data-enrollment-action="reactivate">Reactivar</button>`
            : `<button type="button" data-enrollment-action="archive">Baja</button>`
        }

        <button type="button" data-enrollment-action="delete" class="dangerBtn">Borrar</button>
      </div>
    </article>
  `;
}

function formatEnrollmentCourseMeta(course) {
  if (!course) return "Cursada no encontrada";

  const pieces = [
    course.academic_year,
    course.commission_name ? `Comisión ${course.commission_name}` : "",
    formatCourseSchedule(course)
  ].filter((value) => value && value !== "-");

  return pieces.join(" · ") || "-";
}


  async function handleEnrollmentsListClick(event) {
    const button = event.target.closest("[data-enrollment-action]");

    if (!button) return;

    const row = button.closest("[data-enrollment-id]");
    const enrollmentId = row?.dataset.enrollmentId;
    const action = button.dataset.enrollmentAction;

    if (!enrollmentId || !action) return;

    const enrollment = enrollmentsCache.find((item) => item.id === enrollmentId);

    if (!enrollment) {
      alert("No se encontró la inscripción seleccionada.");
      return;
    }

    if (action === "details") {
      renderEnrollmentDetail(enrollment);
      return;
    }

    if (action === "edit") {
      startEditEnrollment(enrollment);
      return;
    }

    if (action === "archive") {
      await archiveEnrollment(enrollment);
      return;
    }

    if (action === "reactivate") {
      await reactivateEnrollment(enrollment);
      return;
    }

    if (action === "delete") {
      await deleteEnrollment(enrollment);
    }
  }

  function startEditEnrollment(enrollment) {
    const form = document.getElementById("enrollmentForm");
    const title = document.getElementById("enrollmentFormTitle");
    const subtitle = document.getElementById("enrollmentFormSubtitle");
    const submitBtn = document.getElementById("enrollmentSubmitBtn");
    const cancelBtn = document.getElementById("cancelEditEnrollmentBtn");
    const status = document.getElementById("enrollmentFormStatus");

    if (!form) return;

    editingEnrollmentId = enrollment.id;

    form.elements.student_id.value = enrollment.student_id || "";
    form.elements.course_id.value = enrollment.course_id || "";
    form.elements.enrollment_date.value = enrollment.enrollment_date || "";
    form.elements.status.value = enrollment.status || "inscripto";
    form.elements.notes.value = enrollment.notes || "";

    if (title) {
      title.textContent = "Editar inscripción";
    }

    if (subtitle) {
      subtitle.textContent = "Editando inscripción del alumno.";
    }

    if (submitBtn) {
      submitBtn.textContent = "Guardar cambios";
    }

    if (cancelBtn) {
      cancelBtn.hidden = false;
    }

    setStatus(status, "");

    renderEnrollmentsList(getFilteredEnrollments());

    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetEnrollmentForm() {
    const form = document.getElementById("enrollmentForm");
    const status = document.getElementById("enrollmentFormStatus");

    if (form) {
      form.reset();
    }

    resetEnrollmentFormMode();
    setDefaultEnrollmentDate();
    setStatus(status, "");
    renderEnrollmentsList(getFilteredEnrollments());
  }

  function resetEnrollmentFormMode() {
    const title = document.getElementById("enrollmentFormTitle");
    const subtitle = document.getElementById("enrollmentFormSubtitle");
    const submitBtn = document.getElementById("enrollmentSubmitBtn");
    const cancelBtn = document.getElementById("cancelEditEnrollmentBtn");

    editingEnrollmentId = null;

    if (title) {
      title.textContent = "Nueva inscripción";
    }

    if (subtitle) {
      subtitle.textContent = "Seleccioná un alumno y una cursada.";
    }

    if (submitBtn) {
      submitBtn.textContent = "Guardar inscripción";
    }

    if (cancelBtn) {
      cancelBtn.hidden = true;
    }
  }

  function renderEnrollmentDetail(enrollment) {
    const panel = document.getElementById("enrollmentDetailPanel");

    if (!panel) return;

    const student = getStudentById(enrollment.student_id);
    const course = getCourseById(enrollment.course_id);
    const subject = getSubjectById(course?.subject_id);
    const teacher = getTeacherById(course?.teacher_id);
    const status = enrollment.status || "inscripto";

    panel.hidden = false;

    panel.innerHTML = `
      <div class="studentDetailHeader">
        <div>
          <p class="dashboardEyebrow">Ficha de inscripción</p>
          <h3>${escapeHTML(getStudentFullName(student) || "Alumno no encontrado")}</h3>
          <p>
            Inscripción del alumno a una cursada o comisión específica.
          </p>
        </div>

        <div class="studentDetailActions">
          <button type="button" data-enrollment-detail-action="edit">Editar inscripción</button>
          <button type="button" data-enrollment-detail-action="close" class="secondaryBtn">Cerrar</button>
        </div>
      </div>

      <div class="studentDetailGrid">
        <article class="studentDetailCard">
          <h4>Alumno</h4>

          <dl>
            <div>
              <dt>Alumno</dt>
              <dd>${escapeHTML(getStudentFullName(student) || "-")}</dd>
            </div>

            <div>
              <dt>DNI</dt>
              <dd>${escapeHTML(student?.dni || "-")}</dd>
            </div>

            <div>
              <dt>Cohorte</dt>
              <dd>${escapeHTML(student?.cohort || "-")}</dd>
            </div>

            <div>
              <dt>Trayecto</dt>
              <dd>${escapeHTML(student?.program_name || "-")}</dd>
            </div>
          </dl>
        </article>

        <article class="studentDetailCard">
          <h4>Cursada</h4>

          <dl>
            <div>
              <dt>Materia</dt>
              <dd>${escapeHTML(subject?.name || "Materia no encontrada")}</dd>
            </div>

            <div>
              <dt>Ciclo</dt>
              <dd>${escapeHTML(course?.academic_year || "-")}</dd>
            </div>

            <div>
              <dt>Comisión</dt>
              <dd>${escapeHTML(course?.commission_name || "-")}</dd>
            </div>

            <div>
              <dt>Horario</dt>
              <dd>${escapeHTML(formatCourseSchedule(course))}</dd>
            </div>
          </dl>
        </article>

        <article class="studentDetailCard">
          <h4>Docente</h4>

          <dl>
            <div>
              <dt>Docente</dt>
              <dd>${escapeHTML(getTeacherFullName(teacher) || "Sin asignar")}</dd>
            </div>

            <div>
              <dt>Email</dt>
              <dd>${escapeHTML(teacher?.email || "-")}</dd>
            </div>
          </dl>
        </article>

        <article class="studentDetailCard">
          <h4>Estado</h4>

          <dl>
            <div>
              <dt>Fecha</dt>
              <dd>${escapeHTML(formatDateOnly(enrollment.enrollment_date))}</dd>
            </div>

            <div>
              <dt>Estado</dt>
              <dd>
                <strong class="statusPill statusPill--${escapeHTML(status)}">
                  ${escapeHTML(formatEnrollmentStatus(status))}
                </strong>
              </dd>
            </div>

            <div>
              <dt>Última modificación</dt>
              <dd>${escapeHTML(formatDateTime(enrollment.updated_at))}</dd>
            </div>
          </dl>
        </article>
      </div>

      <article class="studentDetailCard studentDetailNotes">
        <h4>Observaciones</h4>
        <p>${formatMultilineText(enrollment.notes)}</p>
      </article>
    `;

    panel.dataset.currentEnrollmentId = enrollment.id;

    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleEnrollmentDetailClick(event) {
    const button = event.target.closest("[data-enrollment-detail-action]");

    if (!button) return;

    const action = button.dataset.enrollmentDetailAction;
    const panel = document.getElementById("enrollmentDetailPanel");
    const enrollmentId = panel?.dataset?.currentEnrollmentId;

    if (action === "close") {
      if (panel) {
        panel.hidden = true;
        panel.innerHTML = "";
        delete panel.dataset.currentEnrollmentId;
      }

      return;
    }

    if (action === "edit") {
      const enrollment = enrollmentsCache.find((item) => item.id === enrollmentId);

      if (!enrollment) {
        alert("No se encontró la inscripción seleccionada.");
        return;
      }

      startEditEnrollment(enrollment);
    }
  }

  async function archiveEnrollment(enrollment) {
    const confirmed = confirm("¿Querés marcar esta inscripción como baja?");

    if (!confirmed) return;

    try {
      await App.enrollmentsService.updateEnrollmentStatus(enrollment.id, "baja");

      if (editingEnrollmentId === enrollment.id) {
        resetEnrollmentForm();
      }

      await loadInitialData();
    } catch (error) {
      console.error(error);
      alert(getFriendlyErrorMessage(error));
    }
  }

  async function reactivateEnrollment(enrollment) {
    const confirmed = confirm("¿Querés reactivar esta inscripción?");

    if (!confirmed) return;

    try {
      await App.enrollmentsService.updateEnrollmentStatus(enrollment.id, "inscripto");

      if (editingEnrollmentId === enrollment.id) {
        resetEnrollmentForm();
      }

      await loadInitialData();
    } catch (error) {
      console.error(error);
      alert(getFriendlyErrorMessage(error));
    }
  }

  async function deleteEnrollment(enrollment) {
    const confirmed = confirm(
      "Esto va a borrar definitivamente la inscripción.\n\n¿Querés continuar?"
    );

    if (!confirmed) return;

    try {
      await App.enrollmentsService.deleteEnrollment(enrollment.id);

      if (editingEnrollmentId === enrollment.id) {
        resetEnrollmentForm();
      }

      await loadInitialData();
    } catch (error) {
      console.error(error);
      alert(getFriendlyErrorMessage(error));
    }
  }

  function getStudentById(studentId) {
    if (!studentId) return null;

    return studentsCache.find((student) => student.id === studentId) || null;
  }

  function getCourseById(courseId) {
    if (!courseId) return null;

    return coursesCache.find((course) => course.id === courseId) || null;
  }

  function getSubjectById(subjectId) {
    if (!subjectId) return null;

    return subjectsCache.find((subject) => subject.id === subjectId) || null;
  }

  function getTeacherById(teacherId) {
    if (!teacherId) return null;

    return teachersCache.find((teacher) => teacher.id === teacherId) || null;
  }

  function getStudentFullName(student) {
    if (!student) return "";

    const firstName = student.first_name || "";
    const lastName = student.last_name || "";

    return `${lastName}, ${firstName}`.replace(/^,\s*/, "").trim();
  }

  function getTeacherFullName(teacher) {
    if (!teacher) return "";

    const firstName = teacher.first_name || "";
    const lastName = teacher.last_name || "";

    return `${lastName}, ${firstName}`.replace(/^,\s*/, "").trim();
  }

  function formatCourseTitle(course) {
    if (!course) return "Cursada no encontrada";

    const subject = getSubjectById(course.subject_id);

    const pieces = [
      subject?.name || "Materia no encontrada",
      course.academic_year,
      course.commission_name ? `Comisión ${course.commission_name}` : ""
    ].filter(Boolean);

    return pieces.join(" · ");
  }

  function formatCourseSchedule(course) {
    if (!course) return "-";

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

  function formatEnrollmentStatus(value) {
    const labels = {
      inscripto: "Inscripto",
      regular: "Regular",
      libre: "Libre",
      aprobado: "Aprobado",
      baja: "Baja"
    };

    return labels[value] || value || "-";
  }

  function formatDateOnly(value) {
    if (!value) return "-";

    const dateText = String(value).slice(0, 10);
    const parts = dateText.split("-");

    if (parts.length !== 3) return "-";

    const [year, month, day] = parts;

    return `${day}/${month}/${year}`;
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
      return "No se pudo guardar: ese alumno ya está inscripto en esa cursada.";
    }

    if (message.toLowerCase().includes("permission denied")) {
      return "No tenés permisos suficientes para realizar esta acción.";
    }

    return `No se pudo completar la operación: ${message}`;
  }

  App.enrollmentsUI = {
    renderEnrollmentsModule,
    loadInitialData
  };
})();