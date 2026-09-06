import photo from './photo-v19';
import type { Env } from './photo-v19';

export { AppState } from './photo-v19';
export type { Env } from './photo-v19';

export default {
  fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = new URL(req.url).origin;
    return photo.fetch(req, { ...env, WEBAPP_URL: origin }, ctx);
  },
};
