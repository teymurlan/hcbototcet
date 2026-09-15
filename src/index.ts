import staff from './staff-v4';
import type { Env } from './staff-v4';

export { AppState } from './staff-v4';
export type { Env } from './staff-v4';

export default {
  fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = new URL(req.url).origin;
    return staff.fetch(req, { ...env, WEBAPP_URL: origin }, ctx);
  },
  scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    return staff.scheduled(controller, env, ctx);
  },
};
