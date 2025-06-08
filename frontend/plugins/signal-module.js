const { withDangerousMod } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

module.exports = function withSignalModule(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      // Copy your Kotlin file to the right location
      const sourceFile = path.join(
        config.modRequest.projectRoot,
        "SignalModule.kt"
      );
      const targetDir = path.join(
        config.modRequest.platformProjectRoot,
        "app/src/main/java/com/anonymous/QoE"
      );
      const targetFile = path.join(targetDir, "SignalModule.kt");

      console.log(sourceFile, targetDir, targetFile);

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      if (fs.existsSync(sourceFile)) {
        fs.copyFileSync(sourceFile, targetFile);
      }

      return config;
    },
  ]);
};
