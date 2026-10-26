/* Блок «Этапы и сроки» на доме Алексино (выставочный дом в Forest Club). Те же этапы и тот же рисунок, что в прототипе
   etapy-i-sroki, но дом настоящий: 34 детали с марками и монолит из IFC Максима (alexino-data.js, копия данных теста
   «Из чертежа в дом»). Порядок монтажа как в том тесте: север и запад, внутренние стены, фасад, плиты, стенки перепада, парапеты.
   Камера (вариант c4 с правкой Максима 26.10): проект сверху планом, дальше изометрия с юго-юго-запада, когда уходит завод,
   небольшой разворот на юго-восток и сборка с другой стороны, в конце фасад, как в лоадере Димы (Фигма, «12-2 Концепция 1»).
   Единица рисунка 50 мм, 20 единиц на метр. x вдоль осей 1 → 4, y на север от оси А, z вверх от чистого пола. */
(() => {
'use strict';

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ramp = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
// один изинг на все движения: квадратичный in-out, мягкий старт и финиш без рывка (вариант e3, выбрал Максим 26.10).
// Были кубический in-out с рывком посередине и easeOut с резким стартом
const ease = t => t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
function seq(t, k, n, d) { const a = n <= 1 ? 0 : k * (1 - d) / (n - 1); return ramp(a, a + d, t); }

const qs = new URLSearchParams(location.search);
let FORCE = qs.has('p') ? clamp(+qs.get('p') || 0, 0, 1) : null;   // ?p=0.4 рисует кадр на 40% без прокрутки
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- строки: этапы по наброску Максима Липатникова 16.10, недели стройки из 26 ---------- */
const WEEKS = ['Недели 00–04', 'Недели 03–13', 'Недели 12–14', 'Недели 14–22', 'Недели 21–26'];
const WEEK_END = [4, 13, 14, 22, 26];
const STAGES = ['Проект фундамента и панелей', 'Фундамент и завод', 'Монтаж', 'Перекрытие', 'Окна и кровля'];
const ANIMATED = STAGES.length;
const PITCH = 503 / ANIMATED;
const ROW_TOP = STAGES.map((_, i) => Math.round(i * PITCH));
const RULES = STAGES.map((_, i) => Math.round((i + 1) * PITCH) - 1);

const body = $('etBody'), hl = $('etHl'), num = $('etNum');
hl.style.setProperty('--hlh', PITCH + 1);
for (const y of RULES) { const r = document.createElement('div'); r.className = 'et-rule'; r.style.top = `calc(${y} * var(--u))`; body.insertBefore(r, hl); }
const weekEls = WEEKS.map((t, i) => { const el = document.createElement('p'); el.className = 'et-week'; el.textContent = t; el.style.top = `calc(${ROW_TOP[i] + (PITCH - 18) / 2} * var(--u))`; body.appendChild(el); return el; });
const stageEls = STAGES.map((t, i) => {
  const el = document.createElement('p'); el.className = 'et-stage'; el.style.top = `calc(${ROW_TOP[i] + (PITCH - 26) / 2 - 3} * var(--u))`;
  el.innerHTML = '<i></i><span></span>'; el.lastChild.textContent = t; body.appendChild(el); return el;
});
let shownRow = -1;
function syncRows(p) {
  const row = Math.min(ANIMATED - 1, Math.floor(p * ANIMATED));
  if (row === shownRow) return;
  shownRow = row;
  weekEls.forEach((el, i) => el.classList.toggle('on', i === row));
  stageEls.forEach((el, i) => el.classList.toggle('on', i === row));
  hl.style.setProperty('--hl', ROW_TOP[row]);
}
/* ---------- счётчик недель: лента цифр, как в Number Odometer из Osmo, но едет непрерывно ---------- */
// Неделя стройки идёт по ходу этапа: от конца прошлого этапа до конца этого, всего с 00 до 26. Цель целая, показ
// догоняет её каждый кадр, как Lenis прокрутку: с любой скоростью колеса и при пропуске цифры едут, а не стоят и прыгают
// пачкой. Десятки едут, только пока единицы идут с 9 на 0, как в механическом счётчике
const ODO_K = 5, ODO_VMAX = 24;   // догон 1/с: шаг на неделю почти доезжает за полсекунды; лента не быстрее 24 цифр в секунду
let wkTarget = 0, wkShown = 0, odoT = 0;
const odoStrips = [0, 1].map(k => {   // десятки 0…9, единицы 0…9 и снова 0, чтобы 9 уезжал в 0
  const mask = document.createElement('span'), roller = document.createElement('span');
  mask.setAttribute('data-odometer-part', 'mask'); mask.setAttribute('aria-hidden', 'true'); mask.style.height = '1em'; mask.style.lineHeight = 1;
  roller.setAttribute('data-odometer-part', 'roller'); roller.style.lineHeight = 1;
  roller.textContent = Array.from({ length: k ? 11 : 10 }, (_, i) => i % 10).join('\n');
  mask.appendChild(roller); return { mask, roller };
});
const wkText = document.createElement('span');   // число для экранного диктора
wkText.className = 'sr-only'; wkText.textContent = '00';
num.replaceChildren(...odoStrips.map(s => s.mask), wkText);
function syncWeek(p) {
  const row = Math.min(ANIMATED - 1, Math.floor(p * ANIMATED)), a = row ? WEEK_END[row - 1] : 0;
  const w = Math.round(lerp(a, WEEK_END[row], stageT(p, row)));
  if (w !== wkTarget) { wkTarget = w; wkText.textContent = String(w).padStart(2, '0'); }
}
function rollWeek(now) {
  const dt = Math.min(0.1, Math.max(0, (now - odoT) / 1000)); odoT = now;
  if (wkShown === wkTarget) return;
  const gap = wkTarget - wkShown, step = clamp(gap * (1 - Math.exp(-dt * ODO_K)), -ODO_VMAX * dt, ODO_VMAX * dt);
  wkShown = RM || FORCE !== null || Math.abs(gap) < 0.002 ? wkTarget : wkShown + step;
  const ones = wkShown % 10, tens = Math.floor(wkShown / 10) + clamp(ones - 9, 0, 1);
  odoStrips[0].roller.style.transform = `translate3d(0, ${-tens}em, 0)`;
  odoStrips[1].roller.style.transform = `translate3d(0, ${-ones}em, 0)`;
}

/* ---------- холст и камера ---------- */
// Камера ортогональная: азимут phi (куда смотрим в плане) и высота eps. При phi 45° и eps 35,26° это прежняя изометрия:
// x и y под 30°, высота в натуральную величину. При eps 0 фасад, при eps 90° план
const cv = $('cv'), ctx = cv.getContext('2d');
const css = getComputedStyle(document.documentElement), tok = n => css.getPropertyValue(n).trim();
const INK = tok('--ink'), GHOST = tok('--muted'), CELL = tok('--cell');
const CELL_W = 784, CELL_H = 503, FIT = [36, 24, CELL_W - 72, CELL_H - 48];
const S = Math.sqrt(1.5), ISO = Math.atan(Math.SQRT1_2), DEG = Math.PI / 180;
const PIV = [141, 147, 30];   // центр дома, вокруг него облетает камера
let FX = 1, FY = 0, RX = 0, RY = -1, SE = 0, CE = 1;
let CAM = { k: 1, ox: 0, oy: 0 }, U = 1, DPR = 1, LW = 1, DASH = [3, 3];
function setView(v) { FX = Math.cos(v.phi); FY = Math.sin(v.phi); RX = FY; RY = -FX; SE = Math.sin(v.eps); CE = Math.cos(v.eps); }
const P = (x, y, z) => { const dx = x - PIV[0], dy = y - PIV[1]; return [CAM.ox + CAM.k * S * (RX * dx + RY * dy), CAM.oy - CAM.k * S * (SE * (FX * dx + FY * dy) + CE * (z - PIV[2]))]; };
const mixCam = (a, b, t) => ({ k: lerp(a.k, b.k, t), ox: lerp(a.ox, b.ox, t), oy: lerp(a.oy, b.oy, t) });
const corners = b => { const o = []; for (const x of [b[0], b[1]]) for (const y of [b[2], b[3]]) for (const z of [b[4], b[5]]) o.push([x, y, z]); return o; };
function fitCam(pts, r) {   // вписать точки в прямоугольник ячейки при текущем направлении взгляда
  let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
  for (const [x, y, z] of pts) {
    const dx = x - PIV[0], dy = y - PIV[1], px = S * (RX * dx + RY * dy), py = -S * (SE * (FX * dx + FY * dy) + CE * (z - PIV[2]));
    a = Math.min(a, px); c = Math.max(c, px); b = Math.min(b, py); d = Math.max(d, py);
  }
  const k = Math.min(r[2] / (c - a), r[3] / (d - b));
  return { k, ox: r[0] + r[2] / 2 - k * (a + c) / 2, oy: r[1] + r[3] / 2 - k * (b + d) / 2 };
}
// точки обзора камеры и путь по сюжету: этап i идёт с i/5 до (i + 0,8)/5. Разворот на юго-восток на монтаже,
// когда встали стены и уходит завод: закладные уже видны с той стороны
const VW = {
  top: { phi: 90 * DEG, eps: 89.5 * DEG },    // план, север вверх
  sw: { phi: 62 * DEG, eps: ISO },            // изометрия с юго-юго-запада: южный фасад, как в лоадере, виден лучше западного
  se: { phi: 118 * DEG, eps: 34 * DEG },      // разворот после завода: юго-восток, вход, навес над террасой, восточный фасад
  front: { phi: 90 * DEG, eps: 0 }            // фасад с юга, как в лоадере
};
const PATH = [[0, VW.top], [0.16, VW.top], [0.2, VW.sw], [0.48, VW.sw], [0.5, VW.se], [0.96, VW.se], [1, VW.front]];
const depthAt = (v, c) => Math.cos(v.eps) * (Math.cos(v.phi) * (c[0] - PIV[0]) + Math.sin(v.phi) * (c[1] - PIV[1])) - Math.sin(v.eps) * (c[2] - PIV[2]);   // больше — дальше от зрителя
const centre = b => [(b[0] + b[1]) / 2, (b[2] + b[3]) / 2, (b[4] + b[5]) / 2];
function viewAt(p) {
  const K = PATH;
  if (p <= K[0][0]) return K[0][1];
  for (let i = 1; i < K.length; i++) if (p <= K[i][0]) {
    const [p0, a] = K[i - 1], [p1, b] = K[i], t = ease(ramp(p0, p1, p));
    return { phi: lerp(a.phi, b.phi, t), eps: lerp(a.eps, b.eps, t) };
  }
  return K[K.length - 1][1];
}

/* ---------- дом Алексино из IFC ---------- */
const HS = window.HOUSE, SC = 1 / 50, EPS = 0.01, T = 7;
const GZ = -470 * SC;   // низ фундаментной плиты, уровень земли на рисунке
function ifcBox(l) {   // слой или деталь из IFC в коробку рисунка [x0, x1, y0, y1, z0, z1]
  if (l.W === 'x') return [l.w[0] * SC, l.w[1] * SC, -l.u[1] * SC, -l.u[0] * SC, l.v[0] * SC, l.v[1] * SC];
  if (l.W === 'z') return [l.u[0] * SC, l.u[1] * SC, -l.w[1] * SC, -l.w[0] * SC, l.v[0] * SC, l.v[1] * SC];
  return [l.u[0] * SC, l.u[1] * SC, -l.v[1] * SC, -l.v[0] * SC, l.w[0] * SC, l.w[1] * SC];   // плита
}
const holeRect = o => [o[0] * SC, o[1] * SC, -o[3] * SC, -o[2] * SC];
function rectsMinus(R, holes) {   // прямоугольник без вырезов как набор прямоугольников
  const xs = [...new Set([R[0], R[1], ...holes.flatMap(h => [h[0], h[1]])])].filter(x => x >= R[0] && x <= R[1]).sort((a, b) => a - b);
  const ys = [...new Set([R[2], R[3], ...holes.flatMap(h => [h[2], h[3]])])].filter(y => y >= R[2] && y <= R[3]).sort((a, b) => a - b);
  const filled = (x, y) => !holes.some(h => x > h[0] && x < h[1] && y > h[2] && y < h[3]);
  let rows = [];
  for (let j = 0; j < ys.length - 1; j++) {
    const cy = (ys[j] + ys[j + 1]) / 2, runs = [];
    for (let i = 0; i < xs.length - 1; i++) {
      if (!filled((xs[i] + xs[i + 1]) / 2, cy)) continue;
      const last = runs[runs.length - 1];
      if (last && Math.abs(last[1] - xs[i]) < EPS) last[1] = xs[i + 1]; else runs.push([xs[i], xs[i + 1]]);
    }
    rows.push({ y0: ys[j], y1: ys[j + 1], runs });
  }
  const out = [];
  for (const r of rows) for (const [a, b] of r.runs) {
    const prev = out.find(q => Math.abs(q[0] - a) < EPS && Math.abs(q[1] - b) < EPS && Math.abs(q[3] - r.y0) < EPS);
    if (prev) prev[3] = r.y1; else out.push([a, b, r.y0, r.y1]);
  }
  return out;
}
function outline(rects) {   // наружный контур объединения прямоугольников одной петлёй точек
  const xs = [...new Set(rects.flatMap(r => [r[0], r[1]]))].sort((a, b) => a - b), ys = [...new Set(rects.flatMap(r => [r[2], r[3]]))].sort((a, b) => a - b);
  const inside = (x, y) => rects.some(r => x > r[0] && x < r[1] && y > r[2] && y < r[3]);
  const segs = [];
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ys.length - 1; j++) {
    const cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2; if (!inside(cx, cy)) continue;
    if (!inside(cx, ys[j] - 0.01)) segs.push({ a: [xs[i], ys[j]], b: [xs[i + 1], ys[j]], n: [0, -1] });
    if (!inside(cx, ys[j + 1] + 0.01)) segs.push({ a: [xs[i + 1], ys[j + 1]], b: [xs[i], ys[j + 1]], n: [0, 1] });
    if (!inside(xs[i] - 0.01, cy)) segs.push({ a: [xs[i], ys[j + 1]], b: [xs[i], ys[j]], n: [-1, 0] });
    if (!inside(xs[i + 1] + 0.01, cy)) segs.push({ a: [xs[i + 1], ys[j]], b: [xs[i + 1], ys[j + 1]], n: [1, 0] });
  }
  // обход против часовой: из конца отрезка в начало следующего, на прямых участках точки не повторяем.
  // Кусков может быть несколько (крыльцо отдельно от плиты), у каждого своя петля
  const loops = [], sides = [], used = new Array(segs.length).fill(false);
  for (let st = used.indexOf(false); st >= 0; st = used.indexOf(false)) {
    const loop = [segs[st].a]; let cur = st; used[st] = true;
    for (;;) {
      const end = segs[cur].b, nx = segs.findIndex((s, i) => !used[i] && Math.abs(s.a[0] - end[0]) < EPS && Math.abs(s.a[1] - end[1]) < EPS);
      if (nx < 0) break;
      if (segs[nx].n[0] !== segs[cur].n[0] || segs[nx].n[1] !== segs[cur].n[1]) loop.push(end);
      used[nx] = true; cur = nx;
    }
    loops.push(loop);
    for (let i = 0; i < loop.length; i++) {   // прямые участки с наружной нормалью, для бортов опалубки
      const a = loop[i], b = loop[(i + 1) % loop.length];
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < EPS) continue;
      sides.push({ a, b, n: Math.abs(a[1] - b[1]) < EPS ? [0, b[0] > a[0] ? -1 : 1] : [b[1] > a[1] ? 1 : -1, 0] });
    }
  }
  return { loops, sides };
}

const els = [];
function box(kind, b, o = {}) { const e = Object.assign({ id: els.length, kind, b }, o); els.push(e); return e; }
const rawSlabs = list => {   // плиты разбиты на прямоугольники по вырезам, рёбра перепада отдельными коробками
  const out = [];
  for (const d of list) {
    const b = ifcBox(d);
    if (d.W !== 'y') { out.push({ b, beam: true }); continue; }
    for (const r of rectsMinus(b, d.o.map(holeRect))) out.push({ b: [r[0], r[1], r[2], r[3], b[4], b[5]], holes: [] });
  }
  return out;
};
let fnd = rawSlabs(HS.mono['Фундамент']), flr = rawSlabs(HS.mono['Пол']), roof = rawSlabs(HS.mono['Перекрытие']);

const PAN = {};
for (const [m, p] of Object.entries(HS.panels)) {
  const B = [1e9, -1e9, 1e9, -1e9, 1e9, -1e9];
  for (const l of p.l) { const b = ifcBox(l); for (let i = 0; i < 6; i += 2) { B[i] = Math.min(B[i], b[i]); B[i + 1] = Math.max(B[i + 1], b[i + 1]); } }
  const ax = p.l[0].W === 'x' ? 'x' : 'y', out = p.l.find(l => l.k === 'e') || p.l[0];
  const kind = m.startsWith('ПП') ? 'para' : m.startsWith('ВС') ? 'inner' : 'wall';
  if (kind !== 'para') B[4] = Math.max(B[4], 0);   // панель стоит на чистом полу, нижние 150 мм в плите не рисуем
  // наружная стена, под которой нет пола, стоит на фундаменте: иначе между ними щель 170 мм и стена висит в воздухе
  const ov = r => r.b[0] < B[1] - EPS && B[0] < r.b[1] - EPS && r.b[2] < B[3] - EPS && B[2] < r.b[3] - EPS;
  if (kind === 'wall' && !flr.some(ov)) B[4] = Math.max(...fnd.filter(ov).map(r => r.b[5]), B[4] - 3.4);
  const ops = out.o.filter(o => o[3] < out.v[1] - 10)   // вырезы под плиту у верха панели не проёмы
    .map(o => ax === 'x' ? [-o[1] * SC, -o[0] * SC, Math.max(0, o[2] * SC), o[3] * SC] : [o[0] * SC, o[1] * SC, Math.max(0, o[2] * SC), o[3] * SC]);
  PAN[m] = box('panel', B, { m, part: kind, ax, ops });
}
const PANELS = Object.values(PAN), PARAS = PANELS.filter(e => e.part === 'para');

// стыки: в IFC тела заходят друг в друга, а порядок отрисовки нужен однозначный
const over3 = (a, b) => a[0] < b[1] - EPS && b[0] < a[1] - EPS && a[2] < b[3] - EPS && b[2] < a[3] - EPS && a[4] < b[5] - EPS && b[4] < a[5] - EPS;
const overXY = (a, b) => a[0] < b[1] - EPS && b[0] < a[1] - EPS && a[2] < b[3] - EPS && b[2] < a[3] - EPS;
function trimAlong(a, i, b) {   // убрать из a часть, которую занимает b, вдоль оси i (0: x, 2: y)
  if (a[i] >= b[i] - EPS && a[i] < b[i + 1]) a[i] = b[i + 1];
  else if (a[i + 1] <= b[i + 1] + EPS && a[i + 1] > b[i]) a[i + 1] = b[i];
  else if (b[i] - a[i] > a[i + 1] - b[i + 1]) a[i + 1] = b[i]; else a[i] = b[i + 1];
}
const tang = e => e.ax === 'x' ? 2 : 0;
const area = r => (r[1] - r[0]) * (r[3] - r[2]);
fnd = fnd.filter(A => !fnd.some(B => B !== A && A.b[0] >= B.b[0] - EPS && A.b[1] <= B.b[1] + EPS && A.b[2] >= B.b[2] - EPS && A.b[3] <= B.b[3] + EPS && area(A.b) < area(B.b)));   // кусок внутри другого
for (const A of PANELS) for (const B of PANELS) {   // угол отдаём стене, которая идёт поперёк
  if (A === B || A.ax !== 'y' || B.ax !== 'x' || A.part === 'para' || B.part === 'para' || !over3(A.b, B.b)) continue;
  const a = A.b, b = B.b;
  if (a[0] >= b[0] - 0.5 && a[0] < b[1]) a[0] = b[1]; else if (a[1] <= b[1] + 0.5 && a[1] > b[0]) a[1] = b[0];
}
const flat = () => roof.filter(s => !s.beam);
for (const A of PANELS) {   // стена под плитой обрезается по её низу; стена, которая идёт выше плиты, проходит вырезом в плите
  if (A.part === 'para' || A.b[4] > 30) continue;
  for (const s of flat()) if (over3(A.b, s.b)) { if (A.b[5] <= s.b[5] + 1) A.b[5] = s.b[4]; else s.holes.push(A.b.slice(0, 4)); }
}
roof = roof.flatMap(s => s.beam || !s.holes.length ? [s] : rectsMinus(s.b, s.holes).map(r => ({ b: [r[0], r[1], r[2], r[3], s.b[4], s.b[5]], holes: [] })));
for (const s of roof.filter(s => s.beam)) {   // рёбра перепада между плитами и до стен
  for (const f of flat()) if (over3(s.b, f.b)) { if (f.b[5] - s.b[4] < 1) s.b[4] = f.b[5]; else if (s.b[5] - f.b[4] < 1) s.b[5] = f.b[4]; }
  for (const A of PANELS) if (A.part !== 'para' && A.b[4] <= 30 && over3(s.b, A.b)) trimAlong(s.b, s.b[1] - s.b[0] > s.b[3] - s.b[2] ? 0 : 2, A.b);
}
roof = roof.filter(s => s.b[1] - s.b[0] > 1 && s.b[3] - s.b[2] > 1);
for (const A of PANELS) {   // стенки перепада стоят на нижней плите у края верхней
  if (A.part === 'para' || A.b[4] <= 30) continue;
  for (const s of roof) if (over3(A.b, s.b)) trimAlong(A.b, A.ax === 'x' ? 0 : 2, s.b);
}
for (const A of PARAS) {   // парапет стоит на своей плите и не заходит в соседнюю
  const a = A.b; let z = a[4];
  for (const s of flat()) if (overXY(a, s.b) && s.b[5] < a[5] - 6) z = Math.max(z, s.b[5]);
  a[4] = z;
  for (const s of roof) if (over3(a, s.b)) trimAlong(a, tang(A), s.b);
}
for (const A of PARAS) for (const B of [...PARAS, ...PANELS.filter(e => e.part !== 'para' && e.b[4] > 30)]) if (A !== B && A.b[5] <= B.b[5] && over3(A.b, B.b)) trimAlong(A.b, tang(A), B.b);
const FOUND = fnd.map(s => box('found', s.b, { flat: true }));
const FLOOR = flr.map(s => box('floor', s.b, { flat: true }));
const ROOF = roof.map(s => box(s.beam ? 'beam' : 'slab', s.b, { flat: !s.beam }));
const LOW = ROOF.filter(e => e.kind === 'slab' && e.b[5] < 65), HIGH = ROOF.filter(e => e.kind === 'slab' && e.b[5] >= 65), BEAMS = ROOF.filter(e => e.kind === 'beam');
const HB = [-30, 312, -22, 316, GZ, 85];   // охват дома
const HC = [(HB[0] + HB[1]) / 2, (HB[2] + HB[3]) / 2];
for (const e of PANELS) e.ext = e.ax === 'x' ? Math.sign((e.b[0] + e.b[1]) / 2 - HC[0]) || 1 : Math.sign((e.b[2] + e.b[3]) / 2 - HC[1]) || 1;   // где улица
// окна и двери: рамы из IFC, каждая в проёме своей наружной панели
const WINS = HS.rings.map(r => {
  const b = ifcBox({ W: r.W, w: r.w, u: r.u, v: r.v }), ib = ifcBox({ W: r.W, w: r.w, u: r.iu, v: r.iv });
  b[4] = Math.max(0, b[4]); ib[4] = Math.max(0, ib[4]);
  const cx = (b[0] + b[1]) / 2, cy = (b[2] + b[3]) / 2, cz = (b[4] + b[5]) / 2;
  const pan = PANELS.find(e => e.part === 'wall' && cx > e.b[0] - 1 && cx < e.b[1] + 1 && cy > e.b[2] - 1 && cy < e.b[3] + 1 && cz > e.b[4] && cz < e.b[5]);
  return { b, ib, ax: r.W === 'x' ? 'x' : 'y', pan, done: false };
});
for (const e of PANELS) e.rings = WINS.filter(w => w.pan === e);
// проём, который после разбора угла вылез за торец стены, поджимаем внутрь вместе с рамой: у торца простенок 150 мм.
// Так у НС-110 на южном фасаде: проём в IFC до x 285, а угол забрала восточная НС-109, и стена кончается на 280
for (const e of PANELS) {
  if (e.part === 'para') continue;
  const i = e.ax === 'x' ? 2 : 0, lo = e.b[i] + 3, hi = e.b[i + 1] - 3;
  for (const o of e.ops) {
    const dh = o[1] - hi, dl = lo - o[0];
    for (const w of e.rings) if (w.b[i] < o[1] && w.b[i + 1] > o[0]) {
      if (dh > 0) { w.b[i + 1] -= dh; w.ib[i + 1] -= dh; }
      if (dl > 0) { w.b[i] += dl; w.ib[i] += dl; }
    }
    if (dh > 0) o[1] = hi;
    if (dl > 0) o[0] = lo;
  }
}
// рама окна меньше проёма на 50 мм с каждой стороны, у двери низ на полу: в IFC рама размером с проём, а местами шире,
// и на подлёте её контур ложился на контур проёма. Ширина рамы прежняя
for (const e of PANELS) for (const w of e.rings) {
  const i = e.ax === 'x' ? 2 : 0, ov = o => Math.max(0, Math.min(o[1], w.b[i + 1]) - Math.max(o[0], w.b[i])) * Math.max(0, Math.min(o[3], w.b[5]) - Math.max(o[2], w.b[4]));
  const o = e.ops.reduce((a, c) => ov(c) > ov(a) ? c : a, e.ops[0]); if (!o || ov(o) <= 0) continue;
  const g = 1, door = o[2] < 0.5, fw = [w.ib[i] - w.b[i], w.b[i + 1] - w.ib[i + 1], w.ib[4] - w.b[4], w.b[5] - w.ib[5]];
  w.b[i] = o[0] + g; w.b[i + 1] = o[1] - g; w.b[4] = door ? o[2] : o[2] + g; w.b[5] = o[3] - g;
  w.ib[i] = w.b[i] + fw[0]; w.ib[i + 1] = w.b[i + 1] - fw[1]; w.ib[4] = w.b[4] + fw[2]; w.ib[5] = w.b[5] - fw[3];
}
// Летящие детали не проходят сквозь друг друга (Максим 26.10). Стены опускают краном сверху прямо на место, почти разом,
// сначала дальние от зрителя: сверху они друг друга не задевают. Стены из теста «Из чертежа в дом»
const MONT0 = ['НС-104', 'НС-103', 'НС-105', 'НС-102', 'НС-106', 'НС-101', 'НС-107', 'НС-108', 'ВС-101', 'ВС-102', 'ВС-104', 'ВС-103', 'НС-113', 'НС-112', 'НС-111', 'НС-110', 'НС-109'].map(m => PAN[m]);
// окантовка кровли: парапеты и стенки перепада опускают сверху на место вместе с окнами, сначала дальние от зрителя
const EDGE = [...PARAS, PAN['НС-114'], PAN['НС-115']].sort((a, b) => depthAt(VW.se, centre(b.b)) - depthAt(VW.se, centre(a.b)));
const WSEQ = WINS.slice().sort((a, b) => depthAt(VW.se, centre(b.b)) - depthAt(VW.se, centre(a.b)));   // окна тоже от дальних
const EDGES = new Set(EDGE);
const PLOT = [-62, 344, -54, 348];

/* ---------- завод: конвейер ---------- */
const L1 = 4, L2 = 5, L3 = 5, PT = L1 + L2 + L3;   // слои на рисунке завода утрированы: бетон, утеплитель, бетон
const NB = 7, PER = 5;                               // в стеллаже 7 пачек по 5 панелей дома
const FO = -100;                                     // завод сдвинут к дому: Алексино уже прежней модели
const PAD = [458 + FO, 782 + FO, -14, 214];
const slotY = s => 112 + (NB - 1 - s) * 14;
const RACK = s => [719 + FO, 769 + FO, slotY(s), slotY(s) + 10, GZ, GZ + 50];
const SX = [496, 558, 620, 682, 744].map(x => x + FO);   // посты: борт, бетон, утеплитель, бетон, выход
const SCENE = [...corners(HB), ...corners([PAD[0], PAD[1], PAD[2], PAD[3], GZ, GZ + 52]), ...corners([PLOT[0], PLOT[1], PLOT[2], PLOT[3], GZ, GZ])];
const HOUSE_PTS = corners(HB);
const MONT = MONT0.slice().sort((a, b) => depthAt(VW.sw, centre(b.b)) - depthAt(VW.sw, centre(a.b)));
const PSEQ = [...MONT, ...EDGE], PIDX = new Map(PSEQ.map((e, k) => [e, k]));

/* ---------- время ---------- */
const HOLD = 0.8;
// Прокрутка по отрезкам сюжета: [конец отрезка по p, доля]. Щелчок колеса около 100 px. Паузы, где ничего не движется, 0.
// Сохранённый вариант на 30 щелчков: backups/etapy-variants/saved-alexino-30. Здесь проект, фундамент с заводом и монтаж
// короче (Максим 26.10: «половина анимации на первые два пункта»), остальное как там. Доли — px из варианта на 2390 px
const SEGS = [
  [0.16, 250],     // проект: оси и дом чертежом
  [0.2, 100],      // камера сверху в изометрию
  [0.36, 350],     // фундамент контуром и бетоном, завод
  [0.4, 0],        // пауза
  [0.48, 250],     // монтаж: стены краном сверху почти разом
  [0.5, 120],      // завод уходит, камера подъезжает и разворачивается на юго-восток
  [0.56, 270],     // закладные рентгеном
  [0.6, 0],        // пауза
  [0.76, 390],     // плита перекрытия: стойки, контур, сетка и бетон внахлёст
  [0.8, 0],        // пауза
  [0.896, 360],    // окна и окантовка кровли разом
  [0.944, 150],    // мембрана
  [0.96, 30],      // фановая труба
  [1, 120]         // фасад
];
// весь блок 4000 px, около 40 щелчков (Максим 26.10 выбрал из 40 и 45); доли растягиваются пропорционально
{ const sum = SEGS.reduce((a, g) => a + g[1], 0); for (const g of SEGS) g[1] *= 4000 / sum; }
const WARP = []; { let x = 0, a = 0; for (const g of SEGS) { WARP.push([a, g[0], x, x + g[1]]); x += g[1]; a = g[0]; } }
const SCROLL_PX = WARP[WARP.length - 1][3];
function storyP(q) {   // доля прокрутки → время сюжета
  const x = q * SCROLL_PX;
  for (const [a, b, x0, x1] of WARP) if (x1 > x0 && x <= x1) return lerp(a, b, (x - x0) / (x1 - x0));
  return 1;
}
const FLY = ease;
const stageT = (p, i) => ramp(i / ANIMATED, (i + HOLD) / ANIMATED, p);

/* ---------- кадр: что рисуем ---------- */
let ITEMS = [], GROUND = [], OVER = [];
let POST = null;   // правка всех тел кадра после сборки: прозрачность на рентгене
function item(b, o) { const it = Object.assign({ cb: b, mode: 'solid', a: 1, fillA: 1 }, o); ITEMS.push(it); return it; }
function prism(C, o) {
  const a = [1e9, -1e9, 1e9, -1e9, 1e9, -1e9];
  for (const p of C) { a[0] = Math.min(a[0], p[0]); a[1] = Math.max(a[1], p[0]); a[2] = Math.min(a[2], p[1]); a[3] = Math.max(a[3], p[1]); a[4] = Math.min(a[4], p[2]); a[5] = Math.max(a[5], p[2]); }
  return item(a, Object.assign({ prism: C }, o));
}
const ground = g => GROUND.push(Object.assign({ color: GHOST, dash: false, a: 1, close: true }, g));
const line = (from, to, o = {}) => OVER.push(Object.assign({ from, to, color: INK, a: 1, dash: false }, o));
const over = (pts, o) => OVER.push(Object.assign({ pts, color: INK, a: 1, dash: false }, o));
const rectZ = (b, z) => [[b[0], b[2], z], [b[1], b[2], z], [b[1], b[3], z], [b[0], b[3], z]];
const boxPts = b => [[b[0], b[2], b[4]], [b[1], b[2], b[4]], [b[1], b[3], b[4]], [b[0], b[3], b[4]], [b[0], b[2], b[5]], [b[1], b[2], b[5]], [b[1], b[3], b[5]], [b[0], b[3], b[5]]];
function rotX(pts, hy, hz, ang) { const c = Math.cos(ang), s = Math.sin(ang); return pts.map(([x, y, z]) => { const dy = y - hy, dz = z - hz; return [x, hy + dy * c - dz * s, hz + dy * s + dz * c]; }); }
function discPts(p, r = 3, n = 16) { const o = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; o.push([p[0] + r * Math.cos(a), p[1] + r * Math.sin(a), p[2]]); } return o; }

let LIFT = 0;   // монтаж: доля волны стен. Пачки стеллажа кран поднимает вверх той же волной, а стены в это время опускаются на дом
function rack(stored, a) {   // стеллаж: пачки встают с завода, на монтаже улетают вверх и растворяются, первой сделанная последней
  for (let s = 0; s < NB; s++) {
    const al = clamp(stored - s, 0, 1), L = seq(LIFT, NB - 1 - s, NB, 0.6); if (al <= 0 || L >= 1) continue;
    const r = RACK(s), dz = 90 * ease(L) + 6 * (1 - ease(al));   // появляясь, пачка мягко оседает на место
    item([r[0], r[1], r[2], r[3], r[4] + dz, r[5] + dz], { a: a * al * (1 - ramp(0.4, 1, L)) });
  }
}
function gate(x, a, busy, pourZ) {
  item([x - 2, x + 2, 9, 12, GZ, GZ + 44], { a }); item([x - 2, x + 2, 84, 87, GZ, GZ + 44], { a });
  item([x - 3, x + 3, 9, 87, GZ + 44, GZ + 48], { a });
  if (pourZ !== null) { item([x - 6, x + 6, 38, 58, GZ + 30, GZ + 44], { a }); if (busy) line([x, 48, GZ + 30], [x, 48, pourZ], { a }); }
}
function factory(f, A) {   // один поддон едет по линии ровно, без остановок, у каждого поста панель прибавляет слой.
  // На выходе встаёт и одним плавным движением уезжает в дальний слот стеллажа, следом стеллаж добирает остальные пачки.
  // Поддон и панель одинарными линиями: одна плоскость и одна коробка, без бортов, плит утеплителя и точек (Максим 26.10)
  item([464 + FO, 778 + FO, 18, 21, GZ, GZ + 3], { a: A }); item([464 + FO, 778 + FO, 75, 78, GZ, GZ + 3], { a: A });
  const x = lerp(SX[0], SX[4], ease(ramp(0, 0.6, f))), pos = (x - SX[0]) / (SX[1] - SX[0]);   // pos: 0 у борта, 4 на выходе
  const b1 = ramp(0.7, 1.3, pos), b2 = ramp(1.7, 2.3, pos), b3 = ramp(2.7, 3.3, pos), h = L1 * b1 + L2 * b2 + L3 * b3;
  gate(SX[0], A, false, null); gate(SX[1], A, b1 > 0 && b1 < 1, GZ + 3 + h); gate(SX[2], A, false, null); gate(SX[3], A, b3 > 0 && b3 < 1, GZ + 3 + h);
  const k = ramp(0.6, 0.85, f), fill = ramp(0.85, 1, f);
  if (f > 0) item([x - 29, x + 29, 20, 76, GZ + 3, GZ + 3], { a: A, top: true });   // поддон: плоскость без толщины, шире панели на 4 с боков, чтобы линии не слипались
  if (f > 0 && k <= 0) item([x - 25, x + 25, 23, 73, GZ + 3, GZ + 3 + h], { a: A, top: h < 0.01 });   // панель одной коробкой
  else if (k > 0 && k < 1) {   // встаёт и едет в слот: поворот и переезд внахлёст, к концу толщина как у пачки, подмены не видно
    const th = lerp(PT, 10, ease(ramp(0.3, 1, k))), m = ease(ramp(0.25, 1, k));
    const C = rotX(boxPts([x - 25, x + 25, 23, 73, GZ + 3, GZ + 3 + th]), 73, GZ + 3, -Math.PI / 2 * ease(ramp(0, 0.6, k)));
    prism(C.map(q => [q[0], q[1] + (slotY(0) - 73) * m, q[2] - 3 * m]), { a: A });
  }
  rack(f >= 1 ? NB : (k >= 1 ? 1 : 0) + (NB - 1) * fill, A);   // панель стала первой пачкой, остальные появляются по очереди
}

/* ---------- этап «Проект фундамента и панелей»: оси и дом чертежом ---------- */
// По осям 1–4 и А–Г из IFC пунктиром проступает весь дом снизу вверх по кадру: фундамент, панели с проёмами, плиты, парапеты
const AXN = Object.values(HS.axes).map(l => ({ a: [l[0][0] * SC, l[0][1] * SC], b: [l[1][0] * SC, l[1][1] * SC] }));
let SCAN = [0, 0];   // низ и верх дома на экране, для проявления чертежа
function project(t, fade) {
  const a = 1 - fade, k = ramp(0, 0.4, t);
  AXN.forEach((x, i) => {
    const w = seq(k, i, AXN.length, 0.3); if (w <= 0) return;
    ground({ pts: [[x.b[0], x.b[1], GZ], [x.a[0], x.a[1], GZ]], close: false, dash: true, part: ease(w), a });
    if (w >= 1) { const dx = x.a[0] - x.b[0], dy = x.a[1] - x.b[1], L = Math.hypot(dx, dy); ground({ pts: discPts([x.a[0] + dx / L * 6, x.a[1] + dy / L * 6, GZ], 6, 20), a }); }   // кружок оси
  });
  const sy = ease(ramp(0.3, 1, t)); if (sy <= 0) return;
  const o = { mode: 'ghost', fillA: 0, a, scan: lerp(SCAN[0], SCAN[1], sy) };
  for (const e of els) item(e.b, Object.assign({ e: e.kind === 'panel' ? e : null }, o));
}

/* ---------- фундамент: опалубка по контуру, сетка, бетон идёт фронтом через всю плиту, опалубку снимают ---------- */
const FOUT = outline(FOUND.map(e => e.b));
const sweepRange = rs => { let a = 1e9, b = -1e9; for (const r of rs) { a = Math.min(a, r[0] + r[2]); b = Math.max(b, r[1] + r[3]); } return [a - 2, b + 2]; };
function boards(sides, z0, z1, a) {   // борта опалубки снаружи контура
  for (const { a: p, b: q, n } of sides) {
    const x0 = Math.min(p[0], q[0]), x1 = Math.max(p[0], q[0]), y0 = Math.min(p[1], q[1]), y1 = Math.max(p[1], q[1]);
    if (n[1]) item([x0 - 4, x1 + 4, n[1] < 0 ? y0 - 4 : y0, n[1] < 0 ? y0 : y0 + 4, z0, z1], { a });
    else item([n[0] < 0 ? x0 - 4 : x0, n[0] < 0 ? x0 : x0 + 4, y0, y1, z0, z1], { a });
  }
}
function meshOn(rects, z, k, front) {   // сетка через 16: прутки вдоль и поперёк растут одновременно, у плиты один путь
  if (k <= 0) return;
  const f = ease(k);
  for (const r of rects) {
    const segs = [];
    for (let y = Math.ceil((r[2] - 8) / 16) * 16 + 8; y < r[3]; y += 16) segs.push([[r[0], y, z], [lerp(r[0], r[1], f), y, z]]);
    for (let x = Math.ceil((r[0] - 8) / 16) * 16 + 8; x < r[1]; x += 16) segs.push([[x, r[2], z], [x, lerp(r[2], r[3], f), z]]);
    if (segs.length) item([r[0], r[1], r[2], r[3], z, z], { a: 1, draw: drawMesh, segs, front });
  }
}
function frontLine(rects, s, z) { for (const r of rects) { const xa = Math.max(r[0], s - r[3]), xb = Math.min(r[1], s - r[2]); if (xb > xa) line([xa, s - xa, z], [xb, s - xb, z]); } }
function foundation(t) {   // появляется контур и сразу идёт бетон фронтом, без бортов и сетки; после заливки контур растворяется
  const tr = ramp(0, 0.3, t), rs = FOUND.map(e => e.b), pw = ramp(0.15, 0.9, t), [s0, s1] = sweepRange(rs), s = lerp(s0, s1, ease(pw));
  const ca = 1 - ramp(0.9, 1, t);   // после заливки контур растворяется
  if (tr > 0 && ca > 0) for (const l of FOUT.loops) ground({ pts: l.map(p => [p[0], p[1], GZ]), color: INK, part: tr, a: ca });
  if (pw > 0) {
    for (const e of [...FOUND, ...FLOOR]) { e.s.on = true; if (pw < 1) e.s.cut = s; }
    if (pw < 1) frontLine(FLOOR.map(e => e.b), s, 0);
  }
}

/* ---------- этап «Перекрытие»: две монолитные плиты на разных высотах и рёбра перепада ---------- */
// Под навес над террасой ставят стойки и щит, сетка, бетон идёт фронтом, стойки снимают. Бортов по краю плит нет:
// окантовка крыши появляется один раз, парапетами на окнах и кровле (Максим 26.10)
// В конце видны закладные внутри коробки
const LOUT = outline(LOW.map(e => e.b)), HOUT = outline(HIGH.map(e => e.b));
const ROOF_RS = [...LOW, ...HIGH].map(e => e.b);
const PROPS = []; for (const y of [20, 64, 108, 152, 196]) PROPS.push([295, y]);
function slab(t) {
  const st = ramp(0, 0.2, t) * (1 - ramp(0.88, 1, t));   // стойки и щит под навесом
  if (st > 0) { for (const [x, y] of PROPS) item([x - 1, x + 1, y - 1, y + 1, GZ, 66], { a: st }); item([288, 301.2, 8.8, 217.4, 66, 68], { a: st }); }
  const tr = ramp(0, 0.3, t), m = ramp(0.05, 0.5, t), pw = ramp(0.25, 0.85, t), [s0, s1] = sweepRange(ROOF_RS), s = lerp(s0, s1, ease(pw));   // внахлёст
  // контур плиты держим до конца заливки: бортов нет, и без него сетка у края висит обрывками; потом он растворяется
  const ca = 1 - ramp(0.85, 1, t);   // после заливки контур растворяется, а не пропадает разом
  if (tr > 0 && ca > 0) { for (const l of LOUT.loops) ground({ pts: l.map(p => [p[0], p[1], 68]), color: INK, part: tr, a: ca }); for (const l of HOUT.loops) ground({ pts: l.map(p => [p[0], p[1], 78]), color: INK, part: tr, a: ca }); }
  if (m > 0 && pw < 1) { meshOn(LOW.map(e => e.b), 62.5, m, pw > 0 ? s : null); meshOn(HIGH.map(e => e.b), 72.5, m, pw > 0 ? s : null); }
  if (pw > 0) {
    for (const e of ROOF) { e.s.on = true; if (pw < 1) e.s.cut = s; }
    if (pw < 1) { frontLine(LOW.map(e => e.b), s, 62); frontLine(HIGH.map(e => e.b), s, 72); }
  }
}

/* ---------- закладные под коммуникации (вариант З2), в конце перекрытия: коробка становится пунктиром, как схема сетей ---------- */
// Канализация и вода выходят через фундамент с запада, кабель с юга, выпуски с заглушками. Трассы условные: плана сетей нет
const dist3 = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
const len3 = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += dist3(pts[i - 1], pts[i]); return L; };
function cut3(pts, f) {
  if (f >= 1) return pts;
  let need = len3(pts) * f; const out = [pts[0]];
  for (let i = 1; i < pts.length && need > 0; i++) {
    const a = pts[i - 1], b = pts[i], d = dist3(a, b);
    if (d <= need) { out.push(b); need -= d; } else { const k = need / d; out.push([lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]); need = 0; }
  }
  return out;
}
function along(pts, q) {
  let s = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = dist3(pts[i - 1], pts[i]), e = dist3(pts[i - 1], q);
    if (Math.abs(e + dist3(q, pts[i]) - d) < 1e-6) return (s + e) / len3(pts);
    s += d;
  }
  return 1;
}
function net(list, w, pts, t0, dur, end) { const n = { w, pts, t: [t0, t0 + dur], end }; list.push(n); return n; }
function branch(list, from, pts, dur, end) { return net(list, from.w, pts, lerp(from.t[0], from.t[1], along(from.pts, pts[0])), dur, end); }
function norm(list) { const m = Math.max(...list.map(n => n.t[1])); for (const n of list) n.t = [n.t[0] / m, n.t[1] / m]; }
const NETS = [], BOARD = [32, 48, 0, 4, 30, 50], FAN = [100, 150];   // щит на южной стене, фановая труба через низкую кровлю
let INP_T = 0;
{
  const sew = net(NETS, 2.4, [[-2.8, 150, -6.4], [8, 150, -6.4], [8, 150, 1], [100, 150, 1]], 0.06, 0.2);
  branch(NETS, sew, [[60, 150, 1], [60, 232, 1], [60, 232, 8]], 0.08, 'dot');
  net(NETS, 2.4, [[100, 150, 1], [230, 150, 1], [230, 150, 8]], sew.t[1], 0.16, 'dot');
  net(NETS, 2.4, [[100, 150, 1], [100, 150, 58]], sew.t[1], 0.12);   // стояк к кровле
  const wat = net(NETS, 1.6, [[-2.8, 130, -6.4], [8, 130, -6.4], [8, 130, 1], [110, 130, 1]], 0.09, 0.2);
  branch(NETS, wat, [[70, 130, 1], [70, 222, 1], [70, 222, 14]], 0.08, 'dot');
  net(NETS, 1.6, [[110, 130, 1], [220, 130, 1], [220, 130, 14]], wat.t[1], 0.14, 'dot');
  const inp = net(NETS, 1, [[40, -6.4, -5], [40, 2, -5], [40, 2, 30]], 0.04, 0.1);
  const r1 = net(NETS, 1, [[40, 2, 50], [40, 2, 56], [116, 2, 56], [116, 282, 56], [4, 282, 56], [4, 2, 56], [40, 2, 56]], inp.t[1] + 0.03, 0.36);
  for (const [x, y, s] of [[80, 2, 'y'], [4, 60, 'x'], [4, 230, 'x'], [60, 282, 'y'], [116, 240, 'x']]) branch(NETS, r1, [[x, y, 56], [x, y, 14]], 0.05, s);
  const link = branch(NETS, r1, [[116, 100, 56], [126, 100, 56]], 0.03);
  const r2 = net(NETS, 1, [[126, 100, 56], [126, 34, 56], [276, 34, 56], [276, 192, 56], [126, 192, 56], [126, 100, 56]], link.t[1], 0.3);
  for (const [x, y, s] of [[200, 34, 'y'], [276, 120, 'x'], [200, 192, 'y'], [126, 160, 'x']]) branch(NETS, r2, [[x, y, 56], [x, y, 14]], 0.05, s);
  norm(NETS); INP_T = inp.t[1];
}
function sockPts(p, s, r = 2.6) {
  const [x, y, z] = p;
  return s === 'x' ? [[x, y - r, z - r], [x, y + r, z - r], [x, y + r, z + r], [x, y - r, z + r]] : [[x - r, y, z - r], [x + r, y, z - r], [x + r, y, z + r], [x - r, y, z + r]];
}
function lay(list, f) {
  const lines = [], marks = [];
  for (const n of list) {
    const k = ramp(n.t[0], n.t[1], f); if (k <= 0) continue;
    lines.push({ pts: cut3(n.pts, ease(k)), w: n.w });
    if (k >= 1 && n.end) { const p = n.pts[n.pts.length - 1]; marks.push({ p, pts: n.end === 'dot' ? discPts(p) : sockPts(p, n.end) }); }
  }
  return { lines, marks };
}
function stubs(k) {   // выпуски из фундамента с заглушками: канализация и вода с запада, кабель с юга
  if (k <= 0) return;
  const e = ease(k), zc = -6.4;
  for (const [y, r, L] of [[150, 3, 10], [130, 1.6, 8]]) {
    const x = -2.8 - L * e;
    item([x, -2.8, y - r, y + r, zc - r, zc + r], { util: true });
    item([x - 1.2, x, y - r - 0.6, y + r + 0.6, zc - r - 0.6, zc + r + 0.6], { util: true });
  }
  const y = -6.4 - 8 * e;
  item([38.4, 41.6, y, -6.4, -6.6, -3.4], { util: true }); item([37.8, 42.2, y - 1.2, y, -7.2, -2.8], { util: true });
}
function fanPipe(k) {   // фановая труба над низкой кровлей
  if (k <= 0) return;
  const z = 62 + 14 * ease(k);
  item([FAN[0] - 3, FAN[0] + 3, FAN[1] - 3, FAN[1] + 3, 62, z], { util: true });
  if (k >= 1) item([FAN[0] - 4.5, FAN[0] + 4.5, FAN[1] - 4.5, FAN[1] + 4.5, z, z + 1.6], { util: true });
}
function zaklXray(t, back = 0) {
  const g = ramp(0, 0.14, t) * (1 - back), na = 1 - back;
  if (g > 0) POST = it => { if (it.util) return; it.mode = 'ghost'; it.fillA *= 1 - g; };
  const f = ramp(0.1, 0.97, t);
  stubs(ramp(0, 0.08, f));
  if (na > 0) {
    const { lines, marks } = lay(NETS, f);
    for (const l of lines) over(l.pts, { w: l.w, a: na });
    const ba = ramp(INP_T - 0.03, INP_T, f) * na;
    if (ba > 0) for (const F of [FACE.top(BOARD), FACE.front(BOARD), FACE.side(BOARD)]) over(F, { close: true, fill: true, a: ba });
    for (const m of marks) over(m.pts, { close: true, fill: true, a: na });
  }
}

/* ---------- этап «Окна и кровля»: окна подлетают к проёмам, встают парапеты, по плитам раскатывается мембрана ---------- */
function flyWindow(w, k) {   // окно подлетает к проёму с улицы по пунктиру
  const out = 46 * (1 - FLY(k)) * (w.pan ? w.pan.ext : 1), off = w.ax === 'x' ? [out, 0, 0] : [0, out, 0];
  const sh = b => [b[0] + off[0], b[1] + off[0], b[2] + off[1], b[3] + off[1], b[4], b[5]];
  item(sh(w.b), { w, cur: sh(w.b), inner: sh(w.ib), target: w.b, a: ramp(0, 0.15, k), draw: drawWinFly });
}
// мембрана внутри парапетов: по наружному краю плиты отступаем, чтобы не зайти под парапет
function membraneRects(parts, out) {
  const onEdge = (x0, y0, x1, y1) => out.sides.some(({ a, b }) => Math.abs(a[0] - b[0]) < EPS ? Math.abs(x0 - a[0]) < EPS && Math.abs(x1 - a[0]) < EPS && Math.max(y0, Math.min(a[1], b[1])) < Math.min(y1, Math.max(a[1], b[1])) : Math.abs(y0 - a[1]) < EPS && Math.abs(y1 - a[1]) < EPS && Math.max(x0, Math.min(a[0], b[0])) < Math.min(x1, Math.max(a[0], b[0])));
  return parts.map(e => {
    const r = e.b.slice(0, 4), d = 3.6;
    return [onEdge(r[0], r[2], r[0], r[3]) ? r[0] + d : r[0], onEdge(r[1], r[2], r[1], r[3]) ? r[1] - d : r[1], onEdge(r[0], r[2], r[1], r[2]) ? r[2] + d : r[2], onEdge(r[0], r[3], r[1], r[3]) ? r[3] - d : r[3], e.b[5] + 0.3];
  });
}
const MEMB = [...membraneRects(LOW, LOUT), ...membraneRects(HIGH, HOUT)];

/* ---------- сюжет ---------- */
function state(p) {
  const t1 = stageT(p, 0), t2 = stageT(p, 1), t3 = stageT(p, 2), t4 = stageT(p, 3), t5 = stageT(p, 4);
  setView(viewAt(p));
  CAM = mixCam(fitCam(SCENE, FIT), fitCam(HOUSE_PTS, FIT), ease(ramp(0.5, 0.625, t3)));   // встали стены: камера подъезжает к дому и разворачивается
  { let a = 1e9, b = -1e9; for (const q of HOUSE_PTS) { const y = P(q[0], q[1], q[2])[1]; a = Math.min(a, y); b = Math.max(b, y); } SCAN = [b + 2, a - 2]; }
  const facA = 1 - ramp(0.45, 0.6, t3);
  const fade = ramp(0, 0.2, t2);   // чертёж гаснет, когда начинают фундамент
  if (t1 > 0 && fade < 1) project(t1, fade);
  foundation(t2);   // фундамент и завод идут одновременно, весь этап
  LIFT = ramp(0, 0.5, t3);
  MONT.forEach((e, k) => { e.u = seq(LIFT, k, MONT.length, 0.6); });   // стены краном сверху почти разом
  const roofK = ramp(0, 0.6, t5);   // окна и окантовка кровли встают одновременно
  EDGE.forEach((e, k) => { e.u = seq(roofK, k, EDGE.length, 0.6); });   // окантовка почти разом, от дальних
  if (facA > 0) {
    ground({ pts: rectZ(PAD, GZ), dash: true, a: facA });
    ground({ pts: rectZ(PLOT, GZ), dash: true, a: facA });
    factory(ramp(0.04, 0.96, t2), facA);
  }
  for (const e of PSEQ) {   // стены и окантовку опускают краном сверху на место
    const u = e.u; if (u <= 0) continue;
    const s = e.s; s.on = true;
    if (u < 1) { s.off = [0, 0, (EDGES.has(e) ? 40 : 70) * (1 - FLY(u))]; s.a = ramp(0, 0.3, u); }
  }
  if (t3 > 0.625) zaklXray(ramp(0.625, 1, t3), ramp(0, 0.12, t4));   // закладные на монтаже, когда встали стены; схема уходит на перекрытии
  if (t4 > 0) slab(t4);
  WSEQ.forEach((w, k) => {
    const kk = seq(roofK, k, WSEQ.length, 0.6);
    w.done = kk >= 1; if (kk > 0 && kk < 1) flyWindow(w, kk);
  });
  const mb = ramp(0.6, 0.9, t5);
  if (mb > 0) for (const r of MEMB) item([r[0], lerp(r[0] + 0.6, r[1], ease(mb)), r[2], r[3], r[4], r[4]], { top: true });
  fanPipe(ramp(0.9, 1, t5));
}

/* ---------- геометрия экрана ---------- */
function hull(pts) {
  const Q = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (Q.length < 3) return Q;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of Q) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = Q.length - 1; i >= 0; i--) { const p = Q[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  lo.pop(); up.pop(); return lo.concat(up);
}
function overlap(A, B, tol = 0.5) {
  for (const poly of [A, B]) for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], nx = b[1] - a[1], ny = a[0] - b[0], L = Math.hypot(nx, ny);
    if (L < 1e-9) continue;
    let p0 = 1e18, p1 = -1e18, q0 = 1e18, q1 = -1e18;
    for (const p of A) { const d = (p[0] * nx + p[1] * ny) / L; if (d < p0) p0 = d; if (d > p1) p1 = d; }
    for (const q of B) { const d = (q[0] * nx + q[1] * ny) / L; if (d < q0) q0 = d; if (d > q1) q1 = d; }
    if (p1 < q0 + tol || q1 < p0 + tol) return false;
  }
  return true;
}
function rel(A, B) {   // -1: A дальше и рисуется раньше, 1: B раньше, 0: не ясно. Дальше значит дальше по направлению взгляда
  let r = 0;
  const vote = v => { if (!v || r === 2) return; r = r && r !== v ? 2 : v; };
  if (Math.abs(FX) > 1e-3) vote(A[0] >= B[1] - EPS ? (FX > 0 ? -1 : 1) : B[0] >= A[1] - EPS ? (FX > 0 ? 1 : -1) : 0);
  if (Math.abs(FY) > 1e-3) vote(A[2] >= B[3] - EPS ? (FY > 0 ? -1 : 1) : B[2] >= A[3] - EPS ? (FY > 0 ? 1 : -1) : 0);
  if (SE > 1e-3) vote(A[5] <= B[4] + EPS ? -1 : B[5] <= A[4] + EPS ? 1 : 0);
  return r === 2 ? 0 : r;
}
function order(items) {
  const n = items.length;
  const hp = items.map(e => hull(corners(e.cb).map(q => P(q[0], q[1], q[2]))));
  const bb = hp.map(h => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const p of h) { a = Math.min(a, p[0]); c = Math.max(c, p[0]); b = Math.min(b, p[1]); d = Math.max(d, p[1]); } return [a, b, c, d]; });
  const adj = items.map(() => []), indeg = new Array(n).fill(0);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const a = bb[i], c = bb[j];
    if (a[2] <= c[0] || c[2] <= a[0] || a[3] <= c[1] || c[3] <= a[1]) continue;
    if (!overlap(hp[i], hp[j])) continue;
    const r = rel(items[i].cb, items[j].cb);
    if (r < 0) { adj[i].push(j); indeg[j]++; } else if (r > 0) { adj[j].push(i); indeg[i]++; }
  }
  const depth = items.map(e => { const b = e.cb; return CE * (FX * (b[0] + b[1]) + FY * (b[2] + b[3])) / 2 - SE * (b[4] + b[5]) / 2; });
  const out = [], used = new Array(n).fill(false);
  let ready = []; for (let i = 0; i < n; i++) if (!indeg[i]) ready.push(i);
  while (out.length < n) {
    if (!ready.length) { let best = -1; for (let i = 0; i < n; i++) if (!used[i] && (best < 0 || indeg[i] < indeg[best] || (indeg[i] === indeg[best] && depth[i] > depth[best]))) best = i; ready.push(best); }
    ready.sort((p, q) => depth[q] - depth[p]);
    const i = ready.shift(); if (used[i]) continue; used[i] = true; out.push(items[i]);
    for (const j of adj[i]) if (!used[j] && --indeg[j] === 0) ready.push(j);
  }
  return out;
}

/* ---------- рисование ---------- */
// видимые грани коробки зависят от стороны, с которой смотрим
const xf = b => FX > 0 ? b[0] : b[1], yf = b => FY > 0 ? b[2] : b[3];
const FACE = {
  top: b => [[b[0], b[2], b[5]], [b[1], b[2], b[5]], [b[1], b[3], b[5]], [b[0], b[3], b[5]]],
  front: b => { const y = yf(b); return [[b[0], y, b[4]], [b[1], y, b[4]], [b[1], y, b[5]], [b[0], y, b[5]]]; },
  side: b => { const x = xf(b); return [[x, b[2], b[4]], [x, b[3], b[4]], [x, b[3], b[5]], [x, b[2], b[5]]]; }
};
const PFACES = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
function path(pts, close = true) { const q = pts.map(v => P(v[0], v[1], v[2])); ctx.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) ctx.lineTo(q[i][0], q[i][1]); if (close) ctx.closePath(); }
function seg(a, b) { const p = P(a[0], a[1], a[2]), q = P(b[0], b[1], b[2]); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }
function part(pts, f, close = true) {
  const Q = close ? pts.concat([pts[0]]) : pts;
  if (f >= 0.999) return Q;
  let L = 0; for (let i = 1; i < Q.length; i++) L += Math.hypot(Q[i][0] - Q[i - 1][0], Q[i][1] - Q[i - 1][1]);
  let need = L * f; const out = [Q[0]];
  for (let i = 1; i < Q.length && need > 0; i++) {
    const d = Math.hypot(Q[i][0] - Q[i - 1][0], Q[i][1] - Q[i - 1][1]);
    if (d <= need) { out.push(Q[i]); need -= d; } else { const t = need / d; out.push([Q[i - 1][0] + (Q[i][0] - Q[i - 1][0]) * t, Q[i - 1][1] + (Q[i][1] - Q[i - 1][1]) * t]); need = 0; }
  }
  return out;
}
const cur = e => { const b = e.b, o = e.s.off; return [b[0] + o[0], b[1] + o[0], b[2] + o[1], b[3] + o[1], b[4] + o[2], b[5] + o[2]]; };
function clipHalf(s, z, ahead) {   // полуплоскость x + y ≤ s (залито) или ≥ s (впереди фронта) на высоте z
  const L = 3000, q = s / 2, A = P(q - L, q + L, z), B = P(q + L, q - L, z), C = ahead ? P(q + L, q + L, z) : P(q - L, q - L, z);
  const vx = C[0] - (A[0] + B[0]) / 2, vy = C[1] - (A[1] + B[1]) / 2;
  ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(B[0] + vx, B[1] + vy); ctx.lineTo(A[0] + vx, A[1] + vy); ctx.closePath(); ctx.clip();
}
const add3 = (a, n) => [a[0] + n[0], a[1] + n[1], a[2] + n[2]];
function fillStroke(pts, fa, a) { ctx.beginPath(); path(pts); ctx.globalAlpha = fa; ctx.fill(); ctx.globalAlpha = a; ctx.stroke(); }
function rectOn(ax, plane, r) {   // прямоугольник в плоскости стены: r = [вдоль0, вдоль1, низ, верх]
  return ax === 'x' ? [[plane, r[0], r[2]], [plane, r[1], r[2]], [plane, r[1], r[3]], [plane, r[0], r[3]]] : [[r[0], plane, r[2]], [r[1], plane, r[2]], [r[1], plane, r[3]], [r[0], plane, r[3]]];
}
function drawOpenings(e, b, it) {   // проёмы на видимой грани панели: откосы и окно видны только в границах проёма
  const ax = e.ax, plane = ax === 'x' ? xf(b) : yf(b), th = ax === 'x' ? b[1] - b[0] : b[3] - b[2];
  const into = ax === 'x' ? [FX > 0 ? th : -th, 0, 0] : [0, FY > 0 ? th : -th, 0];
  const dx = b[0] - e.b[0], dy = b[2] - e.b[2], dz = b[4] - e.b[4], dt = ax === 'x' ? dy : dx;
  const jambHi = ax === 'x' ? FY > 0 : FX > 0;   // какой откос смотрит на нас
  const fa = it.a * it.fillA, col = it.mode === 'solid' ? INK : GHOST;
  for (const o of e.ops) {
    const R = rectOn(ax, plane, [o[0] + dt, o[1] + dt, o[2] + dz, o[3] + dz]);
    ctx.save(); ctx.beginPath(); path(R); ctx.clip();
    ctx.fillStyle = CELL; ctx.beginPath(); path(R); ctx.globalAlpha = fa; ctx.fill(); ctx.globalAlpha = it.a;
    if (SE > 0.02) fillStroke([R[0], R[1], add3(R[1], into), add3(R[0], into)], fa, it.a);   // подоконник
    fillStroke(jambHi ? [R[1], R[2], add3(R[2], into), add3(R[1], into)] : [R[0], R[3], add3(R[3], into), add3(R[0], into)], fa, it.a);
    for (const w of e.rings) if (w.done) {   // окно в проёме: рама и стекло
      const wb = w.b, ib = w.ib, wp = ax === 'x' ? xf(wb) + dx : yf(wb) + dy;
      ctx.strokeStyle = col; ctx.beginPath();
      path(rectOn(ax, wp, ax === 'x' ? [wb[2] + dy, wb[3] + dy, wb[4] + dz, wb[5] + dz] : [wb[0] + dx, wb[1] + dx, wb[4] + dz, wb[5] + dz]));
      path(rectOn(ax, wp, ax === 'x' ? [ib[2] + dy, ib[3] + dy, ib[4] + dz, ib[5] + dz] : [ib[0] + dx, ib[1] + dx, ib[4] + dz, ib[5] + dz]));
      ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath(); path(R); ctx.stroke();
  }
}
function drawWinFly(it) {   // окно на подлёте: тонкая рама, стекло в штриховку, пунктир к проёму
  const w = it.w, b = it.cur, ib = it.inner, t = it.target, ax = w.ax;
  ctx.save(); ctx.globalAlpha = it.a; ctx.lineWidth = LW;
  ctx.setLineDash(DASH); ctx.strokeStyle = GHOST; ctx.beginPath();
  for (const [x, y, z] of [[t[0], t[2], t[4]], [t[1], t[3], t[4]]]) seg([x, y, z], [x + b[0] - t[0], y + b[2] - t[2], z]);
  ctx.stroke(); ctx.setLineDash([]); ctx.strokeStyle = INK; ctx.fillStyle = CELL;
  for (const f of ['top', 'front', 'side']) { ctx.beginPath(); path(FACE[f](b)); ctx.fill(); ctx.stroke(); }
  const plane = ax === 'x' ? xf(b) : yf(b), r = ax === 'x' ? [ib[2], ib[3], ib[4], ib[5]] : [ib[0], ib[1], ib[4], ib[5]], G = rectOn(ax, plane, r);
  ctx.beginPath(); path(G); ctx.stroke();
  ctx.save(); ctx.beginPath(); path(G); ctx.clip(); ctx.beginPath();
  for (let u = r[0] + 2.2; u < r[1]; u += 4.4) seg(rectOn(ax, plane, [u, u, r[2], r[3]])[0], rectOn(ax, plane, [u, u, r[2], r[3]])[3]);
  ctx.stroke(); ctx.restore();
  ctx.restore();
}
function drawMesh(it) {   // прутки сетки одним путём, видны только впереди фронта бетона
  ctx.save(); ctx.globalAlpha = it.a; ctx.strokeStyle = GHOST; ctx.setLineDash([]); ctx.lineWidth = LW;
  if (it.front != null) clipHalf(it.front, it.segs[0][0][2], true);
  ctx.beginPath(); for (const [a, b] of it.segs) seg(a, b); ctx.stroke(); ctx.restore();
}
function drawDots(b, [nx, ny, a]) {
  ctx.fillStyle = INK; ctx.globalAlpha *= a;
  const r = 0.8 / U;
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const q = P(lerp(b[0], b[1], (i + 0.5) / nx), lerp(b[2], b[3], (j + 0.5) / ny), b[5]);
    ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, Math.PI * 2); ctx.fill();
  }
}
function drawItem(it) {
  if (it.draw) { it.draw(it); return; }
  const col = it.mode === 'solid' ? INK : GHOST;
  ctx.save();
  if (it.cut != null) clipHalf(it.cut, it.cb[5], false);
  if (it.scan != null) { ctx.beginPath(); ctx.rect(-1e4, it.scan, 3e4, 3e4); ctx.clip(); }
  ctx.lineWidth = LW; ctx.setLineDash(it.mode === 'ghost' ? DASH : []); ctx.strokeStyle = col; ctx.fillStyle = CELL; ctx.globalAlpha = it.a;
  if (it.prism) {
    const C = it.prism, cen = C.reduce((a, p) => [a[0] + p[0] / 8, a[1] + p[1] / 8, a[2] + p[2] / 8], [0, 0, 0]);
    for (const f of PFACES) {
      const q = f.map(i => C[i]), fc = q.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4, a[2] + p[2] / 4], [0, 0, 0]);
      if (-(fc[0] - cen[0]) * FX * CE - (fc[1] - cen[1]) * FY * CE + (fc[2] - cen[2]) * SE <= 1e-6) continue;   // грань смотрит от нас
      fillStroke(q, it.a * it.fillA, it.a);
    }
  } else {
    const faces = it.top ? ['top'] : ['top', 'front', 'side'];
    for (const f of faces) fillStroke(FACE[f](it.cb), it.a * it.fillA, it.a);
  }
  if (it.e && it.e.ops && it.e.ops.length) drawOpenings(it.e, it.cb, it);
  if (it.dots) drawDots(it.cb, it.dots);
  ctx.restore();
}
function drawGround() {
  for (const g of GROUND) {
    if (g.a <= 0.001) continue;
    const scr = g.pts.map(q => P(q[0], q[1], q[2]));
    const pp = g.part !== undefined ? part(scr, g.part, g.close) : (g.close ? scr.concat([scr[0]]) : scr);
    ctx.globalAlpha = g.a; ctx.strokeStyle = g.color; ctx.setLineDash(g.dash ? DASH : []);
    ctx.beginPath(); ctx.moveTo(pp[0][0], pp[0][1]); for (let i = 1; i < pp.length; i++) ctx.lineTo(pp[i][0], pp[i][1]); ctx.stroke();
  }
  ctx.setLineDash([]); ctx.globalAlpha = 1;
}
function drawOver() {
  for (const l of OVER) {
    if (l.a <= 0.001) continue;
    ctx.globalAlpha = l.a; ctx.strokeStyle = l.color; ctx.setLineDash(l.dash ? DASH : []); ctx.lineWidth = LW * (l.w || 1);
    ctx.beginPath(); if (l.pts) path(l.pts, !!l.close); else seg(l.from, l.to);
    if (l.fill) { ctx.fillStyle = CELL; ctx.fill(); }
    ctx.stroke();
  }
  ctx.setLineDash([]); ctx.globalAlpha = 1; ctx.lineWidth = LW;
}

let P_now = 0, dirty = true;
function render() {
  dirty = false;
  const p = RM ? Math.min(1, (Math.min(ANIMATED - 1, Math.floor(P_now * ANIMATED)) + HOLD + 0.01) / ANIMATED) : P_now;
  ITEMS = []; GROUND = []; OVER = []; POST = null;
  for (const e of els) e.s = { on: false, mode: 'solid', a: 1, fillA: 1, off: [0, 0, 0], cut: null };
  state(p);
  for (const e of els) if (e.s.on && e.s.a > 0.001) item(cur(e), { e: e.kind === 'panel' ? e : null, mode: e.s.mode, a: e.s.a, fillA: e.s.fillA, cut: e.s.cut });
  if (POST) for (const it of ITEMS) POST(it);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = CELL; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(U * DPR, 0, 0, U * DPR, 0, 0);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = LW;
  drawGround();
  for (const it of order(ITEMS)) drawItem(it);
  drawOver();
  syncRows(P_now);
  syncWeek(P_now);
}
function setP(p) { if (p !== P_now) { P_now = p; dirty = true; } }

function sizeAll() {
  U = document.documentElement.clientWidth / 1440;
  document.documentElement.style.setProperty('--u', U + 'px');
  DPR = Math.min(2, window.devicePixelRatio || 1);
  LW = 1 / U; DASH = [3 / U, 3 / U];
  const w = Math.round(CELL_W * U * DPR), h = Math.round(CELL_H * U * DPR);
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  dirty = true;
}

/* ---------- прокрутка: Lenis и закрепление ScrollTrigger ---------- */
sizeAll();
gsap.registerPlugin(ScrollTrigger);
let lenis = null, TRIG = null;
if (FORCE === null) {
  lenis = new Lenis({ lerp: 0.1 });
  lenis.on('scroll', ScrollTrigger.update);
  TRIG = ScrollTrigger.create({
    trigger: '#etapy', start: 'top top', end: () => '+=' + SCROLL_PX, pin: true,
    onUpdate: self => setP(storyP(self.progress))
  });
} else setP(FORCE);
gsap.ticker.add(time => { if (lenis) lenis.raf(time * 1000); if (dirty) render(); rollWeek(time * 1000); skip.classList.toggle('off', P_now >= 1); });
gsap.ticker.lagSmoothing(0);
// пропуск анимации: дом быстро собирается до конца и встаёт в фасад, блок остаётся на экране
const skip = $('etSkip');
if (!TRIG) skip.hidden = true;
skip.addEventListener('click', () => { if (TRIG) lenis.scrollTo(TRIG.end, RM ? { immediate: true } : { duration: 2.5, easing: ease }); });
let rsT = 0;
addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(() => { sizeAll(); ScrollTrigger.refresh(); }, 120); });

window.__etapy = { setP: p => { setP(p); render(); }, get p() { return P_now; }, get week() { return wkTarget; }, get weekShown() { return wkShown; }, els, WINS, storyP, SCROLL_PX };
})();
