export const medals = { gold: { label: '金', points: 4 }, silver: { label: '銀', points: 3 }, bronze: { label: '銅', points: 2 }, iron: { label: '鉄', points: 1 } };
// Quick-pick values for the Olympic point input (diamond = holed from off the green).
export const olympicPicks = [['鉄', 1], ['銅', 2], ['銀', 3], ['金', 4], ['ダイヤ', 5]];
export const OLYMPIC_MIN = -10, OLYMPIC_MAX = 30;
export const MAX_PUSHES = 30;
export const pushTimings = { tee: 'ティーショットの前', second: '2打目の前', green: 'グリーンに乗る前', any: 'いつでも' };
export const DEFAULT_RULES = { pairing: 'order', rotateEvery: 3, roundUp: true, birdie: true, birdieMult: 1, eagle: 2, pairBirdie: 1, bothBirdie: 'cancel', zoroMode: 'double', doublePar: false, overflow: 'raw', carry: 'add', pushLimit: 0, pushPer: 'half', pushTiming: 'tee' };
// Rounds saved before a rule existed keep the behaviour they were scored with.
const LEGACY_RULES = { pairing: 'order', rotateEvery: 3, roundUp: false, birdie: false, birdieMult: 1, eagle: 1, pairBirdie: 1, bothBirdie: 'both', zoroMode: 'double', doublePar: false, overflow: 'raw', carry: 'none', pushLimit: 0, pushPer: 'half', pushTiming: 'any' };
const empty = () => [null, null, null, null];
export function createRound() {
  return { version: 1, started: false, course: '', names: ['プレイヤー 1', 'プレイヤー 2', 'プレイヤー 3', 'プレイヤー 4'], count: 18, partner: 3, vegasRules: { ...DEFAULT_RULES }, holes: Array.from({ length: 18 }, () => ({ par: 4, pushers: [false, false, false, false], scores: empty(), putts: empty(), olympic: empty() })) };
}
export function teeOrder(round, index) {
  let order = [0,1,2,3];
  for(let h=0; h<index; h++) {
    const scores=round.holes[h].scores;
    if(scores.every(Number.isInteger)) order=order.toSorted((a,b)=>scores[a]-scores[b]);
  }
  return order;
}
export function vegasRules(round) {
  return { ...LEGACY_RULES, ...(round.vegasRules ?? {}) };
}
// Partner 1-3: a tee-order position (order) or a player number (fixed / manual / rotate).
export function teams(round, index) {
  const rules = vegasRules(round);
  let a;
  if (rules.pairing === 'fixed') a = [0, round.partner];
  else if (rules.pairing === 'manual') a = [0, round.holes[index].partner ?? round.partner];
  else if (rules.pairing === 'rotate') a = [0, Math.floor(index / rules.rotateEvery) % 3 + 1];
  else { const order = teeOrder(round, index); a = [order[0], order[round.partner]]; }
  return { a, b: [0, 1, 2, 3].filter(p => !a.includes(p)) };
}
export function pushCount(hole) {
  return Array.isArray(hole.pushers) ? hole.pushers.filter(Boolean).length : hole.pushes ?? 0;
}
// Pushes a player already used in the same half (or round) outside this hole.
export function pushesUsed(round, player, index) {
  const rules = vegasRules(round), half = Math.floor(index / 9);
  return round.holes.slice(0, round.count).filter((h, i) => i !== index && (rules.pushPer === 'round' || Math.floor(i / 9) === half) && h.pushers?.[player]).length;
}
export function canPush(round, player, index) {
  const limit = vegasRules(round).pushLimit;
  return !!round.holes[index].pushers?.[player] || limit === 0 || pushesUsed(round, player, index) < limit;
}
// Smaller score first (46). A score of 10 or more goes first instead (4 and 10 -> 104).
const teamNumber = ([x, y]) => { const lo = Math.min(x, y), hi = Math.max(x, y); return hi >= 10 ? Number(`${hi}${lo}`) : lo * 10 + hi; };
const flipped = ([x, y]) => { const lo = Math.min(x, y), hi = Math.max(x, y); return Number(`${hi}${lo}`); };
function holeCore(round, index) {
  const hole = round.holes[index], { a, b } = teams(round, index);
  const pushes = pushCount(hole), pushMultiplier = 2 ** pushes;
  if (!hole.scores.every(s => Number.isInteger(s) && s >= 1 && s <= 20)) return { a, b, ready: false, pushes, pushMultiplier };
  const rules = vegasRules(round);
  const counted = p => rules.overflow === 'nine' ? Math.min(hole.scores[p], 9) : hole.scores[p];
  const score = team => team.map(counted);
  // Birdie (1 under) or better: kind, whether both partners made it, and the multiplier it earns.
  const achievement = team => {
    const under = team.map(p => hole.par - hole.scores[p]), best = Math.max(...under), pair = Math.min(...under) >= 1;
    if (best < 1) return null;
    let multiplier = rules.birdieMult;
    if (best >= 2) multiplier = Math.max(multiplier, rules.eagle);
    if (pair) multiplier = Math.max(multiplier, rules.pairBirdie);
    return { kind: best >= 2 ? 'eagle' : 'birdie', pair, multiplier };
  };
  const achA = achievement(a), achB = achievement(b);
  const cancelled = !!(achA && achB && rules.bothBirdie === 'cancel');
  const activeA = cancelled ? null : achA, activeB = cancelled ? null : achB;
  // flipA: A's number is flipped by B's birdie. doubleParA: A flips itself.
  const flipA = !!activeB && rules.birdie, flipB = !!activeA && rules.birdie;
  const doubleParA = rules.doublePar && a.some(p => hole.scores[p] >= hole.par * 2);
  const doubleParB = rules.doublePar && b.some(p => hole.scores[p] >= hole.par * 2);
  const rawA = teamNumber(score(a)), rawB = teamNumber(score(b));
  const na = flipA || doubleParA ? flipped(score(a)) : rawA, nb = flipB || doubleParB ? flipped(score(b)) : rawB;
  const same = team => counted(team[0]) === counted(team[1]);
  const zoroA = flipA && same(a), zoroB = flipB && same(b);
  const birdieMultiplier = Math.max(activeA?.multiplier ?? 1, activeB?.multiplier ?? 1);
  return { a, b, ready: true, rawA, rawB, na, nb, achA, achB, cancelled, flipA, flipB, doubleParA, doubleParB, zoroA, zoroB, birdieMultiplier, pushes, pushMultiplier };
}
// Ties in a row right before this hole: "add" gives x2, x3, x4...; "double" gives x2, x4, x8...
export function carryFor(round, index) {
  const mode = vegasRules(round).carry;
  if (mode === 'none') return 1;
  let ties = 0;
  for (let j = index - 1; j >= 0; j--) {
    const core = holeCore(round, j);
    if (!core.ready || core.na !== core.nb) break;
    ties++;
  }
  return mode === 'double' ? 2 ** ties : 1 + ties;
}
export function vegas(round, index) {
  const core = holeCore(round, index), rules = vegasRules(round), carry = carryFor(round, index);
  if (!core.ready) return { ...core, carry };
  const zoroEvents = rules.zoroMode === 'none' ? 0 : Number(core.zoroA) + Number(core.zoroB);
  const base = rules.zoroMode === 'add' ? core.pushMultiplier + zoroEvents : core.pushMultiplier * 2 ** zoroEvents;
  const multiplier = base * core.birdieMultiplier * carry;
  // A gap of 11 counts as 20 when the ones digit is rounded up.
  const gap = core.nb - core.na;
  const baseDiff = rules.roundUp ? Math.sign(gap) * Math.ceil(Math.abs(gap) / 10) * 10 : gap;
  const diff = baseDiff * multiplier;
  return { ...core, carry, zoroEvents, base, multiplier, gap, baseDiff, diff, points: [0, 1, 2, 3].map(p => core.a.includes(p) ? diff : -diff) };
}
// Points each player entered for the hole. Older rounds derive them from medal + 1 putt.
export function olympic(hole) {
  if (Array.isArray(hole.olympic)) return hole.olympic.map(v => v ?? 0);
  return hole.putts.map((p,i)=>p===1&&medals[hole.medals?.[i]] ? medals[hole.medals[i]].points : 0);
}
// Each point is received from every other player: own x players - everyone's total.
export function olympicNet(points) {
  const total = points.reduce((s, v) => s + v, 0);
  return points.map(v => v * points.length - total);
}
export function match(hole) {
  if(!hole.scores.every(Number.isInteger)) return null;
  return hole.scores.map(s => { const wins = hole.scores.filter(o => s < o).length, losses = hole.scores.filter(o => s > o).length; return { wins, losses, net: wins - losses }; });
}
// grid[p][q]: holes p won against q minus holes p lost to q (match-play up/down), over holes before upTo.
// A hole counts for a pair as soon as both of them have a score.
export function headToHead(round, upTo = round.count) {
  const grid = [0, 1, 2, 3].map(() => [0, 0, 0, 0]);
  round.holes.slice(0, Math.min(upTo, round.count)).forEach(h => {
    for (let p = 0; p < 4; p++) for (let q = 0; q < 4; q++) if (p !== q && Number.isInteger(h.scores[p]) && Number.isInteger(h.scores[q])) grid[p][q] += Math.sign(h.scores[q] - h.scores[p]);
  });
  return grid;
}
export function totals(round) {
 const result=round.names.map(()=>({strokes:0,putts:0,played:0,vegas:0,olympic:0,olympicNet:0,match:0,wins:0,losses:0}));
 round.holes.slice(0,round.count).forEach((h,i)=>{
  const v=vegas(round,i),o=olympic(h),on=olympicNet(o);
  result.forEach((r,p)=>{
   if(h.scores[p]!==null){r.strokes+=h.scores[p];r.played++;}if(h.putts[p]!==null)r.putts+=h.putts[p];r.vegas+=v.ready?v.points[p]:0;r.olympic+=o[p];r.olympicNet+=on[p];
   if(Number.isInteger(h.scores[p]))h.scores.forEach((o2,q)=>{if(q===p||!Number.isInteger(o2))return;if(h.scores[p]<o2)r.wins++;else if(h.scores[p]>o2)r.losses++;});
  });
 });
 result.forEach(r=>{r.match=r.wins-r.losses;});
 return result;
}
// Match-play status label: 2UP, 1DN or AS (all square).
export const upDown = n => n > 0 ? `${n}UP` : n < 0 ? `${-n}DN` : 'AS';
const optional = (value, ok) => value === undefined || ok(value);
const oneOf = list => x => list.includes(x);
const isBool = x => typeof x === 'boolean';
const ruleChecks = {
  pairing: oneOf(['order','fixed','manual','rotate']), rotateEvery: oneOf([3,6]), roundUp: isBool, birdie: isBool, birdieMult: oneOf([1,2]),
  eagle: oneOf([1,2,3,4]), pairBirdie: oneOf([1,2,3,4]), bothBirdie: oneOf(['cancel','both']), zoroMode: oneOf(['add','double','none']),
  doublePar: isBool, overflow: oneOf(['raw','nine']), carry: oneOf(['none','add','double']), pushLimit: x => Number.isInteger(x) && x >= 0 && x <= 9,
  pushPer: oneOf(['half','round']), pushTiming: oneOf(Object.keys(pushTimings)),
};
function validRules(v) {
  return v !== null && typeof v === 'object' && Object.entries(ruleChecks).every(([k, ok]) => optional(v[k], ok));
}
function validHole(h) {
  if (h === null || typeof h !== 'object' || ![3,4,5,6].includes(h.par)) return false;
  if (!['scores','putts'].every(k => Array.isArray(h[k]) && h[k].length === 4)) return false;
  return optional(h.pushes, x => Number.isInteger(x) && x >= 0 && x <= MAX_PUSHES)
    && optional(h.pushers, x => Array.isArray(x) && x.length === 4 && x.every(isBool))
    && optional(h.partner, oneOf([1,2,3]))
    && optional(h.olympic, x => Array.isArray(x) && x.length === 4 && x.every(n => n === null || Number.isInteger(n) && n >= OLYMPIC_MIN && n <= OLYMPIC_MAX))
    && h.scores.every(s => s === null || Number.isInteger(s) && s >= 1 && s <= 20)
    && h.putts.every((p,i) => p === null || Number.isInteger(p) && p >= 0 && p <= 10 && (h.scores[i] === null || p <= h.scores[i]))
    && optional(h.medals, m => Array.isArray(m) && m.length === 4 && m.every(x => x === '' || Object.hasOwn(medals, x)) && new Set(m.filter(Boolean)).size === m.filter(Boolean).length);
}
// A course saved on this device: name and the par of all 18 holes.
export function validCourse(c) {
  return c !== null && typeof c === 'object' && typeof c.id === 'string' && c.id.length > 0 && c.id.length <= 40
    && typeof c.name === 'string' && c.name.trim().length > 0 && c.name.length <= 60
    && Array.isArray(c.pars) && c.pars.length === 18 && c.pars.every(oneOf([3,4,5,6]));
}
export function applyCourse(round, course) {
  round.course = course.name;
  round.courseId = course.id;
  round.holes.forEach((h, i) => { h.par = course.pars[i]; });
}
// Score relative to par, as marked on a paper scorecard.
export function scoreMark(score, par) {
  if (!Number.isInteger(score)) return '';
  const d = score - par;
  return d <= -2 ? 'eagle' : d === -1 ? 'birdie' : d === 0 ? 'par' : d === 1 ? 'bogey' : 'double';
}
export function validRound(r) {
 return r?.version===1 && optional(r.started, isBool) && optional(r.courseId, x => typeof x === 'string' && x.length <= 40) && optional(r.vegasRules, validRules) && typeof r.course==='string' && Array.isArray(r.names)&&r.names.length===4&&r.names.every(n=>typeof n==='string'&&n.length<=30)&&[9,18].includes(r.count)&&[1,2,3].includes(r.partner)&&Array.isArray(r.holes)&&r.holes.length===18&&r.holes.every(validHole);
}
