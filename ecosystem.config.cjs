module.exports = {
  apps: [
    {
      name: process.env.PM2_APP_NAME_API || "openmiq-api",
      cwd: "./apps/api",
      script: "dist/index.js",
      env: { HOST: "127.0.0.1" },
    },
    {
      name: process.env.PM2_APP_NAME_WEB || "openmiq-web",
      cwd: "./apps/web",
      script: "build/index.js",
      env: { HOST: "127.0.0.1", PORT: "9414" },
    },
  ],
};
