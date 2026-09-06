import photo from './photo-v19-admin-gallery';
import type { Env } from './photo-v19-admin-gallery';

export { AppState } from './photo-v19-admin-gallery';
export type { Env } from './photo-v19-admin-gallery';

export default {
  fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = new URL(req.url).origin;
    return photo.fetch(req, { ...env, WEBAPP_URL: origin }, ctx);
  },
};
