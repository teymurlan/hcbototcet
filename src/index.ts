export interface Env { AI: Ai; TELEGRAM_BOT_TOKEN: string; }
const TELEGRAM_API=(token:string)=>`https://api.telegram.org/bot${token}`;
const TELEGRAM_FILE_API=(token:string)=>`https://api.telegram.org/file/bot${token}`;
const VISION_MODEL="@cf/google/gemma-4-26b-a4b-it";
const MAX_IMAGE_BYTES=8*1024*1024;
const SYSTEM_PROMPT=`Ты анализируешь фото расклада Таро. Работай только с тем, что видно. Не придумывай карты. Нечитаемая карта: card_name=null, confidence=low. Верни короткий JSON на русском без markdown и без рассуждений. Поля: readable, deck, cards, spread_type, analysis, conclusion, advice. В cards: position, card_name, orientation (upright/reversed/unknown), confidence (high/medium/low).`;
interface TelegramUpdate{update_id:number;message?:{message_id:number;chat:{id:number};photo?:Array<{file_id:string;width:number;height:number;file_size?:number}>;caption?:string;text?:string}};
export default{async fetch(request:Request,env:Env):Promise<Response>{
 if(request.method==="GET")return new Response("Tarot bot is running");
 if(request.method!=="POST")return new Response("Method Not Allowed",{status:405});
 let update:TelegramUpdate|undefined;
 try{update=await request.json<TelegramUpdate>();await handleUpdate(update,env)}catch(error){
  console.error("[TAROT BOT]",error);const chatId=update?.message?.chat.id;
  if(chatId)await sendMessage(env.TELEGRAM_BOT_TOKEN,chatId,"Не удалось обработать расклад. Попробуйте отправить фото ещё раз.");
 }
 return new Response("OK");
}} satisfies ExportedHandler<Env>;
async function handleUpdate(update:TelegramUpdate,env:Env){
 const m=update.message;if(!m)return;const t=env.TELEGRAM_BOT_TOKEN,c=m.chat.id;
 if(m.text==="/start"){await sendMessage(t,c,"🔮 Добро пожаловать.\n\nОтправьте фото расклада Таро и вопрос в подписи.");return}
 if(!m.photo?.length){await sendMessage(t,c,"Пришлите фото расклада Таро и вопрос в подписи.");return}
 const q=(m.caption||"").trim();if(!q){await sendMessage(t,c,"Добавьте вопрос в подписи к фотографии и отправьте её ещё раз.");return}
 await sendMessage(t,c,"Фото получил. Распознаю карты и готовлю разбор...");
 const p=m.photo[m.photo.length-1];const file=await downloadTelegramImage(t,p.file_id);const result=await analyzeTarot(env,file.buffer,file.mime,q);await sendMessage(t,c,formatTarotResult(result,q));
}
async function downloadTelegramImage(t:string,id:string):Promise<{buffer:ArrayBuffer;mime:string}>{
 const r=await fetch(`${TELEGRAM_API(t)}/getFile?file_id=${encodeURIComponent(id)}`);if(!r.ok)throw new Error(`Telegram getFile HTTP ${r.status}`);
 const j=await r.json<any>();if(!j.ok||!j.result?.file_path)throw new Error("Telegram getFile failed");
 const image=await fetch(`${TELEGRAM_FILE_API(t)}/${j.result.file_path}`);if(!image.ok)throw new Error(`Telegram image HTTP ${image.status}`);
 const n=Number(image.headers.get("content-length")||0);if(n>MAX_IMAGE_BYTES)throw new Error("Image too large");
 const buffer=await image.arrayBuffer();if(buffer.byteLength>MAX_IMAGE_BYTES||!buffer.byteLength)throw new Error("Image too large or empty");
 const h=image.headers.get("content-type")?.split(";")[0].trim().toLowerCase();return{buffer,mime:h?.startsWith("image/")?h:"image/jpeg"};
}
function toDataUrl(buffer:ArrayBuffer,mime:string){const bytes=new Uint8Array(buffer);let binary="";for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+0x8000,bytes.length)));return`data:${mime};base64,${btoa(binary)}`}
async function analyzeTarot(env:Env,buffer:ArrayBuffer,mime:string,q:string){
 const image=toDataUrl(buffer,mime);
 const prompt=`Вопрос: ${q}\n\nПосмотри фото расклада. Посчитай только видимые карты. Не угадывай нечитаемые. Коротко интерпретируй расклад по вопросу. Верни ТОЛЬКО один полный JSON: {"readable":true,"deck":"...","cards":[{"position":1,"card_name":"...","orientation":"upright","confidence":"high"}],"spread_type":"...","analysis":"...","conclusion":"...","advice":"..."}`;
 const response=await env.AI.run(VISION_MODEL,{messages:[{role:"system",content:SYSTEM_PROMPT},{role:"user",content:prompt}],image,temperature:0.2,max_tokens:2400,chat_template_kwargs:{enable_thinking:false,clear_thinking:true}} as any);
 const raw=extractModelText(response);if(!raw){console.error("[TAROT BOT] AI empty",response);throw new Error("Workers AI returned no final answer")}
 return normalize(parseJson(raw));
}
function extractModelText(response:any){if(typeof response==="string")return response.trim();if(typeof response?.response==="string"&&response.response.trim())return response.response.trim();const m=response?.choices?.[0]?.message;if(typeof m?.content==="string"&&m.content.trim())return m.content.trim();if(Array.isArray(m?.content))return m.content.map((x:any)=>typeof x==="string"?x:x?.text||"").join("").trim();return""}
function parseJson(raw:string){const cleaned=raw.replace(/^\s*```json\s*/i,"").replace(/^\s*```\s*/i,"").replace(/\s*```\s*$/i,"").trim();try{return JSON.parse(cleaned)}catch{const s=cleaned.indexOf("{"),e=cleaned.lastIndexOf("}");if(s>=0&&e>s)try{return JSON.parse(cleaned.slice(s,e+1))}catch{}throw new Error(`Invalid AI JSON: ${cleaned.slice(0,500)}`)}}
function normalize(v:any){const cards=Array.isArray(v?.cards)?v.cards.map((x:any,i:number)=>({position:Number(x?.position)||i+1,card_name:typeof x?.card_name==="string"&&x.card_name.trim()?x.card_name.trim():null,orientation:["upright","reversed","unknown"].includes(x?.orientation)?x.orientation:"unknown",confidence:["high","medium","low"].includes(x?.confidence)?x.confidence:"low"})):[];return{readable:Boolean(v?.readable??cards.some((x:any)=>x.card_name)),deck:typeof v?.deck==="string"?v.deck:"Не определена",cards,spread_type:typeof v?.spread_type==="string"?v.spread_type:"Схема не определена",analysis:typeof v?.analysis==="string"?v.analysis:"Не удалось сформировать анализ.",conclusion:typeof v?.conclusion==="string"?v.conclusion:"Не удалось сформировать итог.",advice:typeof v?.advice==="string"?v.advice:"Не удалось сформировать совет."}}
function formatTarotResult(r:any,q:string){if(!r.cards?.some((c:any)=>c.card_name))return"Я не смог уверенно распознать карты. Пришлите фото крупнее, чтобы все карты были хорошо видны.";const lines=r.cards.map((c:any,i:number)=>`${Number(c.position)||i+1}. ${c.card_name||"Карта не определена"}${c.orientation==="reversed"?" — перевёрнутая":c.orientation==="upright"?" — прямая":" — положение не определено"}`).join("\n");return`🔮 РАЗБОР РАСКЛАДА\n\nВопрос: ${q}\n\nКарты:\n${lines}\n\nСхема: ${r.spread_type}\n\nОБЩИЙ АНАЛИЗ\n${r.analysis}\n\nИТОГ\n${r.conclusion}\n\nСОВЕТ\n${r.advice}\n\nЭто символическая интерпретация Таро, а не гарантированное предсказание будущего.`}
async function sendMessage(t:string,c:number,text:string){const r=await fetch(`${TELEGRAM_API(t)}/sendMessage`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({chat_id:c,text,disable_web_page_preview:true})});if(!r.ok)console.error("[TAROT BOT] Telegram sendMessage failed",await r.text())}
