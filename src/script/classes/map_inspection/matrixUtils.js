//-------------------------------------JACOBIAN--------------------------------------//

function jacobianMatrix(tetrahedra1, tetrahedra2) {
  const v0 = tetrahedra1[0];
  const v1 = tetrahedra1[1];
  const v2 = tetrahedra1[2];
  const v3 = tetrahedra1[3];

  const v0m = tetrahedra2[0];
  const v1m = tetrahedra2[1];
  const v2m = tetrahedra2[2];
  const v3m = tetrahedra2[3];

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

  const invDtm = invertMatrix3x3(Dtm);

  const J = multiplyMatrices(Dt, invDtm);

  return J;
}

//-----------------------------------Support functions------------------------------------//

function determinant3x3(m) {
  return (
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  );
}

function invertMatrix3x3(m) {
  const det = determinant3x3(m);

  const invDet = 1 / det;

  const invM = [[], [], []];

  invM[0][0] = (m[1][1] * m[2][2] - m[1][2] * m[2][1]) * invDet;
  invM[0][1] = -(m[0][1] * m[2][2] - m[0][2] * m[2][1]) * invDet;
  invM[0][2] = (m[0][1] * m[1][2] - m[0][2] * m[1][1]) * invDet;

  invM[1][0] = -(m[1][0] * m[2][2] - m[1][2] * m[2][0]) * invDet;
  invM[1][1] = (m[0][0] * m[2][2] - m[0][2] * m[2][0]) * invDet;
  invM[1][2] = -(m[0][0] * m[1][2] - m[0][2] * m[1][0]) * invDet;

  invM[2][0] = (m[1][0] * m[2][1] - m[1][1] * m[2][0]) * invDet;
  invM[2][1] = -(m[0][0] * m[2][1] - m[0][1] * m[2][0]) * invDet;
  invM[2][2] = (m[0][0] * m[1][1] - m[0][1] * m[1][0]) * invDet;

  return invM;
}

// Funzione per moltiplicare due matrici
function multiplyMatrices(A, B) {
  if (!Array.isArray(A) || !A.every((row) => Array.isArray(row))) {
    throw new Error("A has to be a two-dimensional array (array of arrays).");
  }
  if (!Array.isArray(B) || !B.every((row) => Array.isArray(row))) {
    throw new Error("B has to be a two-dimensional array (array of arrays).");
  }

  const rowsA = A.length;
  const colsA = A[0].length;
  const rowsB = B.length;
  const colsB = B[0].length;

  if (colsA !== rowsB) {
    throw new Error("The number of columns of A must be equal to the number of rows of B.");
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

//---------------------------------------SINGULAR VALUES----------------------------------------//

function computeSingularValues(matrix) {
  // Compute AAᵗ
  const At = transposeMatrix(matrix);
  const AAt = multiplyMatrices(matrix, At);

  // Calculate the eigenvalues of AAᵗ
  const eigenvalues = jacobiEigenvaluesOnly(AAt);

  // Calculate the singular values as the square root of the absolute value of the eigenvalues
  const singularValues = eigenvalues.map((eigenvalue) => Math.sqrt(Math.abs(eigenvalue)));

  return singularValues;
}

//-----------------------------------Support functions------------------------------------//

function transposeMatrix(matrix) {
  if (!Array.isArray(matrix) || !matrix.every((row) => Array.isArray(row))) {
    throw new Error("Input must be a two-dimensional array (array of arrays).");
  }
  return matrix[0].map((_, colIndex) => matrix.map((row) => row[colIndex]));
}

function jacobiEigenvaluesOnly(A, epsilon = 1e-10, maxIterations = 100) {
  const n = A.length;
  let matrix = cloneMatrix(A);

  for (let iter = 0; iter < maxIterations; iter++) {
    const { max, p, q } = maxOffDiagonal(matrix);
    if (max < epsilon) break;

    const theta = 0.5 * Math.atan2(2 * matrix[p][q], matrix[q][q] - matrix[p][p]);
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

export { jacobianMatrix, determinant3x3, computeSingularValues };
