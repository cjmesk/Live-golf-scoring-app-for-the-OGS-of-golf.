window.OGSGolf = window.OGSGolf || {};
window.OGSGolf.cloud = window.OGSGolf.cloud || {};

window.OGSGolf.cloud.getSupabaseClient = function getSupabaseClient() {
  const config = window.OGSGolf.cloud.supabaseConfig;

  if (!window.supabase || !config.url || !config.anonKey) {
    return null;
  }

  return window.supabase.createClient(config.url, config.anonKey);
};
