import {
  AdminRepositoryContext,
  supabaseAdminRepository,
  type AdminRepository,
} from "./admin-settings.js";
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { createClient } from "@supabase/supabase-js";
import { readAuthConfig } from "./auth-config.js";
import { GoogleAuthController } from "./google-auth.js";
import { loadWorkspaceAccess } from "./workspace-access.js";
import type { AccessLoader } from "./auth-entry.js";
import { SiteEntry } from "./auth-entry.js";
import "./style.css";
let config = readAuthConfig(import.meta.env);
let controller: GoogleAuthController | undefined;
let loadAccess: AccessLoader | undefined;
let adminRepository: AdminRepository | null = null;
try {
  if (config.mode === "configured") {
    const client = createClient(config.url, config.key, {
      auth: {
        flowType: "pkce",
        detectSessionInUrl: false,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    adminRepository = supabaseAdminRepository(client);
    loadAccess = (userId) => loadWorkspaceAccess(client, userId);
    controller = new GoogleAuthController(
      client.auth,
      {
        href: () => window.location.href,
        replace: (url) => window.history.replaceState(null, "", url),
        go: (url) => window.location.assign(url),
      },
      config.url,
    );
  }
} catch {
  config = { mode: "blocked" };
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AdminRepositoryContext.Provider value={adminRepository}>
      {config.mode === "preview" ? (
        <App />
      ) : (
        <SiteEntry
          config={config}
          controller={controller}
          loadAccess={loadAccess}
        />
      )}
    </AdminRepositoryContext.Provider>
  </React.StrictMode>,
);
