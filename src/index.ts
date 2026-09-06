import photo from './photo-v6';
import type { Env } from './photo-v6';

export { AppState } from './photo-v6';
export type { Env } from './photo-v6';

export default {
  fetch(req: Request, env: Env): Promise<Response> {
    const origin = new URL(req.url).origin;
    return photo.fetch(req, { ...env, WEBAPP_URL: origin });
  },
};
