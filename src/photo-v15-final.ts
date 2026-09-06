import { APP } from './app-v15-final';
import photoV15 from './photo-v15';
import type { Env } from './photo-v15';
export { AppState } from './photo-v15';
export type { Env } from './photo-v15';

export default {
  async fetch(req:Request,env:Env,ctx?:ExecutionContext):Promise<Response>{
    const u=new URL(req.url);
    if(req.method==='GET'&&(u.pathname==='/'||u.pathname==='/app'))return new Response(APP,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate','x-content-type-options':'nosniff','referrer-policy':'no-referrer','permissions-policy':'camera=(self), geolocation=(self)'}});
    return photoV15.fetch(req,env,ctx);
  }
};
