import { APP } from './app-v16-keyboard';
import photo from './photo-v17-startfix';
import type { Env } from './photo-v17-startfix';

export { AppState } from './photo-v17-startfix';
export type { Env } from './photo-v17-startfix';

function html(s:string){
  return new Response(s,{headers:{
    'content-type':'text/html; charset=utf-8',
    'cache-control':'no-store, no-cache, must-revalidate',
    'x-content-type-options':'nosniff',
    'referrer-policy':'no-referrer',
    'permissions-policy':'camera=(self), geolocation=(self)'
  }});
}

export default{
  fetch(req:Request,env:Env,ctx?:ExecutionContext):Promise<Response>{
    const u=new URL(req.url);
    if(req.method==='GET'&&(u.pathname==='/'||u.pathname==='/app'))return Promise.resolve(html(APP));
    return photo.fetch(req,env,ctx);
  }
};
