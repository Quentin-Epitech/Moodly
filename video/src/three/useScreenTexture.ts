import { useEffect, useState } from 'react';
import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';
import * as THREE from 'three';

// Toutes les captures utilisées par la vidéo, chargées une fois avant la première image :
// un écran ne peut ainsi jamais apparaître vide (noir) au moment de la capture d'image.
export const SCREEN_FILES = [
  'home', 'mood', 'merci', 'bilan', 'suivi', 'conseils', 'manager', 'weekly', 'report', 'code',
  'slot', 'meeting', 'agenda', 'hr-cases', 'desktop-manager', 'desktop-chart', 'desktop-hr',
] as const;

const textures = new Map<string, THREE.Texture>();
let statusBar: THREE.Texture | null = null;

function load(file: string): Promise<void> {
  return new THREE.TextureLoader().loadAsync(staticFile(`screens/${file}.png`)).then((texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    textures.set(file, texture);
  });
}

/** Barre d'état d'iPhone (heure, réseau, Wi-Fi, batterie), dessinée à 3× comme les captures */
function drawStatusBar(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 1170;
  canvas.height = 141;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000000';
  ctx.font = '600 51px Inter';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('9:41', 165, 80);
  // Réseau : quatre barres
  for (let i = 0; i < 4; i++) {
    const h = 12 + i * 9;
    ctx.beginPath();
    ctx.roundRect(850 + i * 17, 98 - h, 11, h, 3);
    ctx.fill();
  }
  // Wi-Fi : trois arcs
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#000000';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(966, 100, 12 + i * 13, (-3 * Math.PI) / 4, -Math.PI / 4);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(966, 98, 5, 0, Math.PI * 2);
  ctx.fill();
  // Batterie
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.roundRect(1022, 62, 72, 36, 11);
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(1028, 68, 60, 24, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.roundRect(1099, 73, 6, 14, 3);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  return texture;
}

/** À appeler une fois en haut de la vidéo : true quand toutes les captures sont prêtes */
export function useScreensReady(): boolean {
  const [ready, setReady] = useState(textures.size === SCREEN_FILES.length && statusBar !== null);
  useEffect(() => {
    if (ready) return;
    const handle = delayRender('captures de l’app');
    Promise.all([...SCREEN_FILES.map(load), document.fonts.ready])
      .then(() => {
        statusBar = drawStatusBar();
        setReady(true);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [ready]);
  return ready;
}

export function getScreenTexture(file: string): THREE.Texture {
  const texture = textures.get(file);
  if (!texture) throw new Error(`Capture non préchargée : ${file} (ajoutez-la à SCREEN_FILES)`);
  return texture;
}

export function getStatusBarTexture(): THREE.Texture {
  if (!statusBar) throw new Error('Barre d’état non prête');
  return statusBar;
}
