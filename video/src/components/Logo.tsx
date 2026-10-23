import { color, font } from '../theme';

/** Marque Moodly : anneau violet, point soleil (comme dans l'app) */
export function LogoMark({ size = 64, ring = 1, dot = 1 }: { size?: number; ring?: number; dot?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256">
      <g transform={`translate(128 128) scale(${ring}) translate(-128 -128)`}>
        <path
          fill={color.accent}
          d="M128 24a104 104 0 1 0 0 208 104 104 0 0 0 0-208Zm0 36a68 68 0 1 1 0 136 68 68 0 0 1 0-136Z"
        />
      </g>
      <circle cx="128" cy="128" r={28 * dot} fill={color.mood[2]} />
    </svg>
  );
}

export function Wordmark({ size = 64 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.28 }}>
      <LogoMark size={size} />
      <span style={{ fontFamily: font.sans, fontWeight: 600, fontSize: size * 0.72, color: color.ink, letterSpacing: -1 }}>
        Moodly
      </span>
    </div>
  );
}
