import staff from './staff-clients';
import type { Env } from './staff-clients';
import type { Env as HumanOrdersEnv } from './staff-human-orders';

export { AppState } from './staff-clients';
export type { Env } from './staff-clients';

// Keep the established human-orders layer explicit in the entrypoint contract while
// the client database extends it through staff-clients.
type _HumanOrdersChainContract = HumanOrdersEnv;

export default {
  fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = new URL(req.url).origin;
    return staff.fetch(req, { ...env, WEBAPP_URL: origin }, ctx);
  },
  scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    return staff.scheduled(controller, env, ctx);
  },
};
