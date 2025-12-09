import * as THREE from "../../../libs/three/three.module.js";
import * as utils from "../../main/utils.js";

const minSliderValue = -100;
const maxSliderValue = 100;

const minDistSliderValue = 0;
const maxDistSliderValue = 100;

export class DistortionSlicer {
  isActive = false;

  distData = {
    polyByDistortion: null,
    polyVisibility: null,
    isReversed: false,
  };

  volumeMap = null;

  constructor(volumeMap) {
    this.volumeMap = volumeMap;
  }

  isPolyVisibleByDistortion(polyIndex) {
    if (this.isDegenerateFilterActive) {
      const distortion = this.volumeMap.mapViewer.clampedPolyDistortion[polyIndex];
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

  setPolyByDistortionAndVisibility() {
    const polyDistortion = this.volumeMap.mapViewer.clampedPolyDistortion;
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
    this.distData.polyByDistortion = Array.from(tmpPoly.sort(sortByDistortion));

    this.distData.polyVisibility = new Array(tmpPoly.length).fill(true);
  }

  //Slice by distortion value
  slice(sliderValue) {
    if (!this.volumeMap) {
      console.warn("Map not updated yet");
      return false;
    }
    const clampedPolyDistortion = this.volumeMap.mapViewer.clampedPolyDistortion;
    //Calculate distortion value based on slider and clamp range (0-1)
    const distortion = sliderValue * (1 / maxDistSliderValue);

    var firstVisiblePoly = utils.binarySearchClosest(
      this.distData.polyByDistortion,
      (i) => clampedPolyDistortion[i],
      distortion
    );

    //Include all polyhedra with the same distortion value as the first visible one
    if (!this.distData.isReversed) {
      for (let i = firstVisiblePoly - 1; i >= 0; i--) {
        if (
          clampedPolyDistortion[this.distData.polyByDistortion[i]] ===
          clampedPolyDistortion[this.distData.polyByDistortion[firstVisiblePoly]]
        ) {
          firstVisiblePoly = i;
        } else {
          break;
        }
      }
    } else {
      for (let i = firstVisiblePoly + 1; i < this.distData.polyByDistortion.length; i++) {
        if (
          clampedPolyDistortion[this.distData.polyByDistortion[i]] ===
          clampedPolyDistortion[this.distData.polyByDistortion[firstVisiblePoly]]
        ) {
          firstVisiblePoly = i;
        } else {
          break;
        }
      }
    }

    for (let i = 0; i < this.distData.polyByDistortion.length; i++) {
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

  /*
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
  */

  reset() {
    if (this.volumeMap.mapViewer.isActive) {
      this.isDegenerateFilterActive = false;
      this.distData.polyVisibility.fill(true);
      this.distData.isReversed = false;
    }
  }
}
