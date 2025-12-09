import * as THREE from "../../../libs/three/three.module.js";
import * as utils from "../../main/utils.js";
import { MapController } from "../controllers/MapController.js";
import { DistortionSlicer } from "../map_inspection/DistortionSlicer.js";
//import { TetrahedronPicker } from "../map_inspection/TetrahedronPicker.js";
import { MapViewer } from "../map_inspection/MapViewer.js";
//import { DistortionSlicer } from "../map_inspection/DistortionSlicer.js";

export class VolumeMap {
  isValid = false;

  volumeMesh1 = null;
  volumeMesh2 = null;

  controller = null;
  mapViewer = null;
  distortionSlicer = null;
  tetrahedronPicker = null;

  constructor(volumeMesh1, volumeMesh2, settingsContainer, statusBarContainer) {
    this.volumeMesh1 = volumeMesh1;
    this.volumeMesh2 = volumeMesh2;
    this.volumeMesh1.volumeMap = this;
    this.volumeMesh2.volumeMap = this;

    this.controller = new MapController(this, settingsContainer, statusBarContainer);
    this.mapViewer = new MapViewer(this);
    this.distortionSlicer = new DistortionSlicer(this);
    //this.tetrahedronPicker = new TetrahedronPicker(this);
  }

  updateMesh() {
    const oldValidity = this.isValid;
    this.isValid = this.checkMapValidity();

    if (oldValidity !== this.isValid) {
      if (this.isValid) {
        this.mapViewer.updateMap();
        const data = this.volumeMesh1.mesh.geometry.userData;
        this.controller.updateModelInfo(
          data.vertices.length / 3,
          data.triangles.length / 3,
          data.tetrahedra.length / 4
        );
      } else {
        this.mapViewer.resetSettings();
        this.controller.resetMapViewerSettings();
        this.controller.updateModelInfo(-1, -1, -1);
      }

      this.mapViewer.setActive(this.isValid);
      this.controller.toggleMapViewer(this.isValid);
    }
  }

  checkMapValidity() {
    const mesh1 = this.volumeMesh1.mesh;
    const mesh2 = this.volumeMesh2.mesh;

    if (mesh1 == null || mesh2 == null) {
      console.warn("mesh1 or mesh2 not loaded yet");
      return false;
    } else {
      const vertices1 = mesh1.geometry.userData.vertices;
      const vertices2 = mesh2.geometry.userData.vertices;
      const tetrahedra1 = mesh1.geometry.userData.tetrahedra;
      const tetrahedra2 = mesh2.geometry.userData.tetrahedra;

      if (vertices1.length != vertices2.length) {
        console.warn("mesh1 and mesh2 have different number of vertices");
        return false;
      } else if (tetrahedra1.length != tetrahedra2.length) {
        console.warn("mesh1 and mesh2 have different number of tetrahedra");
        return false;
      } else {
        for (let i = 0; i < tetrahedra1.length; i += 4) {
          if (
            tetrahedra1[i] != tetrahedra2[i] ||
            tetrahedra1[i + 1] != tetrahedra2[i + 1] ||
            tetrahedra1[i + 2] != tetrahedra2[i + 2] ||
            tetrahedra1[i + 3] != tetrahedra2[i + 3]
          ) {
            console.warn("mesh1 and mesh2 have different tetrahedra connectivity");
            return false;
          }
        }
        return true;
      }
    }
  }

  toggleMapViewer(flag) {
    if (!this.isValid) {
      console.warn("Cannot toggle Map Viewer: the map is not valid");
      return false;
    }

    this.mapViewer.setActive(flag);
    return true;
  }

  changeEnergy(value) {
    if (!this.isValid) {
      console.warn("Cannot change energy: the map is not valid");
      return false;
    }

    this.mapViewer.setEnergy(value);
    this.mapViewer.updateMap();
    return true;
  }

  changeClampLimits(start, end) {
    if (!this.isValid) {
      console.warn("Cannot change clamp start: the map is not valid");
      return false;
    }
    this.mapViewer.setClampLimits(start, end);
    this.controller.updateClampInfo(start, end);
    return true;
  }

  changeGradientLimits(start, end) {
    if (!this.isValid) {
      console.warn("Cannot change gradient start: the map is not valid");
      return false;
    }
    this.mapViewer.setGradientLimits(start, end);
    this.controller.updateGradientInfo(
      start,
      end,
      start != utils.white && end != utils.white
    );
    return true;
  }

  toggleDegenerateColor(flag) {
    if (!this.isValid) {
      console.warn("Cannot toggle degenerate color: the map is not valid");
      return false;
    }
    this.mapViewer.setDegenerateColor(flag);
    return true;
  }

  changeDegenerateColor(color) {
    if (!this.isValid) {
      console.warn("Cannot change degenerate color: the map is not valid");
      return false;
    }
    this.mapViewer.setDegenerateColorValue(color);
    return true;
  }

  reverseMapDirection(flag) {
    if (!this.isValid) {
      console.warn("Cannot reverse map: the map is not valid");
      return false;
    }
    this.mapViewer.reverseMap(flag);
    console.log("reversed map direction:", flag);
    return true;
  }

  resetMapViewer() {
    if (!this.isValid) {
      console.warn("Cannot reset Map Viewer: the map is not valid");
      return false;
    }
    this.mapViewer.resetSettings();
    this.mapViewer.updateMap();
    return true;
  }

  toggleDistortionSlicer(flag) {
    if (!this.isValid) {
      console.warn("Cannot toggle Distortion Slicer: the map is not valid");
      return false;
    }

    this.distortionSlicer.setActive(flag);

    if (!flag) {
      this.distortionSlicer.reset();
      this.volumeMesh1.updateVisibleFaces(this.distortionSlicer.isActive, this.mapViewer.isActive);
      this.volumeMesh2.updateVisibleFaces(this.distortionSlicer.isActive, this.mapViewer.isActive);
    }

    return true;
  }

  sliceDistortion(value) {
    if (!this.isValid) {
      console.warn("Cannot slice by distortion: the map is not valid");
      return false;
    }

    this.distortionSlicer.slice(value);
    this.volumeMesh1.updateVisibleFaces(this.distortionSlicer.isActive, this.mapViewer.isActive);
    this.volumeMesh2.updateVisibleFaces(this.distortionSlicer.isActive, this.mapViewer.isActive);
    return true;
  }

  reverseDistortionSlicingDirection() {
    if (!this.isValid) {
      console.warn("Cannot reverse distortion slicing direction: the map is not valid");
      return false;
    }
    //TODO this.distortionSlicer.reverseSlicingDirection();
    return true;
  }

  toggleDegenerateFilter(flag) {
    if (!this.isValid) {
      console.warn("Cannot toggle degenerate filter: the map is not valid");
      return false;
    }
    //TODO this.distortionSlicer.toggleDegenerateFilter(flag);
    return true;
  }
}
