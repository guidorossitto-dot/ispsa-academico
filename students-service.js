(() => {
  "use strict";

  const App = window.App = window.App || {};

  async function listStudents() {
    if (!App.supabase) {
      throw new Error("Supabase no está inicializado.");
    }

    const { data, error } = await App.supabase
      .from("students")
      .select("id, first_name, last_name, dni, email, phone, status, notes, created_at")
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  }

  async function createStudent(student) {
    if (!App.supabase) {
      throw new Error("Supabase no está inicializado.");
    }

    const payload = {
      first_name: student.first_name,
      last_name: student.last_name,
      dni: student.dni || null,
      email: student.email || null,
      phone: student.phone || null,
      status: student.status || "activo",
      notes: student.notes || null
    };

    const { data, error } = await App.supabase
      .from("students")
      .insert(payload)
      .select("id, first_name, last_name, dni, email, phone, status, notes, created_at")
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  App.studentsService = {
    listStudents,
    createStudent
  };
})();