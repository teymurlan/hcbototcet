export interface Env { AI: Ai; TELEGRAM_BOT_TOKEN: string; }
const TELEGRAM_API=(token:string)=>`https://api.telegram.org/bot${token}`;
const TELEGRAM_FILE_API=(token:string)=>`https://api.telegram.org/file/bot${token}`;
const VISION_MODEL="@cf/google/gemma-4-26b-a4b-it";
const MAX_IMAGE_BYTES=8*1024*1024;
const SYSTEM_PROMPT=`Ты — специалист по визуальному распознаванию карт Таро. Твоя главная задача — НЕ ошибаться в количестве и названиях карт.

СТРОГИЕ ПРАВИЛА:
1. Анализируй ТОЛЬКО фото расклада Таро. Если на фото нет карт Таро или это обычная фотография без расклада, ответь ровно: НЕ_ТАРО.
2. Сначала внимательно осмотри ВСЁ изображение целиком, затем каждую карту отдельно, слева направо и сверху вниз.
3. Посчитай ВСЕ видимые карты на фото. Не пропускай карты по краям, частично закрытые карты, повернутые карты и карты в нескольких рядах.
4. НИКОГДА не сокращай список карт. Если видно 9 карт — должно быть ровно 9 позиций. Если видно 10 — ровно 10.
5. Называй карту только если её изображение или название достаточно уверенно соответствует карте. Не подменяй одну карту другой.
6. Если карта видна, но название невозможно определить уверенно, напиши «не определена», но всё равно включи её в список с правильной позицией. Не удаляй её.
7. Учитывай русские названия Старших Арканов, Младших Арканов и придворных карт. Учитывай разные дизайны и нестандартные колоды. Если это авторская карта, укажи видимое название, не заменяй её стандартной картой.
8. Определи положение карты: прямая, перевёрнутая или неизвестно. Не придумывай перевёрнутое положение.
9. Не проси «фото крупнее», если на исходном изображении можно хотя бы распознать карту. Работай с любым качеством, размером, освещением и расположением фото настолько хорошо, насколько возможно.
10. Не пиши рассуждения, самокоррекции, внутренний анализ, повторения или догадки.
11. После полного распознавания ВСЕХ карт дай общий символический анализ именно заданного вопроса, учитывая каждую распознанную карту.
12. Ответ только на русском и только в указанном формате. Не используй JSON.`;
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
 await sendMessage(t,c,"Фото получил. Внимательно просматриваю все карты и готовлю полный разбор...");
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
async function runVision(env:Env,image:string,prompt:string){return await env.AI.run(VISION_MODEL,{messages:[{role:"system",content:SYSTEM_PROMPT},{role:"user",content:prompt}],image,temperature:0,max_tokens:1400,chat_template_kwargs:{enable_thinking:false,clear_thinking:true}} as any)}
async function analyzeTarot(env:Env,buffer:ArrayBuffer,mime:string,q:string){
 const image=toDataUrl(buffer,mime);
 const prompt=`Вопрос пользователя: «${q}»

Выполни работу в ДВА этапа, но покажи пользователю только итог.

ЭТАП 1 — РАСПОЗНАВАНИЕ:
- Осмотри фото целиком.
- Определи, является ли изображение раскладом Таро.
- Посчитай ВСЕ карты на фото.
- Затем проверь каждую карту повторно отдельно.
- Иди по порядку: верхний ряд слева направо, затем следующий ряд и так далее.
- Для каждой карты укажи точное название, положение и уверенность.
- Не пропускай ни одной видимой карты.

ЭТАП 2 — АНАЛИЗ:
Используй весь список карт из этапа 1. Сделай анализ вопроса, учитывая КАЖДУЮ карту, а не только несколько самых заметных.

ФОРМАТ ОТВЕТА:
КАРТЫ: 1) название — прямая/перевёрнутая/неизвестно; 2) название — ...; 3) ...
СХЕМА: кратко опиши расположение и количество карт
АНАЛИЗ: 5-8 предложений, учитывая все карты
ИТОГ: 2-3 предложения
СОВЕТ: 2-3 предложения

Если это не расклад Таро, ответь ровно: НЕ_ТАРО
Если карта видна, но не удаётся уверенно определить название, обязательно напиши: «не определена — положение неизвестно», сохранив её номер.
Никогда не говори пользователю «пришлите фото крупнее».
Не добавляй никаких других разделов, рассуждений или пояснений.`;
 let response=await runVision(env,image,prompt);let raw=extractModelText(response);
 if(!raw){console.error("[TAROT BOT] AI empty first attempt",response);response=await runVision(env,image,`Очень кратко распознай этот расклад Таро. Посчитай ВСЕ видимые карты слева направо и сверху вниз и перечисли их все. Для каждой укажи название или «не определена». Затем одной короткой фразой ответь на вопрос «${q}». Формат: КАРТЫ: ...\nАНАЛИЗ: ...`);raw=extractModelText(response)}
 if(!raw){console.error("[TAROT BOT] AI empty retry",response);throw new Error("Workers AI returned no final answer")}
 return normalizeVisionText(raw);
}
function extractModelText(response:any){if(typeof response==="string")return response.trim();if(typeof response?.response==="string"&&response.response.trim())return response.response.trim();const m=response?.choices?.[0]?.message;if(typeof m?.content==="string"&&m.content.trim())return m.content.trim();if(Array.isArray(m?.content))return m.content.map((x:any)=>typeof x==="string"?x:x?.text||"").join("").trim();return""}
function normalizeVisionText(raw:string){
 const clean=raw.replace(/```[\s\S]*?```/g,x=>x.replace(/```(?:json)?/gi,"")).trim();
 if(/^НЕ_ТАРО\s*$/i.test(clean))return{readable:false,notTarot:true,deck:"",cards:[],spread_type:"",analysis:"",conclusion:"",advice:""};
 const cardsMatch=clean.match(/КАРТЫ\s*:\s*([\s\S]*?)(?=\n\s*(?:СХЕМА|АНАЛИЗ|ИТОГ|СОВЕТ)\s*:|$)/i);const cardsText=cardsMatch?.[1]?.trim()||"";
 const cards=cardsText.split(/\s*(?:;|\n)\s*(?=\d+[.)]|[А-ЯЁA-Z])/).map((s,i)=>s.replace(/^\s*\d+[.)]\s*/,"").trim()).filter(Boolean).map((name,i)=>({position:i+1,card_name:/^не определена/i.test(name)?null:name.replace(/\s*[—-]\s*(прямая|перев[ёе]рнутая|перевёрнутая|неизвестно).*$/i,"").trim()||null,orientation:/перев[ёе]рнут/i.test(name)?"reversed":/неизвест/i.test(name)?"unknown":"upright",confidence:/не определена/i.test(name)?"low":"medium"}));
 const section=(name:string,next:string)=>{const m=clean.match(new RegExp(`${name}\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*(?:${next})\\s*:|$)`i));return m?.[1]?.trim()||""};
 return{readable:cards.length>0,notTarot:false,deck:"Таро по фото",cards,spread_type:section("СХЕМА","АНАЛИЗ|ИТОГ|СОВЕТ")||"Схема не определена",analysis:section("АНАЛИЗ","ИТОГ|СОВЕТ")||clean.slice(0,1400),conclusion:section("ИТОГ","СОВЕТ")||"",advice:section("СОВЕТ","$")||""};
}
function formatTarotResult(r:any,q:string){
 if(r.notTarot)return"🔮 На фото не удалось обнаружить расклад карт Таро. Бот анализирует только фото с картами Таро. Отправьте фото расклада ещё раз.";
 if(!r.cards?.length)return"🔮 Не удалось уверенно распознать карты на этом фото. Я повторно просмотрел изображение, но не буду придумывать названия карт. Попробуйте отправить фото ещё раз.";
 const lines=r.cards.map((c:any,i:number)=>`${Number(c.position)||i+1}. ${c.card_name||"Не определена"}${c.orientation==="reversed"?" — перевёрнутая":c.orientation==="upright"?" — прямая":" — положение неизвестно"}`).join("\n");
 return`🔮 РАЗБОР РАСКЛАДА\n\nВопрос: ${q}\n\nКАРТЫ (${r.cards.length}):\n${lines}\n\nСхема: ${r.spread_type}\n\nОБЩИЙ АНАЛИЗ\n${r.analysis}\n\nИТОГ\n${r.conclusion}\n\nСОВЕТ\n${r.advice}\n\nЭто символическая интерпретация Таро, а не гарантированное предсказание будущего.`
}
async function sendMessage(t:string,c:number,text:string){const r=await fetch(`${TELEGRAM_API(t)}/sendMessage`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({chat_id:c,text,disable_web_page_preview:true})});if(!r.ok)console.error("[TAROT BOT] Telegram sendMessage failed",await r.text())}
