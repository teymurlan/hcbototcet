export interface Env { AI: Ai; TELEGRAM_BOT_TOKEN: string; }
const TELEGRAM_API=(token:string)=>`https://api.telegram.org/bot${token}`;
const TELEGRAM_FILE_API=(token:string)=>`https://api.telegram.org/file/bot${token}`;
const VISION_MODEL="@cf/google/gemma-4-26b-a4b-it";
const MAX_IMAGE_BYTES=8*1024*1024;
const SYSTEM_PROMPT=`Ты — строгий анализатор фотографий раскладов Таро. Твоя главная задача — НЕ ошибаться в количестве и названиях карт.

КРИТИЧЕСКИЕ ПРАВИЛА:
1. Анализируй ТОЛЬКО фото расклада Таро. Если на фото нет карт Таро или это обычная фотография без расклада, ответь ровно: НЕ_ТАРО.
2. Сначала осмотри ВСЁ изображение целиком, затем каждую карту отдельно, слева направо и сверху вниз.
3. Посчитай ВСЕ физически видимые карты. Не пропускай карты по краям, частично закрытые карты, повернутые карты и карты в нескольких рядах.
4. НИКОГДА не сокращай список. Если видно 9 карт — должно быть ровно 9 позиций. Если видно 10 — ровно 10.
5. Называй карту только если её изображение или название достаточно уверенно соответствует именно этой карте. Не подменяй её другой картой.
6. Если карта физически видна, но название невозможно уверенно определить, напиши «не определена», но сохрани её позицию. Не удаляй её и не заменяй другой картой.
7. Учитывай русские названия Старших Арканов, Младших Арканов и придворных карт, разные дизайны и нестандартные колоды. Если это авторская карта, используй видимое название.
8. Определи положение карты: прямая, перевёрнутая или неизвестно. Не придумывай положение.
9. Не проси фото крупнее, если карты в целом видны. Работай с исходным фото.
10. Не пиши рассуждения, самокоррекции, внутренний анализ, повторы или догадки.
11. После полного распознавания ВСЕХ карт дай общий символический анализ вопроса, учитывая КАЖДУЮ карту.
12. Весь итоговый ответ только на русском языке. Английские названия и технические слова запрещены.
13. Строго соблюдай порядок: все карты и короткое значение каждой → общий анализ всех карт → итог → совет.
14. Это символическая интерпретация Таро, а не гарантированное предсказание.`;
interface TelegramUpdate{update_id:number;message?:{message_id:number;chat:{id:number};photo?:Array<{file_id:string;width:number;height:number;file_size?:number}>;caption?:string;text?:string}};
export default{async fetch(request:Request,env:Env):Promise<Response>{
 if(request.method==="GET")return new Response("Tarot bot is running");
 if(request.method!=="POST")return new Response("Method Not Allowed",{status:405});
 let update:TelegramUpdate|undefined;
 try{update=await request.json<TelegramUpdate>();await handleUpdate(update,env)}catch(error){console.error("[TAROT BOT]",error);const chatId=update?.message?.chat.id;if(chatId)await sendMessage(env.TELEGRAM_BOT_TOKEN,chatId,"Не удалось обработать расклад. Попробуйте отправить фото ещё раз.")}
 return new Response("OK");
}} satisfies ExportedHandler<Env>;
async function handleUpdate(update:TelegramUpdate,env:Env){
 const m=update.message;if(!m)return;const t=env.TELEGRAM_BOT_TOKEN,c=m.chat.id;
 if(m.text==="/start"){await sendMessage(t,c,"🔮 Добро пожаловать.\n\nОтправьте фото расклада Таро и вопрос в подписи.");return}
 if(!m.photo?.length){await sendMessage(t,c,"Пришлите фото расклада Таро и вопрос в подписи.");return}
 const q=(m.caption||"").trim();if(!q){await sendMessage(t,c,"Добавьте вопрос в подписи к фотографии и отправьте её ещё раз.");return}
 await sendMessage(t,c,"Фото получил. Сначала считаю все карты, затем проверяю каждую и делаю полный разбор...");
 const p=m.photo.reduce((best,current)=>current.width*current.height>best.width*best.height?current:best,m.photo[0]);
 const file=await downloadTelegramImage(t,p.file_id);const result=await analyzeTarot(env,file.buffer,file.mime,q);await sendMessage(t,c,formatTarotResult(result,q));
}
async function downloadTelegramImage(t:string,id:string):Promise<{buffer:ArrayBuffer;mime:string}>{
 const r=await fetch(`${TELEGRAM_API(t)}/getFile?file_id=${encodeURIComponent(id)}`);if(!r.ok)throw new Error(`Telegram getFile HTTP ${r.status}`);const j=await r.json<any>();if(!j.ok||!j.result?.file_path)throw new Error("Telegram getFile failed");
 const image=await fetch(`${TELEGRAM_FILE_API(t)}/${j.result.file_path}`);if(!image.ok)throw new Error(`Telegram image HTTP ${image.status}`);const buffer=await image.arrayBuffer();if(buffer.byteLength>MAX_IMAGE_BYTES||!buffer.byteLength)throw new Error("Image too large or empty");const h=image.headers.get("content-type")?.split(";")[0].trim().toLowerCase();return{buffer,mime:h?.startsWith("image/")?h:"image/jpeg"};
}
function toDataUrl(buffer:ArrayBuffer,mime:string){const bytes=new Uint8Array(buffer);let binary="";for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+0x8000,bytes.length)));return`data:${mime};base64,${btoa(binary)}`}
async function runVision(env:Env,image:string,prompt:string,max_tokens=1800){return await env.AI.run(VISION_MODEL,{messages:[{role:"system",content:SYSTEM_PROMPT},{role:"user",content:prompt}],image,temperature:0,max_tokens,chat_template_kwargs:{enable_thinking:false,clear_thinking:true}} as any)}
async function analyzeTarot(env:Env,buffer:ArrayBuffer,mime:string,q:string){
 const image=toDataUrl(buffer,mime);
 const prompt=`Вопрос пользователя: «${q}»

Выполни задачу максимально строго.

СНАЧАЛА: определи, есть ли на фото расклад Таро.
ЗАТЕМ: посчитай ВСЕ отдельные физические карты. Не используй заранее заданное число. Если на фотографии девять карт, должно быть девять пунктов. Если семь — семь. Если двенадцать — двенадцать.
ЗАТЕМ: проверь каждую карту по отдельности в порядке слева направо и сверху вниз. Не пропускай карты по краям и частично закрытые карты.
ЗАТЕМ: только после полного списка делай толкование.

Для каждой карты напиши её название и одной короткой фразой — что она означает именно применительно к вопросу «${q}». Если название не видно достаточно уверенно, напиши «Не определена» и сохрани номер этой карты. Никогда не придумывай название отсутствующей карты.

ОБЯЗАТЕЛЬНЫЙ ФОРМАТ:
КАРТЫ НА ФОТО:
1. [название] — [прямая/перевёрнутая/положение неизвестно] — [короткое значение в контексте вопроса]
2. [название] — [положение] — [значение]
3. [название] — [положение] — [значение]
И ТАК ДО ПОСЛЕДНЕЙ ФИЗИЧЕСКИ ВИДИМОЙ КАРТЫ.

ОБЩИЙ АНАЛИЗ:
Короткий связный анализ ВСЕХ перечисленных карт вместе, без игнорирования отдельных карт.

ИТОГ:
Прямой ответ на вопрос пользователя с учётом всего расклада.

СОВЕТ:
Короткий совет по раскладу.

ТОЛЬКО РУССКИЙ ЯЗЫК. Не используй английские названия карт, английские заголовки, технические слова, JSON, код, внутренние рассуждения, повторения или фразы о процессе. Не проси фотографию крупнее.
Если это не расклад Таро, ответь ровно: НЕ_ТАРО`;
 let response=await runVision(env,image,prompt,1800);let raw=extractModelText(response);
 if(!raw){console.error("[TAROT BOT] AI empty first attempt",response);response=await runVision(env,image,`Строго перечисли ВСЕ физически видимые карты Таро на фотографии по порядку слева направо и сверху вниз. Ничего не добавляй от себя. Неизвестную карту оставь как «Не определена». Количество пунктов должно совпадать с количеством видимых карт. Затем коротко ответь на вопрос «${q}». Только русский язык. Формат:\nКАРТЫ НА ФОТО:\n1. ...\n2. ...\nОБЩИЙ АНАЛИЗ:\n...\nИТОГ:\n...\nСОВЕТ:\n...`,1800);raw=extractModelText(response)}
 if(!raw){console.error("[TAROT BOT] AI empty retry",response);throw new Error("Workers AI returned no final answer")}
 return normalizeVisionText(raw);
}
function extractModelText(response:any){if(typeof response==="string")return response.trim();if(typeof response?.response==="string"&&response.response.trim())return response.response.trim();const m=response?.choices?.[0]?.message;if(typeof m?.content==="string"&&m.content.trim())return m.content.trim();if(Array.isArray(m?.content))return m.content.map((x:any)=>typeof x==="string"?x:x?.text||"").join("").trim();return""}
function normalizeVisionText(raw:string){
 const clean=raw.replace(/```(?:text|markdown|json)?/gi,"").replace(/```/g,"").trim();
 if(/^НЕ_ТАРО\s*$/i.test(clean))return{readable:false,notTarot:true,cards:[],spread_type:"",analysis:"",conclusion:"",advice:""};
 const cardsMatch=clean.match(/КАРТЫ\s*НА\s*ФОТО\s*:\s*([\s\S]*?)(?=\n\s*ОБЩИЙ\s+АНАЛИЗ\s*:|\n\s*ИТОГ\s*:|$)/i);
 const cardsText=cardsMatch?.[1]?.trim()||"";
 const cards=cardsText.split(/\n+/).map(s=>s.trim()).filter(Boolean).map((s,i)=>s.replace(/^[-•*]\s*/,"").replace(/^\d+[.)]\s*/,"").trim()).filter(Boolean).map((line,i)=>{
  const parts=line.split(/\s+[—–-]\s+/);const name=(parts.shift()||"Не определена").trim();const rest=parts.join(" — ").trim();
  const orientation=/перев[ёе]рнут/i.test(line)?"reversed":/положение\s+неизвестно/i.test(line)?"unknown":"upright";
  return{position:i+1,card_name:/^не определена/i.test(name)?null:name,orientation,meaning:rest,confidence:/^не определена/i.test(name)?"low":"medium"};
 });
 const section=(name:string,ends:string[])=>{const end=ends.length?`(?=\\n\\s*(?:${ends.join("|")})\\s*:|$)`:"$";const m=clean.match(new RegExp(`${name}\\s*:\\s*([\\s\\S]*?)${end}`i));return m?.[1]?.trim()||""};
 return{readable:cards.length>0,notTarot:false,cards,spread_type:"Определено по расположению карт на фотографии",analysis:section("ОБЩИЙ АНАЛИЗ",["ИТОГ","СОВЕТ"]),conclusion:section("ИТОГ",["СОВЕТ"]),advice:section("СОВЕТ",[])};
}
function formatTarotResult(r:any,q:string){
 if(r.notTarot)return"🔮 На фото не удалось обнаружить расклад карт Таро. Бот анализирует только фотографии с картами Таро.";
 if(!r.cards?.length)return"🔮 Не удалось распознать карты на этом фото. Я не буду придумывать отсутствующие карты. Попробуйте отправить фотографию ещё раз.";
 const lines=r.cards.map((c:any,i:number)=>`${Number(c.position)||i+1}. ${c.card_name||"Не определена"}${c.orientation==="reversed"?" — перевёрнутая":c.orientation==="upright"?" — прямая":" — положение неизвестно"}${c.meaning?` — ${c.meaning}`:""}`).join("\n");
 return`🔮 РАЗБОР РАСКЛАДА\n\nВопрос: ${q}\n\nКАРТЫ НА ФОТО (${r.cards.length}):\n${lines}\n\nОБЩИЙ АНАЛИЗ:\n${r.analysis||"Не удалось сформировать общий анализ."}\n\nИТОГ:\n${r.conclusion||"Не удалось сформировать итог."}\n\nСОВЕТ:\n${r.advice||"Не удалось сформировать совет."}\n\nРасклад Таро даёт символическую интерпретацию и не является гарантированным предсказанием будущего.`;
}
async function sendMessage(t:string,c:number,text:string){const r=await fetch(`${TELEGRAM_API(t)}/sendMessage`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({chat_id:c,text,disable_web_page_preview:true})});if(!r.ok)console.error("[TAROT BOT] Telegram sendMessage failed",await r.text())}
