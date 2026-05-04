// documents-service.js
(() => {
  "use strict";

  const App = window.App = window.App || {};

  const BUCKET_NAME = "academic-documents";

  const DOCUMENT_TYPES = {
    teacher: [
      { value: "dni", label: "DNI" },
      { value: "titulo_habilitante", label: "Título habilitante / título docente" },
      { value: "titulo_secundario", label: "Título secundario" },
      { value: "cv", label: "CV" },
      { value: "cuil", label: "Constancia de CUIL" },
      { value: "antecedentes_nacionales", label: "Antecedentes nacionales" },
      { value: "antecedentes_provinciales", label: "Antecedentes provinciales" },
      { value: "registro_cuota_alimentaria", label: "Registro de cuota alimentaria" },
      { value: "declaracion_jurada_cargos", label: "Declaración jurada de cargos" },
      { value: "apto_psicofisico", label: "Apto psico-físico" },
      { value: "fotos_4x4", label: "2 fotos 4x4" },
      { value: "designacion_contrato", label: "Designación / contrato" },
      { value: "certificado", label: "Certificados / cursos" },
      { value: "otro", label: "Otros" }
    ],

    student: [
      { value: "dni", label: "DNI" },
      { value: "titulo_secundario", label: "Título secundario" },
      { value: "partida_nacimiento", label: "Partida / certificado de nacimiento" },
      { value: "ficha_inscripcion", label: "Ficha de inscripción firmada" },
      { value: "apto_psicofisico", label: "Certificado de apto psico-físico" },
      { value: "fotos_4x4", label: "2 fotos carnet 4x4" },
      { value: "cuil", label: "Constancia de CUIL" },
      { value: "otro", label: "Otros" }
    ]
  };

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

  function getDocumentTypes(personType) {
    return DOCUMENT_TYPES[personType] || [];
  }

  function getDocumentTypeLabel(personType, documentType) {
    const found = getDocumentTypes(personType).find(
      (item) => item.value === documentType
    );

    return found?.label || documentType || "-";
  }

  function validatePersonType(personType) {
    if (!["student", "teacher"].includes(personType)) {
      throw new Error("Tipo de persona inválido.");
    }
  }

  function validateDocumentType(personType, documentType) {
    const validTypes = getDocumentTypes(personType).map((item) => item.value);

    if (!validTypes.includes(documentType)) {
      throw new Error("Tipo de documento inválido.");
    }
  }

  function sanitizeFileName(fileName) {
    const original = normalizeText(fileName) || "documento";

    return original
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
  }

  function buildStoragePath({ personType, personId, documentType, fileName }) {
    const safeName = sanitizeFileName(fileName);
    const timestamp = Date.now();

    return `${personType}/${personId}/${documentType}/${timestamp}-${safeName}`;
  }

  function getDocumentSelectFields() {
    return `
      id,
      person_type,
      person_id,
      document_type,
      title,
      file_path,
      file_name,
      file_mime_type,
      file_size,
      notes,
      uploaded_by,
      created_at
    `;
  }

  async function listDocuments(personType, personId) {
    const supabase = getClient();

    validatePersonType(personType);

    if (!personId) {
      throw new Error("Falta el ID de la persona.");
    }

    const { data, error } = await supabase
      .from("person_documents")
      .select(getDocumentSelectFields())
      .eq("person_type", personType)
      .eq("person_id", personId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  }

  async function uploadDocument({
    personType,
    personId,
    documentType,
    title,
    notes,
    file
  }) {
    const supabase = getClient();

    validatePersonType(personType);
    validateDocumentType(personType, documentType);

    if (!personId) {
      throw new Error("Falta el ID de la persona.");
    }

    if (!file) {
      throw new Error("Seleccioná un archivo.");
    }

    const storagePath = buildStoragePath({
      personType,
      personId,
      documentType,
      fileName: file.name
    });

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    try {
      const { data, error } = await supabase
        .from("person_documents")
        .insert({
          person_type: personType,
          person_id: personId,
          document_type: documentType,
          title: normalizeNullableText(title),
          file_path: storagePath,
          file_name: file.name,
          file_mime_type: file.type || null,
          file_size: file.size || null,
          notes: normalizeNullableText(notes)
        })
        .select(getDocumentSelectFields())
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      await supabase.storage
        .from(BUCKET_NAME)
        .remove([storagePath]);

      throw error;
    }
  }

  async function createSignedUrl(filePath) {
    const supabase = getClient();

    if (!filePath) {
      throw new Error("Falta la ruta del archivo.");
    }

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 60 * 5);

    if (error) {
      throw error;
    }

    return data.signedUrl;
  }

  async function deleteDocument(documentId) {
    const supabase = getClient();

    if (!documentId) {
      throw new Error("Falta el ID del documento.");
    }

    const { data: document, error: findError } = await supabase
      .from("person_documents")
      .select("id, file_path")
      .eq("id", documentId)
      .single();

    if (findError) {
      throw findError;
    }

    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([document.file_path]);

    if (storageError) {
      throw storageError;
    }

    const { error: deleteError } = await supabase
      .from("person_documents")
      .delete()
      .eq("id", documentId);

    if (deleteError) {
      throw deleteError;
    }

    return true;
  }

  App.documentsService = {
    getDocumentTypes,
    getDocumentTypeLabel,
    listDocuments,
    uploadDocument,
    createSignedUrl,
    deleteDocument
  };
})();