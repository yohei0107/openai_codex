import test from 'node:test';
import assert from 'node:assert/strict';
import {createRound,teeOrder,vegas,olympic,match,totals,validRound,MAX_PUSHES,vegasRules} from '../src/game.js';
test('ラスベガスはチームの小さいスコアを十の位にし、差分を対称加算',()=>{const r=createRound();r.vegasRules.birdie=false;r.holes[0].scores=[4,5,6,3];const v=vegas(r,0);assert.deepEqual(v.a,[0,3]);assert.equal(v.na,34);assert.equal(v.nb,56);assert.deepEqual(v.points,[22,-22,-22,22]);assert.equal(v.points.reduce((a,b)=>a+b),0);});
test('チーム分け3通りと引き分け',()=>{const r=createRound();for(const p of [1,2,3]){r.partner=p;assert.deepEqual(vegas(r,0).a,[0,p]);}r.holes[0].scores=[4,4,4,4];assert.equal(vegas(r,0).diff,0);});
test('未入力・10打以上はラスベガスの集計対象外',()=>{const r=createRound();assert.equal(vegas(r,0).ready,false);r.holes[0].scores=[10,4,3,5];assert.equal(vegas(r,0).ready,false);assert.deepEqual(totals(r).map(s=>s.vegas),[0,0,0,0]);});
test('オナーは前ホールの成績順、同点時は直前の順番を維持',()=>{const r=createRound();r.holes[0].scores=[5,3,4,4];r.holes[1].scores=[4,4,4,4];assert.deepEqual(teeOrder(r,1),[1,2,3,0]);assert.deepEqual(teeOrder(r,2),[1,2,3,0]);assert.deepEqual(teeOrder(r,3),[1,2,3,0]);});
test('オリンピックは指定メダルと1パットの両方が必要',()=>{const h=createRound().holes[0];h.medals=['gold','silver','bronze','iron'];h.putts=[1,2,0,null];assert.deepEqual(olympic(h),[4,0,0,0]);h.putts=[1,1,1,1];assert.deepEqual(olympic(h),[4,3,2,1]);});
test('スコアマッチは相手ごとに比較し、引き分けを加点しない',()=>{const h=createRound().holes[0];assert.equal(match(h),null);h.scores=[3,4,4,6];assert.deepEqual(match(h),[3,1,1,0]);});
test('9ホール選択時は後半を集計しない',()=>{const r=createRound();r.holes[0].scores=[4,4,4,4];r.holes[9].scores=[5,5,5,5];r.count=9;assert.deepEqual(totals(r).map(s=>s.strokes),[4,4,4,4]);r.count=18;assert.deepEqual(totals(r).map(s=>s.strokes),[9,9,9,9]);});
test('保存データ検証は不正値・重複メダル・矛盾するパット数を拒否',()=>{const r=createRound();assert.equal(validRound(r),true);r.holes[0].scores[0]=3;r.holes[0].putts[0]=4;assert.equal(validRound(r),false);r.holes[0].putts[0]=2;assert.equal(validRound(r),true);r.holes[0].medals=['gold','gold','',''];assert.equal(validRound(r),false);assert.equal(validRound({}),false);});

test('バーディーで相手の2桁を反転し、ポイントを再計算',()=>{
 const r=createRound();r.holes[0].scores=[4,5,6,3];const v=vegas(r,0);
 assert.equal(v.rawB,56);assert.equal(v.nb,65);assert.equal(v.na,34);
 assert.equal(v.diff,31);assert.deepEqual(v.points,[31,-31,-31,31]);
});
test('プッシュはホールごとに累乗し、別のホールへ繰り越さない',()=>{
 const r=createRound();r.vegasRules.birdie=false;
 r.holes[0].scores=[4,5,6,4];r.holes[1].scores=[4,5,6,4];
 r.holes[0].pushes=3;assert.equal(vegas(r,0).multiplier,8);
 assert.equal(vegas(r,0).diff,96);assert.equal(vegas(r,1).multiplier,1);
});
test('ゾロ目はバーディーを受けた相手チーム内の同スコアで判定',()=>{
 const r=createRound();r.holes[0].scores=[3,5,5,4];const v=vegas(r,0);
 assert.equal(v.zoroB,true);assert.equal(v.nb,55);assert.equal(v.multiplier,2);assert.equal(v.diff,42);
 r.holes[0].scores=[4,5,5,4];assert.equal(vegas(r,0).multiplier,1);
});
test('開始前の倍率方式により、プッシュとゾロ目を加算または乗算',()=>{
 const r=createRound();r.holes[0].scores=[3,5,5,4];r.holes[0].pushes=1;
 assert.equal(vegas(r,0).multiplier,4);assert.equal(vegas(r,0).diff,84);
 r.vegasRules.zoroMode='add';assert.equal(vegas(r,0).multiplier,3);assert.equal(vegas(r,0).diff,63);
 r.holes[0].pushes=2;assert.equal(vegas(r,0).multiplier,5);assert.equal(vegas(r,0).diff,105);
 r.vegasRules.zoroMode='double';assert.equal(vegas(r,0).multiplier,8);assert.equal(vegas(r,0).diff,168);
});
test('両チームのバーディーは同時に相手へ適用する',()=>{
 const r=createRound();r.holes[0].scores=[3,3,5,4];const v=vegas(r,0);
 assert.equal(v.na,43);assert.equal(v.nb,53);assert.equal(v.diff,10);
});
test('同一チームにバーディー2人でも、相手への効果は1回',()=>{
 const r=createRound();r.holes[0].scores=[3,4,5,3];const v=vegas(r,0);
 assert.equal(v.nb,54);assert.equal(v.multiplier,1);assert.equal(v.diff,21);
});
test('両チームのゾロ目とバーディーが重なっても引き分けは0点',()=>{
 const r=createRound();r.holes[0].scores=[3,3,3,3];r.holes[0].pushes=2;
 assert.equal(vegas(r,0).zoroEvents,2);assert.equal(vegas(r,0).multiplier,16);assert.equal(vegas(r,0).diff,0);
 r.vegasRules.zoroMode='add';assert.equal(vegas(r,0).multiplier,6);assert.equal(vegas(r,0).diff,0);
});
test('パーの修正でバーディー判定を再計算、イーグルは別ルールを自動適用しない',()=>{
 const r=createRound();r.holes[0].scores=[3,5,6,4];assert.equal(vegas(r,0).nb,65);
 r.holes[0].par=3;assert.equal(vegas(r,0).nb,56);
 r.holes[0].par=5;assert.equal(vegas(r,0).nb,65);
 r.holes[0].scores[3]=5;assert.equal(vegas(r,0).nb,56);
});
test('未入力や10打以上なら、プッシュを設定しても集計しない',()=>{
 const r=createRound();r.holes[0].pushes=4;assert.equal(vegas(r,0).ready,false);
 r.holes[0].scores=[3,10,5,4];assert.equal(vegas(r,0).ready,false);assert.equal(totals(r)[0].vegas,0);
});
test('旧保存データは欠けた新フィールドを許容し、元のポイントを維持',()=>{
 const r=createRound();delete r.vegasRules;delete r.started;r.holes.forEach(h=>delete h.pushes);
 r.holes[0].scores=[4,5,6,3];assert.equal(validRound(r),true);
 assert.equal(vegasRules(r).birdie,false);assert.equal(vegas(r,0).diff,22);
});
test('保存検証は不正なプッシュ・ルールを拒否し、上限でも精密な整数を保つ',()=>{
 const r=createRound();r.holes[0].scores=[3,9,9,4];r.holes[0].pushes=MAX_PUSHES;
 assert.equal(validRound(r),true);assert.equal(Number.isSafeInteger(totals(r)[0].vegas*18),true);
 for(const invalid of [-1,1.5,MAX_PUSHES+1,null,'2']){r.holes[0].pushes=invalid;assert.equal(validRound(r),false);}
 r.holes[0].pushes=0;r.vegasRules.zoroMode='other';assert.equal(validRound(r),false);
 r.vegasRules=null;assert.equal(validRound(r),false);
});
