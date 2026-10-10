export function runtimeConfig(env: NodeJS.ProcessEnv) {
  if (!env.APP_ENV || !["dev", "staging"].includes(env.APP_ENV))
    throw new Error("APP_ENV must be dev or staging.");
  const port = Number(env.API_PORT);
  if (
    !Number.isInteger(port) ||
    String(port) !== env.API_PORT ||
    port < 1024 ||
    port > 65535
  )
    throw new Error("API_PORT must be an integer between 1024 and 65535.");
  return { environment: env.APP_ENV, port };
}
