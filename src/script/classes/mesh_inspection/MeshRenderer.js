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

  volumeMesh = null;

  debugEnabled = false;
  debugObjects = [];

  constructor(volumeMesh, canvasContainer) {
    this.volumeMesh = volumeMesh;
    this.canvasContainer = canvasContainer;
    this.axisContainer = this.canvasContainer.getElementsByClassName("axis-container")[0];
    this.orbitalContainer = this.canvasContainer.getElementsByClassName("orbital-container")[0];

    this.setRenderers();
    this.setScenes();
    this.setCameraAndLight();
    this.setAxisAndControls();
    this.updateLightAndAxis();
  }

  updateMesh() {
    this.clearScene();
    //Adjust camera parameters based on mesh size
    this.volumeMesh.mesh.geometry.computeBoundingBox();
    const box = this.volumeMesh.mesh.geometry.boundingBox;
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
    //Add mesh to the scene
    this.scene.add(this.volumeMesh.mesh);
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

  focusCameraOnPolyhedron(faceIndex, otherGeometry) {
    const positionAttr = otherGeometry.getAttribute("position");
    const normalAttr = otherGeometry.getAttribute("normal");
    const translation = this.volumeMesh.mesh.position;

    const vA = new THREE.Vector3(positionAttr.getX(faceIndex * 3), positionAttr.getY(faceIndex * 3), positionAttr.getZ(faceIndex * 3)).add(translation);
    const vB = new THREE.Vector3(positionAttr.getX(faceIndex * 3 + 1), positionAttr.getY(faceIndex * 3 + 1), positionAttr.getZ(faceIndex * 3 + 1)).add(translation);
    const vC = new THREE.Vector3(positionAttr.getX(faceIndex * 3 + 2), positionAttr.getY(faceIndex * 3 + 2), positionAttr.getZ(faceIndex * 3 + 2)).add(translation);

    const centroid = new THREE.Vector3().add(vA).add(vB).add(vC).divideScalar(3);

    const nA = new THREE.Vector3(normalAttr.getX(faceIndex * 3), normalAttr.getY(faceIndex * 3), normalAttr.getZ(faceIndex * 3));
    const nB = new THREE.Vector3(normalAttr.getX(faceIndex * 3 + 1), normalAttr.getY(faceIndex * 3 + 1), normalAttr.getZ(faceIndex * 3 + 1));
    const nC = new THREE.Vector3(normalAttr.getX(faceIndex * 3 + 2), normalAttr.getY(faceIndex * 3 + 2), normalAttr.getZ(faceIndex * 3 + 2));

    const normal = new THREE.Vector3().add(nA).add(nB).add(nC).divideScalar(3).normalize().negate();

    otherGeometry.computeBoundingBox();
    const size = otherGeometry.boundingBox.getSize(new THREE.Vector3());

    if (this.debugEnabled) this.drawDebugForFace(vA, vB, vC, centroid, normal, size);

    const offset = size.length();
    const newCameraPos = centroid.clone().addScaledVector(normal, offset);

    this.camera.position.copy(newCameraPos);
    this.camera.lookAt(centroid);
    this.controls.update();
    this.updateLightAndAxis();
    this.camera.updateProjectionMatrix();
  }

  ///DEBUG
  drawDebugForFace(vA, vB, vC, centroid, normal, size) {
    this.debugObjects.forEach(obj => this.scene.remove(obj));
    this.debugObjects = [];

    const arrowLength = size.length() * 0.2;
    const sphereRadius = size.length() * 0.002;
    const sphereGeo = new THREE.SphereGeometry(sphereRadius);

    const normalArrow = new THREE.ArrowHelper(normal, centroid, arrowLength, 0xff0000);
    this.scene.add(normalArrow);
    this.debugObjects.push(normalArrow);

    [vA, vB, vC].forEach((v, i) => {
      const colors = [0x00ff00, 0x0000ff, 0xffff00];
      const sphere = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({ color: colors[i] }));
      sphere.position.copy(v);
      this.scene.add(sphere);
      this.debugObjects.push(sphere);
    });

    const centroidSphere = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    centroidSphere.position.copy(centroid);
    this.scene.add(centroidSphere);
    this.debugObjects.push(centroidSphere);
  }

  ///DEBUG
  toggleDebug(flag) {
    this.debugEnabled = flag;
    if (!flag) {
      this.debugObjects.forEach(obj => this.scene.remove(obj));
      this.debugObjects = [];
    }
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

  resetControl() {
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

    this.debugObjects.forEach(obj => this.scene.remove(obj));
    this.debugObjects = [];
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


