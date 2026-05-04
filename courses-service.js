// courses-service.js
(() => {
  "use strict";

  const App = window.App = window.App || {};

  function getClient() {
    if (!App.supabase) {
      throw new Error("Supabase no está inicializado.");
    }

    return App.supabase;
  }

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function normalizeNullableText(value) {
    const text = normalizeText(value);
    return text || null;
  }

  function normalizeCoursePayload(course = {}) {
    return {
      subject_id: normalizeText(course.subject_id),
      teacher_id: normalizeNullableText(course.teacher_id),
      academic_year: normalizeText(course.academic_year),
      term: normalizeNullableText(course.term),
      commission_name: normalizeNullableText(course.commission_name),
      modality: normalizeText(course.modality) || "presencial",
      shift: normalizeNullableText(course.shift),
      weekday: normalizeNullableText(course.weekday),
      start_time: normalizeNullableText(course.start_time),
      end_time: normalizeNullableText(course.end_time),
      classroom: normalizeNullableText(course.classroom),
      status: normalizeText(course.status) || "activo",
      notes: normalizeNullableText(course.notes)
    };
  }

  function validateCoursePayload(payload) {
    if (!payload.subject_id) {
      throw new Error("La materia es obligatoria.");
    }

    if (!payload.academic_year) {
      throw new Error("El ciclo lectivo es obligatorio.");
    }

    const validStatuses = ["activo", "pausado", "finalizada", "baja"];
    const validModalities = ["presencial", "virtual", "hibrida"];

    if (!validStatuses.includes(payload.status)) {
      throw new Error("El estado de la cursada no es válido.");
    }

    if (!validModalities.includes(payload.modality)) {
      throw new Error("La modalidad no es válida.");
    }
  }

  function getCourseSelectFields() {
    return `
      id,
      subject_id,
      teacher_id,
      academic_year,
      term,
      commission_name,
      modality,
      shift,
      weekday,
      start_time,
      end_time,
      classroom,
      status,
      notes,
      created_at,
      updated_at
    `;
  }

  async function listCourses() {
    const supabase = getClient();

    const { data, error } = await supabase
      .from("courses")
      .select(getCourseSelectFields())
      .order("academic_year", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  }

  async function createCourse(course) {
    const supabase = getClient();
    const payload = normalizeCoursePayload(course);

    validateCoursePayload(payload);

    const { data, error } = await supabase
      .from("courses")
      .insert(payload)
      .select(getCourseSelectFields())
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async function updateCourse(courseId, course) {
    const supabase = getClient();

    if (!courseId) {
      throw new Error("Falta el ID de la cursada.");
    }

    const payload = normalizeCoursePayload(course);

    validateCoursePayload(payload);

    const { data, error } = await supabase
      .from("courses")
      .update(payload)
      .eq("id", courseId)
      .select(getCourseSelectFields())
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async function updateCourseStatus(courseId, status) {
    const supabase = getClient();

    if (!courseId) {
      throw new Error("Falta el ID de la cursada.");
    }

    const normalizedStatus = normalizeText(status);
    const validStatuses = ["activo", "pausado", "finalizada", "baja"];

    if (!validStatuses.includes(normalizedStatus)) {
      throw new Error("El estado de la cursada no es válido.");
    }

    const { data, error } = await supabase
      .from("courses")
      .update({ status: normalizedStatus })
      .eq("id", courseId)
      .select(getCourseSelectFields())
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async function deleteCourse(courseId) {
    const supabase = getClient();

    if (!courseId) {
      throw new Error("Falta el ID de la cursada.");
    }

    const { error } = await supabase
      .from("courses")
      .delete()
      .eq("id", courseId);

    if (error) {
      throw error;
    }

    return true;
  }

  App.coursesService = {
    listCourses,
    createCourse,
    updateCourse,
    updateCourseStatus,
    deleteCourse
  };
})();