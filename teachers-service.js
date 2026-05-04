// teachers-service.js
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

  function normalizeTeacherPayload(teacher = {}) {
    return {
      first_name: normalizeText(teacher.first_name),
      last_name: normalizeText(teacher.last_name),
      dni: normalizeNullableText(teacher.dni),
      email: normalizeNullableText(teacher.email),
      phone: normalizeNullableText(teacher.phone),
      subject_area: normalizeNullableText(teacher.subject_area),
      role_title: normalizeNullableText(teacher.role_title),
      status: normalizeText(teacher.status) || "activo",
      notes: normalizeNullableText(teacher.notes)
    };
  }

  function validateTeacherPayload(payload) {
    if (!payload.first_name) {
      throw new Error("El nombre es obligatorio.");
    }

    if (!payload.last_name) {
      throw new Error("El apellido es obligatorio.");
    }

    const validStatuses = ["activo", "licencia", "baja"];

    if (!validStatuses.includes(payload.status)) {
      throw new Error("El estado del docente no es válido.");
    }
  }

  function getTeacherSelectFields() {
    return `
      id,
      first_name,
      last_name,
      dni,
      email,
      phone,
      subject_area,
      role_title,
      status,
      notes,
      created_at,
      updated_at
    `;
  }

  async function listTeachers() {
    const supabase = getClient();

    const { data, error } = await supabase
      .from("teachers")
      .select(getTeacherSelectFields())
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  }

  async function createTeacher(teacher) {
    const supabase = getClient();
    const payload = normalizeTeacherPayload(teacher);

    validateTeacherPayload(payload);

    const { data, error } = await supabase
      .from("teachers")
      .insert(payload)
      .select(getTeacherSelectFields())
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async function updateTeacher(teacherId, teacher) {
    const supabase = getClient();

    if (!teacherId) {
      throw new Error("Falta el ID del docente.");
    }

    const payload = normalizeTeacherPayload(teacher);

    validateTeacherPayload(payload);

    const { data, error } = await supabase
      .from("teachers")
      .update(payload)
      .eq("id", teacherId)
      .select(getTeacherSelectFields())
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async function updateTeacherStatus(teacherId, status) {
    const supabase = getClient();

    if (!teacherId) {
      throw new Error("Falta el ID del docente.");
    }

    const normalizedStatus = normalizeText(status);
    const validStatuses = ["activo", "licencia", "baja"];

    if (!validStatuses.includes(normalizedStatus)) {
      throw new Error("El estado del docente no es válido.");
    }

    const { data, error } = await supabase
      .from("teachers")
      .update({ status: normalizedStatus })
      .eq("id", teacherId)
      .select(getTeacherSelectFields())
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async function deleteTeacher(teacherId) {
    const supabase = getClient();

    if (!teacherId) {
      throw new Error("Falta el ID del docente.");
    }

    const { error } = await supabase
      .from("teachers")
      .delete()
      .eq("id", teacherId);

    if (error) {
      throw error;
    }

    return true;
  }

  App.teachersService = {
    listTeachers,
    createTeacher,
    updateTeacher,
    updateTeacherStatus,
    deleteTeacher
  };
})();