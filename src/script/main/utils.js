function clamp(val, min, max) {
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

const white = 0xffffff;
const red = 0xff0000;

function hexToRGB(colorInt) {
  const r = ((colorInt >> 16) & 0xff) / 255;
  const g = ((colorInt >> 8) & 0xff) / 255;
  const b = (colorInt & 0xff) / 255;

  return { r, g, b };
}

function RGBToHex({ r, g, b }) {
  const rInt = Math.round(r * 255);
  const gInt = Math.round(g * 255);
  const bInt = Math.round(b * 255);

  return (rInt << 16) | (gInt << 8) | bInt;
}

function lerpColor(c1, c2, t) {
  return {
    r: c1.r + (c2.r - c1.r) * t,
    g: c1.g + (c2.g - c1.g) * t,
    b: c1.b + (c2.b - c1.b) * t,
  };
}

function interpolateColor(start, end, t) {
  const white = { r: 1, g: 1, b: 1 };
  const isWhite = ({ r, g, b }) => r == 1 && g == 1 && b == 1;

  if (isWhite(start) || isWhite(end)) {
    // Interpolazione diretta
    return lerpColor(start, end, t);
  } else {
    // Interpolazione in due fasi: start → bianco → end
    if (t < 0.5) {
      return lerpColor(start, white, t * 2);
    } else {
      return lerpColor(white, end, (t - 0.5) * 2);
    }
  }
}

export {
  clamp,
  clampArray,
  white,
  red,
  hexToRGB,
  RGBToHex,
  lerpColor,
  interpolateColor,
};
