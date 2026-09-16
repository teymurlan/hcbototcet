import { STAFF_DEFECTS_PERFORMANCE_APP } from './staff-defects-performance-ui';

const MIRA_STYLE = String.raw`
<style>
:root{
  --bg:#edf5ff!important;
  --card:#ffffff!important;
  --ink:#101828!important;
  --muted:#75839a!important;
  --line:#dbe7f5!important;
  --blue:#2f6df6!important;
  --blue2:#1b56e8!important;
  --soft:#edf4ff!important;
  --graph:#172235!important;
  --shadow:0 14px 40px rgba(37,77,135,.11)!important;
  --r:24px!important;
}
html{background:#dff1ff!important}
body{
  background:
    radial-gradient(circle at 12% -4%,rgba(83,217,255,.34),transparent 25%),
    radial-gradient(circle at 92% 2%,rgba(77,95,255,.24),transparent 27%),
    linear-gradient(180deg,#e7f4ff 0%,#f4f8ff 34%,#f5f8fc 100%)!important;
  color:var(--ink)!important;
  padding-bottom:calc(106px + env(safe-area-inset-bottom))!important;
}
.app{max-width:760px!important}
.top{
  position:sticky!important;top:0!important;z-index:30!important;
  margin:0!important;padding:14px 18px 13px!important;
  background:rgba(245,249,255,.82)!important;
  backdrop-filter:blur(22px) saturate(145%)!important;
  -webkit-backdrop-filter:blur(22px) saturate(145%)!important;
  border-bottom:1px solid rgba(189,207,232,.5)!important;
  box-shadow:0 8px 24px rgba(34,68,120,.045)!important;
}
.brand{gap:12px!important}.mark{
  width:46px!important;height:46px!important;border-radius:17px!important;
  background:linear-gradient(145deg,#1e66f3,#42bdf7)!important;
  box-shadow:0 9px 22px rgba(47,109,246,.25)!important;
  font-size:17px!important;letter-spacing:-1.2px!important;
}
.brand b{font-size:17px!important;letter-spacing:-.35px!important}.brand small{font-size:12px!important;color:#71819a!important}
.main{padding:18px 16px 28px!important}
.hero{
  position:relative!important;overflow:hidden!important;
  background:linear-gradient(145deg,#3147ff 0%,#2478ff 48%,#31c5ec 100%)!important;
  border-radius:30px!important;padding:24px 22px!important;margin-bottom:17px!important;
  box-shadow:0 18px 44px rgba(43,102,239,.26)!important;
}
.hero:after{content:"";position:absolute;right:-44px;top:-55px;width:170px;height:170px;border-radius:50%;background:rgba(255,255,255,.14);filter:blur(1px)}
.hero h1{position:relative;z-index:1;font-size:29px!important;letter-spacing:-.9px!important}.hero p{position:relative;z-index:1;color:rgba(255,255,255,.87)!important;font-size:14px!important}
.section-title{margin:24px 3px 12px!important;align-items:center!important}.section-title h2{font-size:21px!important;letter-spacing:-.5px!important}.section-title span{font-size:12px!important;color:#7b8799!important}
.grid{gap:11px!important}.metric,.card{
  background:rgba(255,255,255,.97)!important;
  border:1px solid rgba(203,219,240,.78)!important;
  border-radius:24px!important;
  box-shadow:0 9px 28px rgba(44,72,112,.07)!important;
}
.metric{padding:18px!important;min-height:112px!important;display:flex!important;flex-direction:column!important;justify-content:center!important}.metric strong{font-size:29px!important;line-height:1!important;letter-spacing:-1px!important}.metric span{font-size:12px!important;margin-top:8px!important;color:#75839a!important}
.card{padding:17px!important;margin-bottom:11px!important}.title{font-size:18px!important;font-weight:820!important;letter-spacing:-.35px!important}.sub{font-size:13px!important;color:#77859a!important;line-height:1.45!important}
.avatar{width:50px!important;height:50px!important;border-radius:17px!important;background:linear-gradient(145deg,#edf4ff,#e6f1ff)!important;color:#345c9d!important;border:1px solid #d7e5f7!important}
.chip{
  border:1px solid #dbe5f2!important;background:#f6f9fd!important;color:#536277!important;
  border-radius:999px!important;padding:6px 10px!important;font-size:11px!important;font-weight:760!important;
}
.chip.blue{background:#e9f1ff!important;border-color:#c7dbff!important;color:#2365dd!important}.chip.green{background:#eaf9f1!important;border-color:#c8ead7!important;color:#138453!important}.chip.orange{background:#fff5e5!important;border-color:#f2d7a8!important;color:#b46800!important}.chip.red{background:#fff0f0!important;border-color:#f2caca!important;color:#b63e3e!important}
.btn,button{touch-action:manipulation}.btn{
  border-radius:18px!important;min-height:49px!important;padding:12px 16px!important;
  font-weight:820!important;font-size:14px!important;
  background:linear-gradient(145deg,#3476ff,#2463e8)!important;
  box-shadow:0 8px 18px rgba(47,109,246,.18)!important;
  transition:transform .12s ease,opacity .12s ease!important;
}
.btn:active{transform:scale(.976)!important}.btn.secondary{background:#fff!important;color:#172235!important;border:1px solid #d9e4f1!important;box-shadow:0 5px 14px rgba(41,64,96,.05)!important}.btn.soft{background:#edf4ff!important;color:#2867db!important;border:1px solid #d4e3ff!important;box-shadow:none!important}.btn.green{background:linear-gradient(145deg,#16a66a,#118352)!important}.btn.red{background:linear-gradient(145deg,#d84b4b,#b83939)!important}.btn.small{min-height:39px!important;border-radius:14px!important;padding:9px 12px!important;font-size:12px!important}.btn.block{margin-top:11px!important}
.toolbar{gap:8px!important;padding:2px 1px 12px!important}.filter{
  min-height:42px!important;border:1px solid #d8e3f0!important;background:rgba(255,255,255,.92)!important;
  border-radius:999px!important;padding:10px 14px!important;font-weight:760!important;color:#5d6b80!important;
  box-shadow:0 4px 12px rgba(43,68,104,.04)!important;
}
.filter.on{color:#fff!important;border-color:transparent!important;background:linear-gradient(145deg,#3476ff,#2463e8)!important;box-shadow:0 8px 18px rgba(47,109,246,.2)!important}
.search,.input,select,textarea,.money{
  background:rgba(255,255,255,.98)!important;border:1.5px solid #d5e1ef!important;border-radius:17px!important;
  min-height:50px!important;padding:12px 14px!important;color:#172235!important;box-shadow:0 4px 14px rgba(41,64,96,.035)!important;
}
.search:focus,.input:focus,select:focus,textarea:focus,.money:focus{border-color:#75a8ff!important;box-shadow:0 0 0 4px rgba(47,109,246,.09)!important}.label{color:#66768e!important;font-size:12px!important}
.back{
  position:sticky!important;top:76px!important;z-index:15!important;
  min-height:46px!important;border:1px solid rgba(207,220,238,.9)!important;background:rgba(255,255,255,.92)!important;
  backdrop-filter:blur(18px)!important;-webkit-backdrop-filter:blur(18px)!important;
  border-radius:17px!important;padding:10px 14px!important;font-weight:820!important;color:#22304a!important;
  box-shadow:0 8px 22px rgba(39,64,104,.08)!important;
}
.notice,.readonly-box,.dangerbox{border-radius:19px!important;padding:14px 15px!important}.notice{background:#edf5ff!important;border-color:#d3e4ff!important;color:#335e96!important}.readonly-box{background:#eaf9f1!important;border:1px solid #c6ead7!important;color:#19724c!important}.dangerbox{background:#fff0f0!important;border-color:#f2c8c8!important;color:#983c3c!important}
.attention{border-left:0!important;position:relative!important;overflow:hidden!important}.attention:before{content:"";position:absolute;left:0;top:0;bottom:0;width:5px;background:#e99a18}.attention.red:before{background:#d84b4b}
.divider{background:#e7edf5!important}.timeline:before{background:#d9e6f6!important}.event:before{background:#3476ff!important;border-color:#fff!important}
.check,.payline{border-bottom-color:#e9eef5!important}.stagebar{gap:7px!important}.stage{height:6px!important;background:#dce6f2!important}.stage.done{background:linear-gradient(90deg,#3476ff,#32bde8)!important}
.media,.hc-media-grid{gap:8px!important}.media a,.hc-media,.hc-media-skeleton{border-radius:17px!important;overflow:hidden!important}.hc-media{border:0!important;padding:0!important;background:#edf3fa!important;box-shadow:none!important}.hc-media-skeleton{background:linear-gradient(145deg,#edf3fa,#e5eef8)!important;color:#76869a!important}
.hc-defect-panel,.hc-defect-report{border-radius:22px!important;box-shadow:0 8px 24px rgba(149,50,50,.06)!important}.hc-defect-upload{border-radius:16px!important;min-height:50px!important}
.rt-visit.hc-visit-card{border-radius:22px!important;background:#fff!important;box-shadow:0 8px 22px rgba(43,67,102,.06)!important}.hc-visit-field input{border-radius:15px!important;background:#f9fbff!important}
.hc-access-sheet{background:#f4f8ff!important}.hc-access-person,.hc-access-form{border-radius:20px!important}.hc-access-close{border-radius:14px!important}

/* Operational cards keep their meaning but receive the new visual language. */
.hc-status-completed{background:linear-gradient(180deg,#f6fff9,#ecfaf2)!important;border-color:#ccebd9!important}
.hc-status-unassigned{background:linear-gradient(180deg,#fffaf7,#fff1eb)!important;border-color:#f1d0bd!important}
.hc-status-progress{background:linear-gradient(180deg,#f7fbff,#eef5ff)!important;border-color:#cbdfff!important}
.hc-status-assigned{background:linear-gradient(180deg,#fff,#f8fbff)!important;border-color:#d8e4f2!important}

/* Floating bottom navigation inspired by the reference, preserving existing icons and labels. */
.nav{
  left:12px!important;right:12px!important;bottom:10px!important;
  padding:0 0 env(safe-area-inset-bottom)!important;background:transparent!important;
  border:0!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
  pointer-events:none!important;
}
.navin{
  pointer-events:auto!important;width:min(734px,100%)!important;
  min-height:82px!important;padding:8px 8px!important;gap:2px!important;
  background:rgba(255,255,255,.96)!important;
  backdrop-filter:blur(24px) saturate(150%)!important;-webkit-backdrop-filter:blur(24px) saturate(150%)!important;
  border:1px solid rgba(207,220,239,.85)!important;border-radius:31px!important;
  box-shadow:0 18px 48px rgba(33,57,91,.18),0 2px 7px rgba(33,57,91,.06)!important;
}
.nav button{
  min-height:66px!important;padding:4px 2px!important;border:0!important;background:transparent!important;
  color:#738198!important;border-radius:22px!important;font-size:10px!important;font-weight:780!important;
  box-shadow:none!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:2px!important;
}
.nav button i{
  width:42px!important;height:42px!important;margin:0 auto 1px!important;border-radius:16px!important;
  display:flex!important;align-items:center!important;justify-content:center!important;
  background:#f0f4f9!important;color:#637187!important;font-size:20px!important;line-height:1!important;
  transition:transform .14s ease,background .14s ease,box-shadow .14s ease!important;
}
.nav button i svg{width:23px!important;height:23px!important;stroke:currentColor!important}
.nav button.on{background:transparent!important;border:0!important;color:#2365de!important;box-shadow:none!important}
.nav button.on i{
  background:linear-gradient(145deg,#3477ff,#255fdc)!important;color:#fff!important;
  box-shadow:0 9px 20px rgba(47,109,246,.28)!important;transform:translateY(-1px)!important;
}
.nav button:active i{transform:scale(.93)!important}.nav button.on:active i{transform:translateY(-1px) scale(.93)!important}
.sticky-actions{bottom:calc(104px + env(safe-area-inset-bottom))!important;background:linear-gradient(180deg,rgba(245,248,252,0),rgba(245,248,252,.96) 28%)!important;padding-top:24px!important}

@media(max-width:430px){
  .main{padding-left:14px!important;padding-right:14px!important}.hero{padding:22px 19px!important;border-radius:27px!important}.hero h1{font-size:27px!important}
  .nav{left:8px!important;right:8px!important;bottom:7px!important}.navin{border-radius:28px!important;padding:7px 5px!important}.nav button{font-size:9.5px!important}.nav button i{width:40px!important;height:40px!important;border-radius:15px!important}.back{top:72px!important}
}
@media(max-width:360px){.nav button{font-size:8.5px!important}.nav button i{width:37px!important;height:37px!important}.main{padding-left:11px!important;padding-right:11px!important}.card{padding:15px!important}}
</style>`;

export const STAFF_MIRA_STYLE_APP = STAFF_DEFECTS_PERFORMANCE_APP.replace('</head>', MIRA_STYLE + '</head>');
