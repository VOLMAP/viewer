import { MeshLoader } from "../loaders/MeshLoader.js";
import * as utils from "../../main/utils.js";

export class MeshRendererController {
  meshRenderer = null;

  modelInput = null;

  plainColorInput = null;
  wireframeToggle = null;
  wireframeColorInput = null;
  shellToggle = null;
  boundingBoxToggle = null;

  slicerToggle = null;

  axisToggle = null;
  orbitalToggle = null;

  dropdowns = null;
  resetButton = null;

  constructor(meshRenderer, settingsContainer) {
    this.meshRenderer = meshRenderer;
    this.meshRenderer.controller = this;

    const getElement = (container, className) =>
      container.getElementsByClassName(className)[0];

    this.modelInput = getElement(settingsContainer, "mesh-input");

    this.plainColorInput = getElement(settingsContainer, "color-input");
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

    this.slicerToggle = getElement(settingsContainer, "slicer-toggle");

    this.axisToggle = getElement(settingsContainer, "axis-toggle");
    this.orbitalToggle = getElement(settingsContainer, "orbital-toggle");
    this.resetButton = getElement(settingsContainer, "reset-button");

    this.dropdowns = Array.from(
      settingsContainer.getElementsByClassName("dropdown")
    );

    this.appendEventListeners(this);
  }

  appendEventListeners(controller) {
    //Listeners for all UI elements from menus
    this.modelInput.onchange = async function () {
      const file = this.files[0];

      if (!file) {
        console.error("No file selected");
        return;
      }

      const fileName = file.name.toLowerCase(); //convert the filename to lowercase for case-insensitive comparison
      const fileExtension = fileName.split(".").pop(); //get the file extension

      if (fileExtension === "mesh") {
        const loader = new MeshLoader();
        const volumeMesh = await loader.load(file);
        controller.meshRenderer.setMeshWrapper(volumeMesh);
      } else {
        console.error("Invalid file format selected");
      }
    };

    this.plainColorInput.onchange = function () {
      const color_ex = parseInt(this.value.replace("#", ""), 16);
      if (!controller.meshRenderer.changeColor(color_ex)) {
        this.value = utils.whiteHex.toString().replace("0x", "#"); // Reset to white if the color change fails
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
        this.value = utils.blackHex.toString().replace("0x", "#"); // Reset to black if the color change fails
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
    };

    this.resetButton.onclick = function () {
      controller.meshRenderer.reset();
      controller.reset();
    };

    window.addEventListener("resize", () => {
      //Update renderer size on window resize
      controller.meshRenderer.resize();
    });

    this.dropdowns.forEach((dropdown) => {
      const btn = dropdown.querySelector(".dropbtn");
      const content = dropdown.querySelector(".dropcontent");
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        // Close all others
        document.querySelectorAll(".dropcontent.open").forEach((dc) => {
          if (dc !== content) dc.classList.remove("open");
        });
        // Toggle class
        content.classList.toggle("open");
      });
    });

    this.axisToggle.onchange = function () {
      const isAxisVisible = this.checked;
      controller.meshRenderer.toggleAxis(isAxisVisible);
    };

    this.orbitalToggle.onchange = function () {
      const isOrbitalVisible = this.checked;
      controller.meshRenderer.toggleOrbital(isOrbitalVisible);
    };
  }

  reset() {
    //Reset of all UI elements to default values
    this.wireframeToggle.checked = true;
    this.shellToggle.checked = true;
    this.boundingBoxToggle.checked = false;

    this.slicerToggle.checked = false;

    this.axisToggle.checked = false;
    this.orbitalToggle.checked = false;

    this.plainColorInput.value = utils.whiteHex.toString().replace("0x", "#");
    this.wireframeColorInput.value = utils.blackHex
      .toString()
      .replace("0x", "#");
  }
}
