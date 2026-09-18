import { STAFF_V4_APP } from './staff-v4-ui';

const NAV_POLISH = String.raw`
<style>
#nav button i svg{width:19px;height:19px;display:block;stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round}
#nav button.on i svg{stroke:#fff}
</style>
<script>
(function(){
  var icons={
    home:'<svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/></svg>',
    orders:'<svg viewBox="0 0 24 24"><path d="M6 3h12a2 2 0 0 1 2 2v16H4V5a2 2 0 0 1 2-2Z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
    tasks:'<svg viewBox="0 0 24 24"><path d="M6 4h12v16H6z"/><path d="m9 10 2 2 4-4"/><path d="M9 16h6"/></svg>',
    employees:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2"/><path d="M15.5 14.5A4.5 4.5 0 0 1 21 19"/></svg>',
    photos:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m5 17 4-4 3 3 2-2 5 3"/></svg>',
    schedule:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
    profile:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    more:'<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>'
  };
  function paint(){document.querySelectorAll('#nav button[data-n]').forEach(function(b){var i=b.querySelector('i'),k=b.getAttribute('data-n');if(i&&icons[k]&&i.getAttribute('data-hc5')!=='1'){i.innerHTML=icons[k];i.setAttribute('data-hc5','1')}})}
  paint();document.addEventListener('hc:after-render',paint,false);document.addEventListener('click',function(e){var t=e.target;if(t&&t.closest&&t.closest('#nav button'))requestAnimationFrame(paint)},false);window.addEventListener('pageshow',paint);
})();
</script>`;

export const STAFF_V5_APP = STAFF_V4_APP.replace('</body>', `${NAV_POLISH}</body>`);
