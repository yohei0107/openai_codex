import './style.css';
import {createRound,vegas,olympic,olympicNet,headToHead,upDown,totals,validRound,vegasRules,pushCount,pushesUsed,canPush,olympicPicks,pushTimings,OLYMPIC_MIN,OLYMPIC_MAX,teeOrder} from './game.js';
const key='fairway.round.v1';
let round=createRound(),hole=0,tab='round',game='vegas',notice='',settings=false;
try {const raw=localStorage.getItem(key);if(raw){const saved=JSON.parse(raw);if(validRound(saved))round=saved;else notice='保存データを読み込めませんでした。新しいラウンドを表示しています。';}}catch{notice='保存データを読み込めませんでした。';}
settings=round.started===false;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const signed=n=>`${n>0?'+':''}${n.toLocaleString('ja-JP')}`;
const ranges={scores:[1,20],putts:[0,10],olympic:[OLYMPIC_MIN,OLYMPIC_MAX]};
const labels={scores:'スコア',putts:'パット数',olympic:'オリンピックの点'};
function save(){try{localStorage.setItem(key,JSON.stringify(round));notice='';}catch{notice='端末に保存できません。終了前にJSONをダウンロードしてください。';}}
const olympicValue=(h,p)=>Array.isArray(h.olympic)?h.olympic[p]:olympic(h)[p]||null;
function button(text,action,cls='',extra=''){return `<button class="${cls}" data-action="${action}" ${extra}>${text}</button>`;}
function stepper(kind,p,value){const n=esc(round.names[p]),[min,max]=ranges[kind];return `<div class="stepper">${button('−',`step:${kind}:${p}:-1`,'step-btn',`aria-label="${n}の${labels[kind]}を減らす"`)}<input type="number" inputmode="numeric" min="${min}" max="${max}" data-kind="${kind}" data-player="${p}" ${round.started===false?'disabled':''} value="${value??''}" placeholder="—" aria-label="${n}の${labels[kind]}">${button('+',`step:${kind}:${p}:1`,'step-btn',`aria-label="${n}の${labels[kind]}を増やす"`)}</div>`;}
function render(){
 const h=round.holes[hole],sum=totals(round),v=vegas(round,hole),order=teeOrder(round,hole),completed=round.holes.slice(0,round.count).filter(h=>h.scores.every(Number.isInteger)).length;
 document.querySelector('#app').innerHTML=`
 <header><a class="brand" href="./"><span class="brand-icon">⚑</span> FAIRWAY<span class="brand-sub">GOLF GAMES</span></a><span class="header-note">いつものラウンドに、ひとつの楽しみを。</span><button data-action="settings" class="icon-btn" aria-label="ラウンド設定">⚙</button></header>
 <main><section class="intro"><div><div class="eyebrow">YOUR ROUND, YOUR GAME</div><h1>ナイスショットの、その先へ<span>。</span></h1><p>スコアをつけて、仲間と楽しむ。今日のラウンドをここに。</p></div><div class="round-badge"><span class="status-dot"></span> ROUND IN PROGRESS <strong>${completed}<small> / ${round.count} HOLES</small></strong></div></section>
 <div class="notice">試用版：ルールはWeb上の解説と照合済みです。流派によって違う点は、開始前の設定で選べます。</div>
 ${round.started===false?`<div class="start-notice"><span>開始前に、みんなでルールを決めましょう。</span>${button('ルールを決めて開始','settings','primary')}</div>`:''}
 ${notice?`<div role="status" class="notice">${esc(notice)}</div>`:''}
 <div class="layout"><aside><div class="course-art"><div class="sun"></div><div class="hill hill-back"></div><div class="hill"></div><div class="green"></div><div class="flag">⚑</div><div class="art-label">MAKE EVERY<br>HOLE COUNT.</div></div><div class="round-info"><div class="eyebrow">TODAY’S ROUND</div><h2>${esc(round.course||'プライベートラウンド')}</h2><p>4 PLAYERS <span>／</span> ${round.count} HOLES</p>${button('ラウンド設定 ↗','settings','text-btn')}</div><div class="players-list">${round.names.map((n,p)=>`<div><span class="avatar p${p}">${p+1}</span><span>${esc(n)}</span><small>${sum[p].played?sum[p].strokes:'—'}<span class="lv">ベガス ${signed(sum[p].vegas)}</span></small></div>`).join('')}</div><div class="local-note">▣ この端末に自動保存<br><span>金額の設定・精算機能はありません。</span></div></aside>
 <section class="workspace"><nav class="tabs">${button('ラウンド入力','tab-round',tab==='round'?'active':'')}${button('スコアカード','tab-card',tab==='card'?'active':'')}${button('ゲーム結果','tab-results',tab==='results'?'active':'')}</nav>
 ${tab==='round'?`<div class="hole-header"><div class="hole-title"><span>HOLE</span><strong>${String(hole+1).padStart(2,'0')}</strong><label>PAR <select id="par" aria-label="このホールのパー">${[3,4,5,6].map(p=>`<option ${p===h.par?'selected':''}>${p}</option>`).join('')}</select></label></div><div class="hole-nav">${button('←','prev','icon-btn','aria-label="前のホール" '+(hole===0?'disabled':''))}${button('→','next','icon-btn','aria-label="次のホール" '+(hole===round.count-1?'disabled':''))}</div></div>
 <div class="section-caption"><h2>スコアを記録</h2><span>空欄は未入力 · オリンピックは獲得した点</span></div><div class="input-table"><div class="input-table-head"><span>PLAYER</span><span>SCORE</span><span>OLYMPIC</span></div>${round.names.map((n,p)=>`<div class="input-row"><div class="player-name"><span class="avatar p${p}">${p+1}</span><div><strong>${esc(n)}</strong><small>${order[0]===p?'⚑ オナー':`${order.indexOf(p)+1}番目`}</small><small class="lv-total">ベガス計 <b>${signed(sum[p].vegas)}</b></small></div></div>${stepper('scores',p,h.scores[p])}${stepper('olympic',p,olympicValue(h,p))}</div>`).join('')}</div>
 <div class="game-heading"><h2>このホールのゲーム</h2><span class="pill">3 GAMES</span></div>${gameTabs()}<div class="game-panel">${gamePanel(h,v)}</div><div class="footer-actions"><span>${h.scores.every(Number.isInteger)?'✓ 全員のスコアを入力済み':'全員のスコア入力で結果を計算'}</span>${button(hole===round.count-1?'ラウンド結果を見る ↗':'次のホールへ →',hole===round.count-1?'tab-results':'next','primary')}</div>`:tab==='card'?scoreCard(sum):results(sum)}
 </section></div><footer>FAIRWAY <span>楽しむことが、いちばんのルール。</span><button data-action="rules">ゲームのルール</button><button data-action="export">JSONを保存 ↓</button></footer></main>
 ${settings?settingsView():''}`;
}
function gameTabs(){return `<div class="game-tabs">${[['vegas','01','ラスベガス'],['olympic','02','オリンピック'],['match','03','スコアマッチ']].map(([g,n,t])=>button(`<small>${n}</small> ${t}`,`game-${g}`,game===g?'selected':'')).join('')}</div>`;}
function gamePanel(h,v){
 if(game==='vegas')return vegasPanel(h,v);
 if(game==='olympic'){
  const points=olympic(h),net=olympicNet(points);
  return `<h3>パットの挑戦を、メダルに。</h3><p>全員がグリーンに乗ったら、カップから遠い順に金・銀・銅・鉄。1パットで沈めた人は、そのメダルの点を入れます（上のOLYMPIC欄か、下のボタン）。グリーンの外から直接入ったらダイヤ5点。</p><div class="olympic-list">${round.names.map((n,p)=>{const value=olympicValue(h,p);return `<div class="olympic-row"><div class="olympic-name"><span class="avatar p${p}">${p+1}</span><div><strong>${esc(n)}</strong><small>差し引き ${signed(net[p])}</small></div></div><div class="picks">${olympicPicks.map(([label,pt])=>button(`${label}<small>${pt}</small>`,`olym:${p}:${pt}`,value===pt?'on':'',`aria-label="${esc(n)}に${label}${pt}点"`)).join('')}</div></div>`;}).join('')}</div><p class="fine">差し引き＝自分の点×4人−全員の点の合計（点を取った人が、他の3人から受け取る形）。くず鉄（−1）などの独自ルールも、数字で入れられます。</p>`;
 }
 const mark=(p,q)=>{const x=h.scores[p],y=h.scores[q];return !Number.isInteger(x)||!Number.isInteger(y)?'':x<y?'○':x>y?'●':'△';};
 return `<h3>1対1の、アップ・ダウン。</h3><p>ホールマッチ（ヨコ）の総当たり。${hole+1}番ホールまでの、各相手との勝ち越しを表示します（小さな記号はこのホールの結果：○勝ち・●負け・△引き分け）。</p>${matchTable(headToHead(round,hole+1),mark,'このホールまでのアップダウン')}${matchLegend}`;
}
const matchLegend='<p class="fine">UP＝勝ち越し（アップ）、DN＝負け越し（ダウン）、AS＝並び（オールスクエア）。行の人から見た、列の相手との状況です。計は勝ちホール数−負けホール数の合計。</p>';
function matchTable(grid,mark,label){return `<div class="table-scroll h2h"><table aria-label="${label}"><thead><tr><th></th>${round.names.map((n,q)=>`<th><span class="avatar p${q}" aria-label="${esc(n)}">${q+1}</span></th>`).join('')}<th>計</th></tr></thead><tbody>${round.names.map((n,p)=>`<tr><th><span class="avatar p${p}">${p+1}</span> ${esc(n)}</th>${grid[p].map((x,q)=>p===q?'<td>—</td>':`<td class="${x>0?'up':x<0?'down':''}">${upDown(x)}${mark&&mark(p,q)?`<small>${mark(p,q)}</small>`:''}</td>`).join('')}<td><b>${signed(grid[p].reduce((a,b)=>a+b,0))}</b></td></tr>`).join('')}</tbody></table></div>`;}
const pairingOptions=[['order:3','打順 1番・4番 対 2番・3番（定番）'],['order:1','打順 1番・2番 対 3番・4番'],['order:2','打順 1番・3番 対 2番・4番'],['fixed:1','18ホール固定：プレイヤー1・2 対 3・4'],['fixed:2','18ホール固定：プレイヤー1・3 対 2・4'],['fixed:3','18ホール固定：プレイヤー1・4 対 2・3'],['manual','毎ホール組み直す（ホールごとに選ぶ）'],['rotate:3','3ホールごとに交代（1-2→1-3→1-4）'],['rotate:6','6ホールごとに交代（1-2→1-3→1-4）']];
function pairingValue(rules){return rules.pairing==='manual'?'manual':rules.pairing==='rotate'?`rotate:${rules.rotateEvery}`:`${rules.pairing}:${round.partner}`;}
function pairingControl(rules,h){
 if(rules.pairing!=='manual')return `<p class="pairing">ペア：${pairingOptions.find(([v])=>v===pairingValue(rules))?.[1]??''}</p>`;
 const current=h.partner??round.partner;
 return `<label class="pairing">このホールのペア<select id="hole-partner" aria-label="このホールのペア">${[1,2,3].map(q=>`<option value="${q}" ${current===q?'selected':''}>${esc(round.names[0])} ＆ ${esc(round.names[q])}</option>`).join('')}</select></label>`;
}
function ruleSummary(rules){
 const carry={none:'',add:'同点は持ち越し（2倍→3倍…）',double:'同点は持ち越し（2倍→4倍…）'}[rules.carry];
 return [rules.roundUp?'一の位は繰り上げ':'',rules.birdie?'バーディで相手を反転':'',rules.birdieMult>1?'バーディで2倍':'',rules.eagle>1?`イーグル×${rules.eagle}`:'',rules.pairBirdie>1?`ペア2人バーディ×${rules.pairBirdie}`:'',`両ペアバーディは${rules.bothBirdie==='cancel'?'相殺':'両方反転'}`,{double:'ゾロ目は倍率2倍',add:'ゾロ目は倍率+1',none:''}[rules.zoroMode],rules.doublePar?'ダブルパーで自ペア反転':'',rules.overflow==='nine'?'10打以上は9打':'10打以上はその人を前に',carry].filter(Boolean);
}
function vegasPanel(h,v) {
 const rules=vegasRules(round), pushes=pushCount(h);
 const format=n=>n.toLocaleString('ja-JP');
 const team=(letter,players,raw,final,flip,doublePar,zoro)=>`<div><span>TEAM ${letter}</span><p>${players.map(p=>esc(round.names[p])).join(' ＆ ')}</p><strong>${v.ready?final:'—'}</strong>${v.ready&&(flip||doublePar)?`<small class="score-effect">${zoro?'ゾロ目：数字は同じ':raw===final?'反転しても数字は同じ':`${raw} → ${final} に反転`}</small>`:''}</div>`;
 const kind=ach=>ach.kind==='eagle'?'イーグル以上':ach.pair?'ペア2人のバーディ':'バーディ';
 const effects=v.ready?[
   v.cancelled?'両ペアにバーディ以上 → 相殺（反転も倍率もなし）':'',
   !v.cancelled&&v.achA?`TEAM A の${kind(v.achA)}${v.flipB?' → TEAM B を反転':''}`:'',
   !v.cancelled&&v.achB?`TEAM B の${kind(v.achB)}${v.flipA?' → TEAM A を反転':''}`:'',
   v.birdieMultiplier>1?`バーディ・イーグルの倍率 ×${v.birdieMultiplier}`:'',
   v.doubleParA?'TEAM A にダブルパー → 自分たちの数字を反転':'',
   v.doubleParB?'TEAM B にダブルパー → 自分たちの数字を反転':'',
   v.zoroEvents?`反転される2人が同スコア：${v.zoroEvents}件。${rules.zoroMode==='double'?'1件ごとに倍率を2倍':'1件ごとに倍率へ1加算'}`:'',
   v.carry>1?`前のホールから同点が続いている → 持ち越し ×${v.carry}`:'',
 ].filter(Boolean):[];
 const parts=[];if(v.ready){if(v.base>1)parts.push(`リーチ・ゾロ目 ×${format(v.base)}`);if(v.birdieMultiplier>1)parts.push(`バーディ・イーグル ×${v.birdieMultiplier}`);if(v.carry>1)parts.push(`持ち越し ×${v.carry}`);}
 const gapText=v.ready&&v.gap!==v.baseDiff?`差 ${format(Math.abs(v.gap))} → 繰り上げ ${format(Math.abs(v.baseDiff))}`:`差分 ${format(Math.abs(v.baseDiff??0))}`;
 const limit=rules.pushLimit,per=rules.pushPer==='round'?'ラウンド通して':'ハーフごと';
 const pushers=round.names.map((n,p)=>{const on=!!h.pushers?.[p],left=limit?limit-pushesUsed(round,p,hole)-(on?1:0):null;return button(`${esc(n)}<small>${on?'リーチ中':'リーチ'}${left===null?'':` · 残り${Math.max(0,left)}回`}</small>`,`pusher:${p}`,on?'on':'',`aria-pressed="${on}" aria-label="${esc(n)}のリーチ" ${canPush(round,p,hole)?'':'disabled'}`);}).join('');
 return `<div class="panel-top"><div><h3>ふたりのスコアを、チームの力に。</h3><p>反転・倍率・持ち越しを自動計算。</p></div>${pairingControl(rules,h)}</div>
 <div class="vegas-controls"><strong class="configured-rule">開始前に決めたルール <span>${ruleSummary(rules).join(' ／ ')}</span></strong><p class="fine">変更する場合は新しいラウンドを開始してください。</p></div>
 <div class="push-control"><div><h4>リーチ（プッシュ）</h4><p>宣言した人ごとに、このホールの点が2倍（2人で4倍）。宣言は${pushTimings[rules.pushTiming]}。${limit?`1人${limit}回まで（${per}）。`:'回数の上限なし。'}</p>${!Array.isArray(h.pushers)&&pushes?`<p>以前の記録：${pushes}回（人を押すと置き換わります）</p>`:''}</div><div class="pusher-list" aria-label="リーチした人">${pushers}</div></div>
 <div class="versus">${team('A',v.a,v.rawA,v.na,v.flipA,v.doubleParA,v.zoroA)}<b>VS</b>${team('B',v.b,v.rawB,v.nb,v.flipB,v.doubleParB,v.zoroB)}</div>
 ${effects.length?`<ul class="effect-list">${effects.map(e=>`<li>${e}</li>`).join('')}</ul>`:''}
 <div class="calculation" aria-label="ラスベガスの計算式">${v.ready?`${gapText} × 最終倍率 ${format(v.multiplier)}${parts.length?`（${parts.join('・')}）`:''} = <strong>${format(Math.abs(v.diff))} pt</strong>`:`${v.carry>1?`持ち越し ×${v.carry} · `:''}リーチ ${pushes}回 → ${format(v.pushMultiplier)}倍 · スコア入力待ち`}</div>
 <div class="result-note">${v.ready?v.diff===0?`このホールは同点${rules.carry!=='none'?'（次のホールに持ち越し）':''}`:`TEAM ${v.diff>0?'A':'B'} が ${format(Math.abs(v.diff))} pt 獲得`:'全員のスコア入力後に計算します。'}</div>
 <details class="vegas-details"><summary>判定ルール・計算の順番</summary><p>① 2人の打数を並べて2桁にします。少ない打数が十の位（4と6なら46）。10打以上は、設定により9打として数えるか、その人の打数を前に置きます（4と10なら104）。<br>② バーディ以上の人がいるペアは、相手の数字を反転できます（46→64）。両ペアにいる場合は、設定どおり「相殺」か「両方反転」。<br>③ バーディで2倍、イーグルやペア2人のバーディで倍率を上げる設定があれば、その中で一番大きい倍率を使います。<br>④ ダブルパー（パーの2倍以上）の人がいるペアは、設定により自分たちの数字を反転します。<br>⑤ 反転される2人が同スコア（ゾロ目）なら、選んだ方式で倍率を増やします。<br>⑥ リーチは宣言した人数ぶん2倍ずつ。同点の持ち越しがあれば、直前の同点の回数に応じて倍率を掛けます。<br>⑦ 差を出し、一の位の繰り上げがありなら10点単位に切り上げます（11→20）。最終倍率を掛け、数字が小さいペアの各メンバーに加点、相手から同じ点を引きます。</p></details>
 <p class="fine">${rules.pairing==='order'?'打順：前ホールのスコア順。同点は直前の順番を維持。1番ホールはプレイヤー順です。':rules.pairing==='manual'?'ペアはホールごとに選びます（未選択のホールは開始時の設定）。':rules.pairing==='fixed'?'ペアは18ホール固定です。':`ペアはプレイヤー番号で ${rules.rotateEvery}ホールごとに 1-2、1-3、1-4 の順に交代します。`}</p>`;
}
function scoreCard(sum){
 const holes=round.holes.slice(0,round.count),cell=(main,lv,ol,show=true)=>`<td>${main}${show?`<small class="card-sub">ベガス ${lv} · オリ ${ol}</small>`:''}</td>`;
 return `<div class="view-header"><div class="eyebrow">EVERY STROKE MATTERS</div><h2>スコアカード</h2><p>各セルはスコアと、そのホールのラスベガス・オリンピックの点。ホール番号で入力画面に戻れます。</p></div><div class="table-scroll"><table><thead><tr><th>HOLE</th><th>PAR</th>${round.names.map(n=>`<th>${esc(n)}</th>`).join('')}</tr></thead><tbody>${holes.map((h,i)=>{const v=vegas(round,i),o=olympic(h);return `<tr><th>${button(String(i+1),`hole-${i}`,'text-btn')}</th><td>${h.par}</td>${h.scores.map((s,p)=>cell(s??'—',v.ready?signed(v.points[p]):'—',o[p],s!==null||o[p]!==0)).join('')}</tr>`;}).join('')}<tr class="total"><th>TOTAL</th><td>${holes.reduce((a,h)=>a+h.par,0)}</td>${sum.map(s=>cell(s.played?s.strokes:'—',signed(s.vegas),s.olympic)).join('')}</tr></tbody></table></div>`;
}
function results(sum){
 const field=game==='vegas'?'vegas':game==='olympic'?'olympicNet':'match';
 const sub=s=>game==='olympic'?`獲得 ${s.olympic} pt`:game==='match'?`${s.wins}勝 ${s.losses}敗`:'';
 const h2h=game==='match'?matchTable(headToHead(round),null,'相手ごとのアップダウン')+matchLegend:'';
 return `<div class="view-header"><div class="eyebrow">THE ROUND SO FAR</div><h2>ゲーム結果</h2><p>入力済みのホールを集計した途中結果です。</p></div>${gameTabs()}<div class="rankings">${sum.map((s,p)=>({p,s,value:s[field]})).sort((a,b)=>b.value-a.value).map((r,i,arr)=>`<div><span class="rank">${1+arr.filter(x=>x.value>r.value).length}</span><span class="avatar p${r.p}">${r.p+1}</span><strong>${esc(round.names[r.p])}${sub(r.s)?`<span class="rank-sub">${sub(r.s)}</span>`:''}</strong><b>${signed(r.value)}<small> pt</small></b></div>`).join('')}</div>${h2h}<div class="result-note">${game==='vegas'?'反転後の差分 × ホールの最終倍率を各メンバーに加算。全員のスコアを入力したホールが対象。':game==='olympic'?'差し引き＝獲得した点×4人−全員の獲得点の合計。全員の差し引きを足すと0になります。':'各相手との勝ちホール数−負けホール数の合計（ホールマッチの総当たり）。'}</div><div class="notice">流派によって違うルールは、開始前の設定で選んだものを使っています。仲間内のローカルルールと合っているか、始める前に確認してください。</div>`;
}
function settingsView(){
 const r=vegasRules(round),dis=round.started===false?'':'disabled',sel=(a,b)=>a===b?'selected':'',chk=x=>x?'checked':'';
 const select=(id,label,current,options)=>`<label>${label}<select id="${id}" aria-label="開始前の${label}" ${dis}>${options.map(([v,t])=>`<option value="${v}" ${sel(String(current),String(v))}>${t}</option>`).join('')}</select></label>`;
 const check=(id,label,on)=>`<label class="setup-check"><input id="${id}" type="checkbox" ${chk(on)} ${dis}>${label}</label>`;
 const times=[1,2,3,4].map(x=>[x,x===1?'バーディと同じ':`×${x}`]);
 return `<div class="overlay"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title"><div class="modal-head"><h2 id="settings-title">ラウンド設定</h2>${button('✕','close','icon-btn','aria-label="設定を閉じる"')}</div><label>コース名<input id="course" maxlength="60" value="${esc(round.course)}" placeholder="例：フェアウェイゴルフクラブ"></label><div class="settings-grid">${round.names.map((n,p)=>`<label>プレイヤー ${p+1}<input data-name="${p}" maxlength="30" value="${esc(n)}"></label>`).join('')}</div><label>ホール数<select id="count" aria-label="ホール数"><option value="18" ${round.count===18?'selected':''}>18ホール</option><option value="9" ${round.count===9?'selected':''}>9ホール</option></select></label><p class="fine">9ホールに切り替えても後半の記録は保持します。1番ホールの打順はプレイヤーの並び順です。</p>
 ${round.started===false?'<div class="notice">ラスベガスのルールは、プレーを始める前に全員で決めてください。「このルールで開始」を押すまでスコアは入力できず、開始後は変更できません。</div>':''}
 <fieldset class="rules-setup"><legend>ラスベガス：基本ルール</legend>
 ${select('setup-pairing','ペアの決め方',pairingValue(r),pairingOptions)}
 ${check('setup-roundup','一の位を繰り上げる（11点差 → 20点）',r.roundUp)}
 </fieldset>
 <fieldset class="rules-setup"><legend>ラスベガス：追加ルール</legend>
 ${check('setup-birdie','バーディで相手の数字を反転（46 → 64）',r.birdie)}
 ${check('setup-birdie-double','バーディで点差を2倍',r.birdieMult>1)}
 ${select('setup-eagle','イーグル以上のとき',r.eagle,times)}
 ${select('setup-pair-birdie','ペア2人ともバーディ以上のとき',r.pairBirdie,times)}
 ${select('setup-both','両ペアともバーディ以上のとき',r.bothBirdie,[['cancel','相殺（反転も倍率もなし）'],['both','両方とも反転']])}
 ${select('setup-zoro','反転される2人が同スコア（ゾロ目）のとき',r.zoroMode,[['none','特別扱いなし'],['double','倍率を2倍（リーチ2倍 → 4倍）'],['add','倍率に1加算（リーチ2倍 → 3倍）']])}
 ${check('setup-double-par','ダブルパー（パーの2倍以上）で自分たちの数字を反転',r.doublePar)}
 ${select('setup-overflow','10打以上の数え方',r.overflow,[['raw','そのまま（その人を前に：4と10 → 104）'],['nine','9打として計算']])}
 ${select('setup-carry','同点のとき',r.carry,[['none','持ち越しなし'],['add','次のホールを2倍（続けば3倍、4倍…）'],['double','次のホールを2倍（続けば4倍、8倍…）']])}
 <div class="setup-row">${select('setup-push-limit','リーチ上限（1人）',r.pushLimit,[[0,'上限なし'],[1,'1回まで'],[2,'2回まで'],[3,'3回まで']])}${select('setup-push-per','数える範囲',r.pushPer,[['half','ハーフごと'],['round','ラウンド通して']])}</div>
 ${select('setup-push-timing','リーチを宣言できるのは',r.pushTiming,Object.entries(pushTimings))}
 <p class="fine">この選択は全ホール共通で、ラウンド開始後は固定します。</p>${round.started===false?'':'<p class="fine">ルールを変更するには「新しいラウンド」を選択してください。</p>'}</fieldset>
 <div class="modal-actions">${button('新しいラウンド','reset','danger')}${button(round.started===false?'このルールで開始':'設定を保存','save-settings','primary')}</div></section></div>`;
}
function readRules(){
 const q=id=>document.querySelector(id),[pairing,n]=q('#setup-pairing').value.split(':');
 if(pairing==='order'||pairing==='fixed')round.partner=+n;
 return {pairing,rotateEvery:pairing==='rotate'?+n:3,roundUp:q('#setup-roundup').checked,birdie:q('#setup-birdie').checked,birdieMult:q('#setup-birdie-double').checked?2:1,eagle:+q('#setup-eagle').value,pairBirdie:+q('#setup-pair-birdie').value,bothBirdie:q('#setup-both').value,zoroMode:q('#setup-zoro').value,doublePar:q('#setup-double-par').checked,overflow:q('#setup-overflow').value,carry:q('#setup-carry').value,pushLimit:+q('#setup-push-limit').value,pushPer:q('#setup-push-per').value,pushTiming:q('#setup-push-timing').value};
}
function updateNumber(kind,p,value){
 if(round.started===false){settings=true;render();return;}
 const h=round.holes[hole],[min,max]=ranges[kind];
 if(value!==null&&(!Number.isInteger(value)||value<min||value>max)){notice=`${min}〜${max}の整数で入力してください。`;render();return;}
 // Putts are no longer entered; drop an older putt count that would exceed the corrected score.
 if(kind==='scores'&&value!==null&&h.putts[p]!==null&&h.putts[p]>value)h.putts[p]=null;
 if(kind==='olympic'&&!Array.isArray(h.olympic))h.olympic=olympic(h).map(x=>x||null);
 h[kind][p]=value;save();render();
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action;
 if(round.started===false&&/^(step:|pusher:|olym:)/.test(a)){settings=true;render();return;}
 if(a.startsWith('step:')){const [,k,p,d]=a.split(':'),h=round.holes[hole],cur=k==='olympic'&&!Array.isArray(h.olympic)?olympic(h)[p]||null:h[k][p];const initial=k==='scores'?h.par:k==='putts'?2:Math.max(0,+d);updateNumber(k,+p,cur===null?initial:cur+Number(d));return;}
 if(a.startsWith('olym:')){const [,p,pt]=a.split(':').map(Number),h=round.holes[hole],cur=Array.isArray(h.olympic)?h.olympic[p]:null;updateNumber('olympic',p,cur===pt?null:pt);return;}
 if(a.startsWith('pusher:')){const p=+a.slice(7),h=round.holes[hole];if(!canPush(round,p,hole))return;if(!Array.isArray(h.pushers)){h.pushers=[false,false,false,false];delete h.pushes;}h.pushers[p]=!h.pushers[p];save();render();return;}
 if(a==='prev')hole=Math.max(0,hole-1);if(a==='next')hole=Math.min(round.count-1,hole+1);
 if(a.startsWith('tab-'))tab=a.slice(4);if(a.startsWith('game-'))game=a.slice(5);if(a.startsWith('hole-')){hole=+a.slice(5);tab='round';}
 if(a==='settings')settings=true;if(a==='close')settings=false;
 if(a==='save-settings'){round.course=document.querySelector('#course').value.trim();document.querySelectorAll('[data-name]').forEach(el=>round.names[+el.dataset.name]=el.value.trim()||`プレイヤー ${+el.dataset.name+1}`);round.count=+document.querySelector('#count').value;hole=Math.min(hole,round.count-1);if(round.started===false){round.vegasRules=readRules();round.started=true;}settings=false;save();}
 if(a==='reset'){if(!confirm('保存中のラウンドを消去して、新しく始めますか？必要な記録は先にJSONで保存してください。'))return;round=createRound();hole=0;tab='round';game='vegas';settings=true;save();}
 if(a==='rules'){alert('【ゲームのルール】\nラスベガス：2人×2ペア。2人の打数を並べて2桁にし（少ない打数が十の位）、数字が小さいペアが差を獲得。反転・倍率・持ち越し・リーチなどの追加ルールは、開始前の設定で決めたものを使います（ラスベガス画面の「判定ルール・計算の順番」を参照）。\nオリンピック：グリーンで遠い順に金4・銀3・銅2・鉄1、グリーン外からのカップインはダイヤ5。1パットで沈めた人の点を入力し、差し引き（自分×4−全員の合計）で比べます。\nスコアマッチ（ヨコ）：各ホールで全員と1対1で比べ、勝ち＋1・負け−1・引き分け0。\nいずれも金額や精算は扱いません。');}
 if(a==='export'){const url=URL.createObjectURL(new Blob([JSON.stringify(round,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='fairway-round.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 render();if(['settings','reset'].includes(a))document.querySelector('#course').focus();
});
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset.kind&&t.id!=='par'&&t.id!=='hole-partner')return;if(round.started===false){settings=true;render();return;}if(t.dataset.kind){updateNumber(t.dataset.kind,+t.dataset.player,t.value===''?null:Number(t.value));return;}if(t.id==='par')round.holes[hole].par=+t.value;if(t.id==='hole-partner')round.holes[hole].partner=+t.value;save();render();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&settings){settings=false;render();}if(e.key==='Tab'&&settings){const items=[...document.querySelectorAll('.modal button,.modal input,.modal select')];if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0].focus();}}});
render();

if(settings)document.querySelector('#course').focus();
