import photo from './photo-v10';
import type { Env } from './photo-v10';

export { AppState } from './photo-v10';
export type { Env } from './photo-v10';

export default {
  fetch(req: Request, env: Env): Promise<Response> {
    const origin = new URL(req.url).origin;
    return photo.fetch(req, { ...env, WEBAPP_URL: origin });
  },
};
