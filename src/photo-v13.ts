import { APP } from './app-v13';
import photoV12 from './photo-v12';
import type { Env } from './photo-v12';

export { AppState } from './photo-v12';
export type { Env } from './photo-v12';

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/app')) {
      return new Response(APP, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store, no-cache, must-revalidate',
          'x-content-type-options': 'nosniff',
          'referrer-policy': 'no-referrer',
          'permissions-policy': 'camera=(self), geolocation=(self)'
        }
      });
    }
    return photoV12.fetch(req, env);
  }
};
