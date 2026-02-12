const { copySync, removeSync, readFileSync, writeFileSync } = require("fs-extra");
const klaw = require("klaw");

const BUILD_DIR = "dist";
const OUT_DIR = "dist_injected";

// Map of placeholder → env var name
// At build time, Vite replaces import.meta.env.VITE_X with the literal string value.
// We build with placeholder values like "__VITE_API_URL__" so they appear in the output JS.
const REPLACEMENTS = {
  __VITE_API_URL__: process.env.VITE_API_URL || "",
  __VITE_WS_URL__: process.env.VITE_WS_URL || "",
  __VITE_MEDIA_URL__: process.env.VITE_MEDIA_URL || "",
  __VITE_PROXY_URL__: process.env.VITE_PROXY_URL || "",
  __VITE_HCAPTCHA_SITEKEY__: process.env.VITE_HCAPTCHA_SITEKEY || "",
  __VITE_GIFBOX_URL__: process.env.VITE_GIFBOX_URL || "",
};

// Also support REVOLT_PUBLIC_URL as an alias for VITE_API_URL (Helm chart compat)
if (process.env.REVOLT_PUBLIC_URL && !process.env.VITE_API_URL) {
  REPLACEMENTS.__VITE_API_URL__ = process.env.REVOLT_PUBLIC_URL;
}

(async () => {
  console.log("Preparing injected build...");

  try {
    removeSync(OUT_DIR);
  } catch (_) {}

  copySync(BUILD_DIR, OUT_DIR);

  console.log("Injecting environment variables...");
  for await (const file of klaw(OUT_DIR)) {
    const path = file.path;
    if (path.endsWith(".js") || path.endsWith(".html")) {
      let data = readFileSync(path, "utf-8");
      let modified = false;

      for (const [placeholder, value] of Object.entries(REPLACEMENTS)) {
        if (data.includes(placeholder)) {
          data = data.replaceAll(placeholder, value);
          modified = true;
        }
      }

      if (modified) {
        console.log("Injected:", path);
        writeFileSync(path, data);
      }
    }
  }

  console.log("Injection complete.");
})();
