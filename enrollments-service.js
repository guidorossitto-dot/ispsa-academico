// enrollments-service.js
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

  function normalizeEnrollmentPayload(enrollment = {}) {
    return {
      student_id: normalizeText(enrollment.student_id),
      course_id: normalizeText(enrollment.course_id),
      enrollment_date:
        normalizeText(enrollment.enrollment_date) ||
        new Date().toISOString().slice(0, 10),
      status: normalizeText(enrollment.status) || "inscripto",
      notes: normalizeNullableText(enrollment.notes)
    };
  }

  function validateEnrollmentPayload(payload) {
    if (!payload.student_id) {
      throw new Error("El alumno es obligatorio.");
    }

    if (!payload.course_id) {
      throw new Error("La cursada es obligatoria.");
    }

    const validStatuses = ["inscripto", "regular", "libre", "aprobado", "baja"];

    if (!validStatuses.includes(payload.status)) {
      throw new Error("El estado de inscripción no es válido.");
    }
  }

  function getEnrollmentSelectFields() {
    return `
      id,
      student_id,
      course_id,
      enrollment_date,
      status,
      notes,
      created_at,
      updated_at
    `;
  }

  async function listEnrollments() {
    const supabase = getClient();

    const { data, error } = await supabase
      .from("enrollments")
      .select(getEnrollmentSelectFields())
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  }

  async function createEnrollment(enrollment) {
    const supabase = getClient();
    const payload = normalizeEnrollmentPayload(enrollment);

    validateEnrollmentPayload(payload);

    const { data, error } = await supabase
      .from("enrollments")
      .insert(payload)
      .select(getEnrollmentSelectFields())
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async function updateEnrollment(enrollmentId, enrollment) {
    const supabase = getClient();

    if (!enrollmentId) {
      throw new Error("Falta el ID de la inscripción.");
    }

    const payload = normalizeEnrollmentPayload(enrollment);

    validateEnrollmentPayload(payload);

    const { data, error } = await supabase
      .from("enrollments")
      .update(payload)
      .eq("id", enrollmentId)
      .select(getEnrollmentSelectFields())
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async function updateEnrollmentStatus(enrollmentId, status) {
    const supabase = getClient();

    if (!enrollmentId) {
      throw new Error("Falta el ID de la inscripción.");
    }

    const normalizedStatus = normalizeText(status);
    const validStatuses = ["inscripto", "regular", "libre", "aprobado", "baja"];

    if (!validStatuses.includes(normalizedStatus)) {
      throw new Error("El estado de inscripción no es válido.");
    }

    const { data, error } = await supabase
      .from("enrollments")
      .update({ status: normalizedStatus })
      .eq("id", enrollmentId)
      .select(getEnrollmentSelectFields())
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async function deleteEnrollment(enrollmentId) {
    const supabase = getClient();

    if (!enrollmentId) {
      throw new Error("Falta el ID de la inscripción.");
    }

    const { error } = await supabase
      .from("enrollments")
      .delete()
      .eq("id", enrollmentId);

    if (error) {
      throw error;
    }

    return true;
  }

  App.enrollmentsService = {
    listEnrollments,
    createEnrollment,
    updateEnrollment,
    updateEnrollmentStatus,
    deleteEnrollment
  };
})();