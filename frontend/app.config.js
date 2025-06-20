// app.config.js
require("dotenv").config();
export default ({ config }) => ({
  ...config,
  extra: {
    API_URL: process.env.API_URL,
  },
});
