import { ADMIN_APP } from './admin-v18-gallery';
import photoV19Hourglass, { AppState as BaseAppState } from './photo-v19-hourglass';
import type { Env } from './photo-v19-hourglass';

export type { Env } from './photo-v19-hourglass';
export class AppState extends BaseAppState {}

export default {
  async fetch(req: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    const u = new URL(req.url);
    if (req.method === 'GET' && u.pathname === '/admin') {
      return new Response(ADMIN_APP, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store, no-cache, must-revalidate',
          'x-content-type-options': 'nosniff',
          'referrer-policy': 'no-referrer',
          'permissions-policy': 'camera=(self), geolocation=(self)'
        }
      });
    }
    return photoV19Hourglass.fetch(req, env, ctx as any);
  }
};
