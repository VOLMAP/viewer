//Utility Functions
function binarySearchClosest(
  arr,
  evaluate,
  target,
  left = 0,
  right = arr.length - 1,
  bestMatch = -1
) {
  if (left > right) {
    // Return the index of the closest match found
    return bestMatch;
  }

  const mid = Math.floor((left + right) / 2);
  const midValue = evaluate(arr[mid]);

  // If we don't have a bestMatch yet, or if midValue is closer than the current bestMatch, update it
  if (
    bestMatch === -1 ||
    Math.abs(midValue - target) < Math.abs(evaluate(arr[bestMatch]) - target)
  ) {
    bestMatch = mid;
  }

  if (midValue === target) {
    // Found exact match
    return mid;
  } else if (midValue < target) {
    // Search in the right half
    return binarySearchClosest(arr, evaluate, target, mid + 1, right, bestMatch);
  } else {
    // Search in the left half
    return binarySearchClosest(arr, evaluate, target, left, mid - 1, bestMatch);
  }
}

//Color Constants and Functions
const whiteHex = 0xffffff;
const greyHex = 0xf3f3f3;
const blackHex = 0x000000;
const redHex = 0xff8080;
const greenHex = 0x80ff80;
const blueHex = 0x8080ff;
const yellowHex = 0xffff80;

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

export {
  binarySearchClosest,
  whiteHex,
  greyHex,
  blackHex,
  redHex,
  blueHex,
  greenHex,
  yellowHex,
  hexToRGB,
  RGBToHex,
  lerpColor,
};
