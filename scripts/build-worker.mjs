import { spawnSync } from "node:child_process";
for (const args of [
  ["run", "build"],
  [
    "exec",
    "--",
    "esbuild",
    "backend/worker.ts",
    "--bundle",
    "--format=esm",
    "--platform=browser",
    "--target=es2022",
    "--external:node:*",
    "--outfile=dist/backend-worker.mjs",
  ],
]) {
  const result = spawnSync("npm", args, {
    stdio: "inherit",
    env: {
      ...process.env,
      NUXT_PUBLIC_BACKEND_ENABLED: "true",
      BASE_PATH: "/",
    },
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
