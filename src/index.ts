import staff from './staff-mira-style';
import type { Env } from './staff-mira-style';

export { AppState } from './staff-mira-style';
export type { Env } from './staff-mira-style';

export default {
  fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = new URL(req.url).origin;
    return staff.fetch(req, { ...env, WEBAPP_URL: origin }, ctx);
  },
  scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    return staff.scheduled(controller, env, ctx);
  },
};
