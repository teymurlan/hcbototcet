import staff from './staff-v3';
import type { Env } from './staff-v3';

export { AppState } from './staff-v3';
export type { Env } from './staff-v3';

export default {
  fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = new URL(req.url).origin;
    return staff.fetch(req, { ...env, WEBAPP_URL: origin }, ctx);
  },
};
