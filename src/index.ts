import photo from './photo-v17-keyboard';
import type { Env } from './photo-v17-keyboard';

export { AppState } from './photo-v17-keyboard';
export type { Env } from './photo-v17-keyboard';

export default {
  fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = new URL(req.url).origin;
    return photo.fetch(req, { ...env, WEBAPP_URL: origin }, ctx);
  },
};
