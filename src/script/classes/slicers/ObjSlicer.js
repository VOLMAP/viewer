import * as THREE from "../../../libs/three/three.module.js";

const red = 0xff8080;
const green = 0x80ff80;
const blue = 0x8080ff;

const maxSliderValue = 100;
const minSliderValue = -100;

function binarySearchClosest(
  arr,
  evaluate,
  target,
  left = 0,
  right = arr.length - 1,
  bestMatch = -1
) {
  if (left > right) {
    return bestMatch; // Ritorna il miglior valore trovato
  }

  const mid = Math.floor((left + right) / 2);
  const midValue = evaluate(arr[mid]);

  // Se non abbiamo ancora un bestMatch, o se midValue è più vicino del bestMatch attuale, lo aggiorniamo
  if (
    bestMatch === -1 ||
    Math.abs(midValue - target) < Math.abs(evaluate(arr[bestMatch]) - target)
  ) {
    bestMatch = mid;
  }

  if (midValue === target) {
    console.log(`Target: ${target}, Closest Value: ${midValue}`);
    return mid; // Trovato esattamente
  } else if (midValue < target) {
    return binarySearchClosest(
      arr,
      evaluate,
      target,
      mid + 1,
      right,
      bestMatch
    );
  } else {
    return binarySearchClosest(arr, evaluate, target, left, mid - 1, bestMatch);
  }
}

export class ObjSlicer {
  surfaceMesh = null; // Surface mesh object
  originalMeshGeometry = null; // Original mesh object
  originalWireframeGeometry = null; // Original wireframe object

  centroidsByX = null; // Centroids of the faces by x-axis
  centroidsByY = null; // Centroids of the faces by y-axis
  centroidsByZ = null; // Centroids of the faces by z-axis

  isVisibleX = null;
  isVisibleY = null;
  isVisibleZ = null;

  planeYZ = null;
  planeXZ = null;
  planeXY = null;

  isReversedX = false;
  isReversedY = false;
  isReversedZ = false;

  constructor(surfaceMesh) {
    this.surfaceMesh = surfaceMesh; // Surface mesh object
    this.originalMeshGeometry = surfaceMesh.getMesh().geometry.clone(); // Clone the original mesh geometry
    this.originalWireframeGeometry = surfaceMesh
      .getWireframe()
      .geometry.clone(); // Clone the original wireframe geometry

    this.setCentroids();
    this.setPlanes();
  }

  setCentroids() {
    const centroidAttribute =
      this.originalMeshGeometry.getAttribute("centroid");

    var tmpCentroids = new Array(centroidAttribute.count);

    for (let i = 0; i < centroidAttribute.count; i++) {
      tmpCentroids[i] = i;
    }

    function sortByCoord(coordIndex) {
      return function (a, b) {
        const aCoord = centroidAttribute.array[a * 3 + coordIndex];
        const bCoord = centroidAttribute.array[b * 3 + coordIndex];
        return aCoord - bCoord;
      };
    }

    this.centroidsByX = Array.from(tmpCentroids).sort(sortByCoord(0));
    this.centroidsByY = Array.from(tmpCentroids).sort(sortByCoord(1));
    this.centroidsByZ = Array.from(tmpCentroids).sort(sortByCoord(2));

    this.isVisibleX = new Array(centroidAttribute.count).fill(true);
    this.isVisibleY = new Array(centroidAttribute.count).fill(true);
    this.isVisibleZ = new Array(centroidAttribute.count).fill(true);
  }

  setPlanes() {
    const box = this.originalMeshGeometry.boundingBox;
    const size = box.getSize(new THREE.Vector3());
    var distance = new THREE.Vector3(size.x / 2, size.y / 2, size.z / 2);

    function createPlane(width, height, distance, color, type) {
      const planeGeometry = new THREE.PlaneGeometry(width, height);

      const planeMaterial = new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
      });

      const plane = new THREE.Mesh(planeGeometry, planeMaterial);
      plane.renderOrder = 1;

      if (type === "YZ") {
        plane.rotation.y = Math.PI / 2; // Ruota di 90° per essere parallelo a YZ
        plane.position.x = distance; // Trasla lungo X
      } else if (type === "XZ") {
        plane.rotation.x = Math.PI / 2; // Ruota di 90° per essere parallelo a XZ
        plane.position.y = distance; // Trasla lungo Y
      } else if (type === "XY") {
        plane.position.z = distance; // Trasla lungo Z (nessuna rotazione necessaria)
      } else {
        console.error("Tipo di piano non valido. Usa 'XY', 'XZ' o 'YZ'.");
        return null;
      }

      plane.geometry.userData = {
        resetPosition: distance,
      };

      return plane;
    }

    this.planeYZ = createPlane(size.z, size.y, distance.x, red, "YZ");
    this.planeXZ = createPlane(size.x, size.z, distance.y, blue, "XZ");
    this.planeXY = createPlane(size.x, size.y, distance.z, green, "XY");
  }

  getPlaneYZ() {
    return this.planeYZ;
  }

  getPlaneXZ() {
    return this.planeXZ;
  }

  getPlaneXY() {
    return this.planeXY;
  }

  sliceX(sliderValue) {
    const centroid = this.originalMeshGeometry.getAttribute("centroid").array;

    const maxPosition = this.planeYZ.geometry.userData.resetPosition;
    this.planeYZ.position.x = sliderValue * (maxPosition / maxSliderValue);

    const lastVisibleFace = binarySearchClosest(
      this.centroidsByX,
      (i) => centroid[i * 3 + 0],
      this.planeYZ.position.x
    );

    var facesToKeep = !this.isReversedX
      ? this.centroidsByX.slice(0, lastVisibleFace + 1)
      : this.centroidsByX.slice(lastVisibleFace + 1, this.centroidsByX.length);

    var facesToRemove = !this.isReversedX
      ? this.centroidsByX.slice(lastVisibleFace + 1, this.centroidsByX.length)
      : this.centroidsByX.slice(0, lastVisibleFace + 1);

    for (let i = 0; i < facesToKeep.length; i++) {
      this.isVisibleX[facesToKeep[i]] = true;
    }

    for (let i = 0; i < facesToRemove.length; i++) {
      this.isVisibleX[facesToRemove[i]] = false;
    }

    return this.setVisibleFaces();
  }

  sliceY(sliderValue) {
    const centroid = this.originalMeshGeometry.getAttribute("centroid").array;

    const maxPosition = this.planeXZ.geometry.userData.resetPosition;
    this.planeXZ.position.y = sliderValue * (maxPosition / maxSliderValue);

    const lastVisibleFace = binarySearchClosest(
      this.centroidsByY,
      (i) => centroid[i * 3 + 1],
      this.planeXZ.position.y
    );

    var facesToKeep = !this.isReversedY
      ? this.centroidsByY.slice(0, lastVisibleFace + 1)
      : this.centroidsByY.slice(lastVisibleFace + 1, this.centroidsByY.length);

    var facesToRemove = !this.isReversedY
      ? this.centroidsByY.slice(lastVisibleFace + 1, this.centroidsByY.length)
      : this.centroidsByY.slice(0, lastVisibleFace + 1);

    for (let i = 0; i < facesToKeep.length; i++) {
      this.isVisibleY[facesToKeep[i]] = true;
    }

    for (let i = 0; i < facesToRemove.length; i++) {
      this.isVisibleY[facesToRemove[i]] = false;
    }

    return this.setVisibleFaces();
  }

  sliceZ(sliderValue) {
    const centroid = this.originalMeshGeometry.getAttribute("centroid").array;

    const maxPosition = this.planeXY.geometry.userData.resetPosition;
    this.planeXY.position.z = sliderValue * (maxPosition / maxSliderValue);

    const lastVisibleFace = binarySearchClosest(
      this.centroidsByZ,
      (i) => centroid[i * 3 + 2],
      this.planeXY.position.z
    );

    var facesToKeep = !this.isReversedZ
      ? this.centroidsByZ.slice(0, lastVisibleFace + 1)
      : this.centroidsByZ.slice(lastVisibleFace + 1, this.centroidsByZ.length);

    var facesToRemove = !this.isReversedZ
      ? this.centroidsByZ.slice(lastVisibleFace + 1, this.centroidsByZ.length)
      : this.centroidsByZ.slice(0, lastVisibleFace + 1);

    for (let i = 0; i < facesToKeep.length; i++) {
      this.isVisibleZ[facesToKeep[i]] = true;
    }

    for (let i = 0; i < facesToRemove.length; i++) {
      this.isVisibleZ[facesToRemove[i]] = false;
    }

    return this.setVisibleFaces();
  }

  setVisibleFaces() {
    const vertices = this.originalMeshGeometry.userData.vertices;
    const faces = this.originalMeshGeometry.userData.triangles;

    const segments = this.originalWireframeGeometry.getIndex().array;

    var tmpTriangleSoup = new Array();
    var tmpSegments = new Array();

    for (let i = 0; i < faces.length / 3; i++) {
      if (this.isVisibleX[i] && this.isVisibleY[i] && this.isVisibleZ[i]) {
        const v1 = faces[i * 3],
          v2 = faces[i * 3 + 1],
          v3 = faces[i * 3 + 2];

        tmpTriangleSoup.push(vertices[v1 * 3]);
        tmpTriangleSoup.push(vertices[v1 * 3 + 1]);
        tmpTriangleSoup.push(vertices[v1 * 3 + 2]);
        tmpTriangleSoup.push(vertices[v2 * 3]);
        tmpTriangleSoup.push(vertices[v2 * 3 + 1]);
        tmpTriangleSoup.push(vertices[v2 * 3 + 2]);
        tmpTriangleSoup.push(vertices[v3 * 3]);
        tmpTriangleSoup.push(vertices[v3 * 3 + 1]);
        tmpTriangleSoup.push(vertices[v3 * 3 + 2]);

        tmpSegments.push(segments[i * 6]);
        tmpSegments.push(segments[i * 6 + 1]);
        tmpSegments.push(segments[i * 6 + 2]);
        tmpSegments.push(segments[i * 6 + 3]);
        tmpSegments.push(segments[i * 6 + 4]);
        tmpSegments.push(segments[i * 6 + 5]);
      }
    }

    tmpTriangleSoup = new Float32Array(tmpTriangleSoup);
    this.surfaceMesh
      .getMesh()
      .geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(tmpTriangleSoup, 3)
      );
    this.surfaceMesh.getMesh().geometry.computeVertexNormals();
    this.surfaceMesh.getMesh().geometry.needsUpdate = true;

    tmpSegments = new Uint16Array(tmpSegments);
    this.surfaceMesh
      .getWireframe()
      .geometry.setIndex(new THREE.BufferAttribute(tmpSegments, 1));
    this.surfaceMesh.getWireframe().geometry.needsUpdate = true;
  }

  reverseX() {
    this.isReversedX = !this.isReversedX;

    if (!this.isReversedX) {
      this.sliceX(maxSliderValue);
    } else {
      this.sliceX(minSliderValue);
    }

    return this.isReversedX; // Ritorna lo stato corrente di isReversedX
  }

  reverseY() {
    this.isReversedY = !this.isReversedY;

    if (!this.isReversedY) {
      this.sliceY(maxSliderValue);
    } else {
      this.sliceY(minSliderValue);
    }

    return this.isReversedY; // Ritorna lo stato corrente di isReversedY
  }

  reverseZ() {
    this.isReversedZ = !this.isReversedZ;

    if (!this.isReversedZ) {
      this.sliceZ(maxSliderValue);
    } else {
      this.sliceZ(minSliderValue);
    }

    return this.isReversedZ; // Ritorna lo stato corrente di isReversedZ
  }

  reset() {
    this.isVisibleX.fill(true);
    this.isVisibleY.fill(true);
    this.isVisibleZ.fill(true);
    this.setVisibleFaces();

    if (this.isReversedX) {
      this.reverseX();
    }
    if (this.isReversedY) {
      this.reverseY();
    }
    if (this.isReversedZ) {
      this.reverseZ();
    }

    this.planeYZ.position.x = this.planeYZ.geometry.userData.resetPosition;
    this.planeXZ.position.y = this.planeXZ.geometry.userData.resetPosition;
    this.planeXY.position.z = this.planeXY.geometry.userData.resetPosition;
  }
}
