// Shared geometry between CustomTabBar (which draws the notched bar + orb)
// and AiOrbContext (which anchors the tray above the orb) — kept in one
// place so the tray always lines up with wherever the orb actually sits.
export const BAR_HEIGHT = 58;
export const ORB_SIZE = 43;
// Gap between the orb's circumference and the notch's edge that's cut into
// the bar — this is the "collar" that makes the bar read as wrapping around
// the orb rather than either touching it or leaving a disconnected gap.
export const NOTCH_COLLAR = 9;
export const NOTCH_RADIUS = ORB_SIZE / 2 + NOTCH_COLLAR;
// How far the orb's center sits below the bar's top edge — 0 means exactly
// half the orb nests into the notch cavity and half pokes up above the bar,
// which is what makes it read as docked/part of the bar instead of a
// separate floating element.
export const ORB_CENTER_DROP = 0;
