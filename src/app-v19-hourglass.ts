import { APP as BASE_APP } from './app-v19-premium';

const WAITING_CSS = String.raw`
/* Compact premium waiting screen */
#content .card:has(#workTimer){padding:13px!important;border-radius:19px!important}
#content .card:has(#workTimer) .success{padding:8px 6px 2px!important}
#content .card:has(#workTimer) .success h2{font-size:26px!important;line-height:1.08!important;margin:9px 0 6px!important;letter-spacing:-.5px}
#content .card:has(#workTimer) .success p{max-width:560px;margin:0 auto 8px!important;font-size:14px!important;line-height:1.45!important}
#content .card:has(#workTimer) .waitOrb{width:68px!important;height:68px!important;margin:2px auto 8px!important;border-width:1.5px!important;font-size:0!important;box-shadow:0 0 0 1px #f5bd4512,0 7px 22px #0007!important;animation:none!important}
#content .card:has(#workTimer) .waitOrb::before{content:"⏳";display:block;font-size:31px;line-height:1;transform-origin:center;animation:hourglassTurn 1.8s cubic-bezier(.45,.05,.3,1) infinite;will-change:transform;filter:drop-shadow(0 2px 5px #0008)}
#content .card:has(#workTimer) .timer{font-size:42px!important;line-height:1!important;margin:8px 0 2px!important;letter-spacing:-1.2px!important}
#content .card:has(#workTimer) .timerSub{font-size:12px!important;margin-bottom:8px!important}
#content .card:has(#workTimer) .reg{gap:7px!important;margin-top:9px!important}
#content .card:has(#workTimer) .reg div{padding:10px 12px!important;border-radius:12px!important;font-size:14px!important;line-height:1.3!important}
#content .card:has(#workTimer) .hint{margin-top:9px!important;padding:11px 13px!important;font-size:13px!important}
#content .card:has(#workTimer) #afterGo,#content .card:has(#workTimer) #problem{margin-top:9px!important;padding:14px 16px!important}
@keyframes hourglassTurn{
  0%,32%{transform:rotate(0deg) scale(1)}
  47%{transform:rotate(180deg) scale(1.05)}
  78%{transform:rotate(180deg) scale(1)}
  100%{transform:rotate(360deg) scale(1)}
}
@media(prefers-reduced-motion:reduce){#content .card:has(#workTimer) .waitOrb::before{animation-duration:3.2s}}
`;

export const APP = BASE_APP.replace('</style></head>', WAITING_CSS + '</style></head>');
