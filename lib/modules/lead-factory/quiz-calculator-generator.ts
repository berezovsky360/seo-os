// Quiz & Calculator HTML generators for embedding in landing pages.
// Produces self-contained HTML+JS that works without external dependencies.

import type { FormConfig } from './form-generator'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// ====== Shared visual header ======

interface VisualConfig {
  cover_image?: string
  headline?: string
  subtitle?: string
  button_color?: string
  button_text_color?: string
}

function visualHeaderHtml(v: VisualConfig): string {
  const parts: string[] = []
  if (v.cover_image) {
    parts.push(`<img src="${escapeHtml(v.cover_image)}" alt="" style="width:100%;max-height:180px;object-fit:cover;border-radius:.75rem .75rem 0 0;margin:-2rem -2rem 1.5rem -2rem;width:calc(100% + 4rem)">`)
  }
  if (v.headline) {
    parts.push(`<h2 style="margin:0 0 .25rem;font-size:1.25rem;font-weight:700;color:#111">${escapeHtml(v.headline)}</h2>`)
  }
  if (v.subtitle) {
    parts.push(`<p style="color:#6b7280;font-size:.9rem;margin:0 0 1.5rem">${escapeHtml(v.subtitle)}</p>`)
  }
  return parts.join('\n    ')
}

function btnStyle(v: VisualConfig): string {
  const bg = v.button_color || '#e94560'
  const fg = v.button_text_color || '#ffffff'
  return `width:100%;padding:.75rem;background:${bg};color:${fg};border:none;border-radius:.5rem;font-weight:600;font-size:.9rem;cursor:pointer`
}

// ====== Quiz Form ======

interface QuizStep {
  id: string
  question: string
  type: 'single_choice' | 'multi_choice' | 'text_input'
  options: { label: string; value: string; points: number }[]
  image?: string
}

interface QuizGenConfig {
  visual?: VisualConfig
  steps: QuizStep[]
  scoring?: {
    enabled?: boolean
    show_score?: boolean
    redirects?: { min_score: number; max_score: number; url: string; label: string }[]
  }
  collect_email?: 'first' | 'last' | 'none'
}

export function generateQuizForm(config: FormConfig, quiz: QuizGenConfig): string {
  const visual = quiz.visual || {}
  const steps = quiz.steps || []
  const scoring = quiz.scoring || {}
  const collectEmail = quiz.collect_email || 'last'
  const totalSteps = steps.length + (collectEmail !== 'none' ? 1 : 0)

  // Build step HTML
  const stepsHtml = steps.map((step, i) => {
    let answersHtml = ''
    if (step.type === 'text_input') {
      answersHtml = `<input type="text" name="${escapeHtml(step.id)}" style="width:100%;padding:.75rem 1rem;border:1px solid #e5e7eb;border-radius:.5rem;font-size:.9rem;outline:none" placeholder="Your answer...">`
    } else {
      const inputType = step.type === 'multi_choice' ? 'checkbox' : 'radio'
      answersHtml = step.options
        .map(
          (opt) =>
            `<label style="display:flex;align-items:center;gap:.75rem;padding:.75rem 1rem;border:1px solid #e5e7eb;border-radius:.5rem;cursor:pointer;transition:background .15s" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='#fff'">
          <input type="${inputType}" name="${escapeHtml(step.id)}" value="${escapeHtml(opt.value)}" data-points="${opt.points}" style="accent-color:${visual.button_color || '#e94560'}">
          <span style="font-size:.9rem;color:#374151">${escapeHtml(opt.label)}</span>
        </label>`
        )
        .join('\n        ')
    }

    const stepImg = step.image
      ? `<img src="${escapeHtml(step.image)}" alt="" style="width:100%;max-height:120px;object-fit:cover;border-radius:.5rem;margin-bottom:1rem">`
      : ''

    return `<div class="lf-quiz-step" data-step="${i}" style="display:${i === 0 && collectEmail !== 'first' ? 'block' : 'none'}">
      ${stepImg}
      <p style="font-weight:600;font-size:1rem;color:#111;margin:0 0 1rem">${escapeHtml(step.question)}</p>
      <div style="display:flex;flex-direction:column;gap:.5rem;margin-bottom:1.5rem">
        ${answersHtml}
      </div>
    </div>`
  })

  // Email step
  const emailStepIndex = collectEmail === 'first' ? 0 : steps.length
  const emailStepDisplay = collectEmail === 'first' ? 'block' : 'none'
  const emailStepHtml =
    collectEmail !== 'none'
      ? `<div class="lf-quiz-step" data-step="${emailStepIndex}" style="display:${emailStepDisplay}">
      <p style="font-weight:600;font-size:1rem;color:#111;margin:0 0 1rem">${collectEmail === 'first' ? 'Before we start...' : 'Almost done!'}</p>
      <input type="email" name="email" required placeholder="your@email.com" style="width:100%;padding:.75rem 1rem;border:1px solid #e5e7eb;border-radius:.5rem;font-size:.9rem;outline:none;margin-bottom:.75rem">
    </div>`
      : ''

  const btn = btnStyle(visual)

  return `<div id="lf-quiz" style="max-width:480px;margin:0 auto;background:#fff;border-radius:1rem;padding:2rem;box-shadow:0 4px 20px rgba(0,0,0,.08)">
    ${visualHeaderHtml(visual)}
    <form id="lf-quiz-form" action="${escapeHtml(config.captureUrl)}" method="POST">
      <input type="hidden" name="form_id" value="${escapeHtml(config.formId)}">
      <input type="hidden" name="landing_site_id" value="${escapeHtml(config.landingSiteId)}">
      ${collectEmail === 'first' ? emailStepHtml : ''}
      ${stepsHtml.join('\n      ')}
      ${collectEmail === 'last' ? emailStepHtml : ''}
      <div style="display:flex;gap:.75rem;margin-top:.5rem">
        <button type="button" id="lf-quiz-prev" style="${btn};opacity:.6;display:none" onclick="lfQuizNav(-1)">Back</button>
        <button type="button" id="lf-quiz-next" style="${btn}" onclick="lfQuizNav(1)">Next</button>
        <button type="submit" id="lf-quiz-submit" style="${btn};display:none">${escapeHtml(config.buttonText)}</button>
      </div>
      <div style="text-align:center;margin-top:1rem">
        <span id="lf-quiz-progress" style="font-size:.75rem;color:#9ca3af">Step 1 of ${totalSteps}</span>
      </div>
    </form>
    <div id="lf-quiz-result" style="display:none;text-align:center;padding:2rem 0">
      <p style="font-size:1.1rem;font-weight:600;color:#111" id="lf-quiz-score-text"></p>
    </div>
  </div>
<script>
(function(){
  var cur=0,total=${totalSteps};
  var steps=document.querySelectorAll('.lf-quiz-step');
  var prev=document.getElementById('lf-quiz-prev');
  var next=document.getElementById('lf-quiz-next');
  var submit=document.getElementById('lf-quiz-submit');
  var prog=document.getElementById('lf-quiz-progress');
  var scoring=${JSON.stringify(scoring)};
  var quizSteps=${JSON.stringify(steps.map((s) => ({ id: s.id, options: s.options })))};

  function show(){
    steps.forEach(function(s,i){s.style.display=i===cur?'block':'none'});
    prev.style.display=cur>0?'inline-block':'none';
    next.style.display=cur<total-1?'inline-block':'none';
    submit.style.display=cur===total-1?'inline-block':'none';
    prog.textContent='Step '+(cur+1)+' of '+total;
  }

  window.lfQuizNav=function(dir){
    cur=Math.max(0,Math.min(total-1,cur+dir));
    show();
  };

  var form=document.getElementById('lf-quiz-form');
  form.addEventListener('submit',function(e){
    if(scoring.enabled){
      e.preventDefault();
      var fd=new FormData(form);
      var score=0;
      quizSteps.forEach(function(qs){
        var ans=fd.getAll(qs.id);
        (qs.options||[]).forEach(function(opt){
          if(ans.indexOf(opt.value)!==-1)score+=opt.points;
        });
      });
      fd.append('quiz_score',score);
      var label='';
      (scoring.redirects||[]).forEach(function(r){
        if(score>=r.min_score&&score<=r.max_score)label=r.label;
      });
      fd.append('quiz_result_label',label);
      fetch(form.action,{method:'POST',body:fd}).then(function(r){return r.json()}).then(function(d){
        if(d.redirect_url){window.location.href=d.redirect_url}
        else{
          form.style.display='none';
          var res=document.getElementById('lf-quiz-result');
          res.style.display='block';
          var txt=document.getElementById('lf-quiz-score-text');
          if(scoring.show_score)txt.textContent='Your score: '+score+(label?' — '+label:'');
          else if(label)txt.textContent=label;
          else txt.textContent='Thank you!';
        }
      });
    }
  });

  show();
})();
</script>`
}

// ====== Calculator Form ======

interface CalcInput {
  id: string
  label: string
  type: 'number' | 'slider'
  default: number
  min: number
  max: number
  step: number
}

interface CalcGenConfig {
  visual?: VisualConfig
  inputs: CalcInput[]
  formula: string
  result_template: string
  collect_email?: 'after_result' | 'before_result' | 'none'
}

export function generateCalculatorForm(config: FormConfig, calc: CalcGenConfig): string {
  const visual = calc.visual || {}
  const collectEmail = calc.collect_email || 'after_result'

  const inputsHtml = calc.inputs
    .map((inp) => {
      if (inp.type === 'slider') {
        return `<div style="margin-bottom:1rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.25rem">
          <label style="font-size:.85rem;font-weight:500;color:#374151">${escapeHtml(inp.label)}</label>
          <span id="lf-calc-val-${escapeHtml(inp.id)}" style="font-size:.85rem;font-weight:600;color:#111">${inp.default}</span>
        </div>
        <input type="range" name="${escapeHtml(inp.id)}" value="${inp.default}" min="${inp.min}" max="${inp.max}" step="${inp.step}" style="width:100%;accent-color:${visual.button_color || '#e94560'}" oninput="document.getElementById('lf-calc-val-${escapeHtml(inp.id)}').textContent=this.value;lfCalcUpdate()">
      </div>`
      }
      return `<div style="margin-bottom:1rem">
        <label style="display:block;font-size:.85rem;font-weight:500;color:#374151;margin-bottom:.25rem">${escapeHtml(inp.label)}</label>
        <input type="number" name="${escapeHtml(inp.id)}" value="${inp.default}" min="${inp.min}" max="${inp.max}" step="${inp.step}" style="width:100%;padding:.75rem 1rem;border:1px solid #e5e7eb;border-radius:.5rem;font-size:.9rem;outline:none" oninput="lfCalcUpdate()">
      </div>`
    })
    .join('\n      ')

  const btn = btnStyle(visual)

  const emailHtml =
    collectEmail !== 'none'
      ? `<div id="lf-calc-email" style="display:${collectEmail === 'before_result' ? 'block' : 'none'};margin-top:1rem">
        <input type="email" name="email" required placeholder="your@email.com" style="width:100%;padding:.75rem 1rem;border:1px solid #e5e7eb;border-radius:.5rem;font-size:.9rem;outline:none;margin-bottom:.75rem">
      </div>`
      : ''

  return `<div id="lf-calc" style="max-width:480px;margin:0 auto;background:#fff;border-radius:1rem;padding:2rem;box-shadow:0 4px 20px rgba(0,0,0,.08)">
    ${visualHeaderHtml(visual)}
    <form id="lf-calc-form" action="${escapeHtml(config.captureUrl)}" method="POST">
      <input type="hidden" name="form_id" value="${escapeHtml(config.formId)}">
      <input type="hidden" name="landing_site_id" value="${escapeHtml(config.landingSiteId)}">
      ${inputsHtml}
      <div id="lf-calc-result" style="text-align:center;padding:1.25rem;background:#f9fafb;border-radius:.75rem;margin:1rem 0;border:1px solid #e5e7eb">
        <p style="font-size:.75rem;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;margin:0 0 .25rem">Result</p>
        <p id="lf-calc-result-text" style="font-size:1.5rem;font-weight:700;color:#111;margin:0"></p>
      </div>
      ${emailHtml}
      <input type="hidden" name="calculator_result" id="lf-calc-result-val" value="">
      <button type="submit" style="${btn};margin-top:.5rem">${escapeHtml(config.buttonText)}</button>
    </form>
  </div>
<script>
(function(){
  var formula=${JSON.stringify(calc.formula)};
  var tpl=${JSON.stringify(calc.result_template)};
  var ids=${JSON.stringify(calc.inputs.map((i) => i.id))};
  var collectEmail=${JSON.stringify(collectEmail)};

  window.lfCalcUpdate=function(){
    var form=document.getElementById('lf-calc-form');
    var fd=new FormData(form);
    var vars={};
    ids.forEach(function(id){vars[id]=parseFloat(fd.get(id))||0});
    var expr=formula;
    ids.forEach(function(id){expr=expr.split(id).join(vars[id])});
    var result=0;
    try{result=Function('"use strict";return ('+expr+')')()}catch(e){}
    result=Math.round(result*100)/100;
    var text=tpl.replace(/\\$\\{result\\}/g,result);
    document.getElementById('lf-calc-result-text').textContent=text;
    document.getElementById('lf-calc-result-val').value=result;
    if(collectEmail==='after_result'){
      var el=document.getElementById('lf-calc-email');
      if(el)el.style.display='block';
    }
  };
  lfCalcUpdate();
})();
</script>`
}
