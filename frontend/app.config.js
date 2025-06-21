// app.config.js
require("dotenv").config();

export default ({ config }) => ({
  ...config,
  extra: {
    ...config.extra, // Preserve existing extra fields
    API_URL: process.env.API_URL,
  },
});
