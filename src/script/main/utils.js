//Clamping Functions

function clamp(val, min, max) {
  //We use infinity as a distortion value to identify degenerate tetrahedra
  if (isNaN(val)) return Infinity;

  let res = Math.max(val, min);
  res = Math.min(res, max);
  res = (res - min) / (max - min);
  return res;
}

function clampArray(arr, min, max) {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = clamp(arr[i], min, max);
  }
}

//Color Constants and Functions

const whiteHex = 0xffffff;
const blackHex = 0x000000;
const redHex = 0xff0000;
const greenHex = 0x00ff00;
const blueHex = 0x0000ff;
const yellowHex = 0xffff00;

function hexToRGB(colorHex) {
  const r = ((colorHex >> 16) & 0xff) / 255;
  const g = ((colorHex >> 8) & 0xff) / 255;
  const b = (colorHex & 0xff) / 255;

  return { r, g, b };
}

function RGBToHex({ r, g, b }) {
  const rHex = Math.round(r * 255);
  const gHex = Math.round(g * 255);
  const bHex = Math.round(b * 255);

  return (rHex << 16) | (gHex << 8) | bHex;
}

//Linear interpolation between two colors with t as interpolation factor (0-1)
function lerpColor(start, end, t) {
  return {
    r: start.r + (end.r - start.r) * t,
    g: start.g + (end.g - start.g) * t,
    b: start.b + (end.b - start.b) * t,
  };
}

//Custom interpolation between two colors with t as interpolation factor (0-1)
function interpolateColor(start, end, t) {
  const whiteRGB = { r: 1, g: 1, b: 1 };
  const isWhite = (c) => c.r === 1 && c.g === 1 && c.b === 1;

  if (isWhite(start) || isWhite(end)) {
    //Linear interpolation
    return lerpColor(start, end, t);
  } else {
    //Custom interpolation: start → white → end
    if (t < 0.5) {
      return lerpColor(start, whiteRGB, t * 2);
    } else {
      return lerpColor(whiteRGB, end, (t - 0.5) * 2);
    }
  }
}

export {
  clamp,
  clampArray,
  whiteHex,
  blackHex,
  redHex,
  blueHex,
  greenHex,
  yellowHex,
  hexToRGB,
  RGBToHex,
  lerpColor,
  interpolateColor,
};
