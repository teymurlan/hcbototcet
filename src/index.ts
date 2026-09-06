import photo from './photo-v15';
import type { Env } from './photo-v15';

export { AppState } from './photo-v15';
export type { Env } from './photo-v15';

export default {
  fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = new URL(req.url).origin;
    return photo.fetch(req, { ...env, WEBAPP_URL: origin }, ctx);
  },
};
