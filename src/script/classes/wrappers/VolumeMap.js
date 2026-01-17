import * as THREE from "../../../libs/three/three.module.js";
import * as utils from "../../main/utils.js";
import { MapController } from "../controllers/MapController.js";
import { TetrahedronPicker } from "../map_inspection/TetrahedronPicker.js";
import { MapViewer } from "../map_inspection/MapViewer.js";
import { DistortionSlicer } from "../map_inspection/DistortionSlicer.js";

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
    this.tetrahedronPicker = new TetrahedronPicker(this);
    this.mapViewer = new MapViewer(this);
    this.distortionSlicer = new DistortionSlicer(this);
  }

  updateMesh(volumeMesh) {
    const oldValidity = this.isValid;
    this.isValid = this.checkMapValidity();

    if (oldValidity !== this.isValid) {
      if (this.isValid) {
        this.mapViewer.updateMap();
        this.distortionSlicer.updateMap();
        const data = this.volumeMesh1.mesh.geometry.userData;
        this.controller.updateModelInfo(
          data.vertices.length / 3,
          data.triangles.length / 3,
          data.tetrahedra.length / 4,
        );
      } else {
        this.distortionSlicer.setActive(false);
        this.distortionSlicer.resetSlicer();
        if (volumeMesh === this.volumeMesh1) {
          this.volumeMesh2.updateVisibleFaces(
            this.volumeMesh1.meshSlicer.isActive,
            this.distortionSlicer.isActive,
          );
        } else {
          this.volumeMesh1.updateVisibleFaces(
            this.volumeMesh2.meshSlicer.isActive,
            this.distortionSlicer.isActive,
          );
        }
        this.controller.resetSlicer();
        this.controller.toggleDistortionSlicerContainer(false);
        this.controller.toggleDistortionSlicer(false);
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
          const t1 = [
            tetrahedra1[i],
            tetrahedra1[i + 1],
            tetrahedra1[i + 2],
            tetrahedra1[i + 3],
          ].sort((a, b) => a - b);
          const t2 = [
            tetrahedra2[i],
            tetrahedra2[i + 1],
            tetrahedra2[i + 2],
            tetrahedra2[i + 3],
          ].sort((a, b) => a - b);

          if (t1[0] != t2[0] || t1[1] != t2[1] || t1[2] != t2[2] || t1[3] != t2[3]) {
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
    if (!flag) {
      this.toggleDistortionSlicer(false);
      this.controller.toggleDistortionSlicer(false);
    }
    return true;
  }

  changeEnergy(value) {
    if (!this.isValid) {
      console.warn("Cannot change energy: the map is not valid");
      return false;
    }

    if (!this.mapViewer.isActive) {
      console.warn("Map Viewer is not active");
      return false;
    }

    const result = this.mapViewer.setEnergy(value);
    if (result) {
      this.controller.updateEnergyInfo(this.mapViewer.energy);
      this.controller.updateClampInfo(this.mapViewer.clampStart, this.mapViewer.clampEnd);
      this.controller.updateClampInputInfo(this.mapViewer.clampStart, this.mapViewer.clampEnd);
    }
    return result;
  }

  changeClampRange(start, end) {
    if (!this.isValid) {
      console.warn("Cannot change clamp start: the map is not valid");
      return false;
    }

    if (!this.mapViewer.isActive) {
      console.warn("Map Viewer is not active");
      return false;
    }

    const result = this.mapViewer.setClampRange(start, end);
    if (result) {
      this.controller.updateClampInfo(this.mapViewer.clampStart, this.mapViewer.clampEnd);
    }
    return result;
  }

  changeGradientEdges(start, end) {
    if (!this.isValid) {
      console.warn("Cannot change gradient start: the map is not valid");
      return false;
    }

    if (!this.mapViewer.isActive) {
      console.warn("Map Viewer is not active");
      return false;
    }

    const result = this.mapViewer.setGradientEdges(start, end);
    if (result) {
      const isWhiteMid =
        this.mapViewer.gradientStart != utils.white && this.mapViewer.gradientEnd != utils.white;

      this.controller.updateGradientInfo(
        this.mapViewer.gradientStart,
        this.mapViewer.gradientEnd,
        isWhiteMid,
      );
    }
    return result;
  }

  toggleDegenerateColor(flag) {
    if (!this.isValid) {
      console.warn("Cannot toggle degenerate color: the map is not valid");
      return false;
    }

    if (!this.mapViewer.isActive) {
      console.warn("Map Viewer is not active");
      return false;
    }

    this.mapViewer.setDegenerateColorActive(flag);
    return true;
  }

  changeDegenerateColor(color) {
    if (!this.isValid) {
      console.warn("Cannot change degenerate color: the map is not valid");
      return false;
    }

    if (!this.mapViewer.isActive) {
      console.warn("Map Viewer is not active");
      return false;
    }

    return this.mapViewer.setDegenerateColor(color);
  }

  reverseMapDirection(flag) {
    if (!this.isValid) {
      console.warn("Cannot reverse map: the map is not valid");
      return false;
    }

    if (!this.mapViewer.isActive) {
      console.warn("Map Viewer is not active");
      return false;
    }

    this.mapViewer.reverseMapDirection(flag);
    return true;
  }

  resetMapViewer() {
    if (!this.isValid) {
      console.warn("Cannot reset Map Viewer: the map is not valid");
      return false;
    }

    if (!this.mapViewer.isActive) {
      console.warn("Map Viewer is not active");
      return false;
    }

    this.mapViewer.resetSettings();
    this.mapViewer.updateDistortion();
    return true;
  }

  toggleDistortionSlicer(flag) {
    if (flag && !this.isValid) {
      console.warn("Cannot toggle Distortion Slicer: the map is not valid");
      return false;
    }

    if (flag && !this.mapViewer.isActive) {
      console.warn("Map Viewer is not active");
      return false;
    }

    this.distortionSlicer.setActive(flag);
    this.controller.toggleDistortionSlicerContainer(flag);

    if (!flag) {
      this.distortionSlicer.resetSlicer();
      this.controller.resetSlicer();
      this.volumeMesh1.updateVisibleFaces(
        this.volumeMesh1.meshSlicer.isActive,
        this.distortionSlicer.isActive,
      );
      this.volumeMesh2.updateVisibleFaces(
        this.volumeMesh2.meshSlicer.isActive,
        this.distortionSlicer.isActive,
      );
    }

    return true;
  }

  distortionSlice(value) {
    if (!this.isValid) {
      console.warn("Cannot slice by distortion: the map is not valid");
      return false;
    }

    if (!this.distortionSlicer.isActive) {
      console.warn("Distortion Slicer is not active");
      return false;
    }

    if (this.distortionSlicer.isDegenerateFilterActive) {
      console.warn("Degenerate filter is active");
      return false;
    }

    const result = this.distortionSlicer.slice(value);
    if (result) {
      this.volumeMesh1.updateVisibleFaces(
        this.volumeMesh1.meshSlicer.isActive,
        this.distortionSlicer.isActive,
      );
      this.volumeMesh2.updateVisibleFaces(
        this.volumeMesh2.meshSlicer.isActive,
        this.distortionSlicer.isActive,
      );
    }
    return result;
  }

  reverseDistortionSlicingDirection(flag) {
    if (!this.isValid) {
      console.warn("Cannot reverse distortion slicing direction: the map is not valid");
      return false;
    }

    if (!this.distortionSlicer.isActive) {
      console.warn("Distortion Slicer is not active");
      return false;
    }

    if (this.distortionSlicer.isDegenerateFilterActive) {
      console.warn("Degenerate filter is active");
      return false;
    }

    this.distortionSlicer.reverseSlicingDirection(flag);
    this.volumeMesh1.updateVisibleFaces(
      this.volumeMesh1.meshSlicer.isActive,
      this.distortionSlicer.isActive,
    );
    this.volumeMesh2.updateVisibleFaces(
      this.volumeMesh2.meshSlicer.isActive,
      this.distortionSlicer.isActive,
    );
    return true;
  }

  toggleDegenerateFilter(flag) {
    if (!this.isValid) {
      console.warn("Cannot toggle degenerate filter: the map is not valid");
      return false;
    }

    if (!this.distortionSlicer.isActive) {
      console.warn("Distortion Slicer is not active");
      return false;
    }

    this.distortionSlicer.toggleDegenerateFilter(flag);
    this.volumeMesh1.updateVisibleFaces(
      this.volumeMesh1.meshSlicer.isActive,
      this.distortionSlicer.isActive,
    );
    this.volumeMesh2.updateVisibleFaces(
      this.volumeMesh2.meshSlicer.isActive,
      this.distortionSlicer.isActive,
    );
    return true;
  }
}
