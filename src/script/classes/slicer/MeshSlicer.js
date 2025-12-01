import * as THREE from "../../../libs/three/three.module.js";
import * as utils from "../../main/utils.js";

const minSliderValue = -100;
const maxSliderValue = 100;

const minDistSliderValue = 0;
const maxDistSliderValue = 100;

const minClampedDistortion = 0;
const maxClampedDistortion = 1;

export class MeshSlicer {
  meshRenderer = null;

  polysByCentroidX = null; // Polyhedra sorted by centroid x-axis
  polysByCentroidY = null; // Polyhedra sorted by centroid y-axis
  polysByCentroidZ = null; // Polyhedra sorted by centroid z-axis
  polysByDistortion = null; // Polyhedra sorted by distortion value

  polyVisibilityX = null;
  polyVisibilityY = null;
  polyVisibilityZ = null;
  polyVisibilityDistortion = null;

  planeYZ = null;
  planeXZ = null;
  planeXY = null;

  isReversedX = false;
  isReversedY = false;
  isReversedZ = false;
  isReversedDistortion = false;
  isDegenerateFilterActive = false;

  constructor(meshRenderer) {
    this.meshRenderer = meshRenderer;

    meshRenderer.setMeshSlicer(this);
  }

  setMesh() {
    this.setPolysByCentroids();
    this.setPlanes();
    //Set initial visibility of the faces
    this.setVisibleFaces();

    this.reset();
    this.controller.reset();
  }

  setMap() {
    this.setPolysByDistortion();
  }

  setPolysByCentroids() {
    const centroids = this.meshRenderer.getMeshWrapper().getMesh().geometry
      .userData.polyCentroids;

    //Polyhedra indexes array
    var tmpPolys = new Array(centroids.length / 3);

    for (let j = 0; j < tmpPolys.length; j++) {
      tmpPolys[j] = j;
    }

    //Sorting function by comparing specified centroids coordinate
    function sortByCoord(coordIndex) {
      return function (a, b) {
        const aCoord = centroids[coordIndex + a * 3];
        const bCoord = centroids[coordIndex + b * 3];
        return aCoord - bCoord;
      };
    }

    //Sorted polyhedra arrays
    this.polysByCentroidX = Array.from(tmpPolys).sort(sortByCoord(0));
    this.polysByCentroidY = Array.from(tmpPolys).sort(sortByCoord(1));
    this.polysByCentroidZ = Array.from(tmpPolys).sort(sortByCoord(2));

    this.polyVisibilityX = new Array(centroids.length / 3).fill(true);
    this.polyVisibilityY = new Array(centroids.length / 3).fill(true);
    this.polyVisibilityZ = new Array(centroids.length / 3).fill(true);
  }

  setPolysByDistortion() {
    const polyDistortion =
      this.meshRenderer.meshMapViewer.clampedPolyDistortion;
    //Polyhedra indexes array
    var tmpPolys = new Array(polyDistortion.length);

    for (let j = 0; j < polyDistortion.length; j++) {
      tmpPolys[j] = j;
    }

    //Sorting function by comparing distortion values
    function sortByDistortion(a, b) {
      const aDistortion = polyDistortion[a];
      const bDistortion = polyDistortion[b];
      return aDistortion - bDistortion;
    }

    tmpPolys.sort(sortByDistortion);
    this.polysByDistortion = tmpPolys;

    this.polyVisibilityDistortion = new Array(polyDistortion.length).fill(true);
  }

  setPlanes() {
    const box = this.meshRenderer.getMeshWrapper().getMesh()
      .geometry.boundingBox;
    const size = box.getSize(new THREE.Vector3());
    var distance = new THREE.Vector3(size.x / 2, size.y / 2, size.z / 2);

    //Function to create a plane helper
    function createPlaneHelper(width, height, distance, color, type) {
      //Create the plane geometry
      const planeGeometry = new THREE.PlaneGeometry(width, height);

      // Semi-transparent material
      const planeMaterial = new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
      });

      // Create the plane
      const plane = new THREE.Mesh(planeGeometry, planeMaterial);
      plane.renderOrder = 0; // Ensure the plane is drawn above other objects

      // Rotate and translate the plane based on the type
      if (type === "YZ") {
        plane.rotation.y = Math.PI / 2; // Rotate 90° to be parallel to YZ
        plane.position.x = distance; // Translate along X
      } else if (type === "XZ") {
        plane.rotation.x = Math.PI / 2; // Rotate 90° to be parallel to XZ
        plane.position.y = distance; // Translate along Y
      } else if (type === "XY") {
        plane.position.z = distance; // Translate along Z (no rotation needed)
      } else {
        console.error("Invalid plane type. Use 'XY', 'XZ' or 'YZ'.");
      }

      plane.geometry.userData = {
        resetPosition: distance,
      };

      return plane;
    }

    //Create the 3 planes
    this.planeYZ = createPlaneHelper(
      size.z,
      size.y,
      distance.x,
      utils.redHex,
      "YZ"
    );
    this.planeXZ = createPlaneHelper(
      size.x,
      size.z,
      distance.y,
      utils.blueHex,
      "XZ"
    );
    this.planeXY = createPlaneHelper(
      size.x,
      size.y,
      distance.z,
      utils.greenHex,
      "XY"
    );
  }

  //Slice along a given direction (0=X, 1=Y, 2=Z)
  slice(sliderValue, direction) {
    if (!this.meshRenderer.getMeshWrapper()) {
      console.log("Mesh not loaded yet");
      return false;
    }

    const centroids = this.meshRenderer.getMeshWrapper().getMesh().geometry
      .userData.polyCentroids;
    //Find the correct arrays and flags based on the direction
    var polysByCentroid, isReversed, polyVisibility, plane;
    if (direction === 0) {
      polysByCentroid = this.polysByCentroidX;
      isReversed = this.isReversedX;
      polyVisibility = this.polyVisibilityX;
      plane = this.planeYZ;
    } else if (direction === 1) {
      polysByCentroid = this.polysByCentroidY;
      isReversed = this.isReversedY;
      polyVisibility = this.polyVisibilityY;
      plane = this.planeXZ;
    } else {
      polysByCentroid = this.polysByCentroidZ;
      isReversed = this.isReversedZ;
      polyVisibility = this.polyVisibilityZ;
      plane = this.planeXY;
    }
    const maxPosition = plane.geometry.userData.resetPosition;

    const position = sliderValue * (maxPosition / maxSliderValue);

    //Update plane position with respecting the direction
    if (direction === 0) {
      plane.position.x = position;
    } else if (direction === 1) {
      plane.position.y = position;
    } else {
      plane.position.z = position;
    }

    const lastVisibleFace = utils.binarySearchClosest(
      polysByCentroid,
      //Function to find the right coordinate of the centroid to evaluate
      (i) => centroids[i * 3 + direction],
      position
    );

    for (let i = 0; i < polysByCentroid.length; i++) {
      // PolysToKeep and PolysToRemove are reversed when isReversedX is true
      if (i <= lastVisibleFace) {
        polyVisibility[polysByCentroid[i]] = !isReversed;
      } else {
        polyVisibility[polysByCentroid[i]] = isReversed;
      }
    }

    this.setVisibleFaces();

    return true;
  }

  sliceDistortion(sliderValue) {
    if (!this.meshRenderer.meshMapViewer.isMapActive) {
      console.warn("Map not active");
      return false;
    }

    const clampedPolyDistortion =
      this.meshRenderer.meshMapViewer.clampedPolyDistortion;

    const distortion = this.isDegenerateFilterActive
      ? Infinity
      : minClampedDistortion +
        (sliderValue / maxDistSliderValue) *
          (maxClampedDistortion - minClampedDistortion);

    var firstVisiblePoly = utils.binarySearchClosest(
      this.polysByDistortion,
      (i) => clampedPolyDistortion[i],
      distortion
    );

    //Include all polyhedra with the same distortion value as the first visible one
    if (!this.isReversedDistortion) {
      for (let i = firstVisiblePoly - 1; i >= 0; i--) {
        if (
          this.clampedPolyhedraDistortion[this.polysByDistortion[i]] ===
          this.clampedPolyhedraDistortion[
            this.polysByDistortion[firstVisiblePoly]
          ]
        ) {
          firstVisiblePoly = i;
        } else {
          break;
        }
      }
    } else if (this.isReversedDistortion || distortion == Infinity) {
      for (
        let i = firstVisiblePoly + 1;
        i < this.polysByDistortion.length;
        i++
      ) {
        if (
          this.clampedPolyhedraDistortion[this.polysByDistortion[i]] ===
          this.clampedPolyhedraDistortion[
            this.polysByDistortion[firstVisiblePoly]
          ]
        ) {
          firstVisiblePoly = i;
        } else {
          break;
        }
      }
    }

    for (let i = 0; i < this.polysByDistortion.length; i++) {
      // PolysToKeep and PolysToRemove are reversed when isReversedDistortion is true except for degenerate filter
      if (i >= firstVisiblePoly) {
        this.polyVisibilityDistortion[this.polysByDistortion[i]] = this
          .isDegenerateFilterActive
          ? true
          : !this.isReversedDistortion;
      } else {
        this.polyVisibilityDistortion[this.polysByDistortion[i]] = this
          .isDegenerateFilterActive
          ? false
          : this.isReversedDistortion;
      }
    }

    this.setVisibleFaces();

    return true;
  }

  setVisibleFaces() {
    const mesh = this.meshRenderer.getMeshWrapper().getMesh();
    const adjacencyMap = mesh.geometry.userData.adjacencyMap;
    const vertices = mesh.geometry.userData.vertices;
    const isMapActive = this.meshRenderer.meshMapViewer.isMapActive;

    var tmpTriangleSoup = [];
    var tmpPoly = [];
    var tmpSegments = new Array();

    var tmpColor = [];

    for (const key of adjacencyMap.keys()) {
      const value = adjacencyMap.get(key);

      var face = null;
      var poly = null;

      if (value.length < 2) {
        poly = value[0].poly;

        const isVisible =
          this.polyVisibilityX[poly] &&
          this.polyVisibilityY[poly] &&
          this.polyVisibilityZ[poly] &&
          (isMapActive ? this.polyVisibilityDistortion[poly] : true);

        if (isVisible) {
          face = value[0].face;
        }
      } else {
        const poly1 = value[0].poly;
        const poly2 = value[1].poly;

        const isVisible1 =
          this.polyVisibilityX[poly1] &&
          this.polyVisibilityY[poly1] &&
          this.polyVisibilityZ[poly1] &&
          (isMapActive ? this.polyVisibilityDistortion[poly1] : true);
        const isVisible2 =
          this.polyVisibilityX[poly2] &&
          this.polyVisibilityY[poly2] &&
          this.polyVisibilityZ[poly2] &&
          (isMapActive ? this.polyVisibilityDistortion[poly2] : true);

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
          // Get vertex index
          const v = face[i];
          // Push vertex coordinates
          tmpTriangleSoup.push(vertices[v * 3]);
          tmpTriangleSoup.push(vertices[v * 3 + 1]);
          tmpTriangleSoup.push(vertices[v * 3 + 2]);
        }

        tmpPoly.push(poly);

        tmpSegments.push(face[0], face[1]);
        tmpSegments.push(face[1], face[2]);
        tmpSegments.push(face[2], face[0]);

        if (isMapActive) {
          const color = mesh.geometry.userData.polygonsColor[poly];
          tmpColor.push(color.r, color.g, color.b);
          tmpColor.push(color.r, color.g, color.b);
          tmpColor.push(color.r, color.g, color.b);
        }
      }
    }

    mesh.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(tmpTriangleSoup), 3)
    );
    mesh.geometry.computeVertexNormals();

    mesh.geometry.setAttribute(
      "poly",
      new THREE.BufferAttribute(new Float32Array(tmpPoly), 1)
    );

    if (isMapActive) {
      mesh.geometry.setAttribute(
        "color",
        new THREE.BufferAttribute(new Float32Array(tmpColor), 3)
      );
    }

    mesh.geometry.needsUpdate = true;

    this.meshRenderer
      .getMeshWrapper()
      .getWireframe()
      .geometry.setIndex(
        new THREE.BufferAttribute(new Uint32Array(tmpSegments), 1)
      );
    this.meshRenderer
      .getMeshWrapper()
      .getWireframe().geometry.needsUpdate = true;
  }

  reverse(sliderValue, direction) {
    if (direction === 0) {
      this.isReversedX = !this.isReversedX;
    } else if (direction === 1) {
      this.isReversedY = !this.isReversedY;
    } else {
      this.isReversedZ = !this.isReversedZ;
    }

    return this.slice(sliderValue, direction);
  }

  reverseDistortion(sliderValue) {
    this.isReversedDistortion = !this.isReversedDistortion;

    return this.sliceDistortion(sliderValue);
  }

  degenerateFilterToggle(flag, sliderValue) {
    if (!this.meshRenderer.meshMapViewer.isMapActive) {
      console.warn("Map not active");
      return false;
    }

    this.isDegenerateFilterActive = flag;
    this.sliceDistortion(sliderValue);

    return true;
  }

  reset() {
    this.polyVisibilityX.fill(true);
    this.polyVisibilityY.fill(true);
    this.polyVisibilityZ.fill(true);

    this.isReversedX = false;
    this.isReversedY = false;
    this.isReversedZ = false;

    this.planeYZ.position.x = this.planeYZ.geometry.userData.resetPosition;
    this.planeXZ.position.y = this.planeXZ.geometry.userData.resetPosition;
    this.planeXY.position.z = this.planeXY.geometry.userData.resetPosition;

    if (this.meshRenderer.meshMapViewer.isMapActive) {
      this.polyVisibilityDistortion.fill(true);
      this.isReversedDistortion = false;
    }

    this.togglePlane(true, 0);
    this.togglePlane(true, 1);
    this.togglePlane(true, 2);

    this.setVisibleFaces();
  }

  togglePlane(flag, direction) {
    if (!this.meshRenderer.getMeshWrapper()) {
      console.log("Mesh not loaded yet");
      return false;
    }

    const plane =
      direction === 0
        ? this.planeYZ
        : direction === 1
        ? this.planeXZ
        : this.planeXY;

    if (flag) {
      this.meshRenderer.scene.add(plane);
    } else {
      this.meshRenderer.scene.remove(plane);
    }

    return true;
  }
}
