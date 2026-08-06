import type { FontKey, ShapeKind } from './types';

export type TemplateCategory = 'social' | 'business' | 'sale' | 'event' | 'quote' | 'birthday';

export const CATEGORIES: { key: TemplateCategory; label: string }[] = [
  { key: 'social', label: 'Social' },
  { key: 'business', label: 'Business' },
  { key: 'sale', label: 'Sale' },
  { key: 'event', label: 'Event' },
  { key: 'quote', label: 'Quote' },
  { key: 'birthday', label: 'Birthday' },
];

export type PosterTemplateText = {
  text: string;
  color: string;
  fontSize: number;
  fontFamily: FontKey;
  bold: boolean;
  align: 'left' | 'center' | 'right';
  xPct: number;
  yPct: number;
  backgroundColor?: string | null;
};

export type PosterTemplateShape = {
  shapeType: ShapeKind;
  color: string;
  widthPct: number; // fraction of canvas width
  heightPct: number; // fraction of canvas height
  xPct: number;
  yPct: number;
  cornerRadius?: number;
};

export type PosterTemplate = {
  id: string;
  label: string;
  category: TemplateCategory;
  gradient: [string, string];
  shapes?: PosterTemplateShape[];
  texts: PosterTemplateText[];
};

const t = (
  text: string,
  color: string,
  fontSize: number,
  fontFamily: FontKey,
  bold: boolean,
  align: PosterTemplateText['align'],
  xPct: number,
  yPct: number,
  backgroundColor: string | null = null,
): PosterTemplateText => ({ text, color, fontSize, fontFamily, bold, align, xPct, yPct, backgroundColor });

const s = (
  shapeType: ShapeKind,
  color: string,
  widthPct: number,
  heightPct: number,
  xPct: number,
  yPct: number,
  cornerRadius?: number,
): PosterTemplateShape => ({ shapeType, color, widthPct, heightPct, xPct, yPct, cornerRadius });

export const POSTER_TEMPLATES: PosterTemplate[] = [
  // ---------------------------------------------------------------- Social
  {
    id: 'social-new-drop',
    label: 'New Drop',
    category: 'social',
    gradient: ['#FF6B6B', '#FFD93D'],
    shapes: [s('rect', '#0A0A0F', 0.34, 0.075, 0.5, 0.2, 999)],
    texts: [
      t('NEW', '#FFD93D', 15, 'oswald', true, 'center', 0.5, 0.2),
      t('FRESH DROP', '#0A0A0F', 46, 'bebas', false, 'center', 0.5, 0.42),
      t('Available now — link in bio', '#0A0A0F', 15, 'poppins', false, 'center', 0.5, 0.55),
    ],
  },
  {
    id: 'social-milestone',
    label: 'Milestone',
    category: 'social',
    gradient: ['#667EEA', '#764BA2'],
    shapes: [s('circle', 'rgba(255,255,255,0.12)', 0.7, 0.35, 0.5, 0.32)],
    texts: [
      t('THANK YOU', '#FFFFFF', 16, 'oswald', true, 'center', 0.5, 0.24),
      t('10,000', '#FFFFFF', 58, 'poppins', true, 'center', 0.5, 0.4),
      t('Followers strong', '#E0E7FF', 17, 'inter', false, 'center', 0.5, 0.52),
      t('You made this happen 💜', '#FFFFFF', 14, 'inter', false, 'center', 0.5, 0.85),
    ],
  },
  {
    id: 'social-quote-card',
    label: 'Quote Card',
    category: 'social',
    gradient: ['#2D3436', '#636E72'],
    texts: [
      t('“Small steps every day\nadd up to big change.”', '#FFFFFF', 26, 'playfair', false, 'center', 0.5, 0.42),
      t('— Daily Reminder', '#B2BEC3', 16, 'caveat', false, 'center', 0.5, 0.62),
    ],
  },
  {
    id: 'social-today',
    label: 'Photo Caption',
    category: 'social',
    gradient: ['#0F2027', '#2C5364'],
    texts: [
      t('TODAY', '#4FD1C5', 14, 'oswald', true, 'left', 0.09, 0.82, null),
      t('Chasing golden hour', '#FFFFFF', 24, 'poppins', true, 'left', 0.09, 0.89),
    ],
  },

  // -------------------------------------------------------------- Business
  {
    id: 'biz-hiring',
    label: "We're Hiring",
    category: 'business',
    gradient: ['#0F172A', '#1E293B'],
    shapes: [s('rect', '#3B82F6', 0.36, 0.06, 0.5, 0.18, 8)],
    texts: [
      t('APPLY TODAY', '#FFFFFF', 13, 'oswald', true, 'center', 0.5, 0.18),
      t("WE'RE\nHIRING", '#FFFFFF', 44, 'oswald', true, 'center', 0.5, 0.42),
      t('Marketing Coordinator', '#93C5FD', 17, 'inter', false, 'center', 0.5, 0.58),
      t('Send your CV — link in bio', '#94A3B8', 13, 'inter', false, 'center', 0.5, 0.9),
    ],
  },
  {
    id: 'biz-grand-opening',
    label: 'Grand Opening',
    category: 'business',
    gradient: ['#D4AF37', '#AA771C'],
    shapes: [s('line', '#0A0A0F', 0.22, 0.006, 0.5, 0.36)],
    texts: [
      t('GRAND OPENING', '#0A0A0F', 34, 'playfair', true, 'center', 0.5, 0.28),
      t('Join us this Saturday', '#0A0A0F', 16, 'inter', false, 'center', 0.5, 0.44),
      t('123 Main Street · 10AM', '#3A2E0B', 14, 'inter', false, 'center', 0.5, 0.88),
    ],
  },
  {
    id: 'biz-testimonial',
    label: 'Testimonial',
    category: 'business',
    gradient: ['#F5F7FA', '#C3CFE2'],
    shapes: [s('circle', '#0A0A0F', 0.11, 0.055, 0.14, 0.2)],
    texts: [
      t('“', '#0A0A0F', 40, 'playfair', true, 'center', 0.14, 0.2),
      t('Working with this team changed\nhow we run our whole business.', '#0A0A0F', 20, 'playfair', false, 'center', 0.5, 0.42),
      t('— Amara N., Founder', '#4A4A52', 14, 'inter', false, 'center', 0.5, 0.62),
    ],
  },
  {
    id: 'biz-launch',
    label: 'Product Launch',
    category: 'business',
    gradient: ['#141E30', '#243B55'],
    shapes: [s('rect', '#22D3EE', 0.3, 0.055, 0.5, 0.2, 999)],
    texts: [
      t('INTRODUCING', '#0A0A0F', 13, 'oswald', true, 'center', 0.5, 0.2),
      t('Nova\nWorkspace', '#FFFFFF', 40, 'poppins', true, 'center', 0.5, 0.44),
      t('The tool your team\nactually wants to use', '#93E7F0', 15, 'inter', false, 'center', 0.5, 0.62),
    ],
  },

  // ------------------------------------------------------------------ Sale
  {
    id: 'sale-flash',
    label: 'Flash Sale',
    category: 'sale',
    gradient: ['#F857A6', '#FF5858'],
    shapes: [s('rect', '#FFD93D', 0.4, 0.065, 0.5, 0.78, 999)],
    texts: [
      t('FLASH SALE', '#FFFFFF', 48, 'bebas', false, 'center', 0.5, 0.32),
      t('50% OFF EVERYTHING', '#FFFFFF', 20, 'poppins', true, 'center', 0.5, 0.44),
      t('24 HOURS ONLY', '#7A1E00', 14, 'oswald', true, 'center', 0.5, 0.78),
    ],
  },
  {
    id: 'sale-clearance',
    label: 'Clearance',
    category: 'sale',
    gradient: ['#FF9A00', '#FF4E00'],
    texts: [
      t('CLEARANCE', '#FFFFFF', 50, 'bebas', false, 'center', 0.5, 0.36),
      t('Up to 70% off select styles', '#FFF3E0', 17, 'inter', false, 'center', 0.5, 0.5),
      t('While stocks last', '#FFE0B2', 13, 'inter', false, 'center', 0.5, 0.9),
    ],
  },
  {
    id: 'sale-black-friday',
    label: 'Black Friday',
    category: 'sale',
    gradient: ['#000000', '#1A1A1A'],
    shapes: [s('line', '#FFD93D', 0.3, 0.006, 0.5, 0.35)],
    texts: [
      t('BLACK FRIDAY', '#FFD93D', 46, 'bebas', false, 'center', 0.5, 0.28),
      t('The biggest sale of the year', '#FFFFFF', 16, 'inter', false, 'center', 0.5, 0.42),
      t('Starts Friday, 12AM', '#B0B0B0', 13, 'inter', false, 'center', 0.5, 0.88),
    ],
  },
  {
    id: 'sale-bogo',
    label: 'Buy One Get One',
    category: 'sale',
    gradient: ['#11998E', '#38EF7D'],
    shapes: [s('circle', 'rgba(255,255,255,0.15)', 0.55, 0.28, 0.5, 0.3)],
    texts: [
      t('BOGO', '#FFFFFF', 60, 'bebas', false, 'center', 0.5, 0.32),
      t('Buy One, Get One Free', '#0A3A2E', 18, 'poppins', true, 'center', 0.5, 0.48),
      t('In-store & online today', '#0A3A2E', 13, 'inter', false, 'center', 0.5, 0.88),
    ],
  },

  // ----------------------------------------------------------------- Event
  {
    id: 'event-invited',
    label: "You're Invited",
    category: 'event',
    gradient: ['#F85F73', '#FE8C69'],
    shapes: [s('line', '#FFFFFF', 0.24, 0.006, 0.5, 0.63)],
    texts: [
      t("YOU'RE INVITED", '#FFFFFF', 32, 'playfair', true, 'center', 0.5, 0.28),
      t('Event Name', '#FFFFFF', 26, 'caveat', false, 'center', 0.5, 0.46),
      t('Date · Time · Venue', '#FFF0EC', 15, 'inter', false, 'center', 0.5, 0.68),
    ],
  },
  {
    id: 'event-save-date',
    label: 'Save The Date',
    category: 'event',
    gradient: ['#3A1C71', '#D76D77'],
    texts: [
      t('SAVE THE DATE', '#F7D6E0', 14, 'oswald', true, 'center', 0.5, 0.26),
      t('June 14', '#FFFFFF', 52, 'playfair', true, 'center', 0.5, 0.42),
      t('More details to follow', '#EAD0DA', 14, 'inter', false, 'center', 0.5, 0.58),
    ],
  },
  {
    id: 'event-live-concert',
    label: 'Live Concert',
    category: 'event',
    gradient: ['#8E2DE2', '#4A00E0'],
    shapes: [s('rect', '#FF3B7F', 0.3, 0.06, 0.5, 0.2, 999)],
    texts: [
      t('LIVE TONIGHT', '#FFFFFF', 13, 'oswald', true, 'center', 0.5, 0.2),
      t('THE\nAFTERGLOW', '#FFFFFF', 40, 'bebas', false, 'center', 0.5, 0.42),
      t('Doors 8PM · The Warehouse', '#D8B4FE', 14, 'inter', false, 'center', 0.5, 0.62),
    ],
  },
  {
    id: 'event-workshop',
    label: 'Workshop',
    category: 'event',
    gradient: ['#134E5E', '#71B280'],
    shapes: [s('rect', '#FFFFFF', 0.32, 0.055, 0.5, 0.18, 999)],
    texts: [
      t('FREE WORKSHOP', '#134E5E', 13, 'oswald', true, 'center', 0.5, 0.18),
      t('Grow Your\nSmall Business', '#FFFFFF', 32, 'poppins', true, 'center', 0.5, 0.42),
      t('Saturday · 10AM · Free entry', '#D2F1E0', 14, 'inter', false, 'center', 0.5, 0.62),
    ],
  },

  // ----------------------------------------------------------------- Quote
  {
    id: 'quote-elegant',
    label: 'Elegant Quote',
    category: 'quote',
    gradient: ['#232526', '#414345'],
    texts: [
      t('“The best time to start\nwas yesterday. The next\nbest time is now.”', '#FFFFFF', 25, 'playfair', false, 'center', 0.5, 0.42),
      t('— Unknown', '#B0B0B0', 15, 'caveat', false, 'center', 0.5, 0.65),
    ],
  },
  {
    id: 'quote-bold',
    label: 'Bold Statement',
    category: 'quote',
    gradient: ['#FF512F', '#DD2476'],
    texts: [
      t('DREAM BIG.\nWORK HARD.\nSTAY HUMBLE.', '#FFFFFF', 38, 'bebas', false, 'center', 0.5, 0.44),
    ],
  },
  {
    id: 'quote-minimal',
    label: 'Minimal Quote',
    category: 'quote',
    gradient: ['#ECE9E6', '#FFFFFF'],
    texts: [
      t('less noise,\nmore signal', '#111111', 30, 'inter', true, 'left', 0.1, 0.44),
    ],
  },

  // -------------------------------------------------------------- Birthday
  {
    id: 'birthday-classic',
    label: 'Happy Birthday',
    category: 'birthday',
    gradient: ['#FA709A', '#FEE140'],
    shapes: [s('circle', 'rgba(255,255,255,0.2)', 0.6, 0.3, 0.5, 0.3)],
    texts: [
      t('HAPPY BIRTHDAY', '#FFFFFF', 34, 'poppins', true, 'center', 0.5, 0.34),
      t('Name', '#FFFFFF', 24, 'caveat', false, 'center', 0.5, 0.48),
    ],
  },
  {
    id: 'birthday-playful',
    label: 'Playful Party',
    category: 'birthday',
    gradient: ['#F6D365', '#FDA085'],
    shapes: [s('rect', '#FFFFFF', 0.7, 0.09, 0.5, 0.24, 20)],
    texts: [
      t("IT'S PARTY TIME!", '#E64980', 22, 'poppins', true, 'center', 0.5, 0.24),
      t('Turning\nAwesome', '#FFFFFF', 42, 'bebas', false, 'center', 0.5, 0.5),
    ],
  },
  {
    id: 'birthday-elegant',
    label: 'Elegant Birthday',
    category: 'birthday',
    gradient: ['#232526', '#3A3A3C'],
    shapes: [s('line', '#D4AF37', 0.2, 0.005, 0.5, 0.34)],
    texts: [
      t('Celebrating', '#D4AF37', 16, 'playfair', false, 'center', 0.5, 0.28),
      t('30 Years', '#FFFFFF', 46, 'playfair', true, 'center', 0.5, 0.44),
      t('of you', '#C9C9C9', 16, 'caveat', false, 'center', 0.5, 0.56),
    ],
  },
];
