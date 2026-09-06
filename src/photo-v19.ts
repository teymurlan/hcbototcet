import { APP } from './app-v19-premium';
import photoV18, { AppState as BaseAppState } from './photo-v18-fast';
import type { Env } from './photo-v18-fast';

export type { Env } from './photo-v18-fast';
export class AppState extends BaseAppState {}

export default {
  async fetch(req: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    const u = new URL(req.url);
    if (req.method === 'GET' && (u.pathname === '/' || u.pathname === '/app')) {
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
    return photoV18.fetch(req, env, ctx as any);
  }
};
