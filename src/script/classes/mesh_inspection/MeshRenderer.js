import * as THREE from "../../../libs/three/three.module.js";
import { ArcballControls } from "../../../libs/three/addons/controls/ArcballControls.js";

const white = 0xffffff;
const black = 0x000000;
const red = 0xff8080;
const green = 0x80ff80;
const blue = 0x8080ff;

const defaultFOV = 50;
const defaultFar = 1000;
const defaultNear = 0.1;

export class MeshRenderer {
  mesh = null;
  meshMapper = null;

  rendererContainer = null;
  axisContainer = null;
  orbitalContainer = null;
  slicerSettingsContainer = null;
  distortionContainer = null;

  renderer = null;
  axisRenderer = null;
  orbitalRenderer = null;

  scene = null;
  axisScene = null;
  orbitalScene = null;

  camera = null;
  light = null;
  axis = null;
  controls = null;

  constructor(rendererContainer) {
    this.rendererContainer = rendererContainer;
    this.axisContainer =
      this.rendererContainer.getElementsByClassName("axis")[0];
    this.orbitalContainer =
      this.rendererContainer.getElementsByClassName("orbital")[0];
    this.slicerSettingsContainer =
      this.rendererContainer.getElementsByClassName(
        "slicer-settings-container"
      )[0];
    this.distortionContainer =
      this.rendererContainer.getElementsByClassName("distortion")[0];

    this.setRenderers();
    this.setScenes();
    this.setCameraAndLight();
    this.setAxisAndControls();
    this.updateLightAndAxis();
  }

  setRenderers() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
    });
    this.renderer.setSize(
      this.rendererContainer.clientWidth,
      this.rendererContainer.clientHeight
    );
    this.renderer.setClearColor(0xf3f3f3);
    this.rendererContainer.appendChild(this.renderer.domElement);
    this.renderer.domElement.classList.add("renderer");

    const aspect =
      this.rendererContainer.clientWidth / this.rendererContainer.clientHeight;

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
    this.axisRenderer.setSize(
      this.axisContainer.clientWidth,
      this.axisContainer.clientHeight
    );
    this.axisRenderer.setClearColor(white, 0); // Make the background transparent
    this.axisContainer.appendChild(this.axisRenderer.domElement);

    this.orbitalRenderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    this.orbitalRenderer.setSize(
      this.orbitalContainer.clientWidth,
      this.orbitalContainer.clientHeight
    );
    this.orbitalRenderer.setClearColor(white, 0); // Make the background transparent
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
      this.rendererContainer.clientWidth / this.rendererContainer.clientHeight,
      defaultNear,
      defaultFar
    );
    this.camera.position.set(0, 0, 5);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
    this.camera.userData = { resetPosistion: new THREE.Vector3(0, 0, 5) };

    this.light = new THREE.DirectionalLight(white, Math.PI);
    this.light.position.set(0, 0, 5);
    this.scene.add(this.light);

    const light = new THREE.AmbientLight(white, Math.PI / 100);
    this.scene.add(light);
  }

  setAxisAndControls() {
    this.axis = new THREE.AxesHelper(1);
    this.axis.setColors(red, blue, green);
    this.axis.material.transparent = true;
    this.axis.material.opacity = 0.6;
    this.axisScene.add(this.axis);

    this.controls = new ArcballControls(this.camera, this.renderer.domElement);
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

  setMeshMapper(meshMapper) {
    this.meshMapper = meshMapper;
  }

  getMesh() {
    if (this.mesh) {
      return this.mesh;
    } else {
      console.log("Mesh not loaded yet");
      return null;
    }
  }

  setMesh(mesh) {
    if (this.mesh) {
      this.reset();
      this.scene.remove(this.mesh.getMesh());
      this.toggleWireframe(false);
      this.toggleShell(false);
    }

    this.meshMapper.reset();

    this.mesh = mesh;

    const box = mesh.getMesh().geometry.boundingBox;
    const size = box.getSize(new THREE.Vector3());
    const diag = Math.sqrt(
      Math.pow(size.x, 2) + Math.pow(size.y, 2) + Math.pow(size.z, 2)
    );

    const far = Math.min(diag * 100, 100000);
    this.camera.far = far;

    const near = Math.max(diag / 100, 0.1);
    this.camera.near = near;

    const fov = this.camera.fov * (Math.PI / 180);
    var distance = (diag / 2 / Math.tan(fov / 2)) * 1.2;

    if (far === 100000) {
      distance = (diag / 2) * 1.2;
    }

    this.camera.userData.resetPosistion = new THREE.Vector3(0, 0, distance);

    this.scene.add(this.mesh.getMesh());
    this.toggleWireframe(true);
    this.toggleShell(true);
    this.resetCameraAndControls();
  }

  changeColor(color_ex) {
    if (this.mesh) {
      this.mesh.changeColor(color_ex);
      return true;
    } else {
      console.log("Mesh not loaded yet");
      return false;
    }
  }
  /*
  changeTexture(texture) {
    if (this.mesh) {
      this.mesh.changeTexture(texture);
      return true;
    } else {
      console.log("Mesh not loaded yet");
      return false;
    }
  }

  toggleTexture(flag) {
    if (this.mesh) {
      return this.mesh.toggleTexture(flag);
    } else {
      console.log("Mesh not loaded yet");
      return false;
    }
  }
  */
  changeWireframeColor(color_ex) {
    if (this.mesh) {
      this.mesh.changeWireframeColor(color_ex);
      return true;
    } else {
      console.log("Mesh not loaded yet");
      return false;
    }
  }

  updateLightAndAxis() {
    this.light.position.copy(this.camera.position.clone());

    this.axis.position.copy(this.controls._gizmos.position.clone());
    this.axis.scale.set(
      this.controls._tbRadius,
      this.controls._tbRadius,
      this.controls._tbRadius
    );
  }

  reset() {
    this.toggleBoundingBox(false);
    this.toggleWireframe(true);
    this.toggleShell(true);
    this.toggleSlicer(false);
    this.toggleAxis(false);
    this.toggleOrbital(false);
    this.changeColor(white);
    this.changeWireframeColor(black);

    this.resetCameraAndControls();
  }

  resetCameraAndControls() {
    this.controls.reset();

    this.camera.position.copy(this.camera.userData.resetPosistion);
    this.camera.lookAt(0, 0, 0);

    this.controls.update();

    this.updateLightAndAxis();

    this.camera.updateProjectionMatrix();
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

  resize() {
    this.renderer.setSize(
      this.rendererContainer.clientWidth,
      this.rendererContainer.clientHeight
    );

    const aspect = () =>
      this.rendererContainer.clientWidth / this.rendererContainer.clientHeight;

    if (aspect() > 1) {
      const newHeight = 100 / aspect();
      this.axisContainer.style.width = "100px";
      this.orbitalContainer.style.width = "100px";
      this.axisContainer.style.height = `${newHeight}px`;
      this.orbitalContainer.style.height = `${newHeight}px`;
      console.log("Aspect ratio is greater than 1, adjusting height.");
    } else {
      const newWidth = 100 * aspect();
      this.axisContainer.style.height = "100px";
      this.orbitalContainer.style.height = "100px";
      this.axisContainer.style.width = `${newWidth}px`;
      this.orbitalContainer.style.width = `${newWidth}px`;
      console.log("Aspect ratio is lesser than 1, adjusting width.");
    }

    this.axisRenderer.setSize(
      this.axisContainer.clientWidth,
      this.axisContainer.clientHeight
    );

    this.orbitalRenderer.setSize(
      this.orbitalContainer.clientWidth,
      this.orbitalContainer.clientHeight
    );

    this.camera.aspect = aspect();
    this.camera.updateProjectionMatrix();
  }

  toggleBoundingBox(flag) {
    if (!this.mesh) {
      console.log("Mesh not loaded yet");
      return false;
    }

    if (flag) {
      this.scene.add(this.mesh.getBoundingBox());
    } else {
      this.scene.remove(this.mesh.getBoundingBox());
    }

    return true;
  }

  toggleWireframe(flag) {
    if (!this.mesh) {
      console.log("Mesh not loaded yet");
      return false;
    }

    if (flag) {
      this.scene.add(this.mesh.getWireframe());
    } else {
      this.scene.remove(this.mesh.getWireframe());
    }

    return true;
  }

  toggleShell(flag) {
    if (!this.mesh) {
      console.log("Mesh not loaded yet");
      return false;
    }

    if (flag) {
      this.scene.add(this.mesh.getShell());
    } else {
      this.scene.remove(this.mesh.getShell());
    }

    return true;
  }

  toggleSlicer(flag) {
    if (!this.mesh) {
      console.log("Mesh not loaded yet");
      return false;
    }

    if (flag) {
      this.slicerSettingsContainer.style.visibility = "visible";
    } else {
      this.slicerSettingsContainer.style.visibility = "hidden";
      this.mesh.getSlicer().reset();
    }

    this.togglePlaneYZ(flag);
    this.togglePlaneXZ(flag);
    this.togglePlaneXY(flag);

    return true;
  }

  togglePlaneYZ(flag) {
    if (!this.mesh) {
      console.log("Mesh not loaded yet");
      return false;
    }

    const slicer = this.mesh.getSlicer();

    if (flag) {
      this.scene.add(slicer.getPlaneYZ());
    } else {
      this.scene.remove(slicer.getPlaneYZ());
    }

    return true;
  }

  togglePlaneXZ(flag) {
    if (!this.mesh) {
      console.log("Mesh not loaded yet");
      return false;
    }

    const slicer = this.mesh.getSlicer();

    if (flag) {
      this.scene.add(slicer.getPlaneXZ());
    } else {
      this.scene.remove(slicer.getPlaneXZ());
    }

    return true;
  }

  togglePlaneXY(flag) {
    if (!this.mesh) {
      console.log("Mesh not loaded yet");
      return false;
    }

    const slicer = this.mesh.getSlicer();

    if (flag) {
      this.scene.add(slicer.getPlaneXY());
    } else {
      this.scene.remove(slicer.getPlaneXY());
    }

    return true;
  }

  sliceX(value) {
    this.mesh.getSlicer().sliceX(value);
  }

  sliceY(value) {
    this.mesh.getSlicer().sliceY(value);
  }

  sliceZ(value) {
    this.mesh.getSlicer().sliceZ(value);
  }

  sliceDistortion(value) {
    return this.mesh.getSlicer().sliceDistortion(value);
  }

  reverseX(value) {
    return this.mesh.getSlicer().reverseX(value);
  }

  reverseY(value) {
    return this.mesh.getSlicer().reverseY(value);
  }

  reverseZ(value) {
    return this.mesh.getSlicer().reverseZ(value);
  }

  reverseDistortion(value) {
    return this.mesh.getSlicer().reverseDistortion(value);
  }

  resetDistortion() {
    this.mesh.getSlicer().resetDistortion();
  }
}
