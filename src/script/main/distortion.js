function jacobianMatrix(v0, v1, v2, v3, v0m, v1m, v2m, v3m) {
  const Dt = [
    [v1.x - v0.x, v2.x - v0.x, v3.x - v0.x],
    [v1.y - v0.y, v2.y - v0.y, v3.y - v0.y],
    [v1.z - v0.z, v2.z - v0.z, v3.z - v0.z],
  ];
  const Dtm = [
    [v1m.x - v0m.x, v2m.x - v0m.x, v3m.x - v0m.x],
    [v1m.y - v0m.y, v2m.y - v0m.y, v3m.y - v0m.y],
    [v1m.z - v0m.z, v2m.z - v0m.z, v3m.z - v0m.z],
  ];

  const DtmTranspose = invertMatrix3x3(Dtm);

  const jacobianMatrix = multiplyMatrices(Dt, DtmTranspose);

  return jacobianMatrix;
}

function computeSingularValues(matrix) {
  // Calcola AAᵗ
  const At = transpose(matrix);
  const AAt = multiplyMatrices(matrix, At);

  // Calcola gli autovalori di AAᵗ
  const eigenvalues = jacobiEigenvaluesOnly(AAt);

  // Calcola i valori singolari come radice quadrata del valore assoluto degli autovalori
  const singularValues = eigenvalues.map((eigenvalue) =>
    Math.sqrt(Math.abs(eigenvalue))
  );

  return singularValues;
}

function invertMatrix3x3(m) {
  const det =
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

  if (det <= 0) {
    // Usa una soglia per errori numerici
    throw new Error("Tetraedro degenere - determinante nullo o negativo");
  }

  const invDet = 1 / det;

  const inv = [[], [], []];

  inv[0][0] = (m[1][1] * m[2][2] - m[1][2] * m[2][1]) * invDet;
  inv[0][1] = -(m[0][1] * m[2][2] - m[0][2] * m[2][1]) * invDet;
  inv[0][2] = (m[0][1] * m[1][2] - m[0][2] * m[1][1]) * invDet;

  inv[1][0] = -(m[1][0] * m[2][2] - m[1][2] * m[2][0]) * invDet;
  inv[1][1] = (m[0][0] * m[2][2] - m[0][2] * m[2][0]) * invDet;
  inv[1][2] = -(m[0][0] * m[1][2] - m[0][2] * m[1][0]) * invDet;

  inv[2][0] = (m[1][0] * m[2][1] - m[1][1] * m[2][0]) * invDet;
  inv[2][1] = -(m[0][0] * m[2][1] - m[0][1] * m[2][0]) * invDet;
  inv[2][2] = (m[0][0] * m[1][1] - m[0][1] * m[1][0]) * invDet;

  return inv;
}

//---------------------------------------DISTORSIONE----------------------------------------//
function computeDistortion(s_max, s_mid, s_min, energy) {
  switch (energy) {
    case "CONFORMAL":
      return (
        (s_max * s_max + s_mid * s_mid + s_min * s_min) /
        (3 * Math.pow(s_max * s_mid * s_min, 2 / 3))
      );
    case "DIRICHLET":
      return (s_max * s_max + s_mid * s_mid + s_min * s_min) / 3;
    case "SYMMETRIC-DIRICHLET":
      return (
        (s_max * s_max +
          s_mid * s_mid +
          s_min * s_min +
          1 / (s_max * s_max) +
          1 / (s_mid * s_mid) +
          1 / (s_min * s_min)) /
        6
      );
    case "ARAP":
      const EPSILON = 1e-12;
      const val =
        Math.pow(s_max - 1, 2) +
        Math.pow(s_mid - 1, 2) +
        Math.pow(s_min - 1, 2);
      return val < EPSILON ? 0 : val;
    case "MIPS3D":
      return (
        (1 / 8) *
        (s_max / s_mid + s_mid / s_max) *
        (s_min / s_max + s_max / s_min) *
        (s_mid / s_min + s_min / s_mid)
      );
    default:
      throw "unkwnonw energy";
  }
}

//-----------------------------------FUNZIONI DI CALCOLO------------------------------------//

// Funzione per calcolare la matrice trasposta
function transpose(matrix) {
  if (!Array.isArray(matrix) || !matrix.every((row) => Array.isArray(row))) {
    throw new Error("La matrice deve essere un array bidimensionale.");
  }
  return matrix[0].map((_, colIndex) => matrix.map((row) => row[colIndex]));
}

// Funzione per moltiplicare due matrici
function multiplyMatrices(A, B) {
  if (!Array.isArray(A) || !A.every((row) => Array.isArray(row))) {
    throw new Error(
      "A deve essere una matrice bidimensionale (array di array)."
    );
  }
  if (!Array.isArray(B) || !B.every((row) => Array.isArray(row))) {
    throw new Error(
      "B deve essere una matrice bidimensionale (array di array)."
    );
  }

  const rowsA = A.length;
  const colsA = A[0].length;
  const rowsB = B.length;
  const colsB = B[0].length;

  if (colsA !== rowsB) {
    throw new Error(
      "Il numero di colonne di A deve essere uguale al numero di righe di B."
    );
  }

  const result = [];

  for (let i = 0; i < rowsA; i++) {
    const row = [];
    for (let j = 0; j < colsB; j++) {
      let sum = 0;
      for (let k = 0; k < colsA; k++) {
        sum += A[i][k] * B[k][j];
      }
      row.push(sum);
    }
    result.push(row);
  }
  return result;
}

//METODO DI JACOBI PER CALCOLARE GLI AUTOVALORI
function cloneMatrix(matrix) {
  return matrix.map((row) => row.slice());
}

function maxOffDiagonal(matrix) {
  let max = 0;
  let p = 0,
    q = 1;
  const n = matrix.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const val = Math.abs(matrix[i][j]);
      if (val > max) {
        max = val;
        p = i;
        q = j;
      }
    }
  }
  return { max, p, q };
}

function jacobiEigenvaluesOnly(A, epsilon = 1e-10, maxIterations = 100) {
  const n = A.length;
  let matrix = cloneMatrix(A);

  for (let iter = 0; iter < maxIterations; iter++) {
    const { max, p, q } = maxOffDiagonal(matrix);
    if (max < epsilon) break;

    const theta =
      0.5 * Math.atan2(2 * matrix[p][q], matrix[q][q] - matrix[p][p]);
    const c = Math.cos(theta);
    const s = Math.sin(theta);

    const app = matrix[p][p];
    const aqq = matrix[q][q];
    const apq = matrix[p][q];

    // Update diagonal entries
    matrix[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
    matrix[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
    matrix[p][q] = matrix[q][p] = 0;

    // Update other elements
    for (let i = 0; i < n; i++) {
      if (i !== p && i !== q) {
        const aip = matrix[i][p];
        const aiq = matrix[i][q];
        matrix[i][p] = matrix[p][i] = c * aip - s * aiq;
        matrix[i][q] = matrix[q][i] = c * aiq + s * aip;
      }
    }
  }

  // Return diagonal elements as eigenvalues, setting small values to 0
  return matrix.map((row, i) => (Math.abs(row[i]) < epsilon ? 0 : row[i]));
}

export { computeDistortion, jacobianMatrix, computeSingularValues };
