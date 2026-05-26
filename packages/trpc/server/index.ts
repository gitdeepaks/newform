import { router } from "./trpc";

import { healthRouter } from "./routes/health/route";
import { authRouter } from "./routes/auth/route";
import { formRouter } from "./routes/form/route";
import { adminRouter } from "./routes/admin/route";

export const serverRouter = router({
  health: healthRouter,
  auth: authRouter,
  form: formRouter,
  admin: adminRouter,
});

export { createContext } from "./context";
export type ServerRouter = typeof serverRouter;
