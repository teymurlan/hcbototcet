import staff from './staff-production';
import type { Env } from './staff-production';

export { AppState } from './staff-production';
export type { Env } from './staff-production';

export default {
  fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = new URL(req.url).origin;
    return staff.fetch(req, { ...env, WEBAPP_URL: origin }, ctx);
  },
  scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    return staff.scheduled(controller, env, ctx);
  },
};
