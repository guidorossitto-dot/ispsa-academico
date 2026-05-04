// preinscripcion.js
(() => {
  "use strict";

  const App = window.App = window.App || {};

  const form = document.getElementById("publicEnrollmentForm");
  const courseSelect = document.getElementById("publicCourseSelect");
  const submitBtn = document.getElementById("publicEnrollmentSubmitBtn");
  const statusText = document.getElementById("publicEnrollmentStatus");

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function setStatus(message, isError = false) {
    if (!statusText) return;

    statusText.textContent = message;
    statusText.classList.toggle("isError", isError);
  }

  function getClient() {
    if (!App.supabase) {
      throw new Error("Supabase no está inicializado.");
    }

    return App.supabase;
  }

  async function loadPublicCourses() {
    if (!courseSelect) return;

    try {
      const supabase = getClient();

      courseSelect.innerHTML = `
        <option value="">Cargando cursadas...</option>
      `;

      const { data, error } = await supabase.rpc("list_public_courses");

      if (error) {
        throw error;
      }

      const courses = data || [];

      if (!courses.length) {
        courseSelect.innerHTML = `
          <option value="">No hay cursadas disponibles</option>
        `;
        return;
      }

      courseSelect.innerHTML = `
        <option value="">Seleccionar cursada</option>
        ${courses.map((course) => `
          <option value="${course.course_id}">
            ${course.label || course.subject_name}
          </option>
        `).join("")}
      `;
    } catch (error) {
      console.error(error);

      courseSelect.innerHTML = `
        <option value="">No se pudieron cargar las cursadas</option>
      `;

      setStatus(
        "No se pudieron cargar las cursadas disponibles. Intentá nuevamente más tarde.",
        true
      );
    }
  }

  function readFormValues() {
    const formData = new FormData(form);

    return {
      p_first_name: normalizeText(formData.get("first_name")),
      p_last_name: normalizeText(formData.get("last_name")),
      p_dni: normalizeText(formData.get("dni")),
      p_email: normalizeText(formData.get("email")),
      p_phone: normalizeText(formData.get("phone")),
      p_course_id: normalizeText(formData.get("course_id")),
      p_notes: normalizeText(formData.get("notes"))
    };
  }

  function validateValues(values) {
    if (!values.p_first_name) {
      return "El nombre es obligatorio.";
    }

    if (!values.p_last_name) {
      return "El apellido es obligatorio.";
    }

    if (!values.p_dni) {
      return "El DNI es obligatorio.";
    }

    if (!values.p_course_id) {
      return "Seleccioná una cursada.";
    }

    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const values = readFormValues();
    const validationError = validateValues(values);

    if (validationError) {
      setStatus(validationError, true);
      return;
    }

    try {
      const supabase = getClient();

      setStatus("Enviando inscripción...");

      if (submitBtn) {
        submitBtn.disabled = true;
      }

      const { data, error } = await supabase.rpc(
        "submit_public_enrollment",
        values
      );

      if (error) {
        throw error;
      }

      if (!data?.ok) {
        setStatus(data?.message || "No se pudo registrar la inscripción.", true);
        return;
      }

      form.reset();

      await loadPublicCourses();

      setStatus(data.message || "La inscripción fue registrada correctamente.");
    } catch (error) {
      console.error(error);

      setStatus(
        "No se pudo completar la inscripción. Intentá nuevamente o comunicate con secretaría.",
        true
      );
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
      }
    }
  }

  if (form) {
    form.addEventListener("submit", handleSubmit);
  }

  loadPublicCourses();
})();