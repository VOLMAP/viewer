import * as THREE from "../../../libs/three/three.module.js";
import * as utils from "../../main/utils.js";

export class TetrahedronPicker {
  isActive = false;

  lastPickedPolyhedronIndex = null;
  lastPickedPolyhedronColor = null;

  isPicking = false;

  volumeMap = null;

  raycaster = null;
  mouse = null;
  // stored event callbacks so they can be removed later
  _onClickMesh1 = null;
  _onClickMesh2 = null;

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
      // store callbacks so removeEventListener can use the same references
      this._onClickMesh1 = (event) => picker.pickPolyhedron(event, 1);
      this._onClickMesh2 = (event) => picker.pickPolyhedron(event, 2);

      meshRenderer1.renderer.domElement.addEventListener("click", this._onClickMesh1);
      meshRenderer2.renderer.domElement.addEventListener("click", this._onClickMesh2);
    } else {
      if (this._onClickMesh1) {
        meshRenderer1.renderer.domElement.removeEventListener("click", this._onClickMesh1);
        this._onClickMesh1 = null;
      }
      if (this._onClickMesh2) {
        meshRenderer2.renderer.domElement.removeEventListener("click", this._onClickMesh2);
        this._onClickMesh2 = null;
      }

      this.resetPicker();
    }
  }

  updateColor() {
    const faceKeys = this.volumeMap.volumeMesh1.mesh.geometry.userData.faceKeys;
    const adjacencyMap = this.volumeMap.volumeMesh1.mesh.geometry.userData.adjacencyMap;
    const polyColor = this.volumeMap.volumeMesh1.mesh.geometry.userData.polyColor;

    if (this.lastPickedPolyhedronIndex !== null && this.lastPickedPolyhedronColor !== null) {
      const key = faceKeys[this.lastPickedPolyhedronIndex];
      const value = adjacencyMap.get(key);
      this.lastPickedPolyhedronColor = polyColor[value[0].polyIndex];
      const colorRGB = {
        r: 1.0 - this.lastPickedPolyhedronColor.r,
        g: 1.0 - this.lastPickedPolyhedronColor.g,
        b: 1.0 - this.lastPickedPolyhedronColor.b,
      };
      this._colorPolyhedron(
        this.volumeMap.volumeMesh1.mesh,
        this.lastPickedPolyhedronIndex,
        colorRGB
      );
      this._colorPolyhedron(
        this.volumeMap.volumeMesh2.mesh,
        this.lastPickedPolyhedronIndex,
        colorRGB
      );
    }
  }

  pickPolyhedron(event, meshRendererId) {
    if (!event.shiftKey) return;


    const pickedMesh =
      meshRendererId === 1 ? this.volumeMap.volumeMesh1.mesh : this.volumeMap.volumeMesh2.mesh;
    const otherVolumeMesh =
      meshRendererId === 1 ? this.volumeMap.volumeMesh2 : this.volumeMap.volumeMesh1;

    const meshRenderer =
      meshRendererId === 1
        ? this.volumeMap.volumeMesh1.meshRenderer
        : this.volumeMap.volumeMesh2.meshRenderer;

    const rect = meshRenderer.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, meshRenderer.camera);
    const intersects = this.raycaster.intersectObject(pickedMesh, true);

    // If a polyhedron is picked, color it and store its color
    if (intersects.length > 0) {
      const faceKeys = pickedMesh.geometry.userData.faceKeys;
      const adjacencyMap = pickedMesh.geometry.userData.adjacencyMap;
      const polyColor = pickedMesh.geometry.userData.polyColor;
      const polyDistortion = pickedMesh.geometry.userData.polyDistortion;

      const faceIndex = intersects[0].face.a / 3;
      const key = faceKeys[faceIndex];
      const value = adjacencyMap.get(key);
      const pickedPolyhedron = value[0].polyIndex;
      const pickedPolyhedronColor = polyColor[pickedPolyhedron];
      const pickedPolyhedronDistortion = polyDistortion[pickedPolyhedron];
      const isPolyInternal = value.length === 2;

      // If exists, retrieve the last picked polyhedron and restore its color
      if (this.lastPickedPolyhedronIndex !== null && this.lastPickedPolyhedronColor !== null) {
        if (this.lastPickedPolyhedronIndex === pickedPolyhedron) {
          // If the same polyhedron is picked again, just do nothing (keep it highlighted)
          return;
        }
        this._colorPolyhedron(
          pickedMesh,
          this.lastPickedPolyhedronIndex,
          this.lastPickedPolyhedronColor
        );
        this._colorPolyhedron(
          otherVolumeMesh.mesh,
          this.lastPickedPolyhedronIndex,
          this.lastPickedPolyhedronColor
        );
      }
      if (isPolyInternal) {
        otherVolumeMesh.pickerSlice(pickedPolyhedron);
      }


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
      this._colorPolyhedron(otherVolumeMesh.mesh, pickedPolyhedron, colorRGB);

      const otherFaceKeys = otherVolumeMesh.mesh.geometry.userData.faceKeys;
      const otherAdjacencyMap = otherVolumeMesh.mesh.geometry.userData.adjacencyMap;

      let otherFaceIndex = 0;

      for (let i = 0; i < otherFaceKeys.length; i++) {
        const value = otherAdjacencyMap.get(otherFaceKeys[i]);
        
        if (value[0].polyIndex === pickedPolyhedron || (value.length === 2 && value[1].polyIndex === pickedPolyhedron)) {
          otherFaceIndex = i;
          break;
        }
      }

      otherVolumeMesh.meshRenderer.focusCameraOnPolyhedron(otherFaceIndex, otherVolumeMesh.mesh.geometry);

      this.volumeMap.controller.updatePickerInfo(pickedPolyhedron, pickedPolyhedronDistortion);
    } else {
      this.resetPicker();
    }

  }

  _colorPolyhedron(mesh, polyhedron, colorRGB) {
    const faceKeys = mesh.geometry.userData.faceKeys;
    const adjacencyMap = mesh.geometry.userData.adjacencyMap;
    const color = mesh.geometry.getAttribute("color");
    const polyColor = mesh.geometry.userData.polyColor;

    for (let i = 0; i < faceKeys.length; i++) {
      const value = adjacencyMap.get(faceKeys[i]);
      if (value[0].polyIndex === polyhedron ||
        (value.length == 2 && value[1].polyIndex === polyhedron)) {
        // Retrieve the starting index of the face in the color attribute
        const colorOffset = i * 9;
        // Update the color for the three vertices of the face
        for (let j = 0; j < 3; j++) {
          color.array[colorOffset + j * 3] = colorRGB.r;
          color.array[colorOffset + j * 3 + 1] = colorRGB.g;
          color.array[colorOffset + j * 3 + 2] = colorRGB.b;
        }
        // Update the stored color of the polyhedron
        polyColor[polyhedron] = colorRGB;
      }
    }

    color.needsUpdate = true;
  }

  resetPicker() {
    if (this.lastPickedPolyhedronIndex !== null && this.lastPickedPolyhedronColor !== null) {
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

    this.lastPickedPolyhedronColor = null;
    this.lastPickedPolyhedronIndex = null;
  }
}