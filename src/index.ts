export interface Env { AI: Ai; TELEGRAM_BOT_TOKEN: string; }
const TELEGRAM_API=(token:string)=>`https://api.telegram.org/bot${token}`;
const TELEGRAM_FILE_API=(token:string)=>`https://api.telegram.org/file/bot${token}`;
const VISION_MODEL="@cf/google/gemma-4-26b-a4b-it";
const MAX_IMAGE_BYTES=8*1024*1024;
const SYSTEM_PROMPT=`Ты кратко анализируешь фото расклада Таро. Внимательно рассмотри ВСЕ карты. Не проси фото крупнее, если изображение читаемо. Не выдумывай карты: если конкретная карта не читается, напиши «не определена». Определи количество видимых карт, их названия и дай символическую интерпретацию вопроса. Никаких рассуждений, самокоррекций, повторов и JSON.`;
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
 const p=m.photo.reduce((best,current)=>current.width*current.height>best.width*best.height?current:best,m.photo[0]);
 const file=await downloadTelegramImage(t,p.file_id);const result=await analyzeTarot(env,file.buffer,file.mime,q);await sendMessage(t,c,formatTarotResult(result,q));
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
async function runVision(env:Env,image:string,prompt:string){return await env.AI.run(VISION_MODEL,{messages:[{role:"system",content:SYSTEM_PROMPT},{role:"user",content:prompt}],image,temperature:0.1,max_tokens:1000,chat_template_kwargs:{enable_thinking:false,clear_thinking:true}} as any)}
async function analyzeTarot(env:Env,buffer:ArrayBuffer,mime:string,q:string){
 const image=toDataUrl(buffer,mime);
 const prompt=`Вопрос: «${q}»\n\nПроанализируй изображение расклада. Ответ строго в формате:\nКАРТЫ: 1) название; 2) название; 3) название; ...\nСХЕМА: кратко, если понятна\nАНАЛИЗ: 3-6 предложений по вопросу\nИТОГ: 1-2 предложения\nСОВЕТ: 1-2 предложения\n\nНе пиши JSON. Не объясняй процесс. Не повторяй текст. Не говори «пришлите фото крупнее», если изображение в целом читаемо.`;
 let response=await runVision(env,image,prompt);let raw=extractModelText(response);
 if(!raw){console.error("[TAROT BOT] AI empty first attempt",response);response=await runVision(env,image,`Определи карты на фото и ответь по вопросу «${q}». Очень коротко. Формат:\nКАРТЫ: перечисли все видимые карты через точку с запятой.\nАНАЛИЗ: краткий ответ.\nИТОГ: краткий итог.`);raw=extractModelText(response)}
 if(!raw){console.error("[TAROT BOT] AI empty retry",response);throw new Error("Workers AI returned no final answer")}
 return normalizeVisionText(raw);
}
function extractModelText(response:any){if(typeof response==="string")return response.trim();if(typeof response?.response==="string"&&response.response.trim())return response.response.trim();const m=response?.choices?.[0]?.message;if(typeof m?.content==="string"&&m.content.trim())return m.content.trim();if(Array.isArray(m?.content))return m.content.map((x:any)=>typeof x==="string"?x:x?.text||"").join("").trim();return""}
function normalizeVisionText(raw:string){
 const clean=raw.replace(/```[\s\S]*?```/g,x=>x.replace(/```(?:json)?/gi,"")).trim();
 const cardsMatch=clean.match(/КАРТЫ\s*:\s*([\s\S]*?)(?=\n\s*(?:СХЕМА|АНАЛИЗ|ИТОГ|СОВЕТ)\s*:|$)/i);const cardsText=cardsMatch?.[1]?.trim()||"";
 const cards=cardsText.split(/\s*(?:;|\n)\s*/).map((s,i)=>s.replace(/^\s*\d+[.)]\s*/,"").trim()).filter(s=>s&& !/^не определена$/i.test(s)).map((name,i)=>({position:i+1,card_name:name.replace(/\s*[—-]\s*(прямая|перевёрнутая|перевернутая).*$/i,"").trim(),orientation:/перев[ёе]рнут/i.test(name)?"reversed":"upright",confidence:"medium"}));
 const section=(name:string,next:string)=>{const m=clean.match(new RegExp(`${name}\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*(?:${next})\\s*:|$)`i));return m?.[1]?.trim()||""};
 return{readable:cards.length>0,deck:"По фото",cards,spread_type:section("СХЕМА","АНАЛИЗ|ИТОГ|СОВЕТ")||"Схема не определена",analysis:section("АНАЛИЗ","ИТОГ|СОВЕТ")||clean.slice(0,1200),conclusion:section("ИТОГ","СОВЕТ")||"",advice:section("СОВЕТ","$")||""};
}
function formatTarotResult(r:any,q:string){if(!r.cards?.length)return `🔮 Не удалось уверенно определить карты на этом фото. Я уже попробовал повторный анализ.\n\nПопробуйте отправить то же фото ещё раз — не обязательно делать его крупнее.`;const lines=r.cards.map((c:any,i:number)=>`${Number(c.position)||i+1}. ${c.card_name}${c.orientation==="reversed"?" — перевёрнутая":" — прямая"}`).join("\n");return`🔮 РАЗБОР РАСКЛАДА\n\nВопрос: ${q}\n\nКАРТЫ:\n${lines}\n\nСхема: ${r.spread_type}\n\nОБЩИЙ АНАЛИЗ\n${r.analysis}\n\nИТОГ\n${r.conclusion}\n\nСОВЕТ\n${r.advice}\n\nЭто символическая интерпретация Таро, а не гарантированное предсказание будущего.`}
async function sendMessage(t:string,c:number,text:string){const r=await fetch(`${TELEGRAM_API(t)}/sendMessage`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({chat_id:c,text,disable_web_page_preview:true})});if(!r.ok)console.error("[TAROT BOT] Telegram sendMessage failed",await r.text())}
