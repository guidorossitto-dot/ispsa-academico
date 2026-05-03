// students-service.js
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

  function normalizeStudentPayload(student = {}) {
  return {
    first_name: normalizeText(student.first_name),
    last_name: normalizeText(student.last_name),
    dni: normalizeNullableText(student.dni),
    email: normalizeNullableText(student.email),
    phone: normalizeNullableText(student.phone),

    program_name: normalizeNullableText(student.program_name),
    cohort: normalizeNullableText(student.cohort),

    birth_date: normalizeNullableText(student.birth_date),
    address: normalizeNullableText(student.address),
    city: normalizeNullableText(student.city),
    emergency_contact_name: normalizeNullableText(student.emergency_contact_name),
    emergency_contact_phone: normalizeNullableText(student.emergency_contact_phone),

    enrollment_date: normalizeNullableText(student.enrollment_date),
    file_number: normalizeNullableText(student.file_number),
    documentation_status:
      normalizeText(student.documentation_status) || "pendiente",

    status: normalizeText(student.status) || "activo",
    notes: normalizeNullableText(student.notes)
  };
}

  function validateStudentPayload(payload) {
    if (!payload.first_name) {
      throw new Error("El nombre es obligatorio.");
    }

    if (!payload.last_name) {
      throw new Error("El apellido es obligatorio.");
    }

    const validStatuses = ["activo", "egresado", "baja", "pausado"];

    if (!validStatuses.includes(payload.status)) {
      throw new Error("El estado del alumno no es válido.");
    }
  }

  function getStudentSelectFields() {
  return `
    id,
    first_name,
    last_name,
    dni,
    email,
    phone,
    program_name,
    cohort,
    birth_date,
    address,
    city,
    emergency_contact_name,
    emergency_contact_phone,
    enrollment_date,
    file_number,
    documentation_status,
    status,
    notes,
    created_at,
    updated_at
  `;
}

  async function listStudents() {
    const supabase = getClient();

    const { data, error } = await supabase
      .from("students")
      .select(getStudentSelectFields())
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  }

  async function searchStudents(searchTerm) {
    const supabase = getClient();
    const term = normalizeText(searchTerm);

    if (!term) {
      return listStudents();
    }

    const { data, error } = await supabase
      .from("students")
      .select(getStudentSelectFields())
      .or(
        `first_name.ilike.%${term}%,last_name.ilike.%${term}%,dni.ilike.%${term}%,email.ilike.%${term}%`
      )
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  }

  async function createStudent(student) {
    const supabase = getClient();
    const payload = normalizeStudentPayload(student);

    validateStudentPayload(payload);

    const { data, error } = await supabase
      .from("students")
      .insert(payload)
      .select(getStudentSelectFields())
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async function updateStudent(studentId, student) {
    const supabase = getClient();

    if (!studentId) {
      throw new Error("Falta el ID del alumno.");
    }

    const payload = normalizeStudentPayload(student);

    validateStudentPayload(payload);

    const { data, error } = await supabase
      .from("students")
      .update(payload)
      .eq("id", studentId)
      .select(getStudentSelectFields())
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async function updateStudentStatus(studentId, status) {
    const supabase = getClient();

    if (!studentId) {
      throw new Error("Falta el ID del alumno.");
    }

    const normalizedStatus = normalizeText(status);
    const validStatuses = ["activo", "egresado", "baja", "pausado"];

    if (!validStatuses.includes(normalizedStatus)) {
      throw new Error("El estado del alumno no es válido.");
    }

    const { data, error } = await supabase
      .from("students")
      .update({ status: normalizedStatus })
      .eq("id", studentId)
      .select(getStudentSelectFields())
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async function deleteStudent(studentId) {
    const supabase = getClient();

    if (!studentId) {
      throw new Error("Falta el ID del alumno.");
    }

    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", studentId);

    if (error) {
      throw error;
    }

    return true;
  }

  App.studentsService = {
    listStudents,
    searchStudents,
    createStudent,
    updateStudent,
    updateStudentStatus,
    deleteStudent
  };
})();