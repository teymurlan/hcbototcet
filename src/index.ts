export interface Env {
  AI: Ai;
  TELEGRAM_BOT_TOKEN: string;
}

const TELEGRAM_API = (token: string) => `https://api.telegram.org/bot${token}`;
const TELEGRAM_FILE_API = (token: string) => `https://api.telegram.org/file/bot${token}`;
const VISION_MODEL = "@cf/google/gemma-4-26b-a4b-it";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const SYSTEM_PROMPT = `Ты — аккуратный консультант по символической интерпретации Таро. Не придумывай карты и не выдавай догадки за факт. Сначала распознай только реально видимые карты, их порядок и положение. Если название карты нельзя уверенно прочитать или определить по изображению, используй card_name=null и confidence=low. Не добавляй карты, которых нет на фото. Затем кратко интерпретируй весь расклад строго в контексте вопроса пользователя. Если схема расклада неизвестна, так и укажи. Ответ должен быть на русском языке. Это символическая интерпретация, а не гарантированное предсказание.`;

interface TelegramUpdate { update_id:number; message?:{ message_id:number; chat:{id:number}; photo?:Array<{file_id:string;width:number;height:number;file_size?:number}>; caption?:string; text?:string } }

export default { async fetch(request:Request, env:Env):Promise<Response> {
  if (request.method === "GET") return new Response("Tarot bot is running");
  if (request.method !== "POST") return new Response("Method Not Allowed", {status:405});
  let update:TelegramUpdate|undefined;
  try { update=await request.json<TelegramUpdate>(); await handleUpdate(update,env); }
  catch(error) {
    console.error("[TAROT BOT] Update processing error:",error);
    console.error("[TAROT BOT] Error stack:",error instanceof Error?error.stack:String(error));
    const chatId=update?.message?.chat.id;
    if(chatId){const detail=error instanceof Error?error.message:String(error);await sendMessage(env.TELEGRAM_BOT_TOKEN,chatId,/size|large|bytes|too large/i.test(detail)?"Фото слишком большое. Пришлите фото меньшего размера.":"Не удалось обработать расклад. Ошибка записана в логах Cloudflare.")}
  }
  return new Response("OK");
} } satisfies ExportedHandler<Env>;

async function handleUpdate(update:TelegramUpdate,env:Env){
  const m=update.message;if(!m)return;const t=env.TELEGRAM_BOT_TOKEN,c=m.chat.id;
  if(m.text==="/start"){await sendMessage(t,c,"🔮 Добро пожаловать.\n\nОтправьте фото расклада Таро и вопрос в подписи. Я определю только видимые карты и дам символический разбор по вашему вопросу.");return}
  if(!m.photo?.length){await sendMessage(t,c,"Пришлите фотографию расклада Таро и вопрос в подписи.");return}
  const q=(m.caption||"").trim();if(!q){await sendMessage(t,c,"Фото получил. Добавьте вопрос в подписи к фотографии и отправьте ещё раз.");return}
  await sendMessage(t,c,"Фото получил. Распознаю карты и готовлю разбор...");
  const p=m.photo[m.photo.length-1];const file=await downloadTelegramImage(t,p.file_id);const result=await analyzeTarot(env,file.buffer,file.mime,q);await sendMessage(t,c,formatTarotResult(result,q));
}

async function downloadTelegramImage(t:string,id:string):Promise<{buffer:ArrayBuffer;mime:string}>{
  const r=await fetch(`${TELEGRAM_API(t)}/getFile?file_id=${encodeURIComponent(id)}`);if(!r.ok)throw new Error(`Telegram getFile HTTP ${r.status}`);
  const j=await r.json<any>();if(!j.ok||!j.result?.file_path)throw new Error(`Telegram getFile failed: ${JSON.stringify(j)}`);
  const image=await fetch(`${TELEGRAM_FILE_API(t)}/${j.result.file_path}`);if(!image.ok)throw new Error(`Telegram image download HTTP ${image.status}`);
  const n=Number(image.headers.get("content-length")||0);if(n>MAX_IMAGE_BYTES)throw new Error(`Image too large: ${n} bytes`);
  const buffer=await image.arrayBuffer();if(buffer.byteLength>MAX_IMAGE_BYTES)throw new Error(`Image too large: ${buffer.byteLength} bytes`);if(!buffer.byteLength)throw new Error("Downloaded image is empty");
  const h=image.headers.get("content-type")?.split(";")[0].trim().toLowerCase();return{buffer,mime:h?.startsWith("image/")?h:"image/jpeg"};
}

function toDataUrl(buffer:ArrayBuffer,mime:string):string{const bytes=new Uint8Array(buffer);let binary="";const chunk=0x8000;for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+chunk,bytes.length)));return `data:${mime};base64,${btoa(binary)}`}

async function analyzeTarot(env:Env,buffer:ArrayBuffer,mime:string,q:string){
  const image=toDataUrl(buffer,mime);
  const prompt=`Вопрос: ${q}\n\nНа фото расклад Таро. Сначала посчитай только фактически видимые карты. Для каждой реально видимой карты укажи position, card_name, orientation и confidence. Не угадывай нечитаемые карты и не добавляй отсутствующие. Затем дай короткий общий анализ по вопросу. Если схема неизвестна, напиши это. Верни ТОЛЬКО валидный JSON без markdown и без дополнительных пояснений: {"readable":true,"deck":"...","cards":[{"position":1,"card_name":"...","orientation":"upright|reversed|unknown","confidence":"high|medium|low"}],"spread_type":"...","analysis":"...","conclusion":"...","advice":"..."}`;
  console.log("[TAROT BOT] Sending downloaded image to Workers AI",{bytes:buffer.byteLength,mime,model:VISION_MODEL});
  const response=await env.AI.run(VISION_MODEL,{messages:[
    {role:"system",content:SYSTEM_PROMPT},
    {role:"user",content:[{type:"text",text:prompt},{type:"image_url",image_url:{url:image}}]}
  ],temperature:0.1,max_tokens:1200} as any);
  console.log("[TAROT BOT] Workers AI response received");
  const msg=(response as any)?.choices?.[0]?.message;
  const raw=typeof response==="string"?response:(typeof msg?.content==="string"?msg.content.trim():"");
  if(!raw){
    const reasoning=typeof msg?.reasoning_content==="string"?msg.reasoning_content.trim():"";
    console.error("[TAROT BOT] Empty content; model finish reason:",(response as any)?.choices?.[0]?.finish_reason);
    if(reasoning){
      throw new Error("Workers AI completed reasoning but returned no final answer. Retrying with a shorter prompt is required.");
    }
    throw new Error(`Workers AI returned empty response: ${JSON.stringify(response)}`);
  }
  return normalize(parseJson(raw));
}

function parseJson(raw:string){
  try{return JSON.parse(raw)}catch{
    const cleaned=raw.replace(/```json/gi,"").replace(/```/g,"").trim();
    try{return JSON.parse(cleaned)}catch{
      const s=cleaned.indexOf("{"),e=cleaned.lastIndexOf("}");
      if(s>=0&&e>s)return JSON.parse(cleaned.slice(s,e+1));
      throw new Error(`Workers AI returned non-JSON response: ${cleaned.slice(0,500)}`);
    }
  }
}

function normalize(v:any){
  const cards=Array.isArray(v?.cards)?v.cards.map((x:any,i:number)=>({position:Number(x?.position)||i+1,card_name:typeof x?.card_name==="string"&&x.card_name.trim()?x.card_name.trim():null,orientation:["upright","reversed","unknown"].includes(x?.orientation)?x.orientation:"unknown",confidence:["high","medium","low"].includes(x?.confidence)?x.confidence:"low"})):[];
  return{readable:Boolean(v?.readable??cards.some((x:any)=>x.card_name)),deck:typeof v?.deck==="string"?v.deck:"Не определена",cards,spread_type:typeof v?.spread_type==="string"?v.spread_type:"Схема не определена",analysis:typeof v?.analysis==="string"?v.analysis:"Не удалось сформировать анализ.",conclusion:typeof v?.conclusion==="string"?v.conclusion:"Не удалось сформировать итог.",advice:typeof v?.advice==="string"?v.advice:"Не удалось сформировать совет."};
}

function formatTarotResult(r:any,q:string){
  if(!r.cards?.some((c:any)=>c.card_name))return"Я не смог уверенно распознать карты на фотографии. Не хочу угадывать.\n\nПришлите фото крупнее, чтобы все карты были хорошо видны.";
  const lines=r.cards.map((c:any,i:number)=>`${Number(c.position)||i+1}. ${c.card_name||"Карта не определена"}${c.orientation==="reversed"?" — перевёрнутая":c.orientation==="upright"?" — прямая":" — положение не определено"}`).join("\n");
  return`🔮 РАЗБОР РАСКЛАДА\n\nВопрос: ${q}\n\nКарты:\n${lines}\n\nСхема: ${r.spread_type}\n\nОБЩИЙ АНАЛИЗ\n${r.analysis}\n\nИТОГ\n${r.conclusion}\n\nСОВЕТ\n${r.advice}\n\nЭто символическая интерпретация Таро, а не гарантированное предсказание будущего.`;
}

async function sendMessage(t:string,c:number,text:string){const r=await fetch(`${TELEGRAM_API(t)}/sendMessage`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({chat_id:c,text,disable_web_page_preview:true})});if(!r.ok)console.error("[TAROT BOT] Telegram sendMessage failed",await r.text())}
