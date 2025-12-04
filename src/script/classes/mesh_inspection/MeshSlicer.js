import * as THREE from "../../../libs/three/three.module.js";

const red = 0xff8080;
const green = 0x80ff80;
const blue = 0x8080ff;

const maxSliderValue = 100;
const minSliderValue = -100;

const minDistSliderValue = 0;
const maxDistSliderValue = 100;

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

export class MeshSlicer {
  volumeMesh = null;
  originalMeshGeometry = null; // Original mesh object
  originalWireframeGeometry = null; // Original wireframe object

  centroidsByX = null; // Centroids of the faces by x-axis
  centroidsByY = null; // Centroids of the faces by y-axis
  centroidsByZ = null; // Centroids of the faces by z-axis
  polyhedraByDistortion = null; // Polyhedra sorted by distortion value

  isVisibleX = null;
  isVisibleY = null;
  isVisibleZ = null;
  isVisibleDistortion = null;

  planeYZ = null;
  planeXZ = null;
  planeXY = null;

  isReversedX = false;
  isReversedY = false;
  isReversedZ = false;
  isReversedDistortion = true;

  isMapActive = false;
  distortionSliderValue = 0;

  clampedPolyhedraDistortion = null;
  minDistortion = 0;
  maxDistortion = 1;

  constructor(volumeMesh) {
    this.volumeMesh = volumeMesh; // Surface mesh object
    this.originalMeshGeometry = volumeMesh.getMesh().geometry.clone(); // Clone the original mesh geometry
    this.originalWireframeGeometry = volumeMesh.getWireframe().geometry.clone(); // Clone the original wireframe geometry

    this.setCentroids();
    this.setPlanes();

    this.setVisibleFaces(); // Set the initial visibility of the faces
  }

  setCentroids() {
    const centroidAttribute =
      this.originalMeshGeometry.getAttribute("centroid");

    //vettore indici centroidi
    var tmpCentroids = new Array(centroidAttribute.count);

    for (let j = 0; j < centroidAttribute.count; j++) {
      tmpCentroids[j] = j;
    }

    //funzione di ordinamento
    function sortByCoord(coordIndex) {
      return function (a, b) {
        const aCoord = centroidAttribute.array[coordIndex + a * 3];
        const bCoord = centroidAttribute.array[coordIndex + b * 3];
        return aCoord - bCoord;
      };
    }

    //popolamento 3 array indicizzati ordinati per x,y,z
    this.centroidsByX = Array.from(tmpCentroids).sort(sortByCoord(0));
    this.centroidsByY = Array.from(tmpCentroids).sort(sortByCoord(1));
    this.centroidsByZ = Array.from(tmpCentroids).sort(sortByCoord(2));

    this.isVisibleX = new Array(centroidAttribute.count).fill(true);
    this.isVisibleY = new Array(centroidAttribute.count).fill(true);
    this.isVisibleZ = new Array(centroidAttribute.count).fill(true);
    this.isVisibleDistortion = new Array(centroidAttribute.count).fill(true);
  }

  setPolyhedraByDistortion(clampedPolyhedraDistortion) {
    this.clampedPolyhedraDistortion = clampedPolyhedraDistortion;

    var tmpPolyhedra = new Array(clampedPolyhedraDistortion.length);

    for (let j = 0; j < clampedPolyhedraDistortion.length; j++) {
      tmpPolyhedra[j] = j;
    }

    //funzione di ordinamento
    function sortByDistortion(a, b) {
      const aDistortion = clampedPolyhedraDistortion[a];
      const bDistortion = clampedPolyhedraDistortion[b];
      return aDistortion - bDistortion;
    }

    tmpPolyhedra.sort(sortByDistortion);
    this.polyhedraByDistortion = tmpPolyhedra;

    this.isVisibleDistortion = new Array(
      clampedPolyhedraDistortion.length
    ).fill(true);

    this.sliceDistortion(this.distortionSliderValue);
  }

  setPlanes() {
    const box = this.originalMeshGeometry.boundingBox;
    const size = box.getSize(new THREE.Vector3());
    var distance = new THREE.Vector3(size.x / 2, size.y / 2, size.z / 2);

    //Funzione di creazione planeHelper
    function createPlaneHelper(width, height, distance, color, type) {
      // Creazione della geometria del piano
      const planeGeometry = new THREE.PlaneGeometry(width, height);

      // Materiale semi-trasparente
      const planeMaterial = new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
      });

      // Creazione del piano
      const plane = new THREE.Mesh(planeGeometry, planeMaterial);
      plane.renderOrder = 0; // Assicurati che il piano venga disegnato sopra gli altri oggetti

      // 🔹 Ruota e trasla il piano in base al tipo
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

    //Creazione dei 3 piani
    this.planeYZ = createPlaneHelper(size.z, size.y, distance.x, red, "YZ");
    this.planeXZ = createPlaneHelper(size.x, size.z, distance.y, blue, "XZ");
    this.planeXY = createPlaneHelper(size.x, size.y, distance.z, green, "XY");
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

    var polysToKeep = !this.isReversedX
      ? this.centroidsByX.slice(0, lastVisibleFace + 1)
      : this.centroidsByX.slice(lastVisibleFace + 1, this.centroidsByX.length);

    // Array per salvare gli indici da rimuovere
    var polysToRemove = !this.isReversedX
      ? this.centroidsByX.slice(lastVisibleFace + 1, this.centroidsByX.length)
      : this.centroidsByX.slice(0, lastVisibleFace + 1);

    for (let i = 0; i < polysToKeep.length; i++) {
      this.isVisibleX[polysToKeep[i]] = true;
    }

    for (let i = 0; i < polysToRemove.length; i++) {
      this.isVisibleX[polysToRemove[i]] = false;
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

    var polysToKeep = !this.isReversedY
      ? this.centroidsByY.slice(0, lastVisibleFace + 1)
      : this.centroidsByY.slice(lastVisibleFace + 1, this.centroidsByY.length);

    var polysToRemove = !this.isReversedY
      ? this.centroidsByY.slice(lastVisibleFace + 1, this.centroidsByY.length)
      : this.centroidsByY.slice(0, lastVisibleFace + 1);

    for (let i = 0; i < polysToKeep.length; i++) {
      this.isVisibleY[polysToKeep[i]] = true;
    }

    for (let i = 0; i < polysToRemove.length; i++) {
      this.isVisibleY[polysToRemove[i]] = false;
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

    var polysToKeep = !this.isReversedZ
      ? this.centroidsByZ.slice(0, lastVisibleFace + 1)
      : this.centroidsByZ.slice(lastVisibleFace + 1, this.centroidsByZ.length);

    var polysToRemove = !this.isReversedZ
      ? this.centroidsByZ.slice(lastVisibleFace + 1, this.centroidsByZ.length)
      : this.centroidsByZ.slice(0, lastVisibleFace + 1);

    for (let i = 0; i < polysToKeep.length; i++) {
      this.isVisibleZ[polysToKeep[i]] = true;
    }

    for (let i = 0; i < polysToRemove.length; i++) {
      this.isVisibleZ[polysToRemove[i]] = false;
    }

    return this.setVisibleFaces();
  }

  sliceDistortion(sliderValue) {
    if (!this.isMapActive) {
      return false;
    }

    this.distortionSliderValue = sliderValue;
    var distortion = null;

    if (sliderValue == Infinity) {
      this.isReversedDistortion = true;
      distortion = Infinity;
    } else {
      distortion =
        this.minDistortion +
        (sliderValue / maxDistSliderValue) *
          (this.maxDistortion - this.minDistortion);
    }

    var lastVisiblePoly = binarySearchClosest(
      this.polyhedraByDistortion,
      (i) => this.clampedPolyhedraDistortion[i],
      distortion
    );
    console.log(
      distortion,
      lastVisiblePoly,
      this.clampedPolyhedraDistortion[
        this.polyhedraByDistortion[lastVisiblePoly]
      ]
    );

    if (!this.isReversedDistortion) {
      for (
        let i = lastVisiblePoly + 1;
        i < this.clampedPolyhedraDistortion.length;
        i++
      ) {
        if (
          this.clampedPolyhedraDistortion[this.polyhedraByDistortion[i]] ===
          this.clampedPolyhedraDistortion[
            [this.polyhedraByDistortion[lastVisiblePoly]]
          ]
        ) {
          lastVisiblePoly = i;
        } else {
          break;
        }
      }
    } else {
      for (let i = lastVisiblePoly - 1; i >= 0; i--) {
        if (
          this.clampedPolyhedraDistortion[this.polyhedraByDistortion[i]] ===
          this.clampedPolyhedraDistortion[
            this.polyhedraByDistortion[lastVisiblePoly]
          ]
        ) {
          lastVisiblePoly = i;
        } else {
          break;
        }
      }
    }

    var polysToKeep = null;
    var polysToRemove = null;

    if (
      distortion === Infinity &&
      this.clampedPolyhedraDistortion[
        this.polyhedraByDistortion[lastVisiblePoly]
      ] !== Infinity
    ) {
      polysToKeep = this.polyhedraByDistortion.slice(0, 0);
      polysToRemove = this.polyhedraByDistortion.slice(0);

      console.log(polysToKeep);
    } else {
      polysToKeep = !this.isReversedDistortion
        ? this.polyhedraByDistortion.slice(0, lastVisiblePoly + 1)
        : this.polyhedraByDistortion.slice(
            lastVisiblePoly,
            this.polyhedraByDistortion.length
          );

      polysToRemove = !this.isReversedDistortion
        ? this.polyhedraByDistortion.slice(
            lastVisiblePoly + 1,
            this.polyhedraByDistortion.length
          )
        : this.polyhedraByDistortion.slice(0, lastVisiblePoly);

      console.log(polysToKeep);
    }

    console.log(
      lastVisiblePoly,
      this.clampedPolyhedraDistortion[
        this.polyhedraByDistortion[lastVisiblePoly]
      ],
      this.polyhedraByDistortion.length
    );

    for (let i = 0; i < polysToKeep.length; i++) {
      this.isVisibleDistortion[polysToKeep[i]] = true;
    }

    for (let i = 0; i < polysToRemove.length; i++) {
      this.isVisibleDistortion[polysToRemove[i]] = false;
    }

    this.setVisibleFaces();

    return true;
  }

  setVisibleFaces() {
    const map = this.originalMeshGeometry.userData.adjacencyMap;
    const vertices = this.originalMeshGeometry.userData.vertices;
    var tmpTriangleSoup = [];
    var tmpColors = [];
    var tmpDistortion = [];
    var tmpPoly = [];
    var tmpSegments = new Array();

    for (const key of map.keys()) {
      const value = map.get(key);

      var face = null;
      var poly = null;

      if (value.length < 2) {
        poly = value[0].poly;

        const isVisible =
          this.isVisibleX[poly] &&
          this.isVisibleY[poly] &&
          this.isVisibleZ[poly] &&
          (this.isMapActive ? this.isVisibleDistortion[poly] : true);

        if (isVisible) {
          face = value[0].face;
        }
      } else {
        const poly1 = value[0].poly;
        const poly2 = value[1].poly;

        const isVisible1 =
          this.isVisibleX[poly1] &&
          this.isVisibleY[poly1] &&
          this.isVisibleZ[poly1] &&
          (this.isMapActive ? this.isVisibleDistortion[poly1] : true);
        const isVisible2 =
          this.isVisibleX[poly2] &&
          this.isVisibleY[poly2] &&
          this.isVisibleZ[poly2] &&
          (this.isMapActive ? this.isVisibleDistortion[poly2] : true);

        if (isVisible1 && !isVisible2) {
          face = value[0].face;
          poly = poly1;
        }

        if (!isVisible1 && isVisible2) {
          face = value[1].face;
          poly = poly2;
        }
      }

      if (face) {
        for (let i = 0; i < face.length; i++) {
          const v = face[i];

          tmpTriangleSoup.push(vertices[v * 3]);
          tmpTriangleSoup.push(vertices[v * 3 + 1]);
          tmpTriangleSoup.push(vertices[v * 3 + 2]);
        }

        if (this.isMapActive) {
          const color =
            this.volumeMesh.getMesh().geometry.userData.polygonsColor[poly];
          tmpColors.push(color.r, color.g, color.b);
          tmpColors.push(color.r, color.g, color.b);
          tmpColors.push(color.r, color.g, color.b);
          const distortion =
            this.volumeMesh.getMesh().geometry.userData.polygonsDistortion[
              poly
            ];
          tmpDistortion.push(distortion);
          tmpPoly.push(poly);
        }

        tmpSegments.push(face[0], face[1]);
        tmpSegments.push(face[1], face[2]);
        tmpSegments.push(face[2], face[0]);
      }
    }

    tmpTriangleSoup = new Float32Array(tmpTriangleSoup);
    this.volumeMesh
      .getMesh()
      .geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(tmpTriangleSoup, 3)
      );
    this.volumeMesh.getMesh().geometry.computeVertexNormals();

    tmpColors = new Float32Array(tmpColors);
    this.volumeMesh
      .getMesh()
      .geometry.setAttribute("color", new THREE.BufferAttribute(tmpColors, 3));

    this.volumeMesh.getMesh().geometry.needsUpdate = true;

    tmpDistortion = new Float32Array(tmpDistortion);
    this.volumeMesh
      .getMesh()
      .geometry.setAttribute(
        "distortion",
        new THREE.BufferAttribute(tmpDistortion, 1)
      );

    tmpPoly = new Float32Array(tmpPoly);
    this.volumeMesh
      .getMesh()
      .geometry.setAttribute("poly", new THREE.BufferAttribute(tmpPoly, 1));

    tmpSegments = new Uint32Array(tmpSegments);
    this.volumeMesh
      .getWireframe()
      .geometry.setIndex(new THREE.BufferAttribute(tmpSegments, 1));
    this.volumeMesh.getWireframe().geometry.needsUpdate = true;
  }

  reverseX(sliderValue) {
    this.isReversedX = !this.isReversedX;

    this.sliceX(sliderValue);
  }

  reverseY(sliderValue) {
    this.isReversedY = !this.isReversedY;

    this.sliceY(sliderValue);
  }

  reverseZ(sliderValue) {
    this.isReversedZ = !this.isReversedZ;

    this.sliceZ(sliderValue);
  }

  reverseDistortion(sliderValue) {
    if (!this.isMapActive) {
      return false;
    }

    this.isReversedDistortion = !this.isReversedDistortion;

    this.sliceDistortion(sliderValue);

    return true;
  }

  reset() {
    this.isVisibleX.fill(true);
    this.isVisibleY.fill(true);
    this.isVisibleZ.fill(true);

    this.isReversedX = false;
    this.isReversedY = false;
    this.isReversedZ = false;

    this.planeYZ.position.x = this.planeYZ.geometry.userData.resetPosition;
    this.planeXZ.position.y = this.planeXZ.geometry.userData.resetPosition;
    this.planeXY.position.z = this.planeXY.geometry.userData.resetPosition;

    this.resetDistortion();
  }

  resetDistortion() {
    this.isVisibleDistortion.fill(true);
    this.distortionSliderValue = 0;
    this.isReversedDistortion = true;

    this.setVisibleFaces();
  }
}
