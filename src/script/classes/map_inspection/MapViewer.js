import * as THREE from "../../../libs/three/three.module.js";
import * as utils from "../../main/utils.js";
import * as matrixUtils from "./matrixUtils.js";

export class MapViewer {
  isActive = false;

  degeneratePolyhedra = null;
  polyDistortion = null;
  clampedPolyDistortion = null;
  polyColor = null;

  energy = "Conformal";
  clampStart = 1;
  clampEnd = 12;
  gradientStart = utils.whiteHex;
  gradientEnd = utils.mapRedHex;

  isDegenerateColorActive = false;
  degenerateColor = utils.mapYellowHex;

  isMapDirectionReversed = false;

  volumeMap = null;

  constructor(volumeMap) {
    this.volumeMap = volumeMap;
  }

  updateMap() {
    this.computeDistortion();
    this.clampDistortion();
    this.computeColor();
    this.volumeMap.volumeMesh1.updateVisibleFacesColor();
    this.volumeMap.volumeMesh2.updateVisibleFacesColor();
  }

  updateDistortion() {
    this.computeDistortion();
    this.clampDistortion();
    this.computeColor();
    this.volumeMap.distortionSlicer.updateDistortion();
    if (this.volumeMap.distortionSlicer.isActive) {
      this.volumeMap.volumeMesh1.updateVisibleFaces(
        this.volumeMap.volumeMesh1.meshSlicer.isActive,
        this.volumeMap.distortionSlicer.isActive
      );
      this.volumeMap.volumeMesh2.updateVisibleFaces(
        this.volumeMap.volumeMesh2.meshSlicer.isActive,
        this.volumeMap.distortionSlicer.isActive
      );
    } else {
      this.volumeMap.volumeMesh1.updateVisibleFacesColor();
      this.volumeMap.volumeMesh2.updateVisibleFacesColor();
    }
  }

  updateClamp() {
    this.clampDistortion();
    this.computeColor();
    this.volumeMap.distortionSlicer.updateDistortion();
    if (this.volumeMap.distortionSlicer.isActive) {
      this.volumeMap.volumeMesh1.updateVisibleFaces(
        this.volumeMap.volumeMesh1.meshSlicer.isActive,
        this.volumeMap.distortionSlicer.isActive
      );
      this.volumeMap.volumeMesh2.updateVisibleFaces(
        this.volumeMap.volumeMesh2.meshSlicer.isActive,
        this.volumeMap.distortionSlicer.isActive
      );
    } else {
      this.volumeMap.volumeMesh1.updateVisibleFacesColor();
      this.volumeMap.volumeMesh2.updateVisibleFacesColor();
    }
  }

  updateGradient() {
    this.computeColor();
    this.volumeMap.volumeMesh1.updateVisibleFacesColor();
    this.volumeMap.volumeMesh2.updateVisibleFacesColor();
  }

  setActive(flag) {
    this.isActive = flag;
    this.volumeMap.volumeMesh1.toggleMapColor(flag);
    this.volumeMap.volumeMesh2.toggleMapColor(flag);
    this.volumeMap.tetrahedronPicker.setActive(flag);
  }

  computeDistortion() {
    const tmpPolyDistortion = new Array();
    this.degeneratePolyhedra = 0;
    // Based on the mapping direction, choose which mesh is source and which is target
    const mesh1 = this.isMapDirectionReversed
      ? this.volumeMap.volumeMesh2.mesh
      : this.volumeMap.volumeMesh1.mesh;
    const mesh2 = this.isMapDirectionReversed
      ? this.volumeMap.volumeMesh1.mesh
      : this.volumeMap.volumeMesh2.mesh;

    const vertices1 = mesh1.geometry.userData.vertices;
    const vertices2 = mesh2.geometry.userData.vertices;
    const tetrahedra = mesh1.geometry.userData.tetrahedra;

    for (let i = 0; i < tetrahedra.length; i += 4) {
      const tetrahedra1 = new Array();
      const tetrahedra2 = new Array();

      for (let j = 0; j < 4; j++) {
        // Get vertex index
        const vIndex = tetrahedra[i + j];
        // Get vertex coordinates
        const v1 = {
          x: vertices1[vIndex * 3],
          y: vertices1[vIndex * 3 + 1],
          z: vertices1[vIndex * 3 + 2],
        };
        const v2 = {
          x: vertices2[vIndex * 3],
          y: vertices2[vIndex * 3 + 1],
          z: vertices2[vIndex * 3 + 2],
        };
        // Store vertex coordinates
        tetrahedra1.push(v1);
        tetrahedra2.push(v2);
      }

      let distortion = null;

      const J = matrixUtils.jacobianMatrix(tetrahedra1, tetrahedra2);

      if (matrixUtils.determinant3x3(J) <= 0) {
        distortion = NaN;
        this.degeneratePolyhedra++;
      } else {
        const S = matrixUtils.computeSingularValues(J);
        distortion = this.computeTetDistortion(S[0], S[1], S[2], this.energy);
      }

      tmpPolyDistortion.push(distortion);
    }

    // Store the distortion values in both meshes
    this.polyDistortion = tmpPolyDistortion;
    mesh1.geometry.userData.polyDistortion = tmpPolyDistortion;
    mesh2.geometry.userData.polyDistortion = tmpPolyDistortion;
  }

  computeTetDistortion(s_max, s_mid, s_min, energy) {
    switch (energy) {
      case "Conformal":
        return (
          (s_max * s_max + s_mid * s_mid + s_min * s_min) /
          (3 * Math.pow(s_max * s_mid * s_min, 2 / 3))
        );
      case "Dirichlet":
        return (s_max * s_max + s_mid * s_mid + s_min * s_min) / 3;
      case "Sym-Dirichlet":
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
        const val = Math.pow(s_max - 1, 2) + Math.pow(s_mid - 1, 2) + Math.pow(s_min - 1, 2);
        return val < EPSILON ? 0 : val;
      case "MIPS-3D":
        return (
          (1 / 8) *
          (s_max / s_mid + s_mid / s_max) *
          (s_min / s_max + s_max / s_min) *
          (s_mid / s_min + s_min / s_mid)
        );
      default:
        console.error("Unknown energy type: " + energy);
    }
  }

  //Clamping operations
  clampDistortion() {
    const tmpClampedPolyDistortion = this.polyDistortion.slice();

    this.clampArray(tmpClampedPolyDistortion, this.clampStart, this.clampEnd);

    this.clampedPolyDistortion = tmpClampedPolyDistortion;
    this.volumeMap.volumeMesh1.mesh.geometry.userData.clampedPolyDistortion =
      tmpClampedPolyDistortion;
    this.volumeMap.volumeMesh2.mesh.geometry.userData.clampedPolyDistortion =
      tmpClampedPolyDistortion;
  }

  //Clamp and normalize a value between min and max to [0,1]
  clamp(val, min, max) {
    //We use infinity as a distortion value to identify degenerate tetrahedra
    if (isNaN(val)) return Infinity;

    let res = Math.max(val, min);
    res = Math.min(res, max);
    res = (res - min) / (max - min);
    return res;
  }

  clampArray(arr, min, max) {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = this.clamp(arr[i], min, max);
    }
  }

  setDefaultClampRange() {
    if (this.energy == "Conformal") {
      this.clampStart = 1;
      this.clampEnd = 12;
    } else if (this.energy == "Dirichlet") {
      this.clampStart = 2;
      this.clampEnd = 8;
    } else if (this.energy == "Sym-Dirichlet") {
      this.clampStart = 3;
      this.clampEnd = 12;
    } else if (this.energy == "ARAP") {
      this.clampStart = 0;
      this.clampEnd = 2;
    } else if (this.energy == "MIPS-3D") {
      this.clampStart = 1;
      this.clampEnd = 12;
    } else {
      console.error("Unknown energy type: " + this.energy);
    }
  }

  //Color operations
  computeColor() {
    const tmpPolyColor = new Array();

    const mesh1 = this.volumeMap.volumeMesh1.mesh;
    const mesh2 = this.volumeMap.volumeMesh2.mesh;

    const tetrahedra = mesh1.geometry.userData.tetrahedra;

    for (var i = 0; i < tetrahedra.length / 4; i++) {
      let colorRGB = null;

      if (this.clampedPolyDistortion[i] == Infinity) {
        if (this.isDegenerateColorActive) {
          colorRGB = utils.hexToRGB(this.degenerateColor);
        } else {
          colorRGB = utils.hexToRGB(this.gradientEnd);
        }
      } else {
        colorRGB = this.interpolateColor(
          utils.hexToRGB(this.gradientStart),
          utils.hexToRGB(this.gradientEnd),
          this.clampedPolyDistortion[i]
        );
      }

      tmpPolyColor.push(colorRGB);
    }

    this.polyColor = tmpPolyColor;
    mesh1.geometry.userData.polyColor = tmpPolyColor;
    mesh2.geometry.userData.polyColor = tmpPolyColor;
  }

  interpolateColor(start, end, t) {
    const whiteRGB = { r: 1, g: 1, b: 1 };
    const isWhite = (c) => c.r === 1 && c.g === 1 && c.b === 1;

    if (isWhite(start) || isWhite(end)) {
      //Linear interpolation: white → end or start → white
      return utils.lerpColor(start, end, t);
    } else {
      //Custom interpolation: start → white → end
      if (t < 0.5) {
        return utils.lerpColor(start, whiteRGB, t * 2);
      } else {
        return utils.lerpColor(whiteRGB, end, (t - 0.5) * 2);
      }
    }
  }

  setEnergy(value) {
    this.energy = value;
    this.setDefaultClampRange();

    this.updateDistortion();
    return true;
  }

  setClampRange(start, end) {
    if (start == null) {
      start = this.clampStart;
    }
    if (end == null) {
      end = this.clampEnd;
    }

    if (start >= end) {
      console.warn("Invalid clamp range: start must be less than end");
      return false;
    }

    this.clampStart = start;
    this.clampEnd = end;

    this.updateClamp();
    return true;
  }

  setGradientEdges(colorStart, colorEnd) {
    if (colorStart == null) {
      colorStart = this.gradientStart;
    }
    if (colorEnd == null) {
      colorEnd = this.gradientEnd;
    }

    if (colorStart === colorEnd) {
      console.warn("Invalid gradient colors: start and end colors must be different");
      return false;
    }

    this.gradientStart = colorStart;
    this.gradientEnd = colorEnd;

    this.updateGradient();
    return true;
  }

  setDegenerateColorActive(flag) {
    this.isDegenerateColorActive = flag;
    if (this.isDegenerateColorActive) {
      this.updateGradient();
    }
  }

  setDegenerateColor(color) {
    if (!this.isDegenerateColorActive) {
      console.warn("Degenerate color is not active");
      return false;
    }

    const isWhiteMid = this.gradientStart != utils.whiteHex && this.gradientEnd != utils.whiteHex;
    if (
      color == this.gradientStart ||
      color == this.gradientEnd ||
      (isWhiteMid && color == utils.whiteHex)
    ) {
      console.warn("Degenerate color must be different from gradient colors");
      return false;
    }

    this.degenerateColor = color;
    this.updateGradient();
    return true;
  }

  reverseMapDirection(flag) {
    this.isMapDirectionReversed = flag;
    this.updateDistortion();
  }

  resetSettings() {
    this.energy = "Conformal";
    this.setDefaultClampRange();
    this.gradientStart = utils.whiteHex;
    this.gradientEnd = utils.mapRedHex;
    this.isDegenerateColorActive = false;
    this.degenerateColor = utils.mapYellowHex;
    this.isMapDirectionReversed = false;
    this.volumeMap.controller.updateMapInfo(
      this.energy,
      this.gradientStart,
      this.gradientEnd,
      false,
      this.clampStart,
      this.clampEnd
    );
  }
}
