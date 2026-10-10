const environment = process.env.APP_ENV;
if (!environment || !["dev", "staging"].includes(environment))
  throw new Error("APP_ENV must be dev or staging.");
const heartbeat = () =>
  console.log(
    JSON.stringify({
      service: "worker",
      environment,
      status: "idle",
      integrations: "deferred",
    }),
  );
heartbeat();
const timer = setInterval(heartbeat, 30000);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => {
    clearInterval(timer);
  });
// Skeleton only: no queue or business jobs until P03 delivers the worker contract.
