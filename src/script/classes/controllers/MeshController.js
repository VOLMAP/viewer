import { ObjLoader } from "../loaders/ObjLoader.js";
import { MeshLoader } from "../loaders/MeshLoader.js";
import { renderers } from "../../main/main.js";
//import { TextureLoader } from "three";

const maxSliderValue = 100;
const minSliderValue = -100;

const white = "#ffffff";
const black = "#000000";

export class MeshRendererController {
  meshRenderer = null;

  modelInput = null;
  //textureInput = null;

  //textureToggle = null;
  colorInput = null;

  wireframeToggle = null;
  shellToggle = null;
  wireframeColorInput = null;
  boundingBoxToggle = null;

  slicerToggle = null;
  xSlider = null;
  ySlider = null;
  zSlider = null;
  distortionSlider = null;
  xPlaneToggle = null;
  yPlaneToggle = null;
  zPlaneToggle = null;
  xReverseButton = null;
  yReverseButton = null;
  zReverseButton = null;

  distortionReverseButton = null;

  axisToggle = null;
  orbitalToggle = null;
  resetButton = null;

  constructor(meshRenderer, settingsContainer) {
    // Inizializzazione del controller renderer
    this.meshRenderer = meshRenderer;
    this.meshRenderer.controller = this;

    const rendererContainer = meshRenderer.rendererContainer;
    const getElement = (container, className) =>
      container.getElementsByClassName(className)[0];

    this.modelInput = getElement(settingsContainer, "mesh-input");
    //this.textureInput = getElement(settingsContainer, "texture-input");

    //this.textureToggle = getElement(settingsContainer, "texture-toggle");
    this.colorInput = getElement(settingsContainer, "color-input");

    this.wireframeToggle = getElement(settingsContainer, "wireframe-toggle");
    this.shellToggle = getElement(settingsContainer, "shell-toggle");
    this.wireframeColorInput = getElement(
      settingsContainer,
      "wireframe-color-input"
    );
    this.boundingBoxToggle = getElement(
      settingsContainer,
      "bounding-box-toggle"
    );

    this.degenerateFilter = getElement(rendererContainer, "degenerate-filter");

    this.slicerToggle = getElement(settingsContainer, "slicer-toggle");
    this.xSlider = getElement(rendererContainer, "X-slider");
    this.ySlider = getElement(rendererContainer, "Y-slider");
    this.zSlider = getElement(rendererContainer, "Z-slider");
    this.distortionSlider = getElement(rendererContainer, "distortion-slider");
    this.xPlaneToggle = getElement(rendererContainer, "X-plane-toggle");
    this.yPlaneToggle = getElement(rendererContainer, "Y-plane-toggle");
    this.zPlaneToggle = getElement(rendererContainer, "Z-plane-toggle");
    this.xReverseButton = getElement(rendererContainer, "X-reverse");
    this.yReverseButton = getElement(rendererContainer, "Y-reverse");
    this.zReverseButton = getElement(rendererContainer, "Z-reverse");
    this.distortionReverseButton = getElement(
      rendererContainer,
      "distortion-reverse"
    );

    this.axisToggle = getElement(settingsContainer, "axis-toggle");
    this.orbitalToggle = getElement(settingsContainer, "orbital-toggle");
    this.resetButton = getElement(settingsContainer, "reset-button");

    this.dropdowns = Array.from(
      settingsContainer.getElementsByClassName("dropdown")
    );

    this.appendEventListeners(this);
  }

  appendEventListeners(controller) {
    // Listener per tutti gli input della UI
    this.modelInput.onchange = async function () {
      const file = this.files[0];

      if (!file) {
        console.error("No file selected");
        return;
      }

      const fileName = file.name.toLowerCase(); // Converti il nome in minuscolo per evitare problemi di maiuscole
      const fileExtension = fileName.split(".").pop(); // Ottieni l'estensione del file

      if (fileExtension === "obj") {
        const loader = new ObjLoader();
        const surfaceMesh = await loader.load(file);
        controller.meshRenderer.setMesh(surfaceMesh);
        controller.reset();
      } else if (fileExtension === "mesh") {
        const loader = new MeshLoader();
        const volumeMesh = await loader.load(file);
        controller.meshRenderer.setMesh(volumeMesh);
        controller.reset();
      } else {
        console.error("Invalid file format selected");
      }
    };
    /*
    this.textureInput.onchange = function () {
      const file = this.files[0];

      if (!file) {
        console.error("No file selected");
        return;
      }

      const fileURL = URL.createObjectURL(file);

      const loader = new TextureLoader();
      loader.load(fileURL, (texture) => {
        controller.meshRenderer.changeTexture(texture);
      });
    };

    this.textureToggle.onchange = function () {
      const isTextureVisible = this.checked;
      if (!controller.meshRenderer.toggleTexture(isTextureVisible)) {
        this.checked = false;
      }
    };
    */
    this.colorInput.onchange = function () {
      const color_ex = parseInt(this.value.replace("#", ""), 16);

      if (!controller.meshRenderer.changeColor(color_ex)) {
        this.value = "#ffffff"; // Reset to white if the color change fails
      }
    };

    this.wireframeToggle.onchange = function () {
      const isWireframeVisible = this.checked;
      if (!controller.meshRenderer.toggleWireframe(isWireframeVisible)) {
        this.checked = false;
      }
    };

    this.shellToggle.onchange = function () {
      const isShellVisible = this.checked;
      if (!controller.meshRenderer.toggleShell(isShellVisible)) {
        this.checked = false;
      }
    };

    this.wireframeColorInput.onchange = function () {
      const color_ex = parseInt(this.value.replace("#", ""), 16);

      if (!controller.meshRenderer.changeWireframeColor(color_ex)) {
        this.value = "#000000"; // Reset to white if the color change fails
      }
    };

    this.boundingBoxToggle.onchange = function () {
      const isBoundingBoxVisible = this.checked;
      if (!controller.meshRenderer.toggleBoundingBox(isBoundingBoxVisible)) {
        this.checked = false;
      }
    };

    this.slicerToggle.onchange = function () {
      const isSlicerVisible = this.checked;
      if (!controller.meshRenderer.toggleSlicer(isSlicerVisible)) {
        this.checked = false;
      }

      if (!isSlicerVisible) {
        controller.xSlider.value = maxSliderValue;
        controller.ySlider.value = maxSliderValue;
        controller.zSlider.value = maxSliderValue;
        controller.xPlaneToggle.checked = true;
        controller.yPlaneToggle.checked = true;
        controller.zPlaneToggle.checked = true;
      }
    };

    this.xSlider.oninput = function () {
      const sliceValue = this.value;

      //let start = performance.now();
      controller.meshRenderer.sliceX(sliceValue);
      /*
      let end = performance.now();
      let numTriangles =
        controller.meshRenderer.mesh.getMesh().geometry.userData.triangles
          .length / 3;
      console.log(
        "Tempo esecuzione slicing X:",
        (end - start).toFixed(3),
        "ms",
        "Numero di triangoli:",
        numTriangles
      );
      */
    };

    this.ySlider.oninput = function () {
      const sliceValue = this.value;

      controller.meshRenderer.sliceY(sliceValue);
    };

    this.zSlider.oninput = function () {
      const sliceValue = this.value;

      controller.meshRenderer.sliceZ(sliceValue);
    };

    this.distortionSlider.oninput = function () {
      const sliceValue = this.value;

      if (
        !renderers[0].sliceDistortion(sliceValue) ||
        !renderers[1].sliceDistortion(sliceValue)
      ) {
        renderers[0].controller.distortionSlider.value = maxSliderValue;
        renderers[1].controller.distortionSlider.value = maxSliderValue;
      } else {
        renderers[0].controller.distortionSlider.value = sliceValue;
        renderers[1].controller.distortionSlider.value = sliceValue;
      }
    };

    this.degenerateFilter.onclick = function () {
      if (
        renderers[0].sliceDistortion(Infinity) &&
        renderers[1].sliceDistortion(Infinity)
      ) {
        renderers[0].controller.distortionSlider.value = maxSliderValue;
        renderers[1].controller.distortionSlider.value = maxSliderValue;
      }
    };

    this.xPlaneToggle.onchange = function () {
      const isPlaneYZVisible = this.checked;
      if (!controller.meshRenderer.togglePlaneYZ(isPlaneYZVisible)) {
        this.checked = false;
      }
    };

    this.yPlaneToggle.onchange = function () {
      const isPlaneXZVisible = this.checked;
      if (!controller.meshRenderer.togglePlaneXZ(isPlaneXZVisible)) {
        this.checked = false;
      }
    };

    this.zPlaneToggle.onchange = function () {
      const isPlaneXYVisible = this.checked;
      if (!controller.meshRenderer.togglePlaneXY(isPlaneXYVisible)) {
        this.checked = false;
      }
    };

    this.axisToggle.onchange = function () {
      const isAxisVisible = this.checked;
      controller.meshRenderer.toggleAxis(isAxisVisible);
    };

    this.orbitalToggle.onchange = function () {
      const isOrbitalVisible = this.checked;
      controller.meshRenderer.toggleOrbital(isOrbitalVisible);
    };

    this.resetButton.onclick = function () {
      controller.meshRenderer.reset();
      controller.reset();

      if (renderers[0] !== controller.meshRenderer) {
        renderers[0].resetDistortion();
        renderers[0].controller.resetDistortion();
      } else {
        renderers[1].resetDistortion();
        renderers[1].controller.resetDistortion();
      }
    };

    this.xReverseButton.addEventListener("click", () => {
      controller.meshRenderer.reverseX(this.xSlider.value);
    });

    this.yReverseButton.addEventListener("click", () => {
      controller.meshRenderer.reverseY(this.ySlider.value);
    });

    this.zReverseButton.addEventListener("click", () => {
      controller.meshRenderer.reverseZ(this.zSlider.value);
    });

    this.distortionReverseButton.addEventListener("click", () => {
      renderers[0].reverseDistortion(this.distortionSlider.value);
      renderers[1].reverseDistortion(this.distortionSlider.value);
    });

    window.addEventListener("resize", () => {
      // Aggiorna la dimensione del renderer al resize della finestra
      controller.meshRenderer.resize();
    });

    this.dropdowns.forEach((dropdown) => {
      const btn = dropdown.querySelector(".dropbtn");
      const content = dropdown.querySelector(".dropcontent");
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        // Chiudi tutti gli altri
        document.querySelectorAll(".dropcontent.toggle").forEach((dc) => {
          if (dc !== content) dc.classList.remove("toggle");
        });
        // Toggle classe
        content.classList.toggle("toggle");
      });
    });
  }

  reset() {
    // Reset di tutti i toggle e slider alle impostazioni iniziali
    this.wireframeToggle.checked = true;
    this.shellToggle.checked = true;
    this.boundingBoxToggle.checked = false;

    this.slicerToggle.checked = false;
    this.xSlider.value = maxSliderValue;
    this.ySlider.value = maxSliderValue;
    this.zSlider.value = maxSliderValue;
    this.xPlaneToggle.checked = true;
    this.yPlaneToggle.checked = true;
    this.zPlaneToggle.checked = true;

    this.axisToggle.checked = false;
    this.orbitalToggle.checked = false;

    this.colorInput.value = white;
    this.wireframeColorInput.value = black;

    this.resetDistortion();
  }

  resetDistortion() {
    this.distortionSlider.value = 0;
  }
}
