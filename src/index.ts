import photo from './photo-v8';
import type { Env } from './photo-v8';

export { AppState } from './photo-v8';
export type { Env } from './photo-v8';

export default {
  fetch(req: Request, env: Env): Promise<Response> {
    const origin = new URL(req.url).origin;
    return photo.fetch(req, { ...env, WEBAPP_URL: origin });
  },
};
