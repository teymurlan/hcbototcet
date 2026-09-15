import staff from './staff-v2';
import type { Env } from './staff-v2';

export { AppState } from './staff-v2';
export type { Env } from './staff-v2';

export default {
  fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = new URL(req.url).origin;
    return staff.fetch(req, { ...env, WEBAPP_URL: origin }, ctx);
  },
};
