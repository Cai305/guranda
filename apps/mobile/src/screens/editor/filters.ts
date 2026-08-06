// Skia ColorMatrix is a 4x5 array: [R_r,R_g,R_b,R_a,R_bias, G_..., B_..., A_...]
// mapping c' = M(4x4) * c + bias, values on a 0-255 scale.
export type ColorMatrix = number[];

export const IDENTITY_MATRIX: ColorMatrix = [
  1, 0, 0, 0, 0,
  0, 1, 0, 0, 0,
  0, 0, 1, 0, 0,
  0, 0, 0, 1, 0,
];

// Compose "apply a, then apply b" into a single matrix.
export function composeMatrices(a: ColorMatrix, b: ColorMatrix): ColorMatrix {
  const out: number[] = new Array(20).fill(0);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += b[row * 5 + k] * a[k * 5 + col];
      }
      out[row * 5 + col] = sum;
    }
    // bias column
    let bias = b[row * 5 + 4];
    for (let k = 0; k < 4; k++) {
      bias += b[row * 5 + k] * a[k * 5 + 4];
    }
    out[row * 5 + 4] = bias;
  }
  return out;
}

const LUM_R = 0.213;
const LUM_G = 0.715;
const LUM_B = 0.072;

/** saturation in -1..1 (-1 = grayscale, 0 = identity, 1 = oversaturated) */
export function saturationMatrix(saturation: number): ColorMatrix {
  const sat = 1 + saturation;
  return [
    LUM_R + sat * (1 - LUM_R), LUM_G * (1 - sat), LUM_B * (1 - sat), 0, 0,
    LUM_R * (1 - sat), LUM_G + sat * (1 - LUM_G), LUM_B * (1 - sat), 0, 0,
    LUM_R * (1 - sat), LUM_G * (1 - sat), LUM_B + sat * (1 - LUM_B), 0, 0,
    0, 0, 0, 1, 0,
  ];
}

/** brightness in -1..1 */
export function brightnessMatrix(brightness: number): ColorMatrix {
  const bias = brightness * 255;
  return [
    1, 0, 0, 0, bias,
    0, 1, 0, 0, bias,
    0, 0, 1, 0, bias,
    0, 0, 0, 1, 0,
  ];
}

/** contrast in -1..1, pivoted around mid-gray (128) */
export function contrastMatrix(contrast: number): ColorMatrix {
  const scale = 1 + contrast;
  const bias = 128 * (1 - scale);
  return [
    scale, 0, 0, 0, bias,
    0, scale, 0, 0, bias,
    0, 0, scale, 0, bias,
    0, 0, 0, 1, 0,
  ];
}

export type FilterPreset = { key: string; label: string; matrix: ColorMatrix };

export const FILTER_PRESETS: FilterPreset[] = [
  { key: 'original', label: 'Original', matrix: IDENTITY_MATRIX },
  { key: 'vivid', label: 'Vivid', matrix: composeMatrices(saturationMatrix(0.45), contrastMatrix(0.12)) },
  { key: 'bw', label: 'B&W', matrix: saturationMatrix(-1) },
  {
    key: 'warm',
    label: 'Warm',
    matrix: [
      1.12, 0, 0, 0, 12,
      0, 1.02, 0, 0, 4,
      0, 0, 0.88, 0, -6,
      0, 0, 0, 1, 0,
    ],
  },
  {
    key: 'cool',
    label: 'Cool',
    matrix: [
      0.9, 0, 0, 0, -4,
      0, 1.0, 0, 0, 0,
      0, 0, 1.15, 0, 14,
      0, 0, 0, 1, 0,
    ],
  },
  {
    key: 'fade',
    label: 'Fade',
    matrix: composeMatrices(contrastMatrix(-0.28), [
      0.9, 0, 0, 0, 24,
      0, 0.9, 0, 0, 24,
      0, 0, 0.9, 0, 28,
      0, 0, 0, 1, 0,
    ]),
  },
];

export function buildFinalMatrix(filterMatrix: ColorMatrix, brightness: number, contrast: number, saturation: number): ColorMatrix {
  let m = filterMatrix;
  if (saturation !== 0) m = composeMatrices(m, saturationMatrix(saturation));
  if (brightness !== 0) m = composeMatrices(m, brightnessMatrix(brightness));
  if (contrast !== 0) m = composeMatrices(m, contrastMatrix(contrast));
  return m;
}
