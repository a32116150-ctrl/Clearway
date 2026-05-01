import * as THREE from 'three';

// ── Helpers ──────────────────────────────────────────
const box = (w, h, d, color, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.7 })
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};

const cyl = (r, h, color, x = 0, y = 0, z = 0, seg = 8) => {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, h, seg),
    new THREE.MeshStandardMaterial({ color, roughness: 0.6 })
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
};

// ── Furniture catalogue ───────────────────────────────
export const FURNITURE = [
  { type: 'door',     label: 'Porte',    emoji: '🚪', category: 'Structure' },
  { type: 'window',   label: 'Fenêtre',  emoji: '🪟', category: 'Structure' },
  { type: 'chair',    label: 'Chaise',   emoji: '🪑', category: 'Sièges'    },
  { type: 'armchair', label: 'Fauteuil', emoji: '🛋', category: 'Sièges'    },
  { type: 'sofa',     label: 'Canapé',   emoji: '🛋', category: 'Sièges'    },
  { type: 'table',    label: 'Table',    emoji: '🪵', category: 'Tables'    },
  { type: 'desk',     label: 'Bureau',   emoji: '🗂',  category: 'Tables'    },
  { type: 'bed',      label: 'Lit',      emoji: '🛏',  category: 'Chambres'  },
  { type: 'wardrobe', label: 'Armoire',  emoji: '🗄',  category: 'Chambres'  },
  { type: 'toilet',   label: 'WC',       emoji: '🚽', category: 'Sanitaire' },
  { type: 'sink',     label: 'Lavabo',   emoji: '🪠',  category: 'Sanitaire' },
  { type: 'bathtub',  label: 'Baignoire',emoji: '🛁', category: 'Sanitaire' },
  { type: 'shower',   label: 'Douche',   emoji: '🚿', category: 'Sanitaire' },
  { type: 'plant',    label: 'Plante',   emoji: '🌿', category: 'Déco'      },
];

// ── Builders ─────────────────────────────────────────
export function createFurniture(type, ghost = false) {
  const g = new THREE.Group();
  const op = ghost ? 0.45 : 1;

  const applyOp = (mesh) => {
    if (ghost) { mesh.material.transparent = true; mesh.material.opacity = op; }
    return mesh;
  };
  const B = (...a) => applyOp(box(...a));
  const C = (...a) => applyOp(cyl(...a));

  switch (type) {

    case 'door': {
      // Frame
      g.add(B(0.1, 2.1, 0.1, 0x7c5a3a,  0.45, 1.05, 0));
      g.add(B(0.1, 2.1, 0.1, 0x7c5a3a, -0.45, 1.05, 0));
      g.add(B(1.0, 0.1, 0.1, 0x7c5a3a,  0,    2.1,  0));
      // Panel
      g.add(B(0.82, 2.0, 0.05, 0xb08050, 0, 1.0, 0));
      // Handle
      g.add(B(0.05, 0.05, 0.1, 0xd4af37, 0.28, 1.0, 0.05));
      break;
    }

    case 'window': {
      // Frame
      g.add(B(1.2, 0.08, 0.1, 0xd0c8b8, 0, 0.6, 0));
      g.add(B(1.2, 0.08, 0.1, 0xd0c8b8, 0, 1.5, 0));
      g.add(B(0.08, 0.9, 0.1, 0xd0c8b8, -0.56, 1.05, 0));
      g.add(B(0.08, 0.9, 0.1, 0xd0c8b8,  0.56, 1.05, 0));
      // Glass
      const glass = B(1.0, 0.85, 0.04, 0x88ccff, 0, 1.05, 0);
      glass.material.transparent = true;
      glass.material.opacity = ghost ? 0.25 : 0.4;
      g.add(glass);
      // Centre bar
      g.add(B(0.05, 0.85, 0.06, 0xd0c8b8, 0, 1.05, 0));
      break;
    }

    case 'chair': {
      g.add(B(0.5, 0.05, 0.5, 0x8b6543, 0, 0.45, 0));
      g.add(B(0.5, 0.55, 0.05, 0x8b6543, 0, 0.72, -0.22));
      [[-0.2,-0.2],[0.2,-0.2],[-0.2,0.2],[0.2,0.2]].forEach(([x,z]) =>
        g.add(C(0.03, 0.45, 0x6b4f30, x, 0.22, z)));
      break;
    }

    case 'armchair': {
      g.add(B(0.85, 0.12, 0.75, 0x6b7fa0, 0, 0.42, 0));
      g.add(B(0.85, 0.7,  0.1,  0x6b7fa0, 0, 0.77, -0.32));
      g.add(B(0.12, 0.3,  0.75, 0x6b7fa0, -0.36, 0.58, 0));
      g.add(B(0.12, 0.3,  0.75, 0x6b7fa0,  0.36, 0.58, 0));
      [[-0.35,-0.3],[0.35,-0.3],[-0.35,0.3],[0.35,0.3]].forEach(([x,z]) =>
        g.add(C(0.04, 0.36, 0x4a3820, x, 0.18, z)));
      break;
    }

    case 'sofa': {
      g.add(B(2.0, 0.12, 0.85, 0x5a6e8c, 0, 0.42, 0));
      g.add(B(2.0, 0.7,  0.1,  0x5a6e8c, 0, 0.77, -0.37));
      g.add(B(0.15, 0.45, 0.85, 0x5a6e8c, -0.92, 0.65, 0));
      g.add(B(0.15, 0.45, 0.85, 0x5a6e8c,  0.92, 0.65, 0));
      g.add(B(2.0,  0.1,  0.85, 0x4a5e7c, 0, 0.36, 0));
      break;
    }

    case 'table': {
      g.add(B(1.4, 0.05, 0.8, 0xb87850, 0, 0.75, 0));
      [[-0.6,-0.32],[0.6,-0.32],[-0.6,0.32],[0.6,0.32]].forEach(([x,z]) =>
        g.add(C(0.04, 0.75, 0x8b5e3c, x, 0.375, z)));
      break;
    }

    case 'desk': {
      g.add(B(1.6, 0.04, 0.7, 0xa07858, 0, 0.73, 0));
      g.add(B(0.04, 0.73, 0.7, 0x806040, -0.78, 0.365, 0));
      g.add(B(0.04, 0.73, 0.7, 0x806040,  0.78, 0.365, 0));
      g.add(B(1.56, 0.04, 0.7, 0x806040, 0, 0.0, 0));
      break;
    }

    case 'bed': {
      g.add(B(1.6, 0.12, 2.0, 0xc8b090, 0, 0.24, 0));
      g.add(B(1.6, 0.04, 1.9, 0xf0ece4, 0, 0.36, 0.05));
      g.add(B(1.6, 0.35, 0.12, 0x8a7060, 0, 0.42, -0.94));
      g.add(B(0.7, 0.08, 0.5, 0xf0ece4, -0.35, 0.44, -0.66));
      g.add(B(0.7, 0.08, 0.5, 0xf0ece4,  0.35, 0.44, -0.66));
      [[-0.72,-0.9],[0.72,-0.9],[-0.72,0.9],[0.72,0.9]].forEach(([x,z]) =>
        g.add(C(0.07, 0.24, 0x7a6050, x, 0.12, z)));
      break;
    }

    case 'wardrobe': {
      g.add(B(1.8, 2.2, 0.6, 0xd4c4a8, 0, 1.1, 0));
      g.add(B(0.04, 2.2, 0.6, 0xb0a088, 0, 1.1, 0));
      g.add(B(0.04, 0.04, 0.12, 0xd4af37, -0.4, 1.1, 0.3));
      g.add(B(0.04, 0.04, 0.12, 0xd4af37,  0.4, 1.1, 0.3));
      break;
    }

    case 'toilet': {
      g.add(B(0.42, 0.42, 0.65, 0xe8e8e4, 0, 0.21, 0));
      g.add(B(0.38, 0.08, 0.42, 0x6c8ba4, 0, 0.7, -0.12));
      g.add(B(0.42, 0.04, 0.65, 0xdeded8, 0, 0.44, 0));
      break;
    }

    case 'sink': {
      g.add(B(0.6, 0.6, 0.5, 0xe0e0dc, 0, 0.42, 0));
      const basin = B(0.48, 0.08, 0.38, 0xd0d0cc, 0, 0.62, 0.02);
      basin.material.transparent = true; basin.material.opacity = ghost ? 0.3 : 0.7;
      g.add(basin);
      g.add(C(0.025, 0.32, 0xb0b0b0, 0, 0.38, 0.1));
      g.add(B(0.12, 0.04, 0.04, 0xb0b0b0, 0, 0.7, 0.02));
      break;
    }

    case 'bathtub': {
      g.add(B(0.8, 0.55, 1.7, 0xf0eeea, 0, 0.27, 0));
      const inside = B(0.64, 0.35, 1.54, 0xd8f0f8, 0, 0.47, 0);
      inside.material.transparent = true; inside.material.opacity = ghost ? 0.25 : 0.5;
      g.add(inside);
      g.add(C(0.025, 0.2, 0xb0b0b0, 0.22, 0.6, -0.72));
      break;
    }

    case 'shower': {
      g.add(B(0.9, 0.04, 0.9, 0xe8e8e4, 0, 0.04, 0));
      [[-0.42,-0.42],[0.42,-0.42],[-0.42,0.42]].forEach(([x,z]) =>
        g.add(B(0.04, 2.1, 0.04, 0xc0c0c0, x, 1.05, z)));
      const panel = B(0.04, 2.1, 0.9, 0xd0eeff, 0.42, 1.05, 0);
      panel.material.transparent = true; panel.material.opacity = ghost ? 0.15 : 0.3;
      g.add(panel);
      g.add(C(0.015, 1.2, 0xb0b0b0, -0.32, 1.2, -0.32));
      g.add(B(0.15, 0.04, 0.15, 0xb0b0b0, -0.32, 1.84, -0.32));
      break;
    }

    case 'plant': {
      g.add(C(0.2, 0.35, 0x8b6542, 0, 0.17, 0, 12));
      g.add(C(0.32, 0.1, 0xa07850, 0, 0.37, 0, 12));
      [0,72,144,216,288].forEach(a => {
        const rad = THREE.MathUtils.degToRad(a);
        const leaf = B(0.08, 0.55, 0.08, 0x3a7a3a,
          Math.sin(rad)*0.22, 0.65 + Math.random()*0.1, Math.cos(rad)*0.22);
        leaf.rotation.z = Math.sin(rad) * 0.4;
        leaf.rotation.x = Math.cos(rad) * 0.4;
        g.add(leaf);
      });
      break;
    }

    default:
      g.add(B(0.5, 0.5, 0.5, 0x888888, 0, 0.25, 0));
  }

  g.userData = { furnitureType: type };
  return g;
}

// Bounding box helper for placed objects
export function getFurnitureSize(type) {
  const sizes = {
    door: [0.9, 2.1], window: [1.2, 1.0], chair: [0.5, 0.5],
    armchair: [0.85, 0.75], sofa: [2.0, 0.85], table: [1.4, 0.8],
    desk: [1.6, 0.7], bed: [1.6, 2.0], wardrobe: [1.8, 0.6],
    toilet: [0.42, 0.65], sink: [0.6, 0.5], bathtub: [0.8, 1.7],
    shower: [0.9, 0.9], plant: [0.6, 0.6],
  };
  return sizes[type] || [0.5, 0.5];
}
