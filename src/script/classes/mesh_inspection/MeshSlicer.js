import * as THREE from "../../../libs/three/three.module.js";
import * as utils from "../../main/utils.js";

const minSliderValue = -100;
const maxSliderValue = 100;

function AxisData() {
  return {
    plane: null,
    // polyhedra sorted by centroid coordinate
    polyByCentroid: null,
    polyVisibility: null,
    isReversed: false,
  };
}

export class MeshSlicer {
  isActive = false;

  x = AxisData();
  y = AxisData();
  z = AxisData();

  volumeMesh = null;

  constructor(volumeMesh) {
    this.volumeMesh = volumeMesh;
  }

  updateMesh() {
    this.computeCentroids();
    this.setPlanesAndReversed();
    this.setPolyByCentroidAndVisibility();
  }

  getSlicingPlane(axisIndex) {
    if (!this.volumeMesh.mesh) {
      console.warn("Mesh not loaded yet");
      return null;
    }

    return axisIndex === 0 ? this.x.plane : axisIndex === 1 ? this.y.plane : this.z.plane;
  }

  setActive(flag) {
    this.isActive = flag;
  }

  // This method computes the centroids of the mesh's tetrahedra
  computeCentroids() {
    const tetrahedra = this.volumeMesh.mesh.geometry.userData.tetrahedra;
    const vertices = this.volumeMesh.mesh.geometry.userData.vertices;

    const numTetrahedra = tetrahedra.length / 4;
    let centroids = new Array(numTetrahedra * 3);

    for (let i = 0; i < numTetrahedra; i++) {
      let centroid = [0, 0, 0];
      //Visit every vertex of the tetrahedron
      for (let j = 0; j < 4; j++) {
        const vertexIndex = tetrahedra[i * 4 + j];
        //Visit every coordinate of the vertex and sum it to the other corresponding coordinates
        for (let k = 0; k < 3; k++) {
          centroid[k] += vertices[vertexIndex * 3 + k];
        }
      }

      //Average the sum of the corresponding coordinates and assign it
      for (let k = 0; k < 3; k++) {
        centroid[k] /= 4;
        centroids[i * 3 + k] = centroid[k];
      }
    }

    this.volumeMesh.mesh.geometry.userData.polyCentroids = centroids;
  }

  setPolyByCentroidAndVisibility() {
    const polyCentroids = this.volumeMesh.mesh.geometry.userData.polyCentroids;
    //Polyhedra indexes array
    var tmpPoly = new Array(polyCentroids.length / 3);
    for (let j = 0; j < tmpPoly.length; j++) {
      tmpPoly[j] = j;
    }

    //Sorting function by comparing specified centroid's coordinate
    function sortByCoord(coordIndex) {
      return function (aIndex, bIndex) {
        const aCoord = polyCentroids[aIndex * 3 + coordIndex];
        const bCoord = polyCentroids[bIndex * 3 + coordIndex];
        return aCoord - bCoord;
      };
    }

    //Sorted polyhedra arrays
    this.x.polyByCentroid = Array.from(tmpPoly).sort(sortByCoord(0));
    this.y.polyByCentroid = Array.from(tmpPoly).sort(sortByCoord(1));
    this.z.polyByCentroid = Array.from(tmpPoly).sort(sortByCoord(2));
    //Initial visibility arrays
    this.x.polyVisibility = new Array(tmpPoly.length).fill(true);
    this.y.polyVisibility = new Array(tmpPoly.length).fill(true);
    this.z.polyVisibility = new Array(tmpPoly.length).fill(true);
  }

  setPlanesAndReversed() {
    const box = this.volumeMesh.mesh.geometry.boundingBox;
    const size = box.getSize(new THREE.Vector3());
    const distance = new THREE.Vector3(size.x / 2, size.y / 2, size.z / 2);

    //Function to create a plane helper
    function createPlaneHelper(width, height, distance, color, axisIndex) {
      // Create the plane geometry
      const planeGeometry = new THREE.PlaneGeometry(width, height);

      // Create a semi-transparent material
      const planeMaterial = new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.3,
      });

      // Create the plane helper
      const plane = new THREE.Mesh(planeGeometry, planeMaterial);
      plane.renderOrder = 4; // Ensure that the plane is drawn above other objects

      // Rotate and translate the plane based on the axis
      if (axisIndex === 0) {
        plane.rotation.y = Math.PI / 2; // Rotate 90° to be perpendicular to x-axis
        plane.position.x = distance; // Translate along X
      } else if (axisIndex === 1) {
        plane.rotation.x = Math.PI / 2; // Rotate 90° to be perpendicular to y-axis
        plane.position.y = distance; // Translate along Y
      } else if (axisIndex === 2) {
        plane.position.z = distance; // Translate along Z (no rotation needed)
      } else {
        console.error("Invalid plane axis index: must be 0 for x, 1 for y, or 2 for z.");
      }

      plane.geometry.userData = {
        resetPosition: distance,
      };

      return plane;
    }

    //Create the 3 planes
    this.x.plane = createPlaneHelper(size.z, size.y, distance.x, utils.redHex, 0);
    this.y.plane = createPlaneHelper(size.x, size.z, distance.y, utils.blueHex, 1);
    this.z.plane = createPlaneHelper(size.x, size.y, distance.z, utils.greenHex, 2);
    //Initial reversed flags
    this.x.isReversed = false;
    this.y.isReversed = false;
    this.z.isReversed = false;
  }

  isPolyVisible(polyIndex) {
    if (!this.volumeMesh.mesh) {
      console.warn("Mesh not loaded yet");
      return null;
    }

    return (
      this.x.polyVisibility[polyIndex] &&
      this.y.polyVisibility[polyIndex] &&
      this.z.polyVisibility[polyIndex]
    );
  }

  //Slice along a given axis (0=x, 1=y, 2=z)
  slice(sliderValue, axisIndex) {
    if (!this.volumeMesh.mesh) {
      console.warn("Mesh not loaded yet");
      return false;
    }

    const centroids = this.volumeMesh.mesh.geometry.userData.polyCentroids;
    //Find the correct axis data based on axisIndex
    const axisData = axisIndex === 0 ? this.x : axisIndex === 1 ? this.y : this.z;

    //Update plane position based on the axis and slider value
    const maxPlanePosition = axisData.plane.geometry.userData.resetPosition;
    const planePosition = sliderValue * (maxPlanePosition / maxSliderValue);
    if (axisIndex === 0) {
      axisData.plane.position.x = planePosition;
    } else if (axisIndex === 1) {
      axisData.plane.position.y = planePosition;
    } else {
      axisData.plane.position.z = planePosition;
    }

    //Find last visible face index using binary search
    var lastVisiblePolyhedra = utils.binarySearchClosest(
      axisData.polyByCentroid,
      //Function to find the right coordinate of the centroid to evaluate
      (i) => centroids[i * 3 + axisIndex],
      planePosition
    );

    //Adjust lastVisiblePolyhedra to exclude/include last polyhedra when at boundary
    if (lastVisiblePolyhedra == 0) {
      lastVisiblePolyhedra = -1;
    }
    if (lastVisiblePolyhedra == axisData.polyByCentroid.length - 1) {
      lastVisiblePolyhedra = axisData.polyByCentroid.length;
    }

    for (let i = 0; i < axisData.polyByCentroid.length; i++) {
      // PolysToKeep and PolysToRemove are reversed when isReversed is true
      if (i <= lastVisiblePolyhedra) {
        axisData.polyVisibility[axisData.polyByCentroid[i]] = !axisData.isReversed;
      } else {
        axisData.polyVisibility[axisData.polyByCentroid[i]] = axisData.isReversed;
      }
    }

    return true;
  }

  reverseSlicingDirection(axisIndex) {
    if (!this.volumeMesh.mesh) {
      console.warn("Mesh not loaded yet");
      return false;
    }

    const axisData = axisIndex === 0 ? this.x : axisIndex === 1 ? this.y : this.z;

    axisData.isReversed = !axisData.isReversed;
    for (let i = 0; i < axisData.polyByCentroid.length; i++) {
      axisData.polyVisibility[axisData.polyByCentroid[i]] =
        !axisData.polyVisibility[axisData.polyByCentroid[i]];
    }

    return true;
  }

  /*
  pickerSlice(pickedPolyhedra) {
    if (!this.volumeMesh.mesh) {
      console.warn("Mesh not loaded yet");
      return false;
    }

    //Update sliderValue based on the picked polyhedra
    const polyhedraCentroid =
      this.volumeMesh.mesh.geometry.userData.polyCentroids[pickedPolyhedra * 3];

    const maxPlanePosition = this.x.plane.geometry.userData.resetPosition;
    const sliderValue = polyhedraCentroid * (maxSliderValue / maxPlanePosition);
    this.volumeMesh.controller.updatePickerSliceSlider(sliderValue);

    return this.slice(sliderValue, 0);
  }
  */

  resetSlicer() {
    this.x.plane.position.x = this.x.plane.geometry.userData.resetPosition;
    this.y.plane.position.y = this.y.plane.geometry.userData.resetPosition;
    this.z.plane.position.z = this.z.plane.geometry.userData.resetPosition;

    this.x.isReversed = false;
    this.y.isReversed = false;
    this.z.isReversed = false;

    this.x.polyVisibility.fill(true);
    this.y.polyVisibility.fill(true);
    this.z.polyVisibility.fill(true);
  }
}
