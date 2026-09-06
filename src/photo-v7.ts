import { APP } from './app-v7';
import photoV6 from './photo-v6';
export { AppState } from './photo-v6';
export type { Env } from './photo-v6';
import type { Env } from './photo-v6';

export default {
  fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/app')) {
      return Promise.resolve(new Response(APP, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store, no-cache, must-revalidate',
          'x-content-type-options': 'nosniff',
          'referrer-policy': 'no-referrer',
        },
      }));
    }
    return photoV6.fetch(req, env);
  },
};
