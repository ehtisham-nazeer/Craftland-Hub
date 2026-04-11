// eslint-disable-next-line @typescript-eslint/no-require-imports
const mod = require("../artifacts/api-server/dist/serverless.cjs");
const app = mod.default ?? mod;
export default app;
