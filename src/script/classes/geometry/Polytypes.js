export const POLY_TYPES = {
  TETRAHEDRON: {
    vertsPerPoly: 4,
    faces: (v) => [
      [v[0], v[2], v[1]],
      [v[0], v[1], v[3]],
      [v[0], v[3], v[2]],
      [v[1], v[2], v[3]],
    ],
    quads: null,
  },
  HEXAHEDRON: {
    vertsPerPoly: 8,
    faces: (v) => [
      [v[0], v[3], v[2]], [v[0], v[2], v[1]],
      [v[4], v[5], v[6]], [v[4], v[6], v[7]],
      [v[0], v[1], v[5]], [v[0], v[5], v[4]],
      [v[2], v[3], v[7]], [v[2], v[7], v[6]],
      [v[1], v[2], v[6]], [v[1], v[6], v[5]],
      [v[0], v[4], v[7]], [v[0], v[7], v[3]],
    ],
    quads: (v) => [
      [v[0], v[1], v[2], v[3]],
      [v[4], v[5], v[6], v[7]],
      [v[0], v[1], v[5], v[4]],
      [v[2], v[3], v[7], v[6]],
      [v[1], v[2], v[6], v[5]],
      [v[0], v[3], v[7], v[4]],
    ]
  },
};