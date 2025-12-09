import * as THREE from "../../../libs/three/three.module.js";
import * as utils from "../../main/utils.js";

export class TetrahedronPicker {
  isActive = false;

  lastPickedPolyhedronIndex = null;
  lastPickedPolyhedronColor = null;

  volumeMap = null;

  raycaster = null;
  mouse = null;

  constructor(volumeMap) {
    this.volumeMap = volumeMap;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  setActive(flag) {
    this.isActive = flag;

    const picker = this;
    const meshRenderer1 = this.volumeMap.volumeMesh1.meshRenderer;
    const meshRenderer2 = this.volumeMap.volumeMesh2.meshRenderer;

    if (flag) {
      meshRenderer1.renderer.domElement.addEventListener("click", (event) =>
        picker.pickPolygon(event, 1)
      );
      meshRenderer2.renderer.domElement.addEventListener("click", (event) =>
        picker.pickPolygon(event, 2)
      );
    } else {
      meshRenderer1.renderer.domElement.removeEventListener("click", (event) =>
        picker.pickPolygon(event, 1)
      );
      meshRenderer2.renderer.domElement.removeEventListener("click", (event) =>
        picker.pickPolygon(event, 2)
      );
      this.resetPicker();
    }
  }

  pickPolygon(event, meshRendererId) {
    if (!event.shiftKey) return;

    const pickedMesh =
      meshRendererId === 1 ? this.volumeMap.volumeMesh1.mesh : this.volumeMap.volumeMesh2.mesh;
    const otherMesh =
      meshRendererId === 1 ? this.volumeMap.volumeMesh2.mesh : this.volumeMap.volumeMesh1.mesh;

    const meshRenderer =
      meshRendererId === 1
        ? this.volumeMap.volumeMesh1.meshRenderer
        : this.volumeMap.volumeMesh2.meshRenderer;

    const rect = meshRenderer.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, meshRenderer.camera);
    const intersects = this.raycaster.intersectObject(pickedMesh, true);

    // If exists, retrieve the last picked polyhedron and restore its color
    if (this.lastPickedPolyhedronIndex !== null && this.lastPickedPolyhedronColor) {
      this._colorPolyhedron(
        pickedMesh,
        this.lastPickedPolyhedronIndex,
        this.lastPickedPolyhedronColor
      );
      this._colorPolyhedron(
        otherMesh,
        this.lastPickedPolyhedronIndex,
        this.lastPickedPolyhedronColor
      );
    }
    // If a polyhedron is picked, color it and store its color
    if (intersects.length > 0) {
      const polyIndex = pickedMesh.geometry.getAttribute("polyIndex");
      const polyColor = pickedMesh.geometry.userData.polyColor;
      const polyDistortion = pickedMesh.geometry.userData.polyDistortion;

      const faceIndex = intersects[0].face.a / 3;
      const pickedPolyhedron = polyIndex.array[faceIndex];
      const pickedPolyhedronColor = polyColor[pickedPolyhedron];
      const pickedPolyhedronDistortion = polyDistortion[pickedPolyhedron];

      // Store the color of the picked polygon
      this.lastPickedPolyhedronIndex = pickedPolyhedron;
      this.lastPickedPolyhedronColor = pickedPolyhedronColor;
      // Compute the complementary color
      const colorRGB = {
        r: 1.0 - pickedPolyhedronColor.r,
        g: 1.0 - pickedPolyhedronColor.g,
        b: 1.0 - pickedPolyhedronColor.b,
      };
      // Color the picked polygon with the complementary color
      this._colorPolyhedron(pickedMesh, pickedPolyhedron, colorRGB);
      this._colorPolyhedron(otherMesh, pickedPolyhedron, colorRGB);

      this.volumeMap.controller.updatePickerInfo(pickedPolyhedron, pickedPolyhedronDistortion);
    } else {
      this.volumeMap.controller.updatePickerInfo(-1, -1);
    }
  }

  _colorPolyhedron(mesh, polyhedron, colorRGB) {
    const polyIndex = mesh.geometry.getAttribute("polyIndex");
    const color = mesh.geometry.getAttribute("color");
    const polyColor = mesh.geometry.userData.polyColor;

    for (let i = 0; i < polyIndex.array.length; i++) {
      if (polyIndex.array[i] === polyhedron) {
        // Retrieve the starting index of the face in the color attribute
        const faceIndex = i * 9;
        // Update the color for the three vertices of the face
        for (let j = 0; j < 3; j++) {
          color.array[faceIndex + j * 3] = colorRGB.r;
          color.array[faceIndex + j * 3 + 1] = colorRGB.g;
          color.array[faceIndex + j * 3 + 2] = colorRGB.b;
        }
        // Update the stored color of the polyhedron
        polyColor[polyhedron] = colorRGB;
      }
    }

    color.needsUpdate = true;
  }

  resetPicker() {
    if (this.lastPickedPolyhedronIndex !== null && this.lastPickedPolyhedronColor) {
      this._colorPolyhedron(
        this.volumeMap.volumeMesh1.mesh,
        this.lastPickedPolyhedronIndex,
        this.lastPickedPolyhedronColor
      );
      this._colorPolyhedron(
        this.volumeMap.volumeMesh2.mesh,
        this.lastPickedPolyhedronIndex,
        this.lastPickedPolyhedronColor
      );
    }
    this.volumeMap.controller.updatePickerInfo(-1, -1);

    this.lastPickedPolygonColor = null;
    this.lastPickedPolygonIndex = null;
  }
}
