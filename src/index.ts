import photo from './photo-v15-final';
import type { Env } from './photo-v15-final';

export { AppState } from './photo-v15-final';
export type { Env } from './photo-v15-final';

export default {
  fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = new URL(req.url).origin;
    return photo.fetch(req, { ...env, WEBAPP_URL: origin }, ctx);
  },
};
