import photo from './photo-v19-hourglass';
import type { Env } from './photo-v19-hourglass';

export { AppState } from './photo-v19-hourglass';
export type { Env } from './photo-v19-hourglass';

export default {
  fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = new URL(req.url).origin;
    return photo.fetch(req, { ...env, WEBAPP_URL: origin }, ctx);
  },
};
