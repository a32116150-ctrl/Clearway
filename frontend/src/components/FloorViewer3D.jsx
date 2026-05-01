import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

// ─── Constants ──────────────────────────────────────────────────────────────
const GRID = 180;    // Higher resolution catches thin walls better
const WORLD = 14;     // world-units for the LONGER dimension
const WALL_H = 2.8;    // default wall height (world units) ≈ 2.8m
const DARK = 80;     // LOWER threshold — only true black structural lines
const MIN_NEIGH = 2;      // erosion: 2 keeps more wall pixels (was 3, was too aggressive)
const WALL_COL = 0xdadada;
const FLOOR_BG = 0x111827;

// Real-world scale: WORLD units = real_m metres
// We'll derive real_m from image metadata if available, else default to 10m for the long side
const DEFAULT_REAL_M = 10; // metres for the longer dimension

// ─── Material Defaults ──────────────────────────────────────────────────────
const MAT_DEFAULTS = {
  brickW: 0.24,    // m — standard brick length
  brickH: 0.07,    // m — standard brick height
  brickD: 0.115,   // m — standard brick depth / wall thickness
  mortarJoint: 0.01, // m — mortar joint thickness
  cementPerM3: 7,  // bags of cement per m³ of mortar
  sandPerM3: 0.5,  // m³ of sand per m³ of mortar
  mortarRatio: 0.3, // mortar volume = 30% of brickwork volume
  paintCoverage: 12, // m² per litre of paint
  pricesBrick: 0.35,  // TND per brick
  pricesCement: 18,   // TND per 50kg bag
  pricesSand: 85,     // TND per m³
  pricesPaint: 22,    // TND per litre
  pricesLabour: 35,   // TND per m² of wall (labour)
  wallThickness: 0.2, // m — assumed wall thickness for volume calc
  floorHeight: 2.8,   // m — real storey height
};

// ─── Furniture Catalogue ────────────────────────────────────────────────────
const CATALOGUE = [
  { id: 'door', label: 'Porte', cat: 'STRUCTURE', icon: '🚪' },
  { id: 'window', label: 'Fenêtre', cat: 'STRUCTURE', icon: '🪟' },
  { id: 'wall_custom', label: 'Mur perso', cat: 'STRUCTURE', icon: '🧱' },
  { id: 'sofa', label: 'Canapé', cat: 'SIÈGES', icon: '🛋️' },
  { id: 'chair', label: 'Chaise', cat: 'SIÈGES', icon: '🪑' },
  { id: 'armchair', label: 'Fauteuil', cat: 'SIÈGES', icon: '🪑' },
  { id: 'table', label: 'Table', cat: 'TABLES', icon: '🪵' },
  { id: 'desk', label: 'Bureau', cat: 'TABLES', icon: '🗄️' },
  { id: 'bed', label: 'Lit', cat: 'CHAMBRES', icon: '🛏️' },
  { id: 'wardrobe', label: 'Armoire', cat: 'CHAMBRES', icon: '🗃️' },
  { id: 'toilet', label: 'WC', cat: 'SANITAIRE', icon: '🚽' },
  { id: 'sink', label: 'Lavabo', cat: 'SANITAIRE', icon: '🚿' },
  { id: 'bathtub', label: 'Baignoire', cat: 'SANITAIRE', icon: '🛁' },
  { id: 'shower', label: 'Douche', cat: 'SANITAIRE', icon: '🚿' },
  { id: 'plant', label: 'Plante', cat: 'DÉCO', icon: '🌿' },
];
const CATEGORIES = ['STRUCTURE', 'SIÈGES', 'TABLES', 'CHAMBRES', 'SANITAIRE', 'DÉCO'];

// ─── Furniture Builder ───────────────────────────────────────────────────────
function buildFurniture(type) {
  const g = new THREE.Group();
  g.userData.furnitureType = type;
  const mat = (col, rough = 0.75, metal = 0) =>
    new THREE.MeshStandardMaterial({ color: col, roughness: rough, metalness: metal });
  const box = (w, h, d, col, rough, metal) =>
    new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(col, rough, metal));
  const cyl = (rt, rb, h, seg, col, rough, metal) =>
    new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg ?? 12), mat(col, rough, metal));
  const add = (...meshes) => meshes.forEach(m => { m.castShadow = true; g.add(m); });

  switch (type) {
    case 'door': {
      const panel = box(0.88, WALL_H * 0.98, 0.06, 0x7a4f28); panel.position.set(0, WALL_H * 0.49, 0);
      const fL = box(0.07, WALL_H, 0.1, 0x5c3a1a); fL.position.set(-0.445, WALL_H / 2, 0);
      const fR = fL.clone(); fR.position.set(0.445, WALL_H / 2, 0);
      const fT = box(1.0, 0.08, 0.1, 0x5c3a1a); fT.position.set(0, WALL_H, 0);
      const hdl = cyl(0.025, 0.025, 0.12, 8, 0xd4af37, 0.2, 0.9);
      hdl.rotation.z = Math.PI / 2; hdl.position.set(0.32, WALL_H * 0.45, 0.06);
      add(panel, fL, fR, fT, hdl);
      g.userData.fp = { w: 0.95, d: 0.12 }; break;
    }
    case 'window': {
      const frame = box(1.2, 1.1, 0.1, 0xbbbbbb); frame.position.set(0, 1.25, 0);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.94, 0.03),
        new THREE.MeshStandardMaterial({ color: 0x88ccdd, transparent: true, opacity: 0.35, roughness: 0.05 }));
      glass.position.set(0, 1.25, 0);
      const mH = box(1.02, 0.04, 0.05, 0xaaaaaa); mH.position.set(0, 1.25, 0);
      const mV = box(0.04, 0.94, 0.05, 0xaaaaaa); mV.position.set(0, 1.25, 0);
      add(frame, glass, mH, mV);
      g.userData.fp = { w: 1.2, d: 0.12 }; break;
    }
    case 'sofa': {
      const base = box(2.0, 0.42, 0.88, 0x3b5998); base.position.set(0, 0.21, 0);
      const back = box(2.0, 0.65, 0.22, 0x2e4882); back.position.set(0, 0.76, -0.33);
      const aL = box(0.22, 0.58, 0.88, 0x2e4882); aL.position.set(-0.89, 0.29, 0);
      const aR = aL.clone(); aR.position.set(0.89, 0.29, 0);
      add(base, back, aL, aR);
      [-0.58, 0, 0.58].forEach(x => { const c = box(0.56, 0.14, 0.72, 0x4a6cbf, 0.9); c.position.set(x, 0.49, 0.06); add(c); });
      g.userData.fp = { w: 2.0, d: 0.88 }; break;
    }
    case 'chair': {
      const seat = box(0.5, 0.07, 0.5, 0x9b7740); seat.position.set(0, 0.46, 0);
      const back = box(0.5, 0.52, 0.06, 0x9b7740); back.position.set(0, 0.74, -0.22);
      add(seat, back);
      [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].forEach(([x, z]) => { const l = cyl(0.025, 0.025, 0.46, 6, 0x5c3a1a); l.position.set(x, 0.23, z); add(l); });
      g.userData.fp = { w: 0.5, d: 0.5 }; break;
    }
    case 'armchair': {
      const seat = box(0.82, 0.13, 0.82, 0x7a5c3a); seat.position.set(0, 0.43, 0);
      const back = box(0.82, 0.64, 0.1, 0x6a4c2a); back.position.set(0, 0.81, -0.36);
      const aL = box(0.1, 0.22, 0.82, 0x5c3a1a); aL.position.set(-0.36, 0.54, 0);
      const aR = aL.clone(); aR.position.set(0.36, 0.54, 0);
      const cush = box(0.7, 0.12, 0.68, 0x9a7a5a, 0.9); cush.position.set(0, 0.55, 0.04);
      add(seat, back, aL, aR, cush); g.userData.fp = { w: 0.82, d: 0.82 }; break;
    }
    case 'table': {
      const top = box(1.4, 0.06, 0.8, 0x9b7740, 0.45); top.position.set(0, 0.75, 0); add(top);
      [[-0.62, -0.32], [0.62, -0.32], [-0.62, 0.32], [0.62, 0.32]].forEach(([x, z]) => { const l = box(0.06, 0.72, 0.06, 0x6b5010); l.position.set(x, 0.36, z); add(l); });
      g.userData.fp = { w: 1.4, d: 0.8 }; break;
    }
    case 'desk': {
      const top = box(1.6, 0.05, 0.72, 0xd4c4aa, 0.4); top.position.set(0, 0.76, 0);
      const sL = box(0.05, 0.76, 0.72, 0xc4b498); sL.position.set(-0.775, 0.38, 0);
      const sR = sL.clone(); sR.position.set(0.775, 0.38, 0);
      const draw = box(0.58, 0.18, 0.62, 0xb8a88a); draw.position.set(-0.4, 0.28, 0);
      add(top, sL, sR, draw); g.userData.fp = { w: 1.6, d: 0.72 }; break;
    }
    case 'bed': {
      const frame = box(1.65, 0.25, 2.15, 0x9b7740, 0.65); frame.position.set(0, 0.125, 0);
      const matt = box(1.5, 0.22, 2.0, 0xf5f0e8, 0.95); matt.position.set(0, 0.36, 0);
      const head = box(1.65, 0.75, 0.1, 0x6b5010); head.position.set(0, 0.625, -1.025);
      const blanket = box(1.42, 0.1, 1.35, 0x7a9abf, 0.95); blanket.position.set(0, 0.52, 0.3);
      add(frame, matt, head, blanket);
      [-0.36, 0.36].forEach(x => { const p = box(0.56, 0.1, 0.38, 0xffffff, 0.9); p.position.set(x, 0.53, -0.76); add(p); });
      g.userData.fp = { w: 1.65, d: 2.15 }; break;
    }
    case 'wardrobe': {
      const body = box(1.8, 2.2, 0.62, 0xd4c4a8); body.position.set(0, 1.1, 0);
      const d1 = box(0.86, 2.1, 0.04, 0xc4b498); d1.position.set(-0.455, 1.1, 0.33);
      const d2 = d1.clone(); d2.position.set(0.455, 1.1, 0.33);
      const h1 = cyl(0.02, 0.02, 0.15, 8, 0x888888, 0.2, 0.8); h1.rotation.x = Math.PI / 2; h1.position.set(-0.06, 1.1, 0.36);
      const h2 = h1.clone(); h2.position.set(0.06, 1.1, 0.36);
      add(body, d1, d2, h1, h2); g.userData.fp = { w: 1.8, d: 0.62 }; break;
    }
    case 'toilet': {
      const base = box(0.38, 0.38, 0.6, 0xf0f0f0); base.position.set(0, 0.19, 0.05);
      const tank = box(0.36, 0.4, 0.18, 0xf0f0f0); tank.position.set(0, 0.58, -0.26);
      const lid = box(0.38, 0.04, 0.52, 0xe0e0e0); lid.position.set(0, 0.4, 0.05);
      const seat = box(0.36, 0.03, 0.5, 0xfafafa); seat.position.set(0, 0.38, 0.05);
      add(base, tank, lid, seat); g.userData.fp = { w: 0.38, d: 0.72 }; break;
    }
    case 'sink': {
      const cab = box(0.65, 0.82, 0.5, 0xe8e8e0); cab.position.set(0, 0.41, 0);
      const basin = box(0.5, 0.1, 0.36, 0xffffff, 0.1, 0.15); basin.position.set(0, 0.88, 0);
      const tap = cyl(0.014, 0.014, 0.18, 8, 0xcccccc, 0.15, 0.85); tap.position.set(0, 1.02, -0.05);
      const spout = box(0.04, 0.04, 0.12, 0xcccccc, 0.15, 0.85); spout.position.set(0, 1.04, 0.04);
      add(cab, basin, tap, spout); g.userData.fp = { w: 0.65, d: 0.5 }; break;
    }
    case 'bathtub': {
      const outer = box(1.7, 0.55, 0.82, 0xf5f5f5); outer.position.set(0, 0.275, 0);
      const inner = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.42, 0.64),
        new THREE.MeshStandardMaterial({ color: 0xe8f4f8, roughness: 0.04 }));
      inner.position.set(0, 0.37, 0);
      const tap = cyl(0.022, 0.022, 0.2, 8, 0xcccccc, 0.15, 0.85); tap.position.set(0.65, 0.7, 0);
      add(outer, inner, tap); g.userData.fp = { w: 1.7, d: 0.82 }; break;
    }
    case 'shower': {
      const fl = box(1.0, 0.06, 1.0, 0xdddddd, 0.25); fl.position.set(0, 0.03, 0);
      ['front', 'side'].forEach((_, i) => {
        const w = new THREE.Mesh(new THREE.BoxGeometry(i === 0 ? 1.0 : 0.04, 2.05, i === 0 ? 0.04 : 1.0),
          new THREE.MeshStandardMaterial({ color: 0x88bbdd, transparent: true, opacity: 0.28, roughness: 0 }));
        w.position.set(i === 0 ? 0 : 0.48, 1.025, i === 0 ? 0.48 : 0); g.add(w);
      });
      const head = cyl(0.08, 0.08, 0.02, 12, 0xbbbbbb, 0.2, 0.8); head.position.set(-0.3, 2.05, -0.3);
      const arm = box(0.04, 0.04, 0.35, 0xbbbbbb, 0.2, 0.8); arm.position.set(-0.3, 1.96, -0.12);
      add(fl, head, arm); g.userData.fp = { w: 1.0, d: 1.0 }; break;
    }
    case 'plant': {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.11, 0.28, 14), mat(0xc07a3a));
      pot.position.set(0, 0.14, 0);
      const soil = cyl(0.15, 0.15, 0.04, 12, 0x3d2b0a); soil.position.set(0, 0.3, 0);
      const stem = cyl(0.024, 0.032, 0.44, 8, 0x3a6a20); stem.position.set(0, 0.52, 0);
      add(pot, soil, stem);
      [[0, 0.74, 0, 0.28], [-.18, .62, .1, .2], [.18, .6, -.1, .19], [.05, .87, -.12, .18], [-.1, .8, .15, .2]].forEach(([x, y, z, r]) => {
        const l = new THREE.Mesh(new THREE.SphereGeometry(r, 9, 7), mat(0x2d7a3a, 0.95));
        l.castShadow = true; l.position.set(x, y, z); g.add(l);
      });
      g.userData.fp = { w: 0.4, d: 0.4 }; break;
    }
    case 'wall_custom': {
      const m = box(1, 1, 1, 0xeeeeee, 0.8, 0.05); m.position.set(0, 0.5, 0); add(m);
      g.userData.fp = { w: 1, d: 1 }; break;
    }
  }
  return g;
}

// ─── IMPROVED Wall Analysis ──────────────────────────────────────────────────
// Key fixes vs previous version:
//  1. Lower DARK threshold (80 vs 100) — only catches true black structural lines
//  2. Lower MIN_NEIGH (2 vs 3) — less aggressive erosion, fewer missed wall segments
//  3. Better dilation pass — expands surviving wall blobs back to catch edge pixels
//  4. Returns wall run data for real-world area calculations
function analyzeFloorPlan(img) {
  const aspect = img.naturalWidth / img.naturalHeight;
  let gridW, gridH, worldW, worldD;
  if (aspect >= 1) {
    gridW = GRID; gridH = Math.round(GRID / aspect);
    worldW = WORLD; worldD = WORLD / aspect;
  } else {
    gridW = Math.round(GRID * aspect); gridH = GRID;
    worldW = WORLD * aspect; worldD = WORLD;
  }

  const cv = document.createElement('canvas');
  cv.width = gridW; cv.height = gridH;
  const ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0, gridW, gridH);
  const { data } = ctx.getImageData(0, 0, gridW, gridH);

  const N = gridW * gridH;
  const raw = new Uint8Array(N);

  // Stage 1: Perceptual luma threshold — only very dark pixels
  for (let i = 0; i < N; i++) {
    const p = i * 4;
    // Skip near-white background aggressively
    if (data[p + 3] < 128) continue; // transparent
    const luma = data[p] * 0.299 + data[p + 1] * 0.587 + data[p + 2] * 0.114;
    raw[i] = luma < DARK ? 1 : 0;
  }

  // Stage 2: Lighter erosion — keep more structural pixels
  const eroded = new Uint8Array(N);
  for (let y = 1; y < gridH - 1; y++) {
    for (let x = 1; x < gridW - 1; x++) {
      if (!raw[y * gridW + x]) continue;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          if ((dx || dy) && raw[(y + dy) * gridW + (x + dx)]) n++;
      if (n >= MIN_NEIGH) eroded[y * gridW + x] = 1;
    }
  }

  // Stage 3: Connected-component labelling
  const labels = new Int32Array(N).fill(-1);
  const sizes = [];
  let nextLabel = 0;
  const stack = [];
  for (let start = 0; start < N; start++) {
    if (!eroded[start] || labels[start] !== -1) continue;
    const label = nextLabel++;
    sizes.push(0);
    stack.push(start);
    labels[start] = label;
    while (stack.length) {
      const idx = stack.pop();
      sizes[label]++;
      const x = idx % gridW;
      const candidates = [idx - 1, idx + 1, idx - gridW, idx + gridW];
      for (let c = 0; c < 4; c++) {
        const ni = candidates[c];
        if (ni < 0 || ni >= N) continue;
        if (c < 2 && Math.abs((ni % gridW) - x) > 1) continue;
        if (!eroded[ni] || labels[ni] !== -1) continue;
        labels[ni] = label;
        stack.push(ni);
      }
    }
  }

  // Smaller minimum area to catch short wall segments
  const MIN_AREA = Math.max(12, Math.round(N * 0.0006));
  const thick = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (eroded[i] && labels[i] >= 0 && sizes[labels[i]] >= MIN_AREA)
      thick[i] = 1;
  }

  // Stage 4: Two-pass dilation to recover eroded wall edges
  const dilated1 = new Uint8Array(N);
  for (let y = 1; y < gridH - 1; y++) {
    for (let x = 1; x < gridW - 1; x++) {
      const i = y * gridW + x;
      if (thick[i]) { dilated1[i] = 1; continue; }
      if (!raw[i]) continue;
      if (thick[i - 1] || thick[i + 1] || thick[i - gridW] || thick[i + gridW]) dilated1[i] = 1;
    }
  }
  const final = new Uint8Array(N);
  for (let y = 1; y < gridH - 1; y++) {
    for (let x = 1; x < gridW - 1; x++) {
      const i = y * gridW + x;
      if (dilated1[i]) { final[i] = 1; continue; }
      if (!raw[i]) continue;
      if (dilated1[i - 1] || dilated1[i + 1] || dilated1[i - gridW] || dilated1[i + gridW]) final[i] = 1;
    }
  }

  // Count wall cells for stats
  const wallCells = final.reduce((s, v) => s + v, 0);

  // ─── Rectangular Decomposition ───────────────────────────────────────────
  // Merges adjacent cells into larger editable wall segments
  const segments = [];
  const visited = new Uint8Array(N);

  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const i = y * gridW + x;
      if (!final[i] || visited[i]) continue;

      // Find max width for this row
      let w = 1;
      while (x + w < gridW && final[i + w] && !visited[i + w]) w++;

      // Find max height for this width
      let h = 1;
      let ok = true;
      while (y + h < gridH && ok) {
        for (let dw = 0; dw < w; dw++) {
          const ni = (y + h) * gridW + (x + dw);
          if (!final[ni] || visited[ni]) { ok = false; break; }
        }
        if (ok) h++;
      }

      // Mark as visited
      for (let dh = 0; dh < h; dh++) {
        for (let dw = 0; dw < w; dw++) {
          visited[(y + dh) * gridW + (x + dw)] = 1;
        }
      }

      segments.push({ x, y, w, h });
    }
  }

  return { segments, gridW, gridH, worldW, worldD, wallCells, aspect };
}

// ─── Construction Calculations ───────────────────────────────────────────────
function calcMaterials(wallAreaM2, floorAreaM2, mat) {
  const { brickW, brickH, brickD, mortarJoint, cementPerM3, sandPerM3, mortarRatio,
    paintCoverage, pricesBrick, pricesCement, pricesSand, pricesPaint,
    pricesLabour, wallThickness } = mat;

  // Brick calculation per m² of wall face
  const bricksPerRow = 1 / (brickW + mortarJoint);
  const rowsPerMeter = 1 / (brickH + mortarJoint);
  const bricksPerM2 = bricksPerRow * rowsPerMeter;
  const totalBricks = Math.ceil(wallAreaM2 * bricksPerM2 * 1.08); // 8% wastage

  // Mortar (cement + sand)
  const brickworkVol = wallAreaM2 * wallThickness;
  const mortarVol = brickworkVol * mortarRatio;
  const cementBags = Math.ceil(mortarVol * cementPerM3);
  const sandM3 = +(mortarVol * sandPerM3 * 2).toFixed(2);

  // Paint (both sides of each wall)
  const paintableArea = wallAreaM2 * 2;
  const paintLitres = Math.ceil(paintableArea / paintCoverage * 1.15); // 15% wastage

  // Costs
  const costBricks = totalBricks * pricesBrick;
  const costCement = cementBags * pricesCement;
  const costSand = sandM3 * pricesSand;
  const costPaint = paintLitres * pricesPaint;
  const costLabour = wallAreaM2 * pricesLabour;
  const totalCost = costBricks + costCement + costSand + costPaint + costLabour;

  // Floor
  const floorTileM2 = Math.ceil(floorAreaM2 * 1.1);
  const concreteBags = Math.ceil(floorAreaM2 * 0.15 * 6); // 15cm slab, 6 bags/m³

  return {
    walls: {
      areaM2: +wallAreaM2.toFixed(1),
      bricks: totalBricks,
      bricksPerM2: +bricksPerM2.toFixed(1),
      cementBags,
      sandM3,
      paintLitres,
    },
    floor: { areaM2: +floorAreaM2.toFixed(1), tileM2: floorTileM2, concreteBags },
    costs: {
      bricks: +costBricks.toFixed(0),
      cement: +costCement.toFixed(0),
      sand: +costSand.toFixed(0),
      paint: +costPaint.toFixed(0),
      labour: +costLabour.toFixed(0),
      total: +totalCost.toFixed(0),
    }
  };
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function FloorViewer3D({ imageUrl, onClose }) {
  const mountRef = useRef(null);
  const rendRef = useRef(null);
  const sceneRef = useRef(null);
  const camRef = useRef(null);
  const rafRef = useRef(null);
  const floorRef = useRef(null);
  const placedRef = useRef([]);
  const ghostRef = useRef(null);
  const selRef = useRef(null);
  const selBoxRef = useRef(null);
  const rcRef = useRef(new THREE.Raycaster());

  const orb = useRef({ active: false, px: 0, py: 0, theta: -Math.PI / 5, phi: Math.PI / 3.8, r: 20 });
  const target = useRef(new THREE.Vector3(0, 0, 0));
  const keys = useRef({});
  const walkYaw = useRef(-Math.PI / 5);
  const walkPos = useRef(new THREE.Vector3(0, 1.7, 8));
  const locked = useRef(false);
  const mouseDX = useRef(0);
  const mouseDY = useRef(0);
  const walkPitch = useRef(0);
  const draggingRef = useRef(false);

  const [mode, setMode] = useState('orbit');
  const [placing, setPlacing] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [selScale, setSelScale] = useState(1);
  const [selDim, setSelDim] = useState({ w: 1, h: 1, d: 0.15 });
  const [selRotY, setSelRotY] = useState(0);
  const [sideOpen, setSideOpen] = useState(false); // closed by default to show calculator
  const [stats, setStats] = useState({ cells: 0, grid: '', wallAreaM2: 0, floorAreaM2: 0 });
  const [matConfig, setMatConfig] = useState(MAT_DEFAULTS);
  const [realScale, setRealScale] = useState(DEFAULT_REAL_M); // real metres for longer side
  const [activePanel, setActivePanel] = useState('calc'); // 'calc' | 'furniture' | 'settings'
  const [calcResult, setCalcResult] = useState(null);

  const modeRef = useRef('orbit');
  const placingRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { placingRef.current = placing; }, [placing]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // Recalc whenever stats or matConfig or realScale changes
  useEffect(() => {
    if (!stats.wallAreaM2) return;
    setCalcResult(calcMaterials(stats.wallAreaM2, stats.floorAreaM2, matConfig));
  }, [stats.wallAreaM2, stats.floorAreaM2, matConfig]);

  // ── scene init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);
    rendRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(FLOOR_BG);
    scene.fog = new THREE.FogExp2(FLOOR_BG, 0.025);
    sceneRef.current = scene;

    const cam = new THREE.PerspectiveCamera(52, el.clientWidth / el.clientHeight, 0.05, 200);
    camRef.current = cam;

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const sun = new THREE.DirectionalLight(0xfff8f0, 1.4);
    sun.position.set(10, 16, 8); sun.castShadow = true;
    Object.assign(sun.shadow.mapSize, { width: 2048, height: 2048 });
    const sc = sun.shadow.camera;
    sc.left = sc.bottom = -18; sc.right = sc.top = 18; sc.near = 0.5; sc.far = 60;
    sun.shadow.bias = -0.0008;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xddeeff, 0.4); fill.position.set(-8, 10, -5); scene.add(fill);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 0.3));

    const grid = new THREE.GridHelper(40, 40, 0x334455, 0x223344);
    grid.position.y = -0.02; scene.add(grid);

    new THREE.TextureLoader().load(imageUrl, (tex) => {
      const { segments, gridW, gridH, worldW, worldD, wallCells } = analyzeFloorPlan(tex.image);

      // Stats
      const longSide = Math.max(worldW, worldD);
      const scaleM = realScale / longSide;
      const wallAreaM2 = wallCells * (worldW / gridW) * scaleM * matConfig.floorHeight;
      setStats({ 
        cells: wallCells, 
        grid: `${gridW}×${gridH}`, 
        wallAreaM2: +wallAreaM2.toFixed(1), 
        floorAreaM2: +(worldW * worldD * scaleM * scaleM).toFixed(1) 
      });

      // Floor
      tex.colorSpace = THREE.SRGBColorSpace;
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(worldW, worldD),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 })
      );
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);
      floorRef.current = floor;

      // Walls as individual editable objects
      const cellW = worldW / gridW;
      const cellD = worldD / gridH;
      segments.forEach(seg => {
        const wall = buildFurniture('wall_custom');
        const wx = (seg.x + seg.w / 2) * cellW - worldW / 2;
        const wz = (seg.y + seg.h / 2) * cellD - worldD / 2;
        wall.position.set(wx, 0, wz);
        wall.scale.set(seg.w * cellW, matConfig.floorHeight, seg.h * cellD);
        scene.add(wall);
        placedRef.current.push(wall);
      });
    });

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      const cam = camRef.current;
      if (modeRef.current === 'walk') {
        const sens = 0.002;
        walkYaw.current -= mouseDX.current * sens;
        walkPitch.current = Math.max(-Math.PI/2.2, Math.min(Math.PI/2.2, walkPitch.current - mouseDY.current * sens));
        mouseDX.current = 0;
        mouseDY.current = 0;
        const speed = 0.08;
        const ky = keys.current;
        const dir = new THREE.Vector3();
        if (ky['w'] || ky['arrowup']) dir.z -= 1;
        if (ky['s'] || ky['arrowdown']) dir.z += 1;
        if (ky['a'] || ky['arrowleft']) dir.x -= 1;
        if (ky['d'] || ky['arrowright']) dir.x += 1;
        dir.normalize().applyEuler(new THREE.Euler(0, walkYaw.current, 0));
        walkPos.current.addScaledVector(dir, speed);
        walkPos.current.y = 1.7;
        cam.position.copy(walkPos.current);
        cam.rotation.set(walkPitch.current, walkYaw.current, 0, 'YXZ');
      } else {
        const { theta, phi, r } = orb.current;
        const t = target.current;
        cam.position.set(
          t.x + r * Math.sin(phi) * Math.sin(theta),
          t.y + r * Math.cos(phi),
          t.z + r * Math.sin(phi) * Math.cos(theta)
        );
        cam.lookAt(t);
      }
      renderer.render(scene, cam);
    };
    animate();

    const onResize = () => {
      if (!el) return;
      renderer.setSize(el.clientWidth, el.clientHeight);
      camRef.current.aspect = el.clientWidth / el.clientHeight;
      camRef.current.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [imageUrl]);

  useEffect(() => {
    const onKd = e => { keys.current[e.key.toLowerCase()] = true; };
    const onKu = e => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', onKd);
    window.addEventListener('keyup', onKu);
    return () => { window.removeEventListener('keydown', onKd); window.removeEventListener('keyup', onKu); };
  }, []);

  useEffect(() => {
    const onPLC = () => { locked.current = !!document.pointerLockElement; };
    const onMM = e => { if (locked.current) { mouseDX.current += e.movementX; mouseDY.current += e.movementY; } };
    document.addEventListener('pointerlockchange', onPLC);
    document.addEventListener('mousemove', onMM);
    return () => { document.removeEventListener('pointerlockchange', onPLC); document.removeEventListener('mousemove', onMM); };
  }, []);

  const getFloorHit = useCallback((e) => {
    const el = mountRef.current;
    if (!el || !floorRef.current) return null;
    const rect = el.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    rcRef.current.setFromCamera(ndc, camRef.current);
    const hits = rcRef.current.intersectObject(floorRef.current);
    return hits.length ? hits[0].point : null;
  }, []);

  const clearSelection = useCallback(() => {
    if (selBoxRef.current) { sceneRef.current?.remove(selBoxRef.current); selBoxRef.current = null; }
    selRef.current = null; setSelectedId(null);
  }, []);

  const selectGroup = useCallback((group) => {
    clearSelection();
    selRef.current = group;
    setSelectedId(group.userData.furnitureType);
    setSelScale(group.scale.x);
    setSelDim({ w: group.scale.x, h: group.scale.y, d: group.scale.z });
    setSelRotY(group.rotation.y);
    const box3 = new THREE.Box3().setFromObject(group);
    const size = new THREE.Vector3(); box3.getSize(size);
    const center = new THREE.Vector3(); box3.getCenter(center);
    const helper = new THREE.Mesh(
      new THREE.BoxGeometry(size.x + 0.12, size.y + 0.12, size.z + 0.12),
      new THREE.MeshBasicMaterial({ color: 0x10b981, wireframe: true, transparent: true, opacity: 0.7 })
    );
    helper.position.copy(center);
    sceneRef.current.add(helper);
    selBoxRef.current = helper;
  }, [clearSelection]);

  const onMouseDown = useCallback((e) => {
    if (modeRef.current === 'walk') return;
    if (e.button !== 0) return;
    if (placingRef.current) {
      const pt = getFloorHit(e);
      if (!pt) return;
      const group = buildFurniture(placingRef.current);
      group.position.set(pt.x, 0, pt.z);
      sceneRef.current.add(group);
      placedRef.current.push(group);
    } else {
      const el = mountRef.current;
      const rect = el.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      rcRef.current.setFromCamera(ndc, camRef.current);
      const objects = placedRef.current.flatMap(g => { const out = []; g.traverse(c => { if (c.isMesh) out.push(c); }); return out; });
      const hits = rcRef.current.intersectObjects(objects);
      if (hits.length) {
        let obj = hits[0].object;
        while (obj.parent && !obj.parent.isScene) obj = obj.parent;
        if (placedRef.current.includes(obj)) { selectGroup(obj); draggingRef.current = true; }
      } else {
        clearSelection();
        orb.current.active = true; orb.current.px = e.clientX; orb.current.py = e.clientY;
      }
    }
  }, [getFloorHit, selectGroup, clearSelection]);

  const onMouseMove = useCallback((e) => {
    if (modeRef.current === 'walk') return;
    if (draggingRef.current && selRef.current) {
      const pt = getFloorHit(e);
      if (pt) {
        selRef.current.position.set(pt.x, 0, pt.z);
        if (selBoxRef.current) {
          const box3 = new THREE.Box3().setFromObject(selRef.current);
          const center = new THREE.Vector3(); box3.getCenter(center);
          selBoxRef.current.position.copy(center);
        }
      }
      return;
    }
    if (orb.current.active && !placingRef.current) {
      const dx = e.clientX - orb.current.px; const dy = e.clientY - orb.current.py;
      orb.current.theta -= dx * 0.007;
      orb.current.phi = Math.max(0.12, Math.min(Math.PI * 0.48, orb.current.phi + dy * 0.007));
      orb.current.px = e.clientX; orb.current.py = e.clientY;
    }
    if (placingRef.current) {
      const pt = getFloorHit(e);
      if (pt) {
        if (!ghostRef.current || ghostRef.current.userData.furnitureType !== placingRef.current) {
          if (ghostRef.current) sceneRef.current.remove(ghostRef.current);
          ghostRef.current = buildFurniture(placingRef.current);
          ghostRef.current.traverse(c => { if (c.isMesh) { c.material = c.material.clone(); c.material.transparent = true; c.material.opacity = 0.45; } });
          sceneRef.current.add(ghostRef.current);
        }
        ghostRef.current.position.set(pt.x, 0, pt.z);
      }
    }
  }, [getFloorHit]);

  const onMouseUp = useCallback(() => { orb.current.active = false; draggingRef.current = false; }, []);
  const onWheel = useCallback((e) => { orb.current.r = Math.max(4, Math.min(50, orb.current.r + e.deltaY * 0.02)); }, []);

  const startPlacing = useCallback((id) => { clearSelection(); if (ghostRef.current) { sceneRef.current?.remove(ghostRef.current); ghostRef.current = null; } setPlacing(id); placingRef.current = id; }, [clearSelection]);
  const cancelPlacing = useCallback(() => { if (ghostRef.current) { sceneRef.current?.remove(ghostRef.current); ghostRef.current = null; } setPlacing(null); placingRef.current = null; }, []);

  const updateSelBox = () => {
    if (selBoxRef.current && selRef.current) {
      const box3 = new THREE.Box3().setFromObject(selRef.current);
      const size = new THREE.Vector3(); box3.getSize(size);
      const center = new THREE.Vector3(); box3.getCenter(center);
      selBoxRef.current.geometry.dispose();
      selBoxRef.current.geometry = new THREE.BoxGeometry(size.x + 0.12, size.y + 0.12, size.z + 0.12);
      selBoxRef.current.position.copy(center);
    }
  };

  const applyScale = useCallback((v) => { if (!selRef.current) return; setSelScale(v); selRef.current.scale.setScalar(v); updateSelBox(); }, []);
  const applyDim = useCallback((axis, v) => {
    if (!selRef.current) return;
    setSelDim(prev => { const next = { ...prev, [axis]: v }; selRef.current.scale.set(next.w, next.h, next.d); updateSelBox(); return next; });
  }, []);

  const rotateSelected = useCallback(() => {
    if (!selRef.current) return;
    selRef.current.rotation.y += Math.PI / 4; setSelRotY(selRef.current.rotation.y);
    if (selBoxRef.current) {
      const box3 = new THREE.Box3().setFromObject(selRef.current);
      const size = new THREE.Vector3(); box3.getSize(size);
      const center = new THREE.Vector3(); box3.getCenter(center);
      selBoxRef.current.geometry.dispose();
      selBoxRef.current.geometry = new THREE.BoxGeometry(size.x + 0.12, size.y + 0.12, size.z + 0.12);
      selBoxRef.current.position.copy(center);
    }
  }, []);

  const deleteSelected = useCallback(() => {
    if (!selRef.current) return;
    sceneRef.current.remove(selRef.current);
    placedRef.current = placedRef.current.filter(g => g !== selRef.current);
    if (selBoxRef.current) sceneRef.current.remove(selBoxRef.current);
    selRef.current = null; selBoxRef.current = null; setSelectedId(null);
  }, []);

  const switchMode = useCallback((m) => {
    cancelPlacing(); clearSelection();
    if (m === 'walk') {
      mountRef.current?.requestPointerLock?.();
      camRef.current.up.set(0, 1, 0); // Reset up vector to fix potential tilt
    } else {
      document.exitPointerLock?.();
    }
    setMode(m); modeRef.current = m;
  }, [cancelPlacing, clearSelection]);

  const updateMat = (key, val) => {
    setMatConfig(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  const cr = calcResult;

  return (
    <div style={S.root}>
      {/* Canvas */}
      <div ref={mountRef} style={S.canvas}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove}
        onMouseUp={onMouseUp} onWheel={onWheel} />

      {/* Top bar */}
      <div style={S.topBar}>
        <div style={S.topLeft}>
          <span style={S.logo}>🏗️</span>
          <span style={S.title}>{imageUrl.split('/').pop()?.split('?')[0] ?? 'Plan'}</span>
          <span style={S.badge}>{stats.cells} murs · {stats.grid} · {stats.wallAreaM2} m² murs · {stats.floorAreaM2} m² sol</span>
        </div>
        <div style={S.topRight}>
          <button style={{ ...S.modeBtn, ...(mode === 'orbit' ? S.modeBtnActive : {}) }} onClick={() => switchMode('orbit')}>↻ Orbite</button>
          <button style={{ ...S.modeBtn, ...(mode === 'walk' ? S.modeBtnActive : {}) }} onClick={() => switchMode('walk')}>🚶 Marche</button>
          <button style={S.iconBtn} onClick={() => orb.current.r = Math.max(4, orb.current.r - 2)}>+</button>
          <button style={S.iconBtn} onClick={() => orb.current.r = Math.min(50, orb.current.r + 2)}>−</button>
          <button style={S.iconBtn} onClick={() => { orb.current.theta = -Math.PI / 5; orb.current.phi = Math.PI / 3.8; orb.current.r = 20; }}>⟳</button>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>
      </div>

      {/* Right panel */}
      <div style={S.rightPanel}>
        {/* Panel tabs */}
        <div style={S.panelTabs}>
          {[['calc', '📊 Devis'], ['furniture', '🛋️ Mobilier'], ['settings', '⚙️ Config']].map(([id, label]) => (
            <button key={id} style={{ ...S.tabBtn, ...(activePanel === id ? S.tabBtnActive : {}) }}
              onClick={() => setActivePanel(id)}>{label}</button>
          ))}
        </div>

        {/* Calculator panel */}
        {activePanel === 'calc' && (
          <div style={S.panelBody}>
            <div style={S.panelSection}>
              <div style={S.sectionTitle}>📐 Échelle réelle</div>
              <div style={S.inputRow}>
                <label style={S.inputLabel}>Côté long =</label>
                <input type="number" min={1} max={200} step={0.5}
                  value={realScale}
                  onChange={e => setRealScale(parseFloat(e.target.value) || 10)}
                  style={S.numInput} />
                <span style={S.inputUnit}>m</span>
              </div>
              <div style={S.dimRow}>
                <span style={S.dimBadge}>Sol: {stats.floorAreaM2} m²</span>
                <span style={S.dimBadge}>Murs: {stats.wallAreaM2} m²</span>
              </div>
            </div>

            {cr && <>
              {/* Briques */}
              <div style={S.panelSection}>
                <div style={S.sectionTitle}>🧱 Maçonnerie</div>
                <div style={S.calcGrid}>
                  <div style={S.calcCard}>
                    <div style={S.calcVal}>{cr.walls.bricks.toLocaleString()}</div>
                    <div style={S.calcKey}>Briques</div>
                  </div>
                  <div style={S.calcCard}>
                    <div style={S.calcVal}>{cr.walls.bricksPerM2}</div>
                    <div style={S.calcKey}>Briques/m²</div>
                  </div>
                  <div style={S.calcCard}>
                    <div style={S.calcVal}>{cr.walls.cementBags}</div>
                    <div style={S.calcKey}>Sacs ciment</div>
                  </div>
                  <div style={S.calcCard}>
                    <div style={S.calcVal}>{cr.walls.sandM3}</div>
                    <div style={S.calcKey}>m³ sable</div>
                  </div>
                  <div style={S.calcCard}>
                    <div style={S.calcVal}>{cr.walls.paintLitres}</div>
                    <div style={S.calcKey}>L peinture</div>
                  </div>
                  <div style={S.calcCard}>
                    <div style={S.calcVal}>{cr.floor.concreteBags}</div>
                    <div style={S.calcKey}>Sacs béton sol</div>
                  </div>
                </div>
              </div>

              {/* Coûts */}
              <div style={S.panelSection}>
                <div style={S.sectionTitle}>💰 Estimation coût (TND)</div>
                <div style={S.costList}>
                  {[
                    ['🧱 Briques', cr.costs.bricks],
                    ['🏗️ Ciment', cr.costs.cement],
                    ['🏖️ Sable', cr.costs.sand],
                    ['🎨 Peinture', cr.costs.paint],
                    ['👷 Main-d\'œuvre', cr.costs.labour],
                  ].map(([label, val]) => (
                    <div key={label} style={S.costRow}>
                      <span style={S.costLabel}>{label}</span>
                      <span style={S.costVal}>{val.toLocaleString()} TND</span>
                    </div>
                  ))}
                  <div style={S.costTotal}>
                    <span>TOTAL ESTIMÉ</span>
                    <span style={{ color: '#10b981' }}>{cr.costs.total.toLocaleString()} TND</span>
                  </div>
                </div>
              </div>

              {/* Floor */}
              <div style={S.panelSection}>
                <div style={S.sectionTitle}>🏠 Revêtement sol</div>
                <div style={S.dimRow}>
                  <span style={S.dimBadge}>{cr.floor.tileM2} m² carrelage</span>
                  <span style={S.dimBadge}>{cr.floor.concreteBags} sacs béton</span>
                </div>
              </div>

              <div style={S.disclaimer}>
                ⚠️ Estimation indicative. Consulter un ingénieur pour un devis officiel.
              </div>
            </>}
          </div>
        )}

        {/* Furniture panel */}
        {activePanel === 'furniture' && (
          <div style={S.panelBody}>
            {CATEGORIES.map(cat => {
              const items = CATALOGUE.filter(i => i.cat === cat);
              if (!items.length) return null;
              return (
                <div key={cat}>
                  <div style={S.catLabel}>{cat}</div>
                  <div style={S.catGrid}>
                    {items.map(item => (
                      <button key={item.id}
                        style={{ ...S.itemBtn, ...(placing === item.id ? S.itemBtnActive : {}) }}
                        onClick={() => placing === item.id ? cancelPlacing() : startPlacing(item.id)}>
                        <span style={S.itemIcon}>{item.icon}</span>
                        <span style={S.itemLabel}>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Settings panel */}
        {activePanel === 'settings' && (
          <div style={S.panelBody}>
            <div style={S.panelSection}>
              <div style={S.sectionTitle}>🧱 Dimensions brique (m)</div>
              {[
                ['brickW', 'Longueur', 0.05, 0.4, 0.01],
                ['brickH', 'Hauteur', 0.03, 0.15, 0.005],
                ['brickD', 'Épaisseur', 0.05, 0.3, 0.005],
                ['mortarJoint', 'Joint mortier', 0.005, 0.02, 0.001],
              ].map(([k, label, min, max, step]) => (
                <div key={k} style={S.inputRow}>
                  <label style={S.inputLabel}>{label}</label>
                  <input type="number" min={min} max={max} step={step}
                    value={matConfig[k]} onChange={e => updateMat(k, e.target.value)}
                    style={S.numInput} />
                  <span style={S.inputUnit}>m</span>
                </div>
              ))}
            </div>

            <div style={S.panelSection}>
              <div style={S.sectionTitle}>🏗️ Structure</div>
              {[
                ['wallThickness', 'Épaisseur mur', 0.1, 0.5, 0.05, 'm'],
                ['floorHeight', 'Hauteur étage', 2, 5, 0.1, 'm'],
                ['cementPerM3', 'Ciment/m³ mortier', 4, 12, 0.5, 'sacs'],
              ].map(([k, label, min, max, step, unit]) => (
                <div key={k} style={S.inputRow}>
                  <label style={S.inputLabel}>{label}</label>
                  <input type="number" min={min} max={max} step={step}
                    value={matConfig[k]} onChange={e => updateMat(k, e.target.value)}
                    style={S.numInput} />
                  <span style={S.inputUnit}>{unit}</span>
                </div>
              ))}
            </div>

            <div style={S.panelSection}>
              <div style={S.sectionTitle}>💰 Prix unitaires (TND)</div>
              {[
                ['pricesBrick', 'Brique (unité)', 0, 5, 0.05, 'TND'],
                ['pricesCement', 'Ciment (sac)', 5, 50, 1, 'TND'],
                ['pricesSand', 'Sable (m³)', 20, 200, 5, 'TND'],
                ['pricesPaint', 'Peinture (L)', 5, 80, 1, 'TND'],
                ['pricesLabour', 'Main-d\'œuvre (m²)', 10, 100, 5, 'TND'],
              ].map(([k, label, min, max, step, unit]) => (
                <div key={k} style={S.inputRow}>
                  <label style={S.inputLabel}>{label}</label>
                  <input type="number" min={min} max={max} step={step}
                    value={matConfig[k]} onChange={e => updateMat(k, e.target.value)}
                    style={S.numInput} />
                  <span style={S.inputUnit}>{unit}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Placing banner */}
      {placing && (
        <div style={S.placingBanner}>
          Placement: <strong>{CATALOGUE.find(i => i.id === placing)?.label}</strong>
          &nbsp;— Cliquez sur le sol &nbsp;
          <button style={S.cancelBtn} onClick={cancelPlacing}>Annuler</button>
        </div>
      )}

      {/* Selection panel */}
      {selectedId && (
        <div style={S.selPanel}>
          <div style={S.selTitle}>
            {CATALOGUE.find(i => i.id === selectedId)?.icon}&nbsp;
            {CATALOGUE.find(i => i.id === selectedId)?.label}
          </div>
          {selectedId === 'wall_custom' ? (
            <>
              {[['w', 'Longueur', 0.2, 10, 0.1, 'm'], ['d', 'Épaisseur', 0.05, 1, 0.01, 'cm'], ['h', 'Hauteur', 0.1, 5, 0.1, 'm']].map(([axis, lbl, min, max, step, unit]) => (
                <div key={axis} style={S.selRow}>
                  <label style={S.selLabel}>{lbl}</label>
                  <input type="range" min={min} max={max} step={step}
                    value={axis === 'd' ? selDim.d : axis === 'h' ? selDim.h : selDim.w}
                    onChange={e => applyDim(axis, parseFloat(e.target.value))}
                    style={S.slider} />
                  <span style={S.selVal}>{axis === 'd' ? Math.round(selDim.d * 100) + 'cm' : axis === 'h' ? selDim.h.toFixed(1) + 'm' : selDim.w.toFixed(1) + 'm'}</span>
                </div>
              ))}
            </>
          ) : (
            <div style={S.selRow}>
              <label style={S.selLabel}>Taille</label>
              <input type="range" min={0.3} max={3} step={0.05} value={selScale}
                onChange={e => applyScale(parseFloat(e.target.value))} style={S.slider} />
              <span style={S.selVal}>{selScale.toFixed(2)}×</span>
            </div>
          )}
          <div style={S.selActions}>
            <button style={S.actBtn} onClick={rotateSelected}>↻ 45°</button>
            <button style={{ ...S.actBtn, ...S.actBtnDanger }} onClick={deleteSelected}>🗑</button>
          </div>
        </div>
      )}

      <div style={S.hint}>
        {mode === 'orbit'
          ? '🖱 Glisser = Tourner · Molette = Zoom · ⌨️ WASD = Avancer'
          : '🖱 Clic = Verrouiller · ⌨️ WASD = Se déplacer'}
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  root: { position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', fontFamily: '"Inter",system-ui,sans-serif' },
  canvas: { flex: 1, cursor: 'crosshair', userSelect: 'none' },

  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 52,
    background: 'rgba(10,14,26,0.92)', backdropFilter: 'blur(12px)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 16px', gap: 8, zIndex: 10, borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  topLeft: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 },
  topRight: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 },
  logo: { fontSize: 20 },
  title: { color: '#e0e6f0', fontSize: 13, fontWeight: 600, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  badge: { color: '#6b7a99', fontSize: 11, background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap' },
  modeBtn: { padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.08)', color: '#aab4c8', border: '1px solid rgba(255,255,255,0.1)' },
  modeBtnActive: { background: '#10b981', color: '#fff', border: '1px solid #10b981' },
  iconBtn: { width: 32, height: 32, borderRadius: 8, fontSize: 16, cursor: 'pointer', background: 'rgba(255,255,255,0.08)', color: '#aab4c8', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  closeBtn: { width: 32, height: 32, borderRadius: 8, fontSize: 14, cursor: 'pointer', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' },

  // Right panel
  rightPanel: {
    position: 'absolute', top: 52, right: 0, bottom: 48, width: 310,
    background: 'rgba(8,12,24,0.95)', backdropFilter: 'blur(16px)',
    borderLeft: '1px solid rgba(255,255,255,0.07)',
    display: 'flex', flexDirection: 'column', zIndex: 10,
  },
  panelTabs: { display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 },
  tabBtn: { flex: 1, padding: '10px 4px', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'transparent', color: '#6b7a99', border: 'none', borderBottom: '2px solid transparent' },
  tabBtnActive: { color: '#10b981', borderBottom: '2px solid #10b981' },
  panelBody: { flex: 1, overflowY: 'auto', padding: '0 0 16px' },

  panelSection: { padding: '12px 14px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  sectionTitle: { color: '#a0aec0', fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },

  inputRow: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 },
  inputLabel: { color: '#6b7a99', fontSize: 11, flex: 1, minWidth: 0 },
  numInput: { width: 64, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#e0e6f0', fontSize: 12, padding: '3px 6px', textAlign: 'right' },
  inputUnit: { color: '#4b5568', fontSize: 11, width: 28 },
  dimRow: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 },
  dimBadge: { background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontSize: 11, padding: '3px 10px', borderRadius: 99, fontWeight: 600 },

  calcGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 },
  calcCard: { background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '8px 6px', textAlign: 'center' },
  calcVal: { color: '#10b981', fontSize: 15, fontWeight: 800 },
  calcKey: { color: '#6b7a99', fontSize: 10, marginTop: 2 },

  costList: { display: 'flex', flexDirection: 'column', gap: 0 },
  costRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  costLabel: { color: '#a0aec0', fontSize: 12 },
  costVal: { color: '#e0e6f0', fontSize: 12, fontWeight: 700 },
  costTotal: { display: 'flex', justifyContent: 'space-between', padding: '10px 0 4px', fontSize: 13, fontWeight: 800, color: '#e0e6f0', borderTop: '2px solid rgba(16,185,129,0.3)', marginTop: 4 },

  disclaimer: { margin: '8px 14px 0', color: '#4b5568', fontSize: 10, lineHeight: 1.5, fontStyle: 'italic' },

  catLabel: { color: '#6366f1', fontSize: 10, fontWeight: 700, letterSpacing: 1.2, padding: '12px 14px 6px', textTransform: 'uppercase' },
  catGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: '0 10px' },
  itemBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 6px', borderRadius: 10, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#c0cce0', transition: 'all .15s' },
  itemBtnActive: { background: 'rgba(16,185,129,0.2)', border: '1px solid #10b981', color: '#10b981' },
  itemIcon: { fontSize: 22 },
  itemLabel: { fontSize: 11, fontWeight: 500 },

  placingBanner: { position: 'absolute', bottom: 52, left: '50%', transform: 'translateX(-50%)', background: 'rgba(99,102,241,0.92)', backdropFilter: 'blur(8px)', color: '#fff', padding: '8px 18px', borderRadius: 99, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, zIndex: 10, boxShadow: '0 4px 20px rgba(99,102,241,0.4)', whiteSpace: 'nowrap' },
  cancelBtn: { background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '3px 10px', borderRadius: 99, cursor: 'pointer', fontSize: 12 },

  selPanel: { position: 'absolute', bottom: 58, left: 16, background: 'rgba(10,14,26,0.92)', backdropFilter: 'blur(12px)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 14, padding: '14px 16px', minWidth: 220, zIndex: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' },
  selTitle: { color: '#10b981', fontWeight: 700, fontSize: 14, marginBottom: 12 },
  selRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  selLabel: { color: '#6b7a99', fontSize: 11, width: 60 },
  slider: { flex: 1, accentColor: '#10b981' },
  selVal: { color: '#e0e6f0', fontSize: 11, width: 40, textAlign: 'right' },
  selActions: { display: 'flex', gap: 8 },
  actBtn: { flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.08)', color: '#c0cce0', border: '1px solid rgba(255,255,255,0.1)' },
  actBtnDanger: { background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' },

  hint: { position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', color: 'rgba(160,172,200,0.8)', fontSize: 12, background: 'rgba(10,14,26,0.7)', padding: '5px 14px', borderRadius: 99, backdropFilter: 'blur(8px)', zIndex: 10, whiteSpace: 'nowrap' },
};