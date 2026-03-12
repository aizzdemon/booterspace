(function attachEnvReader(globalScope) {
  if (typeof globalScope.getEnvVar === "function") return;

  globalScope.getEnvVar = function getEnvVar(...keys) {
    const runtimeEnv = globalScope.__ENV__ || {};
    const processEnv = typeof process !== "undefined" && process.env ? process.env : {};

    for (const key of keys) {
      if (runtimeEnv[key]) return runtimeEnv[key];
      if (processEnv[key]) return processEnv[key];
    }

    return "";
  };
})(typeof window !== "undefined" ? window : self);
