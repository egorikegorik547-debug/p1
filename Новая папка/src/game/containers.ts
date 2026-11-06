// @ts-nocheck
import * as THREE from 'three';
import { mkTex, speckle, TEX } from './bunkerTextures';
import { CONT, CONT_LOOT, TRACE, ZONES } from './data';

/* ============================================================
   Модели контейнеров сети бункеров.
   Локальная система координат: x — по ширине (от центра), y — вверх от пола, z — от задней стенки (0) к лицевой стороне (d).
   Почему раньше «багались» текстуры, и что исправлено:
   – не осталось компланарных (лежащих в одной плоскости) граней: крышка всегда больше корпуса, а детали на фасаде выступают минимум на 6 мм;
   – UV корпуса масштабируются по реальным размерам (текстура не тянется и не «плывёт»);
   – контейнеры ставятся только в свободные места (проверка пересечений с реквизитом — см. game.ts).
   ============================================================ */

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);

/* ---------- материалы ---------- */
const MC = {};
const cached = (k, f) => MC[k] || (MC[k] = f());
const std = (color, r = 0.6, m = 0.3, map = null) => cached(`s${color}_${r}_${m}_${map ? map.uuid : ''}`, () => new THREE.MeshStandardMaterial({ color, roughness: r, metalness: m, map }));
const basic = c => cached('b' + c, () => new THREE.MeshBasicMaterial({ color: c }));
const emis = (c, col, i = 1) => cached(`e${c}_${col}_${i}`, () => new THREE.MeshStandardMaterial({ color: c, emissive: col, emissiveIntensity: i, roughness: 0.5 }));

/* ---------- процедурные текстуры сейфов и шкафов ---------- */
function scratches(x, w, h, n, a = 0.18) {
  x.lineWidth = 1;
  for (let i = 0; i < n; i++) {
    x.strokeStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * a})`;
    const sx = Math.random() * w, sy = Math.random() * h;
    x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + rnd(-26, 26), sy + rnd(-6, 6)); x.stroke();
  }
}
function rust(x, w, h, n, rgb = '110,62,30', a = 0.25) {
  for (let i = 0; i < n; i++) {
    const px = Math.random() * w, py = Math.random() * h, r = rnd(5, 18), g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, `rgba(${rgb},${rnd(a * 0.4, a)})`); g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill();
  }
}
function bodyTex(c1, c2, brush = 0.06) {
  return mkTex(128, 128, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, c1); g.addColorStop(1, c2);
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.strokeStyle = `rgba(255,255,255,${brush})`; for (let i = 0; i < w; i += 3) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); }
    speckle(x, w, h, 2200, 0.12); scratches(x, w, h, 14); rust(x, w, h, 2, '100,60,30', 0.14);
  });
}
const star = (x, cx, cy, R, r) => { x.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? r : R, a = -Math.PI / 2 + i * Math.PI / 5; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); x.fill(); };
// дверца с фаской, рамкой, заклёпками и табличкой
function doorTex(o) {
  return mkTex(256, 256, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, o.c1); g.addColorStop(1, o.c2);
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    speckle(x, w, h, 3000, 0.12);
    x.lineWidth = 6; x.strokeStyle = 'rgba(255,255,255,.22)'; x.beginPath(); x.moveTo(5, h - 5); x.lineTo(5, 5); x.lineTo(w - 5, 5); x.stroke();
    x.strokeStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.moveTo(w - 5, 5); x.lineTo(w - 5, h - 5); x.lineTo(5, h - 5); x.stroke();
    x.lineWidth = 3; x.strokeStyle = o.line; x.strokeRect(22, 22, w - 44, h - 44);
    if (o.ornate) { x.strokeRect(34, 34, w - 68, h - 68); x.beginPath(); for (const [a, b] of [[22, 22], [w - 22, 22], [22, h - 22], [w - 22, h - 22]]) { x.moveTo(a, b); x.lineTo(a + (a < w / 2 ? 12 : -12), b + (b < h / 2 ? 12 : -12)); } x.stroke(); }
    x.fillStyle = o.rivet; for (const px of [12, w - 12]) for (const py of [12, h / 2, h - 12]) { x.beginPath(); x.arc(px, py, 3.2, 0, TAU); x.fill(); }
    if (o.label) {
      x.fillStyle = o.labelBg || 'rgba(0,0,0,.35)'; x.fillRect(w / 2 - 54, 42, 108, 26);
      x.fillStyle = o.labelFg; x.font = 'bold 17px sans-serif'; x.textAlign = 'center'; x.fillText(o.label, w / 2, 61);
    }
    if (o.star) { x.fillStyle = o.starC; star(x, w / 2, 205, 24, 10); }
    scratches(x, w, h, 26, 0.2); rust(x, w, h, 3, o.rust || '100,60,30', 0.14);
  }, false);
}
let T = null;
function tex() {
  if (T) return T;
  T = {
    ironBody: bodyTex('#6d737a', '#575d63'), ironDoor: doorTex({ c1: '#7a8087', c2: '#5c6268', line: 'rgba(0,0,0,.38)', rivet: '#2d3034', label: 'СЕЙФ', labelFg: '#e4e8ea' }),
    blackBody: bodyTex('#202226', '#121316', 0.04), blackDoor: doorTex({ c1: '#2a2c31', c2: '#16171a', line: 'rgba(210,215,220,.28)', rivet: '#9aa2a8', label: 'СЕЙФ-М', labelFg: '#c9d0d6', labelBg: 'rgba(255,255,255,.07)', rust: '60,60,60' }),
    goldBody: bodyTex('#d9b53a', '#9a7316', 0.12), goldDoor: doorTex({ c1: '#e6c24a', c2: '#a87c1a', line: 'rgba(90,60,5,.55)', rivet: '#6b4a0c', label: 'СЕЙФ-Л', labelFg: '#4f3506', labelBg: 'rgba(255,240,170,.35)', ornate: true, star: true, starC: 'rgba(90,60,5,.6)', rust: '120,80,10' }),
    armyBody: bodyTex('#56673f', '#41502f', 0.05),
    armyDoor: mkTex(256, 512, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#5d6f45'); g.addColorStop(1, '#46563a');
      x.fillStyle = g; x.fillRect(0, 0, w, h); speckle(x, w, h, 5000, 0.12);
      x.lineWidth = 5; x.strokeStyle = 'rgba(255,255,255,.16)'; x.beginPath(); x.moveTo(4, h - 4); x.lineTo(4, 4); x.lineTo(w - 4, 4); x.stroke();
      x.strokeStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.moveTo(w - 4, 4); x.lineTo(w - 4, h - 4); x.lineTo(4, h - 4); x.stroke();
      x.fillStyle = 'rgba(15,22,10,.85)'; for (let i = 0; i < 7; i++) x.fillRect(40, 40 + i * 20, w - 80, 8);
      x.fillStyle = '#d8d3a0'; x.font = 'bold 54px sans-serif'; x.textAlign = 'center'; x.fillText('ВС', w / 2, 270);
      x.font = 'bold 22px sans-serif'; x.fillText('№ ' + (10 + ((Math.random() * 80) | 0)), w / 2, 305);
      x.fillStyle = 'rgba(216,211,160,.85)'; star(x, w / 2, 370, 28, 12);
      x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 3; x.strokeRect(18, 18, w - 36, h - 36);
      scratches(x, w, h, 60, 0.28); rust(x, w, h, 6, '120,100,50', 0.16);
      x.fillStyle = 'rgba(190,190,170,.5)'; for (let i = 0; i < 40; i++) x.fillRect(Math.random() * w, Math.random() * h, rnd(1, 4), rnd(1, 3));
    }, false)
  };
  return T;
}

/* ---------- примитивы ---------- */
function boxGeo(w, h, d, tile) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (tile) {
    const uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0] / tile, uv.getY(i) * dims[f][1] / tile); }
  }
  return g;
}
const bx = (g, w, h, d, mat, x, y, z, tile = 0) => { const m = new THREE.Mesh(boxGeo(w, h, d, tile), mat); m.position.set(x, y, z); g.add(m); return m; };
const cz = (g, r, len, mat, x, y, z, seg = 18) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); g.add(m); return m; };
const cy = (g, r, len, mat, x, y, z, seg = 10) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat); m.position.set(x, y, z); g.add(m); return m; };
const tor = (g, r, t, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 24), mat); m.position.set(x, y, z); g.add(m); return m; };

const dark = () => std(0x14161a, 0.6, 0.5), chrome = () => std(0xc9cfd4, 0.25, 0.9), brass = () => std(0xd9b24a, 0.3, 0.85);

// корпус + цоколь: низ корпуса не лежит в плоскости пола
function body(g, w, h, d, mat, tile, plinth = 0.05) {
  bx(g, w - 0.06, plinth, d - 0.06, dark(), 0, plinth / 2, d / 2);
  return bx(g, w, h - plinth, d, mat, 0, plinth + (h - plinth) / 2, d / 2, tile);
}
// деталь на фасаде: z0 — плоскость фасада; выступает не менее чем на t
const onFront = (g, z0, w, h, t, mat, x, y) => bx(g, w, h, t + 0.004, mat, x, y, z0 + t / 2 - 0.002);

// дверца на петле. Pivot-группа: дверца идёт от x=0 в сторону dir, высота 0..dh, толщина 0..th
function hinged(g, o) {
  const pv = new THREE.Group(); pv.position.set(o.hx, o.y0, o.d); pv.userData.keep = true; pv.userData.dir = o.dir; g.add(pv);
  pv.userData.kind = 'door'; if (o.max) pv.userData.max = o.max; if (o.delay) pv.userData.delay = o.delay;
  const m = new THREE.Mesh(boxGeo(o.dw, o.dh, o.th, o.tile || 0), o.mat); m.position.set(o.dir * o.dw / 2, o.dh / 2, o.th / 2); pv.add(m);
  return pv;
}
// откидная крышка: петля у задней кромки (ось X), крышка идёт от z=0 вперёд на глубину ld, толщина lt
function lidPivot(g, o) {
  const pv = new THREE.Group(); pv.position.set(0, o.y0, 0); pv.userData.keep = true; pv.userData.kind = 'lid'; pv.userData.max = o.max || 1.4; g.add(pv);
  const m = new THREE.Mesh(boxGeo(o.lw, o.lt, o.ld, o.tile || 0), o.mat); m.position.set(0, o.lt / 2, o.ld / 2 - 0.0); pv.add(m);
  return pv;
}
// выдвижной ящик картотеки: передняя панель + лоток, уходящий вглубь корпуса
function drawerPivot(g, o) {
  const pv = new THREE.Group(); pv.position.set(o.x, o.y, 0); pv.userData.keep = true; pv.userData.kind = 'drawer'; pv.userData.slide = o.slide; pv.userData.delay = o.delay || 0; g.add(pv);
  const front = new THREE.Mesh(boxGeo(o.w, o.h, 0.06, o.tile || 0), o.mat); front.position.set(0, 0, o.d); pv.add(front);
  const tm = std(0x1d2024, 0.7, 0.5), tl = o.depth;
  bx(pv, o.w - 0.06, 0.02, tl, tm, 0, -o.h * 0.38, o.d - tl / 2 - 0.02);                       // дно
  for (const sx of [-1, 1]) bx(pv, 0.02, o.h * 0.7, tl, tm, sx * (o.w / 2 - 0.05), -o.h * 0.04, o.d - tl / 2 - 0.02);   // боковины
  bx(pv, o.w - 0.06, o.h * 0.7, 0.02, tm, 0, -o.h * 0.04, o.d - tl - 0.02);                    // задник
  return pv;
}
const hbx = (pv, o, w, h, t, mat, fx, fy) => bx(pv, w, h, t + 0.004, mat, o.dir * fx, fy, o.th + t / 2 - 0.002);

// тёмное нутро: видно только при открытой дверце (при закрытой спрятано внутри толщины дверцы)
function interior(g, w, h, d, m, th, col = 0x0b0c0d) {
  bx(g, w - 2 * m, h - 2 * m, 0.02, std(col, 0.9, 0.2), 0, h / 2, d + 0.005);
  for (const f of [0.35, 0.65]) bx(g, w - 2 * m, 0.025, th * 0.6, std(0x30343a, 0.6, 0.5), 0, h * f, d + th * 0.3);
}

/* ============================================================
   Модели
   ============================================================ */
const MODELS = {
  locker(g, [w, h, d], out) {
    body(g, w, h, d, std(0x3f5048, 0.55, 0.55, TEX.metal), 0.9);
    const dm = std(0x4a5c53, 0.5, 0.6, TEX.metal), doors = [];
    for (const sx of [-1, 1]) {
      const o = { hx: sx * (w / 2 - 0.025), y0: 0.09, d, dw: w / 2 - 0.05, dh: h - 0.16, th: 0.05, dir: -sx, mat: dm, tile: 0.9 };
      const pv = hinged(g, o); doors.push(pv);
      for (let k = 0; k < 4; k++) hbx(pv, o, o.dw * 0.6, 0.024, 0.01, dark(), o.dw / 2, h - 0.3 - k * 0.055 - o.y0);
      hbx(pv, o, 0.026, 0.2, 0.03, chrome(), o.dw - 0.04, h * 0.52 - o.y0);
      if (sx < 0) hbx(pv, o, 0.2, 0.07, 0.008, basic(0xdcdcd0), o.dw / 2, h * 0.6 - o.y0);
    }
    interior(g, w, h, d, 0.05, 0.05, 0x101310);
    out.doors = doors;
  },
  crate(g, [w, h, d], out) {
    const bh = h - 0.07;
    bx(g, w, bh, d, std(0xffffff, 0.85, 0.05, TEX.crate), 0, bh / 2, d / 2);
    for (const y of [0.2, 0.55]) bx(g, w + 0.03, 0.05, d + 0.03, dark(), 0, y, d / 2);
    onFront(g, d + 0.015, 0.2, 0.08, 0.01, basic(0xc9b46a), 0, bh * 0.62);
    bx(g, w - 0.14, 0.012, d - 0.14, std(0x0d0b09, 0.95, 0.1), 0, bh + 0.004, d / 2);          // тёмное нутро
    const cm = [0x6b5a3c, 0x4a5a3a, 0x7a3b30, 0x555a60];
    for (let i = 0; i < 5; i++) bx(g, 0.18 + (i % 3) * 0.07, 0.05 + (i % 2) * 0.03, 0.2 + (i % 2) * 0.1, std(cm[i % 4], 0.8, 0.1), -w * 0.3 + i * w * 0.15, bh + 0.03, d * (0.3 + 0.12 * (i % 3)));
    const pv = lidPivot(g, { y0: bh, lw: w + 0.05, lt: 0.07, ld: d + 0.025, mat: std(0x8a7050, 0.8, 0.1, TEX.crate), max: 1.35 });
    out.doors = [pv];
  },
  cabinet(g, [w, h, d], out) {
    body(g, w, h, d, std(0x4c5157, 0.5, 0.6, TEX.metal), 0.9);
    const dm = std(0x5c6268, 0.5, 0.6, TEX.metal), cw = w / 2 - 0.05, ch = (h - 0.12) / 3 - 0.02, drs = [];
    for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) {
      const y = 0.09 + ch / 2 + k * (ch + 0.02);
      const pv = drawerPivot(g, { x: sx * w / 4, y, d, w: cw, h: ch, mat: dm, tile: 0.9, slide: 0.38 + 0.04 * k, delay: 0.1 * (k + (sx > 0 ? 1 : 0) * 0.5), depth: 0.55 });
      const o = { dir: 1, th: 0.03 };
      bx(pv, cw * 0.4, 0.025, 0.034, chrome(), 0, ch * 0.18, d + 0.03 + 0.015);
      bx(pv, cw * 0.3, 0.05, 0.012, basic(0xe2dfcf), 0, -ch * 0.14, d + 0.03 + 0.004);
      drs.push(pv);
    }
    out.doors = drs;
  },
  medcab(g, [w, h, d], out) {
    body(g, w, h, d, std(0xdfe5e2, 0.4, 0.4, TEX.metal), 0.9);
    const dm = std(0xe9eeec, 0.35, 0.3, TEX.metal), doors = [];
    for (const sx of [-1, 1]) {
      const o = { hx: sx * (w / 2 - 0.025), y0: 0.09, d, dw: w / 2 - 0.05, dh: h - 0.16, th: 0.05, dir: -sx, mat: dm, tile: 0.9 };
      const pv = hinged(g, o); doors.push(pv);
      hbx(pv, o, 0.026, 0.2, 0.03, chrome(), o.dw - 0.04, h * 0.5 - o.y0);
      if (sx < 0) { hbx(pv, o, 0.3, 0.085, 0.01, basic(0xd02828), o.dw / 2, h * 0.74 - o.y0); hbx(pv, o, 0.085, 0.3, 0.014, basic(0xd02828), o.dw / 2, h * 0.74 - o.y0); }
      else hbx(pv, o, 0.24, 0.05, 0.008, basic(0xb8c4c0), o.dw / 2, h * 0.3 - o.y0);
    }
    interior(g, w, h, d, 0.05, 0.05, 0x2a3236);
    out.doors = doors;
  },
  fridge(g, [w, h, d], out) {
    body(g, w, h, d, std(0xdde4e6, 0.35, 0.3, TEX.metal), 0.9);
    const fh = h * 0.3, lh = h - fh - 0.2, dm = std(0xe8eef0, 0.3, 0.3, TEX.metal), doors = [];
    const mk = (y0, dh, hy, hh) => {
      const o = { hx: -w / 2 + 0.03, y0, d, dw: w - 0.06, dh, th: 0.08, dir: 1, mat: dm, tile: 0.9, max: 1.9 };
      const pv = hinged(g, o); doors.push(pv);
      hbx(pv, o, 0.03, hh, 0.035, chrome(), o.dw - 0.06, hy - y0);
      return [pv, o];
    };
    mk(h - fh - 0.05, fh, h - fh * 0.5 - 0.1, 0.18);
    const [pv, o] = mk(0.1, lh, 0.1 + lh * 0.72, 0.34);
    for (let i = 0; i < 3; i++) hbx(pv, o, 0.05, 0.05, 0.014, basic([0xd24a3a, 0x3a8ad2, 0xd2c23a][i]), w / 2 - 0.03 - 0.2 + i * 0.1, h * 0.55 + (i % 2) * 0.08 - 0.1);
    interior(g, w, h, d, 0.06, 0.08, 0xcfd8da);
    out.doors = doors;
  },
  toolbox(g, [w, h, d], out) {
    const bh = h - 0.07;
    bx(g, w, bh, d, std(0x8a2f22, 0.5, 0.5, TEX.metal), 0, bh / 2, d / 2, 0.9);
    onFront(g, d + 0.015, 0.34, 0.07, 0.01, basic(0xe8c040), 0, bh * 0.55);
    bx(g, w - 0.12, 0.012, d - 0.12, std(0x16100e, 0.9, 0.2), 0, bh + 0.004, d / 2);
    for (let i = 0; i < 4; i++) bx(g, 0.06, 0.04, 0.28, i % 2 ? chrome() : std(0xd9a02a, 0.5, 0.4), -w * 0.32 + i * w * 0.2, bh + 0.025, d * 0.5);
    const pv = lidPivot(g, { y0: bh, lw: w + 0.04, lt: 0.07, ld: d + 0.02, mat: std(0x6d2419, 0.5, 0.5, TEX.metal), tile: 0.9, max: 1.5 });
    bx(pv, 0.5, 0.05, 0.06, chrome(), 0, 0.09, d / 2); bx(pv, 0.05, 0.1, 0.06, chrome(), -0.25, 0.06, d / 2); bx(pv, 0.05, 0.1, 0.06, chrome(), 0.25, 0.06, d / 2);
    for (const sx of [-0.4, 0.4]) bx(pv, 0.06, 0.12, 0.034, chrome(), sx, 0.0, d + 0.02 + 0.012);
    out.doors = [pv];
  },
  weapon(g, [w, h, d], out) {
    const bh = h - 0.07;
    bx(g, w, bh, d, std(0xffffff, 0.7, 0.2, TEX.ammoCrate), 0, bh / 2, d / 2);
    onFront(g, d, 0.5, 0.1, 0.01, basic(0xe8c040), 0, bh * 0.55);
    for (const sx of [-0.45, 0.45]) { onFront(g, d, 0.1, 0.1, 0.03, chrome(), sx, bh * 0.9); bx(g, 0.04, 0.08, 0.2, dark(), sx > 0 ? w / 2 + 0.02 : -w / 2 - 0.02, bh * 0.6, d / 2); }
    bx(g, w - 0.14, 0.012, d - 0.14, std(0x141a10, 0.95, 0.1), 0, bh + 0.004, d / 2);
    // внутри — «поролон» с вырезами и ствол
    bx(g, w - 0.2, 0.03, d - 0.2, std(0x2c3326, 1, 0), 0, bh + 0.02, d / 2);
    bx(g, w * 0.7, 0.05, 0.06, std(0x15171a, 0.4, 0.8), 0, bh + 0.055, d * 0.4);
    bx(g, 0.18, 0.06, 0.12, std(0x5a4430, 0.7, 0.1), -w * 0.3, bh + 0.06, d * 0.4);
    const pv = lidPivot(g, { y0: bh, lw: w + 0.05, lt: 0.07, ld: d + 0.025, mat: std(0x2b3524, 0.8, 0.3), max: 1.45 });
    out.doors = [pv];
  }
};

/* ---------- запертые контейнеры (дверца на петле) ---------- */
MODELS.safeS = (g, [w, h, d], out) => {
  const t = tex();
  body(g, w, h, d, std(0xffffff, 0.55, 0.65, t.ironBody), 0.6, 0.04);
  const o = { hx: -w / 2 + 0.03, y0: 0.07, d, dw: w - 0.06, dh: h - 0.1, th: 0.06, dir: 1, mat: std(0xffffff, 0.5, 0.7, t.ironDoor) };
  const pv = hinged(g, o), fx = o.dw * 0.5, fy = o.dh * 0.46;
  hbx(pv, o, 0.15, 0.15, 0.014, dark(), fx, fy); cz(pv, 0.062, 0.03, chrome(), fx, fy, o.th + 0.02);
  hbx(pv, o, 0.016, 0.05, 0.034, dark(), fx, fy + 0.04);
  hbx(pv, o, 0.17, 0.028, 0.05, chrome(), fx, fy - 0.12);
  for (const hy of [0.12, o.dh - 0.12]) cy(pv, 0.018, 0.1, dark(), 0, hy, o.th * 0.5);
  interior(g, w, h, d, 0.05, o.th);
  out.doors = [pv];
};
MODELS.safeM = (g, [w, h, d], out) => {
  const t = tex();
  body(g, w, h, d, std(0xffffff, 0.35, 0.8, t.blackBody), 0.8, 0.05);
  const o = { hx: -w / 2 + 0.035, y0: 0.09, d, dw: w - 0.07, dh: h - 0.13, th: 0.07, dir: 1, mat: std(0xffffff, 0.3, 0.85, t.blackDoor) };
  const pv = hinged(g, o), kx = o.dw * 0.72, ky = o.dh * 0.58;
  hbx(pv, o, 0.2, 0.26, 0.016, chrome(), kx, ky);
  hbx(pv, o, 0.15, 0.045, 0.026, emis(0x0b2a14, 0x2dff7a, 1.1), kx, ky + 0.09);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) hbx(pv, o, 0.036, 0.026, 0.034, dark(), kx + (c - 1) * 0.046, ky + 0.025 - r * 0.036);
  hbx(pv, o, 0.34, 0.034, 0.07, chrome(), o.dw * 0.38, o.dh * 0.34);
  hbx(pv, o, 0.07, 0.07, 0.05, chrome(), o.dw * 0.12, o.dh * 0.34);
  for (const hy of [0.16, o.dh * 0.5, o.dh - 0.16]) cy(pv, 0.02, 0.12, chrome(), 0, hy, o.th * 0.5);
  interior(g, w, h, d, 0.06, o.th);
  out.doors = [pv];
};
MODELS.safeG = (g, [w, h, d], out) => {
  const t = tex(), gm = std(0xf2d268, 0.2, 1.0), gd = std(0x8a6410, 0.4, 0.8);
  bx(g, w + 0.08, 0.1, d + 0.08, std(0x4a3810, 0.6, 0.6), 0, 0.05, d / 2);
  bx(g, w, h - 0.17, d, std(0xffffff, 0.3, 0.9, t.goldBody), 0, 0.1 + (h - 0.17) / 2, d / 2, 0.8);
  bx(g, w + 0.07, 0.07, d + 0.07, std(0xe0be4a, 0.25, 0.95, t.goldBody), 0, h - 0.035, d / 2, 0.8);
  const o = { hx: -w / 2 + 0.05, y0: 0.15, d, dw: w - 0.1, dh: h - 0.28, th: 0.09, dir: 1, mat: std(0xffffff, 0.28, 0.9, t.goldDoor) };
  const pv = hinged(g, o), wx = o.dw * 0.55, wy = o.dh * 0.5;
  hbx(pv, o, 0.5, 0.5, 0.016, gd, wx, wy);
  const wheel = new THREE.Group(); wheel.position.set(wx, wy, o.th + 0.06); pv.add(wheel);
  tor(wheel, 0.2, 0.024, gm, 0, 0, 0);
  for (let k = 0; k < 3; k++) bx(wheel, 0.4, 0.028, 0.028, gm, 0, 0, 0).rotation.z = k * Math.PI / 3;
  cz(wheel, 0.055, 0.06, gm, 0, 0, 0, 16);
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3, kn = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), gm); kn.position.set(Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0); wheel.add(kn); }
  hbx(pv, o, 0.14, 0.14, 0.014, dark(), o.dw * 0.5, o.dh * 0.86); cz(pv, 0.05, 0.03, gm, o.dw * 0.5, o.dh * 0.86, o.th + 0.02);
  for (const [px, py] of [[0.08, 0.06], [0.08, 0.94], [0.92, 0.06], [0.92, 0.94]]) cz(pv, 0.028, 0.04, gm, o.dw * px, o.dh * py, o.th + 0.015, 12);
  for (const hy of [0.2, o.dh * 0.5, o.dh - 0.2]) cy(pv, 0.03, 0.16, gm, 0, hy, o.th * 0.5, 12);
  interior(g, w, h, d, 0.1, o.th);
  out.doors = [pv];
};
MODELS.armyLocker = (g, [w, h, d], out) => {
  const t = tex();
  body(g, w, h, d, std(0xffffff, 0.65, 0.45, t.armyBody), 0.8, 0.06);
  const dw = w / 2 - 0.035, dh = h - 0.2, th = 0.035, dm = std(0xffffff, 0.6, 0.5, t.armyDoor), doors = [];
  for (const sx of [-1, 1]) {
    const o = { hx: sx * (w / 2 - 0.025), y0: 0.11, d, dw, dh, th, dir: -sx, mat: dm };
    const pv = hinged(g, o); doors.push(pv);
    hbx(pv, o, 0.03, 0.22, 0.03, chrome(), dw - 0.08, dh * 0.5);
    for (const hy of [0.25, dh * 0.5, dh - 0.25]) cy(pv, 0.016, 0.1, dark(), 0, hy, th * 0.5, 8);
  }
  // навесной замок на проушине правой дверцы (в центре шкафа)
  const R = doors[1], hasp = new THREE.Group();
  bx(R, 0.1, 0.12, 0.02, dark(), -dw + 0.05, dh * 0.5, th + 0.008);
  hasp.position.set(-dw + 0.05, dh * 0.5, th + 0.03); R.add(hasp);
  bx(hasp, 0.09, 0.1, 0.05, brass(), 0, -0.04, 0.02); tor(hasp, 0.032, 0.011, chrome(), 0, 0.03, 0.02);
  out.padlock = hasp;
  interior(g, w, h, d, 0.1, th);
  out.doors = doors;
};

/* ============================================================
   Публичный API
   ============================================================ */
export function buildContainerModel(kind) {
  const D = CONT[kind].d, g = new THREE.Group(), out = { group: g, w: D[0], h: D[1], d: D[2], doors: null, padlock: null };
  (MODELS[kind] || MODELS.locker)(g, D, out);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return out;
}
// плавное открывание дверец: t = 0 (закрыто) … 1 (открыто)
export function setDoorOpen(c, t) {
  if (!c.doors) return;
  c.doors.forEach(pv => {
    const u = pv.userData, dl = u.delay || 0, k = dl ? Math.min(1, Math.max(0, (t - dl) / (1 - dl))) : t;
    if (u.kind === 'lid') pv.rotation.x = -k * (u.max || 1.4);
    else if (u.kind === 'drawer') pv.position.z = k * u.slide;
    else pv.rotation.y = -u.dir * k * (u.max || (c.ckind === 'armyLocker' ? 1.9 : 1.75));
  });
  if (c.padlock) c.padlock.visible = t < 0.05;
}

/* ---------- Лут: тип контейнера × зона ----------
   Вес = вес по типу контейнера × поправка от зоны (0.6…1.8). Чего нет в таблице контейнера — выпадает с минимальным шансом (TRACE):
   в холодильнике на кухне лежат консервы и вода, а патроны — очень редко. */
export function lootWeights(kind, zk) {
  const base = CONT_LOOT[kind] || {}, zl = ZONES[zk] && Object.keys(ZONES[zk].loot).length ? ZONES[zk].loot : null;
  const zmax = zl ? Math.max(...Object.values(zl)) : 1;
  const ids = new Set([...Object.keys(base), ...(zl ? Object.keys(zl) : [])]);
  const w = {};
  for (const id of ids) {
    if (id === 'key' || id === 'note') continue;
    const zf = zl ? 0.6 + 1.2 * ((zl[id] || 0) / zmax) : 1;
    const kw = base[id] !== undefined ? base[id] : TRACE * (zl ? Math.min(2, 0.5 + (zl[id] || 0)) : 1);
    w[id] = kw * zf;
  }
  return w;
}
