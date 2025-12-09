import * as THREE from "../../../libs/three/three.module.js";
import * as utils from "../../main/utils.js";

const minSliderValue = -100;
const maxSliderValue = 100;

const minDistSliderValue = 0;
const maxDistSliderValue = 100;

export class DistortionSlicer {
  isActive = false;
  isDegenerateFilterActive = false;
  sliderValue = 0;

  polyByDistortion = null;
  polyVisibility = null;
  isReversed = false;

  volumeMap = null;

  constructor(volumeMap) {
    this.volumeMap = volumeMap;
  }

  updateMap() {
    this.isDegenerateFilterActive = false;
    this.setPolyByDistortionAndVisibility();
    this.isReversed = false;
  }

  updateDistortion() {
    this.setPolyByDistortionAndVisibility();
    if (this.isActive) {
      this.slice(this.sliderValue);
    }
  }

  setActive(flag) {
    this.isActive = flag;
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
    this.polyByDistortion = Array.from(tmpPoly.sort(sortByDistortion));

    this.polyVisibility = new Array(tmpPoly.length).fill(true);
  }

  isPolyVisibleByDistortion(polyIndex) {
    if (!this.volumeMap.volumeMesh1.mesh || !this.volumeMap.volumeMesh2.mesh) {
      console.warn("Map not loaded yet");
      return false;
    }

    if (this.isDegenerateFilterActive) {
      const distortion = this.volumeMap.mapViewer.clampedPolyDistortion[polyIndex];
      return distortion == Infinity;
    } else {
      return this.polyVisibility[polyIndex];
    }
  }

  //Slice by distortion value
  slice(sliderValue) {
    if (!this.volumeMap.volumeMesh1.mesh || !this.volumeMap.volumeMesh2.mesh) {
      console.warn("Map not loaded yet");
      return false;
    }

    this.sliderValue = sliderValue;

    const clampedPolyDistortion = this.volumeMap.mapViewer.clampedPolyDistortion;
    //Calculate distortion value based on slider and clamp range (0-1)
    const threshold = sliderValue * (1 / maxDistSliderValue);

    let thresholdPoly = utils.binarySearchClosest(
      this.polyByDistortion,
      (i) => clampedPolyDistortion[i],
      threshold
    );

    //Include all polyhedra with the same distortion value as the first or lastvisible one
    for (let i = thresholdPoly - 1; i >= 0; i--) {
      if (
        clampedPolyDistortion[this.polyByDistortion[i]] ===
        clampedPolyDistortion[this.polyByDistortion[thresholdPoly]]
      ) {
        thresholdPoly = i;
      } else {
        break;
      }
    }

    for (let i = 0; i < this.polyByDistortion.length; i++) {
      // PolysToKeep and PolysToRemove are reversed when isReversed is true
      if (!this.isReversed) {
        this.polyVisibility[this.polyByDistortion[i]] = i >= thresholdPoly;
      } else {
        this.polyVisibility[this.polyByDistortion[i]] = i < thresholdPoly;
      }
    }

    return true;
  }

  toggleDegenerateFilter(flag) {
    if (!this.volumeMap.volumeMesh1.mesh || !this.volumeMap.volumeMesh2.mesh) {
      console.warn("Map not loaded yet");
      return false;
    }

    this.isDegenerateFilterActive = flag;

    return true;
  }

  reverseSlicingDirection(flag) {
    if (!this.volumeMap.volumeMesh1.mesh || !this.volumeMap.volumeMesh2.mesh) {
      console.warn("Map not loaded yet");
      return false;
    }

    this.isReversed = flag;
    this.slice(this.sliderValue);

    return true;
  }

  resetSlicer() {
    this.isDegenerateFilterActive = false;

    this.isReversed = false;
    this.polyVisibility.fill(true);
  }
}
