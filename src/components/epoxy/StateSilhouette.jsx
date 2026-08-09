const LIME = '#7AB800';
const CHARCOAL = '#1a1a1a';

/**
 * Simplified US state silhouette outlines (viewBox 0 0 100 100).
 * Each path captures the recognizable shape of the state as a perimeter.
 */
const STATE_PATHS = {
  florida:        "M15,10 L55,10 L56,22 L50,30 L48,42 L46,56 L45,70 L44,84 L43,95 L41,98 L39,94 L37,84 L34,70 L31,56 L27,42 L22,30 L15,22 Z",
  georgia:        "M15,10 L85,10 L88,32 L85,52 L76,72 L62,88 L48,92 L34,88 L22,72 L13,52 L12,32 Z",
  texas:          "M20,5 L40,5 L42,22 L90,28 L88,44 L80,56 L70,70 L60,84 L52,96 L44,88 L36,74 L28,60 L20,46 L14,32 L17,16 Z",
  california:     "M28,5 L55,8 L52,20 L58,34 L62,48 L58,62 L52,76 L46,90 L40,96 L42,80 L35,64 L30,48 L25,34 L21,20 Z",
  'north-carolina': "M10,24 L90,22 L92,44 L86,60 L72,76 L52,80 L30,78 L15,64 L8,44 Z",
  'south-carolina': "M12,18 L78,15 L85,36 L76,60 L62,78 L42,82 L26,68 L10,42 Z",
  tennessee:      "M8,28 L92,25 L92,46 L86,58 L14,60 L8,46 Z",
  arizona:        "M12,8 L88,8 L88,48 L80,72 L70,62 L60,72 L50,62 L12,56 Z"
};

const STATE_KEY_MAP = {
  'Florida': 'florida',
  'Georgia': 'georgia',
  'Texas': 'texas',
  'California': 'california',
  'North Carolina': 'north-carolina',
  'South Carolina': 'south-carolina',
  'Tennessee': 'tennessee',
  'Arizona': 'arizona'
};

/**
 * Renders a US state silhouette as a perimeter outline with a subtle
 * black accent on the right/bottom edges to create depth.
 */
export default function StateSilhouette({ stateName, size = 72 }) {
  const key = STATE_KEY_MAP[stateName] || stateName.toLowerCase().replace(/\s+/g, '-');
  const path = STATE_PATHS[key];
  if (!path) return null;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block', margin: '0 auto' }}>
      {/* Depth shadow — offset down-right in subtle black */}
      <path d={path} fill="none" stroke="rgba(0,0,0,0.16)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
        transform="translate(1.5,1.5)" />
      {/* Main perimeter — lime green outline with very light fill */}
      <path d={path} fill="rgba(122,184,0,0.06)" stroke={LIME} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* Inner right-edge accent — tiny black hairline for extra depth */}
      <path d={path} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="0.5" strokeLinejoin="round"
        transform="translate(0.5,0.5)" />
    </svg>
  );
}