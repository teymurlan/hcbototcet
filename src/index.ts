import photo from './photo-v13';
import type { Env } from './photo-v13';

export { AppState } from './photo-v13';
export type { Env } from './photo-v13';

export default {
  fetch(req: Request, env: Env): Promise<Response> {
    const origin = new URL(req.url).origin;
    return photo.fetch(req, { ...env, WEBAPP_URL: origin });
  },
};
