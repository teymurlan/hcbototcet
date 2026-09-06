import { APP as BASE_APP } from './app-v16';

const KEYBOARD_CSS = String.raw`
.nav{transition:transform .18s ease,opacity .15s ease}
body.keyboard-open{padding-bottom:24px}
body.keyboard-open .nav{transform:translateY(calc(100% + 24px));opacity:0;pointer-events:none}
body.keyboard-open .toast{bottom:18px}
body.keyboard-open .field{scroll-margin-top:18px;scroll-margin-bottom:42vh}
`;

const KEYBOARD_SCRIPT = String.raw`
<script>(function(){
  var activeField=null, closeTimer=0;
  function isTextField(el){
    if(!el||!el.matches)return false;
    return el.matches('#content input:not([type="checkbox"]):not([type="file"]),#content textarea');
  }
  function keyboardOpen(on){
    document.body.classList.toggle('keyboard-open',!!on);
  }
  function reveal(el){
    if(!el)return;
    var field=el.closest('.field')||el;
    function place(){
      if(document.activeElement!==el)return;
      var vv=window.visualViewport;
      var top=vv?vv.offsetTop:0;
      var height=vv?vv.height:window.innerHeight;
      var target=top+Math.min(170,Math.max(74,height*.22));
      var rect=field.getBoundingClientRect();
      var delta=rect.top-target;
      if(Math.abs(delta)>6){
        try{window.scrollBy({top:delta,left:0,behavior:'smooth'})}
        catch(e){window.scrollBy(0,delta)}
      }
    }
    setTimeout(place,70);
    setTimeout(place,260);
    setTimeout(place,500);
  }
  document.addEventListener('focusin',function(ev){
    var el=ev.target;
    if(!isTextField(el))return;
    clearTimeout(closeTimer);
    activeField=el;
    keyboardOpen(true);
    reveal(el);
  },true);
  document.addEventListener('focusout',function(){
    clearTimeout(closeTimer);
    closeTimer=setTimeout(function(){
      if(isTextField(document.activeElement))return;
      activeField=null;
      keyboardOpen(false);
    },140);
  },true);
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',function(){
      if(activeField&&document.activeElement===activeField)reveal(activeField);
    });
    window.visualViewport.addEventListener('scroll',function(){
      if(activeField&&document.activeElement===activeField)reveal(activeField);
    });
  }
})();</script>`;

export const APP = BASE_APP
  .replace('</style></head>', KEYBOARD_CSS + '</style></head>')
  .replace('</body></html>', KEYBOARD_SCRIPT + '</body></html>');
