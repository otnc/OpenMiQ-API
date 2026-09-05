// pm2 runs `script` directly with node, bypassing each app's own package.json
// "start" script — so the shared root .env (see .env.example) is loaded here
// via node_args instead, the same --env-file-if-exists flag "start" uses.
const ENV_FILE_ARGS = [
  "--env-file-if-exists=../../.env",
  "--env-file-if-exists=../../.env.local",
];

module.exports = {
  apps: [
    {
      name: process.env.PM2_APP_NAME_API || "openmiq-api",
      cwd: "./apps/api",
      script: "dist/index.mjs",
      node_args: ENV_FILE_ARGS,
    },
    {
      name: process.env.PM2_APP_NAME_WEB || "openmiq-web",
      cwd: "./apps/web",
      script: "build/index.js",
      node_args: ENV_FILE_ARGS,
    },
  ],
};
