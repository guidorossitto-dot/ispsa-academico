(() => {
  "use strict";

  const App = window.App = window.App || {};

  const SUPABASE_URL = "https://gwtryfvkyabiictaaawm.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dHJ5ZnZreWFiaWljdGFhYXdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NTEzOTksImV4cCI6MjA5MzMyNzM5OX0.oJXmqZ6Qh3jzg85_P0pA4TUgadht2AqX7uDGXl7Gnn0";

  if (!window.supabase) {
    console.error("No se cargó la librería de Supabase.");
    return;
  }

  App.supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
})();