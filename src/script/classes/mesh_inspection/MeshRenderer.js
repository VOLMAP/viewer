import * as THREE from "../../../libs/three/three.module.js";
import * as utils from "../../main/utils.js";
import { ArcballControls } from "../../../libs/three/addons/controls/ArcballControls.js";

const defaultFOV = 50;
const defaultFar = 1000;
const defaultNear = 0.1;

export class MeshRenderer {
  canvasContainer = null;
  axisContainer = null;
  orbitalContainer = null;

  renderer = null;
  axisRenderer = null;
  orbitalRenderer = null;

  scene = null;
  axisScene = null;
  orbitalScene = null;

  camera = null;
  light = null;
  ambientLight = null;
  axis = null;
  controls = null;

  constructor(canvasContainer) {
    this.canvasContainer = canvasContainer;
    this.axisContainer = this.canvasContainer.getElementsByClassName("axis-container")[0];
    this.orbitalContainer = this.canvasContainer.getElementsByClassName("orbital-container")[0];

    this.setRenderers();
    this.setScenes();
    this.setCameraAndLight();
    this.setAxisAndControls();
    this.updateLightAndAxis();
  }

  updateMesh(volumeMesh) {
    this.clearScene();
    //Adjust camera parameters based on mesh size
    volumeMesh.mesh.geometry.computeBoundingBox();
    const box = volumeMesh.mesh.geometry.boundingBox;
    const size = box.getSize(new THREE.Vector3());
    const diag = Math.sqrt(Math.pow(size.x, 2) + Math.pow(size.y, 2) + Math.pow(size.z, 2));

    const far = Math.min(diag * 100, 100000);
    this.camera.far = far;

    const near = Math.max(diag / 100, 0.1);
    this.camera.near = near;

    const fov = this.camera.fov * (Math.PI / 180);
    var distance = (diag / 2 / Math.tan(fov / 2)) * 1.2;

    if (far === 100000) {
      distance = (diag / 2) * 1.2;
    }

    this.camera.userData.resetPosition = new THREE.Vector3(0, 0, distance);

    this.resetCameraAndControls();
  }

  setRenderers() {
    //Activate antialiasis to improve resolution
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
    });
    this.renderer.setSize(this.canvasContainer.clientWidth, this.canvasContainer.clientHeight);
    this.renderer.setClearColor(utils.greyHex);
    this.canvasContainer.appendChild(this.renderer.domElement);
    this.renderer.domElement.classList.add("mesh-renderer");
    //Get aspect ratio to maintain perspective in the additional scenes also
    const aspect = this.canvasContainer.clientWidth / this.canvasContainer.clientHeight;
    if (aspect > 1) {
      const newHeight = 100 / aspect;
      this.axisContainer.style.width = "100px";
      this.orbitalContainer.style.width = "100px";
      this.axisContainer.style.height = `${newHeight}px`;
      this.orbitalContainer.style.height = `${newHeight}px`;
    } else {
      const newWidth = 100 * aspect;
      this.axisContainer.style.height = "100px";
      this.orbitalContainer.style.height = "100px";
      this.axisContainer.style.width = `${newWidth}px`;
      this.orbitalContainer.style.width = `${newWidth}px`;
    }

    this.axisRenderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    this.axisRenderer.setSize(this.axisContainer.clientWidth, this.axisContainer.clientHeight);
    // Make the background transparent using alpha
    this.axisRenderer.setClearColor(utils.whiteHex, 0);
    this.axisContainer.appendChild(this.axisRenderer.domElement);

    this.orbitalRenderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    this.orbitalRenderer.setSize(
      this.orbitalContainer.clientWidth,
      this.orbitalContainer.clientHeight
    );
    // Make the background transparent using alpha
    this.orbitalRenderer.setClearColor(utils.whiteHex, 0);
    this.orbitalContainer.appendChild(this.orbitalRenderer.domElement);

    this.renderer.setAnimationLoop(() => {
      this.renderer.render(this.scene, this.camera);
      this.axisRenderer.render(this.axisScene, this.camera);
      this.orbitalRenderer.render(this.orbitalScene, this.camera);
    });
  }

  setScenes() {
    this.scene = new THREE.Scene();
    this.axisScene = new THREE.Scene();
    this.orbitalScene = new THREE.Scene();
  }

  setCameraAndLight() {
    this.camera = new THREE.PerspectiveCamera(
      defaultFOV,
      this.canvasContainer.clientWidth / this.canvasContainer.clientHeight,
      defaultNear,
      defaultFar
    );
    this.camera.position.set(0, 0, 5);
    this.camera.lookAt(0, 0, 0);
    this.camera.aspect = this.canvasContainer.clientWidth / this.canvasContainer.clientHeight;
    this.camera.updateProjectionMatrix();
    this.camera.userData = { resetPosition: new THREE.Vector3(0, 0, 5) };
    // Create a directional light to simulate the main light source
    this.light = new THREE.DirectionalLight(utils.whiteHex, Math.PI);
    this.light.position.set(0, 0, 5);
    this.scene.add(this.light);
    // Create an ambient light to simulate the environment light
    this.ambientLight = new THREE.AmbientLight(utils.whiteHex, Math.PI / 100);
    this.scene.add(this.ambientLight);
  }

  setAxisAndControls() {
    this.axis = new THREE.AxesHelper(1);
    this.axis.setColors(utils.redHex, utils.blueHex, utils.greenHex);
    this.axis.material.transparent = true;
    this.axis.material.opacity = 0.6;
    this.axisScene.add(this.axis);

    this.controls = new ArcballControls(this.camera, this.renderer.domElement);
    //Added Event Listeners to replicate gizmos interactions into axis and camera movements into light
    this.controls.addEventListener("change", () => {
      this.updateLightAndAxis();
    });
    this.controls.addEventListener("start", () => {
      this.axis.material.opacity = 1;
    });
    this.controls.addEventListener("end", () => {
      this.axis.material.opacity = 0.6;
    });
    this.orbitalScene.add(this.controls._gizmos);
  }

  updateLightAndAxis() {
    this.light.position.copy(this.camera.position.clone());

    this.axis.position.copy(this.controls._gizmos.position.clone());
    this.axis.scale.set(this.controls._tbRadius, this.controls._tbRadius, this.controls._tbRadius);
  }

  toggleAxis(flag) {
    if (flag) {
      this.axisScene.remove(this.axis);
      this.scene.add(this.axis);
    } else {
      this.scene.remove(this.axis);
      this.axisScene.add(this.axis);
    }
  }

  toggleOrbital(flag) {
    if (flag) {
      this.orbitalScene.remove(this.controls._gizmos);
      this.scene.add(this.controls._gizmos);
    } else {
      this.scene.remove(this.controls._gizmos);
      this.orbitalScene.add(this.controls._gizmos);
    }
  }

  toggleObject(flag, object) {
    if (flag) {
      this.scene.add(object);
    } else {
      this.scene.remove(object);
    }
  }

  clearScene() {
    for (let i = this.scene.children.length - 1; i >= 0; i--) {
      const child = this.scene.children[i];
      if (
        child !== this.axis &&
        child !== this.controls._gizmos &&
        child !== this.camera &&
        child !== this.light &&
        child !== this.ambientLight
      ) {
        this.scene.remove(child);
      }
    }
  }

  reset() {
    this.toggleAxis(false);
    this.toggleOrbital(false);

    this.resetCameraAndControls();
  }

  resetCameraAndControls() {
    this.controls.reset();

    this.camera.position.copy(this.camera.userData.resetPosition);
    this.camera.lookAt(0, 0, 0);

    this.controls.update();

    this.updateLightAndAxis();

    this.camera.updateProjectionMatrix();
  }

  resize() {
    this.renderer.setSize(this.canvasContainer.clientWidth, this.canvasContainer.clientHeight);
    //Get aspect ratio to maintain perspective in the additional scenes also
    const aspect = () => this.canvasContainer.clientWidth / this.canvasContainer.clientHeight;
    if (aspect() > 1) {
      const newHeight = 100 / aspect();
      this.axisContainer.style.width = "100px";
      this.orbitalContainer.style.width = "100px";
      this.axisContainer.style.height = `${newHeight}px`;
      this.orbitalContainer.style.height = `${newHeight}px`;
    } else {
      const newWidth = 100 * aspect();
      this.axisContainer.style.height = "100px";
      this.orbitalContainer.style.height = "100px";
      this.axisContainer.style.width = `${newWidth}px`;
      this.orbitalContainer.style.width = `${newWidth}px`;
    }

    this.axisRenderer.setSize(this.axisContainer.clientWidth, this.axisContainer.clientHeight);
    this.orbitalRenderer.setSize(
      this.orbitalContainer.clientWidth,
      this.orbitalContainer.clientHeight
    );

    this.camera.aspect = aspect();
    this.camera.updateProjectionMatrix();
  }
}
