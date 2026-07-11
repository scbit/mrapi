export function normalizeDegrees(deg) {
  return ((deg % 360) + 360) % 360;
}

export function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}

export function radiansToDegrees(radians) {
  return radians * 180 / Math.PI;
}

export function calculatePathLength(points, toVector) {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const current = toVector ? toVector(points[i]) : points[i];
    const previous = toVector ? toVector(points[i - 1]) : points[i - 1];
    total += current.distanceTo(previous);
  }
  return total;
}
