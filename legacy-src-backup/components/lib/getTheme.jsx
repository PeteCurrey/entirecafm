import { base44 } from "@/api/base44Client";

export async function getTheme(ctx) {
  try {
    const clientId = ctx?.clientId || window.localStorage.getItem("active_client_id");
    
    if (clientId) {
      const themes = await base44.entities.ClientPortalTheme.filter({ client_id: clientId });
      if (themes.length > 0) {
        const theme = themes[0];
        return {
          logo: theme.logo_url,
          primary: theme.primary_color || "#0E0E11",
          accent: theme.accent_color || "#E1467C",
          welcome: theme.welcome_text || "AI Operations Platform"
        };
      }
    }
  } catch (error) {
    console.log("Theme fetch error:", error);
  }

  // Org/default fallback
  try {
    const orgs = await base44.entities.Organisation.list();
    if (orgs.length > 0) {
      const org = orgs[0];
      return {
        logo: org.logo_url || null,
        primary: org.settings?.primary_color || "#0E0E11",
        accent: org.settings?.accent_color || "#E1467C",
        welcome: "AI Operations Platform"
      };
    }
  } catch {}

  // Hard fallback
  return {
    logo: null,
    primary: "#0E0E11",
    accent: "#E1467C",
    welcome: "AI Operations Platform"
  };
}