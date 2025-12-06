import * as THREE from "../../../libs/three/three.module.js";
import * as utils from "../../main/utils.js";

const minSliderValue = -100;
const maxSliderValue = 100;

const minDistSliderValue = 0;
const maxDistSliderValue = 100;

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

  isDegenerateFilterActive = false;

  distData = {
    polyByDistortion: null,
    polyVisibility: null,
    isReversed: false,
  };

  volumeMesh = null;
  volumeMap = null;

  constructor() {}

  updateMesh(volumeMesh) {
    this.volumeMesh = volumeMesh;

    this.setPolyByCentroidAndVisibility();
    this.setPlanes();
  }

  updateMap(volumeMap) {
    this.volumeMap = volumeMap;

    this.setPolyByDistortionAndVisibility();
  }

  isPolyVisible(polyIndex) {
    return (
      this.x.polyVisibility[polyIndex] &&
      this.y.polyVisibility[polyIndex] &&
      this.z.polyVisibility[polyIndex]
    );
  }

  isPolyVisibleByDistortion(polyIndex) {
    if (this.isDegenerateFilterActive) {
      const distortion = this.volumeMap.clampedPolyDistortion[polyIndex];
      return distortion == Infinity;
    } else {
      return this.distData.polyVisibility[polyIndex];
    }
  }

  setActive(flag, setMesh = false) {
    if (flag) {
      this.isActive = true;
    } else {
      this.isActive = false;
      this.reset(setMesh);
    }
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

    this.x.polyVisibility = new Array(tmpPoly.length).fill(true);
    this.y.polyVisibility = new Array(tmpPoly.length).fill(true);
    this.z.polyVisibility = new Array(tmpPoly.length).fill(true);
  }

  setPolyByDistortionAndVisibility() {
    const polyDistortion = this.volumeMap.clampedPolyDistortion;
    //Polyhedra indexes array
    var tmpPoly = new Array(polyDistortion.length);
    for (let j = 0; j < polyDistortion.length; j++) {
      tmpPoly[j] = j;
    }

    //Sorting function by comparing distortion values
    function sortByDistortion(aIndex, bIndex) {
      const aDistortion = polyDistortion[aIndex];
      const bDistortion = polyDistortion[bIndex];
      return aDistortion - bDistortion;
    }

    //Sorted polyhedra array
    this.distortion.polyByDistortion = Array.from(tmpPoly.sort(sortByDistortion));

    this.distortion.polyVisibility = new Array(tmpPoly.length).fill(true);
  }

  setPlanes() {
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
  }

  //Slice along a given axis (0=x, 1=y, 2=z)
  slice(sliderValue, axisIndex) {
    if (!this.volumeMesh) {
      console.warn("Mesh not updated yet");
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

  getSlicingPlane(axisIndex) {
    return axisIndex === 0 ? this.x.plane : axisIndex === 1 ? this.y.plane : this.z.plane;
  }

  reverseSlicingDirection(axisIndex) {
    if (!this.volumeMesh) {
      console.warn("Mesh not updated yet");
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

  distortionSlice(sliderValue) {
    if (!this.volumeMap) {
      console.warn("Map not updated yet");
      return false;
    }

    const clampedPolyDistortion = this.volumeMap.clampedPolyDistortion;
    //Calculate distortion value based on slider and clamp range (0-1)
    const distortion = sliderValue * (1 / maxDistSliderValue);

    var firstVisiblePoly = utils.binarySearchClosest(
      this.polysByDistortion,
      (i) => clampedPolyDistortion[i],
      distortion
    );

    //Include all polyhedra with the same distortion value as the first visible one
    if (!this.distData.isReversed) {
      for (let i = firstVisiblePoly - 1; i >= 0; i--) {
        if (
          clampedPolyDistortion[this.polysByDistortion[i]] ===
          clampedPolyDistortion[this.polysByDistortion[firstVisiblePoly]]
        ) {
          firstVisiblePoly = i;
        } else {
          break;
        }
      }
    } else {
      for (let i = firstVisiblePoly + 1; i < this.polysByDistortion.length; i++) {
        if (
          clampedPolyDistortion[this.polysByDistortion[i]] ===
          clampedPolyDistortion[this.polysByDistortion[firstVisiblePoly]]
        ) {
          firstVisiblePoly = i;
        } else {
          break;
        }
      }
    }

    for (let i = 0; i < this.polysByDistortion.length; i++) {
      // PolysToKeep and PolysToRemove are reversed when isReversed is true
      if (i >= firstVisiblePoly) {
        this.distData.polyVisibility[this.distData.polyByDistortion[i]] = !this.distData.isReversed;
      } else {
        this.distData.polyVisibility[this.distData.polyByDistortion[i]] = this.distData.isReversed;
      }
    }

    return true;
  }

  toggleDegenerateFilter(flag) {
    if (!this.volumeMap) {
      console.warn("Map not updated yet");
      return false;
    }

    this.isDegenerateFilterActive = flag;

    return true;
  }

  reverseDistortionSlicingDirection() {
    if (!this.volumeMap) {
      console.warn("Map not updated yet");
      return false;
    }

    this.distData.isReversed = !this.distData.isReversed;
    for (let i = 0; i < this.distData.polyByDistortion.length; i++) {
      this.distData.polyVisibility[this.distData.polyByDistortion[i]] =
        !this.distData.polyVisibility[this.distData.polyByDistortion[i]];
    }

    return true;
  }

  pickerSlice(pickedPolyhedra) {
    if (!this.volumeMesh) {
      console.warn("Mesh not updated yet");
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

  reset(setMesh = false) {
    if (!setMesh) {
      /*If not setting a new mesh, reset the slicer planes and visibility
        if setting a new mesh, it has just been done*/
      this.x.polyVisibility.fill(true);
      this.y.polyVisibility.fill(true);
      this.z.polyVisibility.fill(true);

      this.x.plane.position.x = this.x.plane.geometry.userData.resetPosition;
      this.y.plane.position.y = this.y.plane.geometry.userData.resetPosition;
      this.z.plane.position.z = this.z.plane.geometry.userData.resetPosition;
    }

    this.x.isReversed = false;
    this.y.isReversed = false;
    this.z.isReversed = false;

    //TODO use map.isActive
    if (false) {
      this.isDegenerateFilterActive = false;

      this.distData.polyVisibility.fill(true);
      this.distData.isReversed = false;
    }
  }
}
