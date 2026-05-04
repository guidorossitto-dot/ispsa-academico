// subjects-service.js
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

  function normalizeNullableNumber(value) {
    const text = normalizeText(value);

    if (!text) return null;

    const number = Number(text);

    if (!Number.isFinite(number)) {
      return null;
    }

    return number;
  }

  function normalizeSubjectPayload(subject = {}) {
    return {
      name: normalizeText(subject.name),
      code: normalizeNullableText(subject.code),
      year_level: normalizeNullableText(subject.year_level),
      workload_hours: normalizeNullableNumber(subject.workload_hours),
      teacher_id: normalizeNullableText(subject.teacher_id),
      status: normalizeText(subject.status) || "activo",
      notes: normalizeNullableText(subject.notes)
    };
  }

  function validateSubjectPayload(payload) {
    if (!payload.name) {
      throw new Error("El nombre de la materia es obligatorio.");
    }

    const validStatuses = ["activo", "pausado", "baja"];

    if (!validStatuses.includes(payload.status)) {
      throw new Error("El estado de la materia no es válido.");
    }

    if (
      payload.workload_hours !== null &&
      (!Number.isInteger(payload.workload_hours) || payload.workload_hours < 0)
    ) {
      throw new Error("La carga horaria debe ser un número entero mayor o igual a cero.");
    }
  }

  function getSubjectSelectFields() {
    return `
      id,
      name,
      code,
      year_level,
      workload_hours,
      teacher_id,
      status,
      notes,
      created_at,
      updated_at
    `;
  }

  async function listSubjects() {
    const supabase = getClient();

    const { data, error } = await supabase
      .from("subjects")
      .select(getSubjectSelectFields())
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  }

  async function createSubject(subject) {
    const supabase = getClient();
    const payload = normalizeSubjectPayload(subject);

    validateSubjectPayload(payload);

    const { data, error } = await supabase
      .from("subjects")
      .insert(payload)
      .select(getSubjectSelectFields())
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async function updateSubject(subjectId, subject) {
    const supabase = getClient();

    if (!subjectId) {
      throw new Error("Falta el ID de la materia.");
    }

    const payload = normalizeSubjectPayload(subject);

    validateSubjectPayload(payload);

    const { data, error } = await supabase
      .from("subjects")
      .update(payload)
      .eq("id", subjectId)
      .select(getSubjectSelectFields())
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async function updateSubjectStatus(subjectId, status) {
    const supabase = getClient();

    if (!subjectId) {
      throw new Error("Falta el ID de la materia.");
    }

    const normalizedStatus = normalizeText(status);
    const validStatuses = ["activo", "pausado", "baja"];

    if (!validStatuses.includes(normalizedStatus)) {
      throw new Error("El estado de la materia no es válido.");
    }

    const { data, error } = await supabase
      .from("subjects")
      .update({ status: normalizedStatus })
      .eq("id", subjectId)
      .select(getSubjectSelectFields())
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async function deleteSubject(subjectId) {
    const supabase = getClient();

    if (!subjectId) {
      throw new Error("Falta el ID de la materia.");
    }

    const { error } = await supabase
      .from("subjects")
      .delete()
      .eq("id", subjectId);

    if (error) {
      throw error;
    }

    return true;
  }

  App.subjectsService = {
    listSubjects,
    createSubject,
    updateSubject,
    updateSubjectStatus,
    deleteSubject
  };
})();