import { TextLayerData } from './types';

export type PosterTemplateLayer = {
  text: string;
  color: string;
  fontSize: number;
  fontFamily: TextLayerData['fontFamily'];
  align: TextLayerData['align'];
  xPct: number; // 0..1 of canvas width
  yPct: number; // 0..1 of canvas height
};

export type PosterTemplate = {
  id: string;
  label: string;
  gradient: [string, string];
  layers: PosterTemplateLayer[];
};

export const POSTER_TEMPLATES: PosterTemplate[] = [
  {
    id: 'announcement',
    label: 'Announcement',
    gradient: ['#8B5CF6', '#6366F1'],
    layers: [
      { text: 'BIG NEWS', color: '#FFFFFF', fontSize: 44, fontFamily: 'bold', align: 'center', xPct: 0.5, yPct: 0.4 },
      { text: 'Tell everyone what’s happening', color: '#E9E7FF', fontSize: 18, fontFamily: 'sans', align: 'center', xPct: 0.5, yPct: 0.52 },
    ],
  },
  {
    id: 'sale',
    label: 'Sale',
    gradient: ['#F59E0B', '#FBBF24'],
    layers: [
      { text: 'SALE', color: '#1A1A26', fontSize: 56, fontFamily: 'bold', align: 'center', xPct: 0.5, yPct: 0.38 },
      { text: 'Up to 50% off today', color: '#3A2E00', fontSize: 18, fontFamily: 'sans', align: 'center', xPct: 0.5, yPct: 0.5 },
    ],
  },
  {
    id: 'event',
    label: 'Event',
    gradient: ['#EF4444', '#EC4899'],
    layers: [
      { text: 'YOU’RE INVITED', color: '#FFFFFF', fontSize: 30, fontFamily: 'bold', align: 'center', xPct: 0.5, yPct: 0.32 },
      { text: 'Event Name', color: '#FFFFFF', fontSize: 26, fontFamily: 'serif', align: 'center', xPct: 0.5, yPct: 0.45 },
      { text: 'Date • Time • Venue', color: '#FFE4EC', fontSize: 16, fontFamily: 'sans', align: 'center', xPct: 0.5, yPct: 0.55 },
    ],
  },
  {
    id: 'quote',
    label: 'Quote',
    gradient: ['#1E1B4B', '#312E81'],
    layers: [
      { text: '“Your quote goes here”', color: '#FFFFFF', fontSize: 26, fontFamily: 'serif', align: 'center', xPct: 0.5, yPct: 0.45 },
      { text: '— Author', color: '#A5B4FC', fontSize: 16, fontFamily: 'sans', align: 'center', xPct: 0.5, yPct: 0.56 },
    ],
  },
  {
    id: 'birthday',
    label: 'Birthday',
    gradient: ['#F472B6', '#FB923C'],
    layers: [
      { text: 'HAPPY BIRTHDAY', color: '#FFFFFF', fontSize: 32, fontFamily: 'bold', align: 'center', xPct: 0.5, yPct: 0.42 },
      { text: 'Name', color: '#FFF1E6', fontSize: 20, fontFamily: 'serif', align: 'center', xPct: 0.5, yPct: 0.54 },
    ],
  },
  {
    id: 'motivational',
    label: 'Motivational',
    gradient: ['#10B981', '#22D3EE'],
    layers: [
      { text: 'KEEP GOING', color: '#FFFFFF', fontSize: 40, fontFamily: 'bold', align: 'center', xPct: 0.5, yPct: 0.45 },
      { text: 'You’ve got this', color: '#E4FFF7', fontSize: 18, fontFamily: 'sans', align: 'center', xPct: 0.5, yPct: 0.56 },
    ],
  },
  {
    id: 'minimal',
    label: 'Minimal',
    gradient: ['#12121A', '#1A1A26'],
    layers: [
      { text: 'Title', color: '#FFFFFF', fontSize: 34, fontFamily: 'sans', align: 'left', xPct: 0.12, yPct: 0.45 },
      { text: 'Subtitle text here', color: '#9494AB', fontSize: 16, fontFamily: 'sans', align: 'left', xPct: 0.12, yPct: 0.53 },
    ],
  },
  {
    id: 'bold',
    label: 'Bold',
    gradient: ['#0EA5E9', '#6366F1'],
    layers: [
      { text: 'MAKE IT\nBOLD', color: '#FFFFFF', fontSize: 48, fontFamily: 'bold', align: 'left', xPct: 0.12, yPct: 0.4 },
    ],
  },
];
