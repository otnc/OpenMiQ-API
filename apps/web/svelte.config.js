import adapter from "@sveltejs/adapter-node";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter(),
    // Both apps share a single .env at the repo root (see .env.example) —
    // without this, `vite dev` would only look in apps/web for it, and
    // $env/dynamic/private would never see values meant for apps/api's
    // section of that file.
    env: { dir: "../../" },
  },
};

export default config;
