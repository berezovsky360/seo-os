// Silent Pulse — Edge analytics tracking script.
// ~1KB inline JS injected before </body> on landing pages.
// Uses navigator.sendBeacon for zero-impact data collection.

/**
 * Returns the Silent Pulse tracking script as an inline <script> tag.
 * @param siteId - The landing_site UUID
 * @param collectEndpoint - The pulse collect API URL (defaults to relative /api/pulse/collect)
 */
export function getTrackingScript(siteId: string, collectEndpoint?: string): string {
  const ep = collectEndpoint || '/api/pulse/collect'

  return `<script>
(function(){
  var sid=sessionStorage.getItem('_sp')||crypto.randomUUID();
  sessionStorage.setItem('_sp',sid);
  var ep='${ep}';
  var site='${siteId}';
  function send(t,d){
    try{navigator.sendBeacon(ep,JSON.stringify({s:site,sid:sid,t:t,p:location.pathname,r:document.referrer,d:d}))}catch(e){}
  }
  send('pv');
  var st=Date.now();
  document.addEventListener('visibilitychange',function(){
    if(document.hidden)send('leave',{dur:Math.round((Date.now()-st)/1000)})
  });
})();
</script>`
}
