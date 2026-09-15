import staff from './staff-v1';
import type { Env } from './staff-v1';

export { AppState } from './staff-v1';
export type { Env } from './staff-v1';

export default {
  fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = new URL(req.url).origin;
    return staff.fetch(req, { ...env, WEBAPP_URL: origin }, ctx);
  },
};
