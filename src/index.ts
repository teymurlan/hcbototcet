import photo from './photo-v14';
import type { Env } from './photo-v14';

export { AppState } from './photo-v14';
export type { Env } from './photo-v14';

export default {
  fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = new URL(req.url).origin;
    return photo.fetch(req, { ...env, WEBAPP_URL: origin }, ctx);
  },
};
