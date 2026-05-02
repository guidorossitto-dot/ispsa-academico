(() => {
  "use strict";

  const App = window.App = window.App || {};

  async function signIn(email, password) {
    if (!App.supabase) {
      throw new Error("Supabase no está inicializado.");
    }

    const { data, error } = await App.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    const profile = await getCurrentProfile();

    return {
      user: data.user,
      session: data.session,
      profile
    };
  }

  async function signOut() {
    if (!App.supabase) {
      throw new Error("Supabase no está inicializado.");
    }

    const { error } = await App.supabase.auth.signOut();

    if (error) {
      throw error;
    }

    return true;
  }

  async function getSession() {
    if (!App.supabase) return null;

    const { data, error } = await App.supabase.auth.getSession();

    if (error) {
      throw error;
    }

    return data.session;
  }

  async function getCurrentUser() {
    if (!App.supabase) return null;

    const { data, error } = await App.supabase.auth.getUser();

    if (error) {
      throw error;
    }

    return data.user;
  }

  async function getCurrentProfile() {
    const user = await getCurrentUser();

    if (!user) return null;

    const { data, error } = await App.supabase
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return {
        id: user.id,
        email: user.email,
        full_name: user.email,
        role: "alumno",
        missingProfile: true
      };
    }

    return data;
  }

  App.auth = {
    signIn,
    signOut,
    getSession,
    getCurrentUser,
    getCurrentProfile
  };
})();