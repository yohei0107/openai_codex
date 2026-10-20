import test from 'node:test';
import assert from 'node:assert/strict';
import {createRound,teeOrder,teams,vegas,olympic,olympicNet,match,headToHead,upDown,totals,validRound,validCourse,applyCourse,scoreMark,MAX_PUSHES,vegasRules,canPush,carryFor} from '../src/game.js';
// A new round with the ones-digit round-up turned off, plus any rule overrides.
const plain=(over={})=>{const r=createRound();Object.assign(r.vegasRules,{roundUp:false},over);return r;};
test('ラスベガスはチームの小さいスコアを十の位にし、差分を対称加算',()=>{const r=plain({birdie:false});r.holes[0].scores=[4,5,6,3];const v=vegas(r,0);assert.deepEqual(v.a,[0,3]);assert.equal(v.na,34);assert.equal(v.nb,56);assert.deepEqual(v.points,[22,-22,-22,22]);assert.equal(v.points.reduce((a,b)=>a+b),0);});
test('一の位の繰り上げ：46対57は11点差だが20点',()=>{
 const r=createRound();r.holes[0].scores=[4,5,7,6];let v=vegas(r,0);
 assert.equal(v.na,46);assert.equal(v.nb,57);assert.equal(v.gap,11);assert.equal(v.baseDiff,20);assert.deepEqual(v.points,[20,-20,-20,20]);
 r.holes[0].scores=[4,5,6,6];v=vegas(r,0);assert.equal(v.gap,10);assert.equal(v.diff,10);
 r.holes[0].scores=[6,4,5,6];v=vegas(r,0);assert.equal(v.gap,-21);assert.equal(v.diff,-30);
 r.vegasRules.roundUp=false;r.holes[0].scores=[4,5,7,6];assert.equal(vegas(r,0).diff,11);
});
test('チーム分け3通りと引き分け',()=>{const r=plain();for(const p of [1,2,3]){r.partner=p;assert.deepEqual(vegas(r,0).a,[0,p]);}r.holes[0].scores=[4,4,4,4];assert.equal(vegas(r,0).diff,0);});
test('10打以上をそのまま数える場合は、その打数を前にする（4と10なら104）',()=>{
 const r=plain({birdie:false});assert.equal(vegas(r,0).ready,false);
 r.holes[0].scores=[10,4,3,4];const v=vegas(r,0);
 assert.equal(v.ready,true);assert.equal(v.na,104);assert.equal(v.nb,34);assert.equal(v.diff,-70);
 r.holes[0].scores=[12,4,3,10];assert.equal(vegas(r,0).na,1210);
 assert.deepEqual(totals(r).map(s=>s.vegas),[-1176,1176,1176,-1176]);
});
test('10打以上を9打として数える設定',()=>{
 const r=plain({birdie:false,overflow:'nine'});r.holes[0].scores=[10,4,3,4];assert.equal(vegas(r,0).na,49);assert.equal(vegas(r,0).diff,-15);
 r.holes[0].scores=[12,4,3,10];assert.equal(vegas(r,0).na,99);assert.equal(vegas(r,0).diff,-65);
});
test('10打以上のチームは反転されても数字が変わらない',()=>{
 const r=plain();r.holes[0].scores=[10,4,3,5];const v=vegas(r,0);
 assert.equal(v.flipA,true);assert.equal(v.rawA,105);assert.equal(v.na,105);assert.equal(v.diff,-71);
});
test('オナーは前ホールの成績順、同点時は直前の順番を維持',()=>{const r=createRound();r.holes[0].scores=[5,3,4,4];r.holes[1].scores=[4,4,4,4];assert.deepEqual(teeOrder(r,1),[1,2,3,0]);assert.deepEqual(teeOrder(r,2),[1,2,3,0]);assert.deepEqual(teeOrder(r,3),[1,2,3,0]);});
test('オリンピックは入力した点を使い、差し引きは合計0',()=>{
 const h=createRound().holes[0];assert.deepEqual(olympic(h),[0,0,0,0]);
 h.olympic=[4,null,5,-1];assert.deepEqual(olympic(h),[4,0,5,-1]);
 const net=olympicNet(olympic(h));assert.deepEqual(net,[8,-8,12,-12]);assert.equal(net.reduce((a,b)=>a+b),0);
});
test('旧データのオリンピックは指定メダルと1パットから計算',()=>{const h=createRound().holes[0];delete h.olympic;h.medals=['gold','silver','bronze','iron'];h.putts=[1,2,0,null];assert.deepEqual(olympic(h),[4,0,0,0]);h.putts=[1,1,1,1];assert.deepEqual(olympic(h),[4,3,2,1]);});
test('スコアマッチは相手ごとに勝ち＋1・負け−1、引き分け0',()=>{
 const h=createRound().holes[0];assert.equal(match(h),null);h.scores=[3,4,4,6];
 assert.deepEqual(match(h).map(m=>m.wins),[3,1,1,0]);assert.deepEqual(match(h).map(m=>m.losses),[0,1,1,3]);assert.deepEqual(match(h).map(m=>m.net),[3,0,0,-3]);
});
test('スコアマッチの相手別の勝ち越しと合計',()=>{
 const r=createRound();r.holes[0].scores=[3,4,4,6];r.holes[1].scores=[5,4,4,4];
 const g=headToHead(r);assert.equal(g[0][1],0);assert.equal(g[1][3],1);assert.equal(g[3][1],-1);assert.equal(g[2][2],0);
 assert.deepEqual(totals(r).map(s=>s.match),[0,1,1,-2]);assert.deepEqual(totals(r).map(s=>s.wins),[3,2,2,1]);
});
test('9ホール選択時は後半を集計しない',()=>{const r=createRound();r.holes[0].scores=[4,4,4,4];r.holes[9].scores=[5,5,5,5];r.count=9;assert.deepEqual(totals(r).map(s=>s.strokes),[4,4,4,4]);r.count=18;assert.deepEqual(totals(r).map(s=>s.strokes),[9,9,9,9]);});
test('保存データ検証は不正値・重複メダル・矛盾するパット数・範囲外の点を拒否',()=>{
 const r=createRound();assert.equal(validRound(r),true);r.holes[0].scores[0]=3;r.holes[0].putts[0]=4;assert.equal(validRound(r),false);r.holes[0].putts[0]=2;assert.equal(validRound(r),true);
 r.holes[0].medals=['gold','gold','',''];assert.equal(validRound(r),false);delete r.holes[0].medals;
 for(const bad of [31,-11,1.5,'2']){r.holes[0].olympic[0]=bad;assert.equal(validRound(r),false);}r.holes[0].olympic[0]=5;assert.equal(validRound(r),true);
 r.holes[0].partner=4;assert.equal(validRound(r),false);r.holes[0].partner=2;assert.equal(validRound(r),true);
 assert.equal(validRound({}),false);
});

test('バーディで相手の2桁を反転：46→64、35なら29点勝ち',()=>{
 const r=plain();r.holes[0].scores=[3,4,6,5];let v=vegas(r,0);
 assert.equal(v.rawB,46);assert.equal(v.nb,64);assert.equal(v.na,35);assert.equal(v.diff,29);assert.deepEqual(v.points,[29,-29,-29,29]);
 r.vegasRules.roundUp=true;assert.equal(vegas(r,0).diff,30);
});
test('バーディで点差を2倍：反転と併用、またはどちらか一方',()=>{
 const r=plain({birdieMult:2});r.holes[0].scores=[3,4,6,5];assert.equal(vegas(r,0).multiplier,2);assert.equal(vegas(r,0).diff,58);
 r.vegasRules.birdie=false;assert.equal(vegas(r,0).nb,46);assert.equal(vegas(r,0).diff,22);
});
test('イーグル・ペア2人のバーディは、設定した倍率のうち大きい方を使う',()=>{
 let r=plain({eagle:4});r.holes[0].par=5;r.holes[0].scores=[3,5,6,4];let v=vegas(r,0);
 assert.equal(v.achA.kind,'eagle');assert.equal(v.nb,65);assert.equal(v.multiplier,4);assert.equal(v.diff,124);
 r=plain({pairBirdie:4});r.holes[0].scores=[3,5,6,3];v=vegas(r,0);
 assert.equal(v.achA.pair,true);assert.equal(v.na,33);assert.equal(v.nb,65);assert.equal(v.multiplier,4);assert.equal(v.diff,128);
 r=plain({birdieMult:2,eagle:3});r.holes[0].par=5;r.holes[0].scores=[3,5,6,5];assert.equal(vegas(r,0).multiplier,3);
});
test('プッシュは押した人数ぶん累乗し、別のホールへ繰り越さない',()=>{
 const r=plain({birdie:false});
 r.holes[0].scores=[4,5,6,4];r.holes[1].scores=[4,5,6,4];
 r.holes[0].pushers=[true,true,true,false];assert.equal(vegas(r,0).multiplier,8);
 assert.equal(vegas(r,0).diff,96);assert.equal(vegas(r,1).multiplier,1);
});
test('ゾロ目はバーディーを受けた相手チーム内の同スコアで判定',()=>{
 const r=plain();r.holes[0].scores=[3,5,5,4];const v=vegas(r,0);
 assert.equal(v.zoroB,true);assert.equal(v.nb,55);assert.equal(v.multiplier,2);assert.equal(v.diff,42);
 r.vegasRules.zoroMode='none';assert.equal(vegas(r,0).multiplier,1);assert.equal(vegas(r,0).diff,21);
 r.vegasRules.zoroMode='double';r.holes[0].scores=[4,5,5,4];assert.equal(vegas(r,0).multiplier,1);
});
test('開始前の倍率方式により、プッシュとゾロ目を加算または乗算',()=>{
 const r=plain();r.holes[0].scores=[3,5,5,4];r.holes[0].pushers=[true,false,false,false];
 assert.equal(vegas(r,0).multiplier,4);assert.equal(vegas(r,0).diff,84);
 r.vegasRules.zoroMode='add';assert.equal(vegas(r,0).multiplier,3);assert.equal(vegas(r,0).diff,63);
 r.holes[0].pushers=[true,true,false,false];assert.equal(vegas(r,0).multiplier,5);assert.equal(vegas(r,0).diff,105);
 r.vegasRules.zoroMode='double';assert.equal(vegas(r,0).multiplier,8);assert.equal(vegas(r,0).diff,168);
});
test('両ペアにバーディなら、既定は相殺（反転も倍率もなし）。両方反転も選べる',()=>{
 const r=plain({birdieMult:2});r.holes[0].scores=[3,3,5,4];let v=vegas(r,0);
 assert.equal(v.cancelled,true);assert.equal(v.na,34);assert.equal(v.nb,35);assert.equal(v.multiplier,1);assert.equal(v.diff,1);
 r.vegasRules.bothBirdie='both';v=vegas(r,0);
 assert.equal(v.na,43);assert.equal(v.nb,53);assert.equal(v.multiplier,2);assert.equal(v.diff,20);
});
test('同一チームにバーディー2人でも、反転は1回',()=>{
 const r=plain();r.holes[0].scores=[3,4,5,3];const v=vegas(r,0);
 assert.equal(v.nb,54);assert.equal(v.multiplier,1);assert.equal(v.diff,21);
});
test('両チームのゾロ目とバーディーが重なっても引き分けは0点',()=>{
 const r=plain({bothBirdie:'both'});r.holes[0].scores=[3,3,3,3];r.holes[0].pushers=[true,true,false,false];
 assert.equal(vegas(r,0).zoroEvents,2);assert.equal(vegas(r,0).multiplier,16);assert.equal(vegas(r,0).diff,0);
 r.vegasRules.zoroMode='add';assert.equal(vegas(r,0).multiplier,6);assert.equal(vegas(r,0).diff,0);
 r.vegasRules.bothBirdie='cancel';assert.equal(vegas(r,0).zoroEvents,0);assert.equal(vegas(r,0).diff,0);
});
test('パーの修正でバーディー判定を再計算し、イーグル以上は反転＋倍率',()=>{
 const r=plain();r.holes[0].scores=[3,5,6,4];assert.equal(vegas(r,0).nb,65);
 r.holes[0].par=3;assert.equal(vegas(r,0).nb,56);
 r.holes[0].par=5;let v=vegas(r,0);assert.equal(v.achA.kind,'eagle');assert.equal(v.nb,65);assert.equal(v.multiplier,2);assert.equal(v.diff,62);
 r.vegasRules.eagle=3;assert.equal(vegas(r,0).multiplier,3);
 r.vegasRules.eagle=1;v=vegas(r,0);assert.equal(v.nb,65);assert.equal(v.multiplier,1);
 r.holes[0].scores=[2,5,6,5];r.holes[0].par=4;r.vegasRules.eagle=2;assert.equal(vegas(r,0).achA.kind,'eagle');assert.equal(vegas(r,0).multiplier,2);
});
test('相殺はイーグルとバーディーの組み合わせでも、反転と倍率を打ち消す',()=>{
 const r=plain();r.holes[0].par=5;r.holes[0].scores=[3,4,6,5];const v=vegas(r,0);
 assert.equal(v.cancelled,true);assert.equal(v.multiplier,1);assert.equal(v.na,35);assert.equal(v.nb,46);
});
test('反転なしでも、イーグルの倍率は設定どおりかかる',()=>{
 const r=plain({birdie:false});r.holes[0].par=5;r.holes[0].scores=[3,5,6,5];let v=vegas(r,0);
 assert.equal(v.nb,56);assert.equal(v.multiplier,2);
 r.vegasRules.eagle=1;v=vegas(r,0);assert.equal(v.multiplier,1);
});
test('ダブルパーで自分たちの数字を反転',()=>{
 const r=plain({doublePar:true});r.holes[0].scores=[8,4,5,6];let v=vegas(r,0);
 assert.equal(v.doubleParA,true);assert.equal(v.rawA,68);assert.equal(v.na,86);assert.equal(v.nb,45);assert.equal(v.diff,-41);
 r.holes[0].scores=[8,3,5,6];v=vegas(r,0);assert.equal(v.na,86);assert.equal(v.nb,35);assert.equal(v.diff,-51);
 r.vegasRules.doublePar=false;r.holes[0].scores=[8,4,5,6];assert.equal(vegas(r,0).na,68);
});
test('同点の持ち越し：+1ずつ（2倍→3倍）または倍々（2倍→4倍）',()=>{
 const r=plain({birdie:false});
 r.holes[0].scores=[4,4,4,4];r.holes[1].scores=[5,5,5,5];r.holes[2].scores=[4,5,6,4];r.holes[3].scores=[4,5,6,4];
 assert.equal(carryFor(r,1),2);assert.equal(vegas(r,2).carry,3);assert.equal(vegas(r,2).multiplier,3);assert.equal(vegas(r,2).diff,36);
 assert.equal(vegas(r,3).carry,1);assert.equal(carryFor(r,5),1);
 r.vegasRules.carry='double';assert.equal(vegas(r,2).carry,4);assert.equal(vegas(r,2).diff,48);
 r.vegasRules.carry='none';assert.equal(vegas(r,2).multiplier,1);
});
test('ペアは打順・固定・毎ホール選択・ローテーションから選べる',()=>{
 const r=createRound();r.holes[0].scores=[5,3,4,4];
 r.vegasRules.pairing='fixed';r.partner=2;assert.deepEqual(teams(r,1).a,[0,2]);assert.deepEqual(teams(r,1).b,[1,3]);
 r.vegasRules.pairing='manual';r.partner=3;r.holes[1].partner=1;assert.deepEqual(teams(r,0).a,[0,3]);assert.deepEqual(teams(r,1).a,[0,1]);
 r.vegasRules.pairing='rotate';r.vegasRules.rotateEvery=3;
 assert.deepEqual([0,2,3,5,6,8,9,17].map(i=>teams(r,i).a[1]),[1,1,2,2,3,3,1,3]);
 r.vegasRules.rotateEvery=6;assert.deepEqual([0,5,6,12,17].map(i=>teams(r,i).a[1]),[1,1,2,3,3]);
});
test('リーチの上限は1人ごとに、ハーフ単位またはラウンド単位で数える',()=>{
 const r=createRound();r.vegasRules.pushLimit=1;r.holes[0].pushers[0]=true;
 assert.equal(canPush(r,0,0),true);assert.equal(canPush(r,0,1),false);assert.equal(canPush(r,1,1),true);assert.equal(canPush(r,0,9),true);
 r.vegasRules.pushPer='round';assert.equal(canPush(r,0,9),false);
 r.vegasRules.pushLimit=0;assert.equal(canPush(r,0,9),true);
});
test('旧保存データは欠けた新フィールドを許容し、元のポイントを維持',()=>{
 const r=createRound();delete r.vegasRules;delete r.started;r.holes.forEach(h=>{delete h.pushers;delete h.olympic;h.medals=['','','',''];});
 r.holes[0].scores=[4,5,6,3];assert.equal(validRound(r),true);
 assert.equal(vegasRules(r).birdie,false);assert.equal(vegasRules(r).roundUp,false);assert.equal(vegas(r,0).diff,22);
 r.holes[1].scores=[4,5,6,3];r.holes[0].scores=[4,4,4,4];assert.equal(vegas(r,1).multiplier,1);
 r.holes[1].pushes=2;assert.equal(vegas(r,1).multiplier,4);
});
test('前のバージョンのルール設定は、足りない項目を従来どおりの動きで補う',()=>{
 const r=createRound();r.vegasRules={birdie:true,zoroMode:'add'};assert.equal(validRound(r),true);
 const rules=vegasRules(r);assert.equal(rules.bothBirdie,'both');assert.equal(rules.carry,'none');assert.equal(rules.roundUp,false);assert.equal(rules.pushLimit,0);assert.equal(rules.pairing,'order');
});
test('保存検証は不正なプッシュ・ルールを拒否し、上限でも精密な整数を保つ',()=>{
 const r=createRound();r.holes[0].scores=[3,9,9,4];delete r.holes[0].pushers;r.holes[0].pushes=MAX_PUSHES;
 assert.equal(validRound(r),true);assert.equal(Number.isSafeInteger(totals(r)[0].vegas*18),true);
 for(const invalid of [-1,1.5,MAX_PUSHES+1,null,'2']){r.holes[0].pushes=invalid;assert.equal(validRound(r),false);}
 r.holes[0].pushes=0;
 for(const invalid of [[true],[1,0,0,0],null]){r.holes[0].pushers=invalid;assert.equal(validRound(r),false);}
 r.holes[0].pushers=[false,false,false,false];assert.equal(validRound(r),true);
 for(const [k,bad] of [['zoroMode','other'],['eagle',5],['bothBirdie','x'],['carry',true],['pushLimit',10],['pushPer','day'],['pairing','random'],['rotateEvery',4],['roundUp','yes'],['birdieMult',3],['pairBirdie',0],['doublePar',1],['overflow','cap'],['pushTiming','later']]){const keep=r.vegasRules[k];r.vegasRules[k]=bad;assert.equal(validRound(r),false,k);r.vegasRules[k]=keep;}
 r.vegasRules=null;assert.equal(validRound(r),false);
});
test('ホールマッチのアップダウンは、指定ホールまでの累計で、2人とも入力済みのホールを数える',()=>{
 const r=createRound();r.holes[0].scores=[4,5,4,6];r.holes[1].scores=[4,5,null,null];r.holes[2].scores=[6,5,5,5];
 assert.equal(headToHead(r,1)[0][1],1);assert.equal(headToHead(r,2)[0][1],2);assert.equal(headToHead(r,3)[0][1],1);
 assert.equal(headToHead(r,2)[0][2],0);assert.equal(headToHead(r,2)[0][3],1);assert.equal(headToHead(r,3)[1][0],-1);
 assert.deepEqual(totals(r).map(s=>s.match),[0,-1,3,-2]);
 assert.equal(upDown(2),'2UP');assert.equal(upDown(-1),'1DN');assert.equal(upDown(0),'AS');
});
test('登録コースの検証と、パー・コース名の反映',()=>{
 const pars=[4,4,5,4,3,4,5,4,3,4,4,5,4,3,4,5,4,3];
 const c={id:'c1',name:'テストカントリー',pars};assert.equal(validCourse(c),true);
 for(const bad of [{...c,id:''},{...c,name:'  '},{...c,pars:pars.slice(1)},{...c,pars:[...pars.slice(1),7]},null]) assert.equal(validCourse(bad),false);
 const r=createRound();applyCourse(r,c);
 assert.equal(r.course,'テストカントリー');assert.equal(r.courseId,'c1');assert.deepEqual(r.holes.map(h=>h.par),pars);assert.equal(validRound(r),true);
 r.courseId=5;assert.equal(validRound(r),false);
});
test('スコアの記号はパーとの差で決まる',()=>{
 assert.deepEqual([2,3,4,5,6,9,null].map(s=>scoreMark(s,4)),['eagle','birdie','par','bogey','double','double','']);
 assert.equal(scoreMark(1,4),'eagle');
});
