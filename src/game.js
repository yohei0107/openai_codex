export const medals = { gold: { label: '金', points: 4 }, silver: { label: '銀', points: 3 }, bronze: { label: '銅', points: 2 }, iron: { label: '鉄', points: 1 } };
export function createRound() {
  return { version: 1, started: false, course: '', names: ['プレイヤー 1', 'プレイヤー 2', 'プレイヤー 3', 'プレイヤー 4'], count: 18, partner: 3, vegasRules: { birdie: true, zoroMode: 'double' }, holes: Array.from({ length: 18 }, () => ({ par: 4, pushes: 0, scores: [null,null,null,null], putts: [null,null,null,null], medals: ['', '', '', ''] })) };
}
export function teeOrder(round, index) {
  let order = [0,1,2,3];
  for(let h=0; h<index; h++) {
    const scores=round.holes[h].scores;
    if(scores.every(Number.isInteger)) order=order.toSorted((a,b)=>scores[a]-scores[b]);
  }
  return order;
}
// Legacy rounds keep their original scoring when reopened; new rounds choose rules before starting.
export function vegasRules(round) {
  return round.vegasRules ?? { birdie: false, zoroMode: 'double' };
}
export const MAX_PUSHES = 30;
export function vegas(round, index) {
  const hole = round.holes[index], order = teeOrder(round, index);
  const a = [order[0], order[round.partner]], b = order.filter(p => !a.includes(p));
  const pushes = hole.pushes ?? 0;
  const pushMultiplier = 2 ** pushes;
  if (!hole.scores.every(s => Number.isInteger(s) && s >= 1 && s <= 9)) {
    return { a, b, ready: false, pushes, pushMultiplier };
  }
  const rules = vegasRules(round);
  const number = team => {
    const scores = team.map(p => hole.scores[p]).sort((x, y) => x - y);
    return scores[0] * 10 + scores[1];
  };
  const rawA = number(a), rawB = number(b);
  const birdieA = rules.birdie && a.some(p => hole.scores[p] === hole.par - 1);
  const birdieB = rules.birdie && b.some(p => hole.scores[p] === hole.par - 1);
  const zoro = team => hole.scores[team[0]] === hole.scores[team[1]];
  const zoroA = birdieB && zoro(a), zoroB = birdieA && zoro(b);
  const reverse = n => (n % 10) * 10 + Math.floor(n / 10);
  // Effects are simultaneous. One or more birdies in a team trigger one effect.
  const na = birdieB ? reverse(rawA) : rawA;
  const nb = birdieA ? reverse(rawB) : rawB;
  const zoroEvents = Number(zoroA) + Number(zoroB);
  const multiplier = rules.zoroMode === 'add'
    ? pushMultiplier + zoroEvents
    : pushMultiplier * 2 ** zoroEvents;
  const baseDiff = nb - na, diff = baseDiff * multiplier;
  return {
    a, b, ready: true, rawA, rawB, na, nb, birdieA, birdieB, zoroA, zoroB,
    pushes, pushMultiplier, zoroEvents, multiplier, baseDiff, diff,
    points: [0, 1, 2, 3].map(p => a.includes(p) ? diff : -diff),
  };
}
export function olympic(hole) {
  return hole.putts.map((p,i)=>p===1&&medals[hole.medals[i]] ? medals[hole.medals[i]].points : 0);
}
export function match(hole) {
  if(!hole.scores.every(Number.isInteger)) return null;
  return hole.scores.map(s=>hole.scores.filter(other=>s<other).length);
}
export function totals(round) {
 const result=round.names.map(()=>({strokes:0,putts:0,played:0,vegas:0,olympic:0,match:0}));
 round.holes.slice(0,round.count).forEach((h,i)=>{
  const v=vegas(round,i),o=olympic(h),m=match(h);
  result.forEach((r,p)=>{if(h.scores[p]!==null){r.strokes+=h.scores[p];r.played++;}if(h.putts[p]!==null)r.putts+=h.putts[p]; r.vegas+=v.ready?v.points[p]:0;r.olympic+=o[p];r.match+=m?m[p]:0;});
 });return result;
}
export function validRound(r) {
 return r?.version===1 && (r.started===undefined || typeof r.started==='boolean') && (r.vegasRules===undefined || r.vegasRules!==null && typeof r.vegasRules.birdie==='boolean' && ['add','double'].includes(r.vegasRules.zoroMode)) && typeof r.course==='string' && Array.isArray(r.names)&&r.names.length===4&&r.names.every(n=>typeof n==='string'&&n.length<=30)&&[9,18].includes(r.count)&&[1,2,3].includes(r.partner)&&Array.isArray(r.holes)&&r.holes.length===18&&r.holes.every(h=>h!==null && typeof h==='object' && (h.pushes===undefined || Number.isInteger(h.pushes)&&h.pushes>=0&&h.pushes<=MAX_PUSHES) && [3,4,5,6].includes(h.par)&&['scores','putts','medals'].every(k=>Array.isArray(h[k])&&h[k].length===4)&&h.scores.every(s=>s===null||Number.isInteger(s)&&s>=1&&s<=20)&&h.putts.every((p,i)=>p===null||Number.isInteger(p)&&p>=0&&p<=10&&(h.scores[i]===null||p<=h.scores[i]))&&h.medals.every(m=>m===''||Object.hasOwn(medals,m))&&new Set(h.medals.filter(Boolean)).size===h.medals.filter(Boolean).length);
}
