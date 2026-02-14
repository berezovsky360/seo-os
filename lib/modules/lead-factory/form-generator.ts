// Lead Factory — Form HTML Generator
// Generates pure HTML forms for embedding in landing pages.
// Zero JS for inline forms; minimal JS for popup triggers.

export interface FormField {
  name: string
  type: 'email' | 'text' | 'tel' | 'textarea' | 'select' | 'radio'
  label?: string
  placeholder?: string
  required: boolean
  options?: { label: string; value: string }[]
}

export { generateQuizForm, generateCalculatorForm } from './quiz-calculator-generator'

export interface FormConfig {
  formId: string
  captureUrl: string
  landingSiteId: string
  fields: FormField[]
  buttonText: string
  successMessage: string
}

export interface PopupConfig {
  trigger: 'time_delay' | 'scroll_percent' | 'exit_intent'
  value: number // seconds for time_delay, percentage for scroll_percent
  showOnce: boolean
  headline: string
  description: string
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function fieldHtml(field: FormField): string {
  const placeholder = escapeHtml(field.placeholder || field.label || field.name)
  const required = field.required ? ' required' : ''
  const style = 'width:100%;padding:.75rem 1rem;border:1px solid #e5e7eb;border-radius:.5rem;font-size:.9rem;margin-bottom:.75rem;outline:none'

  if (field.type === 'textarea') {
    return `<textarea name="${escapeHtml(field.name)}" placeholder="${placeholder}" rows="3" style="${style}"${required}></textarea>`
  }

  return `<input type="${field.type}" name="${escapeHtml(field.name)}" placeholder="${placeholder}" style="${style}"${required}>`
}

/**
 * Generate an inline HTML form for lead capture.
 * Zero JavaScript — pure HTML POST form.
 */
export function generateInlineForm(config: FormConfig): string {
  const fields = config.fields.map(fieldHtml).join('\n      ')
  const btnStyle = 'width:100%;padding:.75rem;background:#e94560;color:#fff;border:none;border-radius:.5rem;font-weight:600;font-size:.9rem;cursor:pointer'

  return `<form action="${escapeHtml(config.captureUrl)}" method="POST" class="lf-form">
      <input type="hidden" name="form_id" value="${escapeHtml(config.formId)}">
      <input type="hidden" name="landing_site_id" value="${escapeHtml(config.landingSiteId)}">
      ${fields}
      <button type="submit" style="${btnStyle}">${escapeHtml(config.buttonText)}</button>
    </form>`
}

/**
 * Generate a popup form with trigger logic.
 * Minimal JS (~20 lines) for show/hide + trigger detection.
 */
export function generatePopupForm(config: FormConfig, popup: PopupConfig): string {
  const fields = config.fields.map(fieldHtml).join('\n        ')
  const btnStyle = 'width:100%;padding:.75rem;background:#e94560;color:#fff;border:none;border-radius:.5rem;font-weight:600;font-size:.9rem;cursor:pointer'

  const popupCfg = JSON.stringify({
    trigger: popup.trigger,
    value: popup.value,
    show_once: popup.showOnce,
  })

  return `<div id="lf-popup" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:1rem;padding:2rem;max-width:420px;width:90%;position:relative;box-shadow:0 25px 50px rgba(0,0,0,.15)">
    <button onclick="document.getElementById('lf-popup').style.display='none'" style="position:absolute;top:1rem;right:1rem;border:none;background:none;font-size:1.5rem;cursor:pointer;color:#999">&times;</button>
    <h2 style="margin:0 0 .5rem;font-size:1.25rem;font-weight:700">${escapeHtml(popup.headline)}</h2>
    <p style="color:#6b7280;font-size:.9rem;margin:0 0 1.5rem">${escapeHtml(popup.description)}</p>
    <form action="${escapeHtml(config.captureUrl)}" method="POST">
      <input type="hidden" name="form_id" value="${escapeHtml(config.formId)}">
      <input type="hidden" name="landing_site_id" value="${escapeHtml(config.landingSiteId)}">
        ${fields}
      <button type="submit" style="${btnStyle}">${escapeHtml(config.buttonText)}</button>
    </form>
  </div>
</div>
<script>
(function(){
  var cfg=${popupCfg};
  var el=document.getElementById('lf-popup');
  if(!el||sessionStorage.getItem('lf-seen'))return;
  function show(){el.style.display='flex';if(cfg.show_once)sessionStorage.setItem('lf-seen','1')}
  if(cfg.trigger==='time_delay')setTimeout(show,cfg.value*1000);
  if(cfg.trigger==='scroll_percent')window.addEventListener('scroll',function f(){
    if((window.scrollY/(document.body.scrollHeight-window.innerHeight))*100>=cfg.value){show();window.removeEventListener('scroll',f)}});
  if(cfg.trigger==='exit_intent')document.addEventListener('mouseout',function f(e){
    if(e.clientY<5){show();document.removeEventListener('mouseout',f)}});
})();
</script>`
}
