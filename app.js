'use strict';
const KEY='wincontrol.entries.v1';
const $=id=>document.getElementById(id);
const brl=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const sgn=v=>(v>0?'+':'')+brl(v);
const compact=v=>{const a=Math.abs(v),s=v>0?'+':v<0?'−':'';const n=a>=1e6?(a/1e6).toLocaleString('pt-BR',{maximumFractionDigits:1})+'M':a>=1e3?(a/1e3).toLocaleString('pt-BR',{maximumFractionDigits:1})+'k':a.toLocaleString('pt-BR',{maximumFractionDigits:0});return s+n};
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const fmtDate=s=>new Date(s+'T12:00').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

// ---- storage ----
let entries=load();
function load(){try{return JSON.parse(localStorage.getItem(KEY))||{}}catch{return{}}}
function save(){localStorage.setItem(KEY,JSON.stringify(entries))}

// ---- state ----
let view=new Date();view.setDate(1);let editing=null,sign=1;

function monthEntries(){const p=iso(view).slice(0,7);return Object.values(entries).filter(e=>e.date.startsWith(p)).sort((a,b)=>a.date<b.date?-1:1)}

function renderStats(list){
  const total=list.reduce((s,e)=>s+e.value,0),w=list.filter(e=>e.value>0).length,l=list.filter(e=>e.value<0).length;
  $('sTotal').textContent=sgn(total);
  $('sCount').textContent=`${list.length} dia(s) registrado(s)`;
  $('sRate').textContent=list.length?Math.round(w/list.length*100)+'%':'—';
  $('sWL').textContent=`${w} dias + · ${l} dias −`;
  let st=0,k=0;for(let i=list.length-1;i>=0;i--){const s=Math.sign(list[i].value);if(!s)break;if(!k)k=s;if(s!==k)break;st++}
  const se=$('sStreak');se.textContent=st?`${st} ${k>0?'vitória':'derrota'}${st>1?'s':''}`:'—';se.className=k>0?'pos':k<0?'neg':'';
  const best=list.reduce((b,e)=>!b||e.value>b.value?e:b,null),worst=list.reduce((b,e)=>!b||e.value<b.value?e:b,null);
  $('sBest').textContent=best&&best.value>0?sgn(best.value):'—';$('sBestD').textContent=best&&best.value>0?fmtDate(best.date).split(',')[1]:'';
  $('sWorst').textContent=worst&&worst.value<0?sgn(worst.value):'—';$('sWorstD').textContent=worst&&worst.value<0?fmtDate(worst.date).split(',')[1]:'';
}

function renderCalendar(){
  {const t=view.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});$('monthLabel').textContent=t[0].toUpperCase()+t.slice(1)}
  const box=$('days');box.innerHTML='';const y=view.getFullYear(),m=view.getMonth(),today=iso(new Date());
  for(let i=0;i<new Date(y,m,1).getDay();i++){const b=document.createElement('div');b.className='day out';box.append(b)}
  const n=new Date(y,m+1,0).getDate();
  for(let d=1;d<=n;d++){
    const key=iso(new Date(y,m,d)),e=entries[key],b=document.createElement('button');
    b.type='button';b.className='day'+(key===today?' today':'')+(e?' has '+(e.value>0?'p':e.value<0?'l':'z'):'');
    b.innerHTML=`<span class="n">${d}</span>${e?`<span class="v">${compact(e.value)}</span>`:''}`;
    b.setAttribute('aria-label',`${fmtDate(key)}: ${e?sgn(e.value)+(e.note?'. '+e.note:''):'sem registro'}`);
    if(e&&e.note)b.title=e.note;
    b.onclick=()=>openDay(key);box.append(b);
  }
}

function renderChart(list){
  const svg=$('chart');svg.innerHTML='';$('chartEmpty').hidden=list.length>0;if(!list.length)return;
  let acc=0;const pts=[0,...list.map(e=>acc+=e.value)];const mn=Math.min(0,...pts),mx=Math.max(0,...pts),r=mx-mn||1;
  const X=i=>pts.length===1?200:i/(pts.length-1)*390+5,Y=v=>190-(v-mn)/r*180;
  const line=pts.map((v,i)=>`${X(i)},${Y(v)}`).join(' ');const up=acc>=0;const c=up?'#5aa2ff':'#f43f5e';
  svg.innerHTML=`<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".45"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs>
  <line x1="0" x2="400" y1="${Y(0)}" y2="${Y(0)}" stroke="#8ea6d6" stroke-dasharray="4 4" stroke-width="1"/>
  <polygon points="${X(0)},${Y(0)} ${line} ${X(pts.length-1)},${Y(0)}" fill="url(#g)"/>
  <polyline points="${line}" fill="none" stroke="${c}" stroke-width="3" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  ${pts.map((v,i)=>`<circle cx="${X(i)}" cy="${Y(v)}" r="3.5" fill="#fff"/>`).join('')}`;
}

function render(){const l=monthEntries();renderStats(l);renderCalendar();renderChart(l)}

// ---- modal ----
function setSign(s){sign=s;$('signPos').classList.toggle('on',s>0);$('signNeg').classList.toggle('on',s<0);$('signPos').setAttribute('aria-pressed',s>0);$('signNeg').setAttribute('aria-pressed',s<0)}
const parseVal=t=>{const n=parseFloat(String(t).replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',','.'));return isNaN(n)?null:n};
function openDay(key){
  editing=key;const e=entries[key];$('dlgDate').textContent=fmtDate(key);
  setSign(e&&e.value<0?-1:1);$('val').value=e?Math.abs(e.value).toLocaleString('pt-BR',{minimumFractionDigits:2}):'';
  $('note').value=e?.note||'';$('delBtn').hidden=!e;$('dlg').showModal();$('val').focus();
}
$('val').addEventListener('input',e=>{if(e.target.value.trim().startsWith('-')){setSign(-1);e.target.value=e.target.value.replace('-','')}});
$('val').addEventListener('blur',e=>{const n=parseVal(e.target.value);if(n!==null)e.target.value=Math.abs(n).toLocaleString('pt-BR',{minimumFractionDigits:2})});
$('signPos').onclick=()=>setSign(1);$('signNeg').onclick=()=>setSign(-1);
$('cancelBtn').onclick=()=>$('dlg').close();
$('delBtn').onclick=()=>{if(confirm('Excluir o registro deste dia?')){delete entries[editing];save();$('dlg').close();render()}};
$('form').addEventListener('submit',ev=>{const n=parseVal($('val').value);if(n===null){ev.preventDefault();$('val').focus();return}
  entries[editing]={date:editing,value:Math.round(Math.abs(n)*sign*100)/100,note:$('note').value.trim()};save();render()});

// ---- nav ----
$('prev').onclick=()=>{view.setMonth(view.getMonth()-1);render()};
$('next').onclick=()=>{view.setMonth(view.getMonth()+1);render()};
$('todayBtn').onclick=()=>{view=new Date();view.setDate(1);render()};

// ---- backup ----
$('exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify(Object.values(entries),null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`wincontrol-backup-${iso(new Date())}.json`;a.click()};
document.querySelector('label[for=importFile]').onkeydown=e=>{if(e.key==='Enter'||e.key===' ')$('importFile').click()};
$('importFile').onchange=async e=>{try{const arr=JSON.parse(await e.target.files[0].text());let c=0;for(const x of arr){if(/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&typeof x.value==='number'){entries[x.date]={date:x.date,value:x.value,note:String(x.note||'')};c++}}save();render();alert(`${c} registro(s) importado(s).`)}catch{alert('Arquivo inválido.')}e.target.value=''};

render();

// ---- tabs ----
function showTab(t){const c=t==='calc';$('viewDiario').hidden=c;$('viewCalc').hidden=!c;
  $('tabDiario').classList.toggle('on',!c);$('tabCalc').classList.toggle('on',c);$('tabDiario').setAttribute('aria-selected',!c);$('tabCalc').setAttribute('aria-selected',c);
  if(c)calc();try{localStorage.setItem('wincontrol.tab',t)}catch{}}
$('tabDiario').onclick=()=>showTab('diario');$('tabCalc').onclick=()=>showTab('calc');

// ---- calculadora ----
let mode='simple';
const num=id=>{const n=parseVal($(id).value);return n===null?0:n};
const pct=v=>(v>=0?'+':'')+v.toLocaleString('pt-BR',{maximumFractionDigits:2})+'%';
function setMode(m){mode=m;$('mSimple').classList.toggle('on',m==='simple');$('mGer').classList.toggle('on',m==='ger');
  $('mSimple').setAttribute('aria-pressed',m==='simple');$('mGer').setAttribute('aria-pressed',m==='ger');
  $('fSimple').hidden=m!=='simple';$('fGer').hidden=m!=='ger';calc()}
$('mSimple').onclick=()=>setMode('simple');$('mGer').onclick=()=>setMode('ger');
function calc(){
  const cap=Math.max(0,num('cCap')),n=Math.min(600,Math.max(1,Math.round(num('cN')))),ap=Math.max(0,num('cAp'));
  let rate,unit,risk=0,tpm=0;
  if(mode==='ger'){
    risk=num('gRisk')/100;const tpd=num('gTpd'),days=num('gDays'),hit=num('gHit')/100,rr=num('gRR');
    tpm=days*tpd;const ev=hit*rr-(1-hit);rate=tpm*risk*ev;unit='Mês';
    $('gFormula').innerHTML=`${days} dias × ${tpd} trades × ${(risk*100).toLocaleString('pt-BR')}% × (${(hit*100).toLocaleString('pt-BR')}% × ${rr.toLocaleString('pt-BR')} − ${((1-hit)*100).toLocaleString('pt-BR')}%)<br>= <b>${pct(rate*100)} ao mês</b> · risco recalculado no início de cada mês`;
  }else{rate=num('cRate')/100;unit=$('cPer').value==='dia'?'Dia':'Mês'}
  $('cNLabel').textContent=mode==='ger'?'Nº de meses':`Nº de ${unit==='Dia'?'dias':'meses'}`;
  const rows=[];let c=cap;
  for(let i=1;i<=n;i++){const start=c,rv=start*risk,profit=start*rate;c=Math.max(0,start+profit+ap);rows.push({i,start,rv,profit,end:c})}
  const tot=cap+ap*n,prof=c-tot;
  $('oFinal').textContent=brl(c);$('oMult').textContent=cap?`${(c/cap).toLocaleString('pt-BR',{maximumFractionDigits:2})}× o capital inicial`:'';
  $('oProfit').textContent=sgn(prof);$('oProfit').className=prof>=0?'pos':'neg';$('oPct').textContent=tot?pct(prof/tot*100)+' sobre o investido':'';
  $('oAp').textContent=brl(tot);$('oRate').textContent=`${pct(rate*100)} por ${unit.toLowerCase()}`;
  const g=mode==='ger';
  $('cTable').tHead.innerHTML=`<tr><th>${unit}</th><th>Capital início</th>${g?'<th>Risco/trade</th>':''}<th>Lucro</th>${ap?'<th>Aporte</th>':''}<th>Capital final</th></tr>`;
  $('cTable').tBodies[0].innerHTML=rows.map(r=>`<tr><td>${r.i}</td><td>${brl(r.start)}</td>${g?`<td>${brl(r.rv)}</td>`:''}<td class="${r.profit>=0?'pos':'neg'}">${sgn(r.profit)}</td>${ap?`<td>${brl(ap)}</td>`:''}<td><b>${brl(r.end)}</b></td></tr>`).join('');
  const pts=[cap,...rows.map(r=>r.end)],mx=Math.max(...pts)||1,X=i=>i/(pts.length-1)*390+5,Y=v=>190-v/mx*175;
  const line=pts.map((v,i)=>`${X(i)},${Y(v)}`).join(' ');
  $('cChart').innerHTML=`<defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5aa2ff" stop-opacity=".5"/><stop offset="1" stop-color="#5aa2ff" stop-opacity="0"/></linearGradient></defs>
  ${[.25,.5,.75,1].map(f=>`<line x1="0" x2="400" y1="${Y(mx*f)}" y2="${Y(mx*f)}" stroke="#1d3a75" stroke-width="1" vector-effect="non-scaling-stroke"/>`).join('')}
  <polygon points="${X(0)},190 ${line} ${X(pts.length-1)},190" fill="url(#cg)"/>
  <polyline points="${line}" fill="none" stroke="#5aa2ff" stroke-width="3" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
}
document.querySelectorAll('#viewCalc input,#viewCalc select').forEach(el=>el.addEventListener('input',calc));
$('useDiario').onclick=()=>{const all=Object.values(entries);if(!all.length){$('useInfo').textContent='Nenhum registro no diário ainda.';return}
  const s=all.reduce((a,e)=>a+e.value,0);$('cCap').value=Math.max(0,s).toLocaleString('pt-BR',{minimumFractionDigits:2});
  $('useInfo').textContent=`Soma de ${all.length} dia(s) registrados: ${sgn(s)}`;calc()};
try{if(localStorage.getItem('wincontrol.tab')==='calc')showTab('calc')}catch{}
if(location.hash==='#calc'||location.hash==='#gerenciamento'){showTab('calc');if(location.hash==='#gerenciamento')setMode('ger')}
