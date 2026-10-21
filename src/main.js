import './style.css';
import {createRound,vegas,olympic,olympicNet,headToHead,upDown,totals,validRound,validCourse,applyCourse,scoreMark,vegasRules,pushCount,pushesUsed,canPush,olympicPicks,pushTimings,OLYMPIC_MIN,OLYMPIC_MAX,teeOrder} from './game.js';
const key='fairway.round.v1',courseKey='fairway.courses.v1';
let round=createRound(),hole=0,tab='round',game='vegas',notice='',settings=false;
// draft: settings form values kept while the course editor is open. editor: the course being edited.
let draft=null,editor=null,courses=[];
try {const raw=localStorage.getItem(key);if(raw){const saved=JSON.parse(raw);if(validRound(saved))round=saved;else notice='保存データを読み込めませんでした。新しいラウンドを表示しています。';}}catch{notice='保存データを読み込めませんでした。';}
try {const list=JSON.parse(localStorage.getItem(courseKey)||'[]');courses=Array.isArray(list)?list.filter(validCourse):[];}catch{courses=[];}
settings=round.started===false;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const signed=n=>`${n>0?'+':''}${n.toLocaleString('ja-JP')}`;
const tone=n=>n>0?'pos':n<0?'neg':'';
const ranges={scores:[1,20],olympic:[OLYMPIC_MIN,OLYMPIC_MAX]};
const labels={scores:'スコア',olympic:'オリンピックの点'};
const olympicValue=(h,p)=>Array.isArray(h.olympic)?h.olympic[p]:olympic(h)[p]||null;
const icons={
 round:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 21V3l11 4.5L6 12"/></svg>',
 card:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="1.5"/><path d="M3.5 10h17M3.5 15h17M9.5 4.5v15"/></svg>',
 results:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20v-6M12 20V5M19 20v-9"/></svg>',
 settings:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
};
function save(){try{localStorage.setItem(key,JSON.stringify(round));notice='';}catch{notice='端末に保存できません。終了前にJSONを保存してください。';}}
function saveCourses(){try{localStorage.setItem(courseKey,JSON.stringify(courses));}catch{notice='コースを端末に保存できませんでした。';}}
function button(text,action,cls='',extra=''){return `<button type="button" class="${cls}" data-action="${action}" ${extra}>${text}</button>`;}
function stepper(kind,p,value,mark=''){const n=esc(round.names[p]),[min,max]=ranges[kind];return `<div class="stepper ${kind}">${button('−',`step:${kind}:${p}:-1`,'step-btn',`aria-label="${n}の${labels[kind]}を減らす"`)}<span class="num ${mark?`mark-${mark}`:''}"><input type="number" inputmode="numeric" min="${min}" max="${max}" data-kind="${kind}" data-player="${p}" ${round.started===false?'disabled':''} value="${value??''}" placeholder="–" aria-label="${n}の${labels[kind]}"></span>${button('+',`step:${kind}:${p}:1`,'step-btn',`aria-label="${n}の${labels[kind]}を増やす"`)}</div>`;}
function render(){
 const sum=totals(round),completed=round.holes.slice(0,round.count).filter(h=>h.scores.every(Number.isInteger)).length;
 document.querySelector('#app').innerHTML=`
 <div class="top"><header class="topbar"><strong>${esc(round.course||'コース未設定')}</strong><span>${round.count}ホール中 ${completed}ホール入力済み</span></header>${tab==='round'?holeBar():''}</div>
 ${notice&&!settings?`<div role="status" class="toast">${esc(notice)}</div>`:''}
 <main class="screen">${tab==='round'?roundView(sum):tab==='card'?scoreCard(sum):results(sum)}</main>
 ${bottomNav()}
 ${settings?settingsView():''}`;
 const strip=document.querySelector('.hole-strip'),current=strip?.querySelector('[aria-current="true"]');
 if(strip&&current)strip.scrollLeft=current.offsetLeft-(strip.clientWidth-current.clientWidth)/2;
}
function holeBar(){
 const h=round.holes[hole];
 return `<div class="hole-bar">${button('‹','prev','nav-btn','aria-label="前のホール" '+(hole===0?'disabled':''))}<div class="hole-now"><span class="hole-no"><b>${hole+1}</b>番</span><label class="par">パー<select id="par" aria-label="このホールのパー">${[3,4,5,6].map(p=>`<option ${p===h.par?'selected':''}>${p}</option>`).join('')}</select></label></div>${button('›','next','nav-btn','aria-label="次のホール" '+(hole===round.count-1?'disabled':''))}</div>
 <nav class="hole-strip" aria-label="ホールを選ぶ">${round.holes.slice(0,round.count).map((x,i)=>button(String(i+1),`hole-${i}`,`${x.scores.every(Number.isInteger)?'done':''} ${i===9?'turn':''}`,`aria-label="${i+1}番ホール" ${i===hole?'aria-current="true"':''}`)).join('')}</nav>`;
}
function bottomNav(){
 const item=(id,label,action)=>button(`${icons[id]}<span>${label}</span>`,action,'',tab===id&&!settings?'aria-current="page"':'');
 return `<nav class="bottom-nav" aria-label="画面の切り替え">${item('round','入力','tab-round')}${item('card','スコアカード','tab-card')}${item('results','ゲーム結果','tab-results')}${button(`${icons.settings}<span>設定</span>`,'settings','',`aria-label="ラウンド設定" ${settings?'aria-current="page"':''}`)}</nav>`;
}
function roundView(sum){
 const h=round.holes[hole],order=teeOrder(round,hole),v=vegas(round,hole),last=hole===round.count-1;
 return `${round.started===false?`<div class="start-card"><p>ラスベガスのルールを決めてから始めます。</p>${button('ルールを決めて開始','settings','primary')}</div>`:''}
 <section class="players" aria-label="スコアを記録"><div class="players-head" aria-hidden="true"><span></span><span>スコア</span><span>オリンピック</span></div>${round.names.map((n,p)=>`<div class="input-row"><div class="player-name"><span class="avatar p${p}">${p+1}</span><div><strong>${esc(n)}</strong><small>${order[0]===p?'<em class="honor">オナー</em>':`<span>${order.indexOf(p)+1}番目</span>`}<span class="lv-total">ベガス <b class="${tone(sum[p].vegas)}">${signed(sum[p].vegas)}</b></span></small></div></div>${stepper('scores',p,h.scores[p],scoreMark(h.scores[p],h.par))}${stepper('olympic',p,olympicValue(h,p))}</div>`).join('')}</section>
 <section class="games" aria-label="このホールのゲーム">${gameTabs()}<div class="game-panel">${gamePanel(h,v)}</div></section>
 <div class="next-row"><p>${h.scores.every(Number.isInteger)?'全員のスコアを入力しました':'全員のスコアを入れると、ゲームの結果が出ます'}</p>${button(last?'ゲーム結果を見る':`${hole+2}番ホールへ`,last?'tab-results':'next','primary wide')}</div>`;
}
function gameTabs(){return `<div class="segmented" role="group" aria-label="ゲーム">${[['vegas','ラスベガス'],['olympic','オリンピック'],['match','スコアマッチ']].map(([g,t])=>button(t,`game-${g}`,'',`aria-pressed="${game===g}"`)).join('')}</div>`;}
function gamePanel(h,v){
 if(game==='vegas')return vegasPanel(h,v);
 if(game==='olympic'){
  const net=olympicNet(olympic(h));
  return `<p class="lead">全員がグリーンに乗ったら、カップから遠い順に金・銀・銅・鉄。1パットで沈めた人の点を入れます。グリーンの外から直接入ったらダイヤ5点。</p><div class="olympic-list">${round.names.map((n,p)=>{const value=olympicValue(h,p);return `<div class="olympic-row"><div class="olympic-name"><span class="avatar p${p}">${p+1}</span><strong>${esc(n)}</strong><small>差し引き <b class="${tone(net[p])}">${signed(net[p])}</b></small></div><div class="picks">${olympicPicks.map(([label,pt])=>button(`${label}<small>${pt}</small>`,`olym:${p}:${pt}`,value===pt?'on':'',`aria-label="${esc(n)}に${label}${pt}点" aria-pressed="${value===pt}"`)).join('')}</div></div>`;}).join('')}</div><p class="fine">差し引きは、自分の点×4人から全員の点の合計を引いた数です（点を取った人が他の3人から受け取る形）。くず鉄（−1）などの独自ルールは、入力欄に数字で入れます。</p>`;
 }
 const mark=(p,q)=>{const x=h.scores[p],y=h.scores[q];return !Number.isInteger(x)||!Number.isInteger(y)?'':x<y?'○':x>y?'●':'△';};
 return `<p class="lead">ホールマッチ（ヨコ）の総当たりです。${hole+1}番ホールまでの、各相手との勝ち越しを出します。小さな記号はこのホールの結果です（○勝ち、●負け、△引き分け）。</p>${matchTable(headToHead(round,hole+1),mark,'このホールまでのアップダウン')}${matchLegend}`;
}
const matchLegend='<p class="fine">UPは勝ち越し、DNは負け越し、ASは並び（オールスクエア）。行の人から見た、列の相手との状況です。計は勝ちホール数から負けホール数を引いた合計です。</p>';
function matchTable(grid,mark,label){return `<div class="table-scroll h2h"><table aria-label="${label}"><thead><tr><th></th>${round.names.map((n,q)=>`<th><span class="avatar p${q}" aria-label="${esc(n)}">${q+1}</span></th>`).join('')}<th>計</th></tr></thead><tbody>${round.names.map((n,p)=>`<tr><th><span class="avatar p${p}">${p+1}</span> ${esc(n)}</th>${grid[p].map((x,q)=>p===q?'<td class="self">—</td>':`<td class="${x>0?'up':x<0?'down':''}">${upDown(x)}${mark&&mark(p,q)?`<small>${mark(p,q)}</small>`:''}</td>`).join('')}<td><b class="${tone(grid[p].reduce((a,b)=>a+b,0))}">${signed(grid[p].reduce((a,b)=>a+b,0))}</b></td></tr>`).join('')}</tbody></table></div>`;}
const pairingOptions=[['order:3','打順 1番・4番 対 2番・3番（定番）'],['order:1','打順 1番・2番 対 3番・4番'],['order:2','打順 1番・3番 対 2番・4番'],['fixed:1','18ホール固定：プレイヤー1・2 対 3・4'],['fixed:2','18ホール固定：プレイヤー1・3 対 2・4'],['fixed:3','18ホール固定：プレイヤー1・4 対 2・3'],['manual','毎ホール組み直す（ホールごとに選ぶ）'],['rotate:3','3ホールごとに交代（1-2→1-3→1-4）'],['rotate:6','6ホールごとに交代（1-2→1-3→1-4）']];
function pairingValue(rules,partner){return rules.pairing==='manual'?'manual':rules.pairing==='rotate'?`rotate:${rules.rotateEvery}`:`${rules.pairing}:${partner}`;}
function ruleSummary(rules){
 const carry={none:'',add:'同点は持ち越し（2倍→3倍…）',double:'同点は持ち越し（2倍→4倍…）'}[rules.carry];
 return [rules.roundUp?'一の位は繰り上げ':'',rules.birdie?'バーディで相手を反転':'',rules.birdieMult>1?'バーディで2倍':'',rules.eagle>1?`イーグル×${rules.eagle}`:'',rules.pairBirdie>1?`ペア2人バーディ×${rules.pairBirdie}`:'',`両ペアバーディは${rules.bothBirdie==='cancel'?'相殺':'両方反転'}`,{double:'ゾロ目は倍率2倍',add:'ゾロ目は倍率+1',none:''}[rules.zoroMode],rules.doublePar?'ダブルパーで自ペア反転':'',rules.overflow==='nine'?'10打以上は9打':'10打以上はその人を前に',carry,`リーチは${pushTimings[rules.pushTiming]}${rules.pushLimit?`、1人${rules.pushLimit}回まで（${rules.pushPer==='round'?'ラウンド通して':'ハーフごと'}）`:''}`].filter(Boolean);
}
function vegasPanel(h,v) {
 const rules=vegasRules(round),pushes=pushCount(h),format=n=>n.toLocaleString('ja-JP');
 const team=(letter,players,raw,final,flip,doublePar,zoro)=>`<div class="team"><span class="team-name">${letter}ペア</span><p>${players.map(p=>esc(round.names[p])).join('・')}</p><strong>${v.ready?final:'–'}</strong>${v.ready&&(flip||doublePar)?`<small class="score-effect">${zoro?'ゾロ目なので数字は同じ':raw===final?'反転しても数字は同じ':`${raw}から反転`}</small>`:''}</div>`;
 const kind=ach=>ach.kind==='eagle'?'イーグル以上':ach.pair?'2人ともバーディ':'バーディ';
 const effects=v.ready?[
   v.cancelled?'両ペアにバーディ以上があるので相殺（反転も倍率もなし）':'',
   !v.cancelled&&v.achA?`Aペアの${kind(v.achA)}${v.flipB?'で、Bペアを反転':''}`:'',
   !v.cancelled&&v.achB?`Bペアの${kind(v.achB)}${v.flipA?'で、Aペアを反転':''}`:'',
   v.birdieMultiplier>1?`バーディ・イーグルの倍率 ×${v.birdieMultiplier}`:'',
   v.doubleParA?'Aペアにダブルパー。自分たちの数字を反転':'',
   v.doubleParB?'Bペアにダブルパー。自分たちの数字を反転':'',
   v.zoroEvents?`反転される2人が同スコア（${v.zoroEvents}件）。${rules.zoroMode==='double'?'1件ごとに倍率を2倍':'1件ごとに倍率に1を足す'}`:'',
   v.carry>1?`前のホールから同点が続いている。持ち越し ×${v.carry}`:'',
 ].filter(Boolean):[];
 const parts=[];if(v.ready){if(v.base>1)parts.push(`リーチ・ゾロ目 ×${format(v.base)}`);if(v.birdieMultiplier>1)parts.push(`バーディ・イーグル ×${v.birdieMultiplier}`);if(v.carry>1)parts.push(`持ち越し ×${v.carry}`);}
 const gapText=v.ready&&v.gap!==v.baseDiff?`差 ${format(Math.abs(v.gap))} を ${format(Math.abs(v.baseDiff))} に繰り上げ`:`差 ${format(Math.abs(v.baseDiff??0))}`;
 const limit=rules.pushLimit,per=rules.pushPer==='round'?'ラウンド通して':'ハーフごと';
 const pushers=round.names.map((n,p)=>{const on=!!h.pushers?.[p],left=limit?limit-pushesUsed(round,p,hole)-(on?1:0):null;return button(`<strong>${esc(n)}</strong><small>${on?'リーチ中':'リーチする'}${left===null?'':`（残り${Math.max(0,left)}回）`}</small>`,`pusher:${p}`,on?'on':'',`aria-pressed="${on}" aria-label="${esc(n)}のリーチ" ${canPush(round,p,hole)?'':'disabled'}`);}).join('');
 return `${pairingControl(rules,h)}
 <div class="versus">${team('A',v.a,v.rawA,v.na,v.flipA,v.doubleParA,v.zoroA)}<span class="vs">対</span>${team('B',v.b,v.rawB,v.nb,v.flipB,v.doubleParB,v.zoroB)}</div>
 <div class="result-note ${v.ready&&v.diff!==0?'decided':''}">${v.ready?v.diff===0?`このホールは同点${rules.carry!=='none'?'。次のホールに持ち越し':''}`:`${v.diff>0?'A':'B'}ペアが ${format(Math.abs(v.diff))}点`:'全員のスコアを入れると計算します'}</div>
 <p class="calculation" aria-label="ラスベガスの計算式">${v.ready?`${gapText} × 倍率 ${format(v.multiplier)}${parts.length?`（${parts.join('、')}）`:''}`:`${v.carry>1?`持ち越し ×${v.carry}、`:''}リーチ ${pushes}回で ${format(v.pushMultiplier)}倍`}</p>
 ${effects.length?`<ul class="effect-list">${effects.map(e=>`<li>${e}</li>`).join('')}</ul>`:''}
 <div class="push-control"><h3>リーチ</h3><p>宣言した人ごとに、このホールの点が2倍になります（2人で4倍）。宣言は${pushTimings[rules.pushTiming]}。${limit?`1人${limit}回まで（${per}）。`:''}</p>${!Array.isArray(h.pushers)&&pushes?`<p>以前の記録：${pushes}回（人を押すと置き換わります）</p>`:''}<div class="pusher-list" role="group" aria-label="リーチした人">${pushers}</div></div>
 <details class="vegas-details"><summary>このラウンドのルール</summary><ul class="rule-list">${ruleSummary(rules).map(r=>`<li>${r}</li>`).join('')}</ul><p>① 2人の打数を並べて2桁にします。少ない打数が十の位（4と6なら46）。10打以上は、設定により9打として数えるか、その人の打数を前に置きます（4と10なら104）。<br>② バーディ以上の人がいるペアは、相手の数字を反転できます（46→64）。両ペアにいる場合は、設定どおり「相殺」か「両方反転」。<br>③ バーディで2倍、イーグルやペア2人のバーディで倍率を上げる設定があれば、その中で一番大きい倍率を使います。<br>④ ダブルパー（パーの2倍以上）の人がいるペアは、設定により自分たちの数字を反転します。<br>⑤ 反転される2人が同スコア（ゾロ目）なら、選んだ方式で倍率を増やします。<br>⑥ リーチは宣言した人数ぶん2倍ずつ。同点の持ち越しがあれば、直前の同点の回数に応じて倍率を掛けます。<br>⑦ 差を出し、一の位の繰り上げがありなら10点単位に切り上げます（11→20）。倍率を掛け、数字が小さいペアの各メンバーに加点し、相手から同じ点を引きます。</p><p>${rules.pairing==='order'?'打順は前のホールのスコア順です。同点なら直前の順番のまま、1番ホールはプレイヤー順です。':rules.pairing==='manual'?'ペアはホールごとに選びます。選んでいないホールは、開始時のペアです。':rules.pairing==='fixed'?'ペアは18ホール固定です。':`ペアはプレイヤー番号で、${rules.rotateEvery}ホールごとに 1-2、1-3、1-4 の順に交代します。`}</p></details>`;
}
function pairingControl(rules,h){
 if(rules.pairing!=='manual')return `<p class="pairing">ペア：${pairingOptions.find(([v])=>v===pairingValue(rules,round.partner))?.[1]??''}</p>`;
 const current=h.partner??round.partner;
 return `<label class="pairing">このホールのペア<select id="hole-partner" aria-label="このホールのペア">${[1,2,3].map(q=>`<option value="${q}" ${current===q?'selected':''}>${esc(round.names[0])}・${esc(round.names[q])}</option>`).join('')}</select></label>`;
}
function scoreCard(sum){
 const holes=round.holes.slice(0,round.count);
 const sub=(lv,ol)=>`<small class="card-sub"><span class="${tone(lv)}">ベ${signed(lv)}</span><span>オ${ol}</span></small>`;
 return `<div class="view-header"><h1>スコアカード</h1><p>○バーディ、◎イーグル以上、□ボギー、二重の□はダブルボギー以上。小さな数字はベガス（ベ）とオリンピック（オ）の点です。ホール番号を押すと入力に戻ります。</p></div><div class="table-scroll card-table"><table><thead><tr><th>ホール</th><th>パー</th>${round.names.map((n,p)=>`<th><span class="avatar p${p}">${p+1}</span><span class="th-name">${esc(n)}</span></th>`).join('')}</tr></thead><tbody>${holes.map((h,i)=>{const v=vegas(round,i),o=olympic(h);return `<tr><th>${button(String(i+1),`hole-${i}`,'text-btn',`aria-label="${i+1}番ホールを入力"`)}</th><td>${h.par}</td>${h.scores.map((s,p)=>`<td>${s===null?'–':`<span class="mini mark-${scoreMark(s,h.par)}">${s}</span>`}${s!==null||o[p]!==0?sub(v.ready?v.points[p]:0,o[p]):''}</td>`).join('')}</tr>`;}).join('')}<tr class="total"><th>計</th><td>${holes.reduce((a,h)=>a+h.par,0)}</td>${sum.map(s=>`<td><b>${s.played?s.strokes:'–'}</b>${sub(s.vegas,s.olympic)}</td>`).join('')}</tr></tbody></table></div>`;
}
function results(sum){
 const field=game==='vegas'?'vegas':game==='olympic'?'olympicNet':'match';
 const sub=s=>game==='olympic'?`獲得 ${s.olympic}点`:game==='match'?`${s.wins}勝 ${s.losses}敗`:'';
 const h2h=game==='match'?matchTable(headToHead(round),null,'相手ごとのアップダウン')+matchLegend:'';
 const note=game==='vegas'?'各ホールの点（差×倍率）の合計です。全員のスコアを入れたホールが対象です。':game==='olympic'?'差し引きは、獲得した点×4人から全員の獲得点の合計を引いた数です。全員分を足すと0になります。':'各相手との勝ちホール数から負けホール数を引いた合計です。';
 return `<div class="view-header"><h1>ゲーム結果</h1><p>入力済みのホールまでの途中結果です。</p></div>${gameTabs()}<div class="rankings">${sum.map((s,p)=>({p,s,value:s[field]})).sort((a,b)=>b.value-a.value).map(r=>`<div><span class="rank">${1+sum.filter(x=>x[field]>r.value).length}</span><span class="avatar p${r.p}">${r.p+1}</span><strong>${esc(round.names[r.p])}${sub(r.s)?`<span class="rank-sub">${sub(r.s)}</span>`:''}</strong><b class="${tone(r.value)}">${signed(r.value)}<small>点</small></b></div>`).join('')}</div>${h2h}<p class="fine">${note}</p>`;
}
function formFromRound(){return {course:round.course,courseId:round.courseId??'',names:[...round.names],count:round.count,rules:vegasRules(round),partner:round.partner};}
function readForm(){
 const q=id=>document.querySelector(id),[pairing,n]=q('#setup-pairing').value.split(':');
 const locked=round.started!==false,base=formFromRound();
 return {course:q('#course').value.trim(),courseId:q('#course-select').value,names:[...document.querySelectorAll('[data-name]')].map((el,p)=>el.value.trim()||`プレイヤー ${p+1}`),count:+q('#count').value,
  partner:locked?base.partner:pairing==='order'||pairing==='fixed'?+n:round.partner,
  rules:locked?base.rules:{pairing,rotateEvery:pairing==='rotate'?+n:3,roundUp:q('#setup-roundup').checked,birdie:q('#setup-birdie').checked,birdieMult:q('#setup-birdie-double').checked?2:1,eagle:+q('#setup-eagle').value,pairBirdie:+q('#setup-pair-birdie').value,bothBirdie:q('#setup-both').value,zoroMode:q('#setup-zoro').value,doublePar:q('#setup-double-par').checked,overflow:q('#setup-overflow').value,carry:q('#setup-carry').value,pushLimit:+q('#setup-push-limit').value,pushPer:q('#setup-push-per').value,pushTiming:q('#setup-push-timing').value}};
}
function settingsView(){
 if(editor)return courseEditorView();
 const f=draft??formFromRound(),r=f.rules,dis=round.started===false?'':'disabled',sel=(a,b)=>String(a)===String(b)?'selected':'',chk=x=>x?'checked':'';
 const select=(id,label,current,options)=>`<label>${label}<select id="${id}" aria-label="開始前の${label}" ${dis}>${options.map(([v,t])=>`<option value="${v}" ${sel(current,v)}>${t}</option>`).join('')}</select></label>`;
 const check=(id,label,on)=>`<label class="setup-check"><input id="${id}" type="checkbox" ${chk(on)} ${dis}>${label}</label>`;
 const times=[1,2,3,4].map(x=>[x,x===1?'バーディと同じ':`×${x}`]);
 const chosen=courses.find(c=>c.id===f.courseId);
 return `<div class="overlay"><section class="sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title"><div class="sheet-head"><h2 id="settings-title">ラウンド設定</h2>${button('✕','close','icon-btn','aria-label="設定を閉じる"')}</div>${sheetNotice()}
 <fieldset class="group"><legend>コース</legend>
 <label>登録したコース<select id="course-select" aria-label="登録したコース"><option value="">選ばない（パーはホールごとに入力）</option>${courses.map(c=>`<option value="${esc(c.id)}" ${sel(f.courseId,c.id)}>${esc(c.name)}（パー${c.pars.reduce((a,b)=>a+b,0)}）</option>`).join('')}</select></label>
 <div class="row-actions">${button('コースを登録','course-new','ghost')}${chosen?button('このコースを編集','course-edit','ghost'):''}</div>
 <label>コース名<input id="course" maxlength="60" value="${esc(f.course)}" placeholder="例：フェアウェイゴルフクラブ"></label>
 ${chosen?`<p class="fine">保存すると、${esc(chosen.name)}のパーを全ホールに入れます。</p>`:''}
 </fieldset>
 <fieldset class="group"><legend>プレイヤー</legend><div class="settings-grid">${f.names.map((n,p)=>`<label>プレイヤー ${p+1}<input data-name="${p}" maxlength="30" value="${esc(n)}"></label>`).join('')}</div>
 <label>ホール数<select id="count" aria-label="ホール数"><option value="18" ${sel(f.count,18)}>18ホール</option><option value="9" ${sel(f.count,9)}>9ホール</option></select></label><p class="fine">9ホールに切り替えても、後半の記録は残ります。1番ホールの打順はプレイヤーの並び順です。</p></fieldset>
 ${round.started===false?'<div class="callout">ラスベガスのルールは、プレーを始める前に全員で決めてください。「このルールで開始」を押すまでスコアは入力できず、開始後は変更できません。</div>':''}
 <fieldset class="group rules-setup"><legend>ラスベガスの基本ルール</legend>
 ${select('setup-pairing','ペアの決め方',pairingValue(r,f.partner),pairingOptions)}
 ${check('setup-roundup','一の位を繰り上げる（11点差を20点に）',r.roundUp)}
 </fieldset>
 <fieldset class="group rules-setup"><legend>ラスベガスの追加ルール</legend>
 ${check('setup-birdie','バーディで相手の数字を反転（46を64に）',r.birdie)}
 ${check('setup-birdie-double','バーディで点差を2倍',r.birdieMult>1)}
 ${select('setup-eagle','イーグル以上のとき',r.eagle,times)}
 ${select('setup-pair-birdie','ペア2人ともバーディ以上のとき',r.pairBirdie,times)}
 ${select('setup-both','両ペアともバーディ以上のとき',r.bothBirdie,[['cancel','相殺（反転も倍率もなし）'],['both','両方とも反転']])}
 ${select('setup-zoro','反転される2人が同スコア（ゾロ目）のとき',r.zoroMode,[['none','特別扱いなし'],['double','倍率を2倍（リーチ2倍なら4倍）'],['add','倍率に1を足す（リーチ2倍なら3倍）']])}
 ${check('setup-double-par','ダブルパー（パーの2倍以上）で自分たちの数字を反転',r.doublePar)}
 ${select('setup-overflow','10打以上の数え方',r.overflow,[['raw','そのまま（その人を前に。4と10なら104）'],['nine','9打として計算']])}
 ${select('setup-carry','同点のとき',r.carry,[['none','持ち越しなし'],['add','次のホールを2倍（続けば3倍、4倍…）'],['double','次のホールを2倍（続けば4倍、8倍…）']])}
 <div class="setup-row">${select('setup-push-limit','リーチ上限（1人）',r.pushLimit,[[0,'上限なし'],[1,'1回まで'],[2,'2回まで'],[3,'3回まで']])}${select('setup-push-per','数える範囲',r.pushPer,[['half','ハーフごと'],['round','ラウンド通して']])}</div>
 ${select('setup-push-timing','リーチを宣言できるのは',r.pushTiming,Object.entries(pushTimings))}
 <p class="fine">${round.started===false?'この選択は全ホール共通で、開始後は変更できません。':'ルールを変えるには「新しいラウンド」を選んでください。'}</p></fieldset>
 <div class="sheet-links">${button('ゲームのルール','rules','text-btn')}${button('JSONを保存','export','text-btn')}</div>
 <p class="fine">試用版です。記録はこの端末のブラウザに保存されます。金額の設定や精算の機能はありません。</p>
 <div class="sheet-foot">${button('新しいラウンド','reset','danger')}${button(round.started===false?'このルールで開始':'設定を保存','save-settings','primary')}</div></section></div>`;
}
const sheetNotice=()=>notice?`<div role="status" class="toast">${esc(notice)}</div>`:'';
function courseEditorView(){
 const total=(a,b)=>editor.pars.slice(a,b).reduce((x,y)=>x+y,0);
 const cell=i=>button(`<small>${i+1}</small><b>${editor.pars[i]}</b>`,`par-cycle:${i}`,'',`aria-label="${i+1}番 パー${editor.pars[i]}"`);
 return `<div class="overlay"><section class="sheet" role="dialog" aria-modal="true" aria-labelledby="editor-title"><div class="sheet-head"><h2 id="editor-title">${editor.id?'コースを編集':'コースを登録'}</h2>${button('✕','editor-back','icon-btn','aria-label="登録をやめる"')}</div>${sheetNotice()}
 <label>コース名<input id="editor-name" maxlength="60" value="${esc(editor.name)}" placeholder="例：フェアウェイゴルフクラブ"></label>
 <p class="fine">ホールを押すたびに、パーが 3→4→5→6 の順に変わります。最初は今のラウンドで入れたパーが入っています。</p>
 <div class="par-block"><h3>OUT <span>パー${total(0,9)}</span></h3><div class="par-grid">${[...Array(9).keys()].map(cell).join('')}</div></div>
 <div class="par-block"><h3>IN <span>パー${total(9,18)}</span></h3><div class="par-grid">${[...Array(9).keys()].map(i=>cell(i+9)).join('')}</div></div>
 <p class="par-total">合計 パー${total(0,18)}</p>
 <p class="fine">登録したコースは、この端末にだけ保存されます。</p>
 <div class="sheet-foot">${editor.id?button('このコースを削除','course-delete','danger'):button('戻る','editor-back','ghost')}${button('コースを保存','course-save','primary')}</div></section></div>`;
}
function updateNumber(kind,p,value){
 if(round.started===false){settings=true;render();return;}
 const h=round.holes[hole],[min,max]=ranges[kind];
 if(value!==null&&(!Number.isInteger(value)||value<min||value>max)){notice=`${labels[kind]}は${min}〜${max}の整数で入れてください。`;render();return;}
 // Putts are no longer entered; drop an older putt count that would exceed the corrected score.
 if(kind==='scores'&&value!==null&&h.putts[p]!==null&&h.putts[p]>value)h.putts[p]=null;
 if(kind==='olympic'&&!Array.isArray(h.olympic))h.olympic=olympic(h).map(x=>x||null);
 h[kind][p]=value;save();render();
}
const nextPar={3:4,4:5,5:6,6:3};
function openEditor(course){
 draft=readForm();
 editor=course?{id:course.id,name:course.name,pars:[...course.pars]}:{id:'',name:draft.course,pars:round.holes.map(h=>h.par)};
}
function saveEditor(){
 const name=document.querySelector('#editor-name').value.trim();
 if(!name){notice='コース名を入れてください。';return;}
 const course={id:editor.id||`c${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`,name,pars:editor.pars};
 courses=[...courses.filter(c=>c.id!==course.id),course].sort((a,b)=>a.name.localeCompare(b.name,'ja'));saveCourses();
 draft={...draft,courseId:course.id,course:course.name};editor=null;notice='';
}
function saveSettings(){
 const f=readForm(),chosen=courses.find(c=>c.id===f.courseId);
 if(chosen&&round.started!==false&&round.holes.some((h,i)=>h.par!==chosen.pars[i])&&!confirm(`${chosen.name}のパーで、全ホールのパーを置き換えます。よろしいですか？`))return false;
 round.names=f.names;round.count=f.count;hole=Math.min(hole,round.count-1);
 if(chosen){applyCourse(round,chosen);if(f.course)round.course=f.course;}else{round.course=f.course;delete round.courseId;}
 if(round.started===false){round.vegasRules=f.rules;round.partner=f.partner;round.started=true;}
 return true;
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action;
 if(round.started===false&&/^(step:|pusher:|olym:)/.test(a)){settings=true;render();return;}
 if(a.startsWith('step:')){const [,k,p,d]=a.split(':'),h=round.holes[hole],cur=k==='olympic'?olympicValue(h,+p):h[k][p];const initial=k==='scores'?h.par:Math.max(0,+d);updateNumber(k,+p,cur===null?initial:cur+Number(d));return;}
 if(a.startsWith('olym:')){const [,p,pt]=a.split(':').map(Number),cur=olympicValue(round.holes[hole],p);updateNumber('olympic',p,cur===pt?null:pt);return;}
 if(a.startsWith('pusher:')){const p=+a.slice(7),h=round.holes[hole];if(!canPush(round,p,hole))return;if(!Array.isArray(h.pushers)){h.pushers=[false,false,false,false];delete h.pushes;}h.pushers[p]=!h.pushers[p];save();render();return;}
 if(a.startsWith('par-cycle:')){const i=+a.slice(10);editor.name=document.querySelector('#editor-name').value;editor.pars[i]=nextPar[editor.pars[i]];render();document.querySelector(`[data-action="par-cycle:${i}"]`)?.focus();return;}
 if(a==='course-new'){openEditor(null);render();document.querySelector('#editor-name').focus();return;}
 if(a==='course-edit'){const id=document.querySelector('#course-select').value;openEditor(courses.find(c=>c.id===id));render();return;}
 if(a==='editor-back'){editor=null;render();return;}
 if(a==='course-save'){saveEditor();render();return;}
 if(a==='course-delete'){if(!confirm(`${editor.name}を削除しますか？ 保存済みのラウンドの記録は消えません。`))return;courses=courses.filter(c=>c.id!==editor.id);saveCourses();if(draft?.courseId===editor.id)draft={...draft,courseId:''};editor=null;render();return;}
 if(a==='prev')hole=Math.max(0,hole-1);if(a==='next')hole=Math.min(round.count-1,hole+1);
 if(a.startsWith('tab-')){tab=a.slice(4);settings=false;draft=null;editor=null;window.scrollTo(0,0);}
 if(a.startsWith('game-'))game=a.slice(5);if(a.startsWith('hole-')){hole=+a.slice(5);if(tab!=='round'){tab='round';window.scrollTo(0,0);}}
 if(a==='settings'){settings=true;draft=null;editor=null;}if(a==='close'){settings=false;draft=null;editor=null;}
 if(a==='save-settings'){if(!saveSettings())return;settings=false;draft=null;save();}
 if(a==='reset'){if(!confirm('保存中のラウンドを消去して、新しく始めますか？必要な記録は先にJSONで保存してください。'))return;round=createRound();hole=0;tab='round';game='vegas';settings=true;draft=null;save();}
 if(a==='rules'){alert('【ゲームのルール】\nラスベガス：2人×2ペア。2人の打数を並べて2桁にし（少ない打数が十の位）、数字が小さいペアが差を獲得。反転・倍率・持ち越し・リーチなどの追加ルールは、開始前の設定で決めたものを使います。\nオリンピック：グリーンで遠い順に金4・銀3・銅2・鉄1、グリーン外からのカップインはダイヤ5。1パットで沈めた人の点を入力し、差し引き（自分×4−全員の合計）で比べます。\nスコアマッチ（ヨコ）：各ホールで全員と1対1で比べ、相手ごとのアップダウンを累計します。\nいずれも金額や精算は扱いません。');return;}
 if(a==='export'){const url=URL.createObjectURL(new Blob([JSON.stringify(round,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='fairway-round.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;}
 render();if(['settings','reset'].includes(a))document.querySelector('#course')?.focus();
});
document.addEventListener('change',e=>{
 const t=e.target;
 if(t.id==='course-select'){const c=courses.find(x=>x.id===t.value);if(c)document.querySelector('#course').value=c.name;draft=readForm();render();return;}
 if(!t.dataset.kind&&t.id!=='par'&&t.id!=='hole-partner')return;
 if(round.started===false){settings=true;render();return;}
 if(t.dataset.kind){updateNumber(t.dataset.kind,+t.dataset.player,t.value===''?null:Number(t.value));return;}
 if(t.id==='par')round.holes[hole].par=+t.value;if(t.id==='hole-partner')round.holes[hole].partner=+t.value;save();render();
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&settings){if(editor)editor=null;else{settings=false;draft=null;}render();}
 if(e.key==='Tab'&&settings){const items=[...document.querySelectorAll('.sheet button,.sheet input,.sheet select')].filter(x=>!x.disabled);if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0].focus();}}
});
// Swipe left or right on the score list to move between holes.
let touch=null;
document.addEventListener('touchstart',e=>{touch=tab==='round'&&!settings&&e.target.closest('.players,.hole-bar')?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;},{passive:true});
document.addEventListener('touchend',e=>{if(!touch)return;const dx=e.changedTouches[0].clientX-touch.x,dy=e.changedTouches[0].clientY-touch.y;touch=null;if(Math.abs(dx)<60||Math.abs(dy)>40)return;hole=dx<0?Math.min(round.count-1,hole+1):Math.max(0,hole-1);render();},{passive:true});
render();

if(settings)document.querySelector('#course').focus();
