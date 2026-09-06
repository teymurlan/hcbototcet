import photo from './photo-v18-fast';
import type { Env } from './photo-v18-fast';

export { AppState } from './photo-v18-fast';
export type { Env } from './photo-v18-fast';

export default {
  fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = new URL(req.url).origin;
    return photo.fetch(req, { ...env, WEBAPP_URL: origin }, ctx);
  },
};
