const minSliderValue = -100;
const maxSliderValue = 100;

export class MeshController {
  volumeMesh = null;
  //Mesh
  meshInput = null;
  sampleMeshInput = null;
  //Rendering
  shellToggle = null;
  meshColorInput = null;
  wireframeToggle = null;
  wireframeColorInput = null;
  boundingBoxToggle = null;
  slicerToggle = null;
  resetRenderingButton = null;
  //Slicing
  slicerSettingsContainer = null;
  xSlider = null;
  xPlaneToggle = null;
  xReverseButton = null;
  ySlider = null;
  yPlaneToggle = null;
  yReverseButton = null;
  zSlider = null;
  zPlaneToggle = null;
  zReverseButton = null;
  //Control
  axisToggle = null;
  orbitalToggle = null;
  resetControlButton = null;

  constructor(volumeMesh, settingsContainer, canvasContainer) {
    this.volumeMesh = volumeMesh;
    const getElement = (container, className) => container.getElementsByClassName(className)[0];

    // Mesh
    this.meshInput = getElement(settingsContainer, "mesh-input");
    this.sampleMeshInput = getElement(settingsContainer, "sample-mesh-input");
    // Rendering
    this.shellToggle = getElement(settingsContainer, "shell-toggle");
    this.meshColorInput = getElement(settingsContainer, "mesh-color-input");
    this.wireframeToggle = getElement(settingsContainer, "wireframe-toggle");
    this.wireframeColorInput = getElement(settingsContainer, "wireframe-color-input");
    this.boundingBoxToggle = getElement(settingsContainer, "bounding-box-toggle");
    this.slicerToggle = getElement(settingsContainer, "slicer-toggle");
    this.resetRenderingButton = getElement(settingsContainer, "reset-rendering");
    // Slicing
    this.slicerSettingsContainer = getElement(canvasContainer, "slicer-settings-container");
    this.xSlider = getElement(this.slicerSettingsContainer, "X-slider");
    this.xPlaneToggle = getElement(this.slicerSettingsContainer, "X-plane-toggle");
    this.xReverseButton = getElement(this.slicerSettingsContainer, "X-reverse-button");
    this.ySlider = getElement(this.slicerSettingsContainer, "Y-slider");
    this.yPlaneToggle = getElement(this.slicerSettingsContainer, "Y-plane-toggle");
    this.yReverseButton = getElement(this.slicerSettingsContainer, "Y-reverse-button");
    this.zSlider = getElement(this.slicerSettingsContainer, "Z-slider");
    this.zPlaneToggle = getElement(this.slicerSettingsContainer, "Z-plane-toggle");
    this.zReverseButton = getElement(this.slicerSettingsContainer, "Z-reverse-button");

    // Control
    this.axisToggle = getElement(settingsContainer, "axis-toggle");
    this.orbitalToggle = getElement(settingsContainer, "orbital-toggle");
    this.resetControlButton = getElement(settingsContainer, "reset-control");

    this.appendEventListeners(this.volumeMesh);
  }

  // Add event listeners to the HTML elements
  appendEventListeners(volumeMesh) {
    // Mesh
    this.meshInput.onchange = async function () {
      const file = this.files[0];

      volumeMesh.loadMesh(file);
    };
    this.sampleMeshInput.onchange = async function () {
      const sample = this.value;

      volumeMesh.loadSampleMesh(sample);
    };

    // Rendering
    this.shellToggle.onchange = function () {
      const flag = this.checked;

      if (!volumeMesh.toggleShell(flag)) {
        this.checked = !flag;
      }
    };
    this.meshColorInput.oninput = function () {
      if (!this.oldValue) {
        // Save the first valid value
        this.oldValue = "#ffffff";
      }

      const colorEx = parseInt(this.value.replace("#", ""), 16);

      // Try to change color
      if (!volumeMesh.changePlainColor(colorEx)) {
        // Failed → restore old value
        this.value = this.oldValue;
      } else {
        // Success → update old value
        this.oldValue = this.value;
      }
    };
    this.wireframeToggle.onchange = function () {
      const flag = this.checked;

      if (!volumeMesh.toggleWireframe(flag)) {
        this.checked = !flag;
      }
    };
    this.wireframeColorInput.oninput = function () {
      if (!this.oldValue) {
        // Save the first valid value
        this.oldValue = "#000000";
      }
      const colorEx = parseInt(this.value.replace("#", ""), 16);
      // Try to change color
      if (!volumeMesh.changeWireframeColor(colorEx)) {
        // Failed → restore old value
        this.value = this.oldValue;
      } else {
        // Success → update old value
        this.oldValue = this.value;
      }
    };
    this.boundingBoxToggle.onchange = function () {
      const flag = this.checked;

      if (!volumeMesh.toggleBoundingBox(flag)) {
        this.checked = !flag;
      }
    };
    this.slicerToggle.onchange = function () {
      const flag = this.checked;

      if (!volumeMesh.toggleSlicer(flag)) {
        this.checked = !flag;
      }
    };
    this.resetRenderingButton.onclick = function () {
      volumeMesh.resetRendering();
      volumeMesh.controller.resetRendering();
    };

    // Slicing
    this.xSlider.oninput = function () {
      if (!this.oldValue) {
        // Save the first valid value
        this.oldValue = maxSliderValue;
      }
      const value = this.value;

      if (!volumeMesh.slice(value, 0)) {
        // Failed → restore old value
        this.value = this.oldValue;
      } else {
        // Success → update old value
        this.oldValue = this.value;
      }
    };
    this.xPlaneToggle.onchange = function () {
      const flag = this.checked;
      if (!volumeMesh.toggleSlicingPlane(flag, 0)) {
        this.checked = !flag;
      }
    };
    this.xReverseButton.onclick = function () {
      if (this.isReversed == null) this.isReversed = false;

      const img = this.getElementsByTagName("img")[0];

      if (volumeMesh.reverseSlicingDirection(!this.isReversed, 0)) {
        this.isReversed = !this.isReversed;
        img.src = this.isReversed
          ? "./src/assets/img/left_arrow.png"
          : "./src/assets/img/right_arrow.png";
      }
    };
    this.ySlider.oninput = function () {
      if (!this.oldValue) {
        // Save the first valid value
        this.oldValue = maxSliderValue;
      }
      const value = this.value;
      if (!volumeMesh.slice(value, 1)) {
        // Failed → restore old value
        this.value = this.oldValue;
      } else {
        // Success → update old value
        this.oldValue = this.value;
      }
    };
    this.yPlaneToggle.onchange = function () {
      const flag = this.checked;
      if (!volumeMesh.toggleSlicingPlane(flag, 1)) {
        this.checked = !flag;
      }
    };
    this.yReverseButton.onclick = function () {
      if (this.isReversed == null) this.isReversed = false;
      const img = this.getElementsByTagName("img")[0];
      if (volumeMesh.reverseSlicingDirection(!this.isReversed, 1)) {
        this.isReversed = !this.isReversed;
        img.src = this.isReversed
          ? "./src/assets/img/left_arrow.png"
          : "./src/assets/img/right_arrow.png";
      }
    };
    this.zSlider.oninput = function () {
      if (!this.oldValue) {
        // Save the first valid value
        this.oldValue = maxSliderValue;
      }
      const value = this.value;
      if (!volumeMesh.slice(value, 2)) {
        // Failed → restore old value
        this.value = this.oldValue;
      } else {
        // Success → update old value
        this.oldValue = this.value;
      }
    };
    this.zPlaneToggle.onchange = function () {
      const flag = this.checked;
      if (!volumeMesh.toggleSlicingPlane(flag, 2)) {
        this.checked = !flag;
      }
    };
    this.zReverseButton.onclick = function () {
      if (this.isReversed == null) this.isReversed = false;
      const img = this.getElementsByTagName("img")[0];
      if (volumeMesh.reverseSlicingDirection(!this.isReversed, 2)) {
        this.isReversed = !this.isReversed;
        img.src = this.isReversed
          ? "./src/assets/img/left_arrow.png"
          : "./src/assets/img/right_arrow.png";
      }
    };

    // Control
    this.axisToggle.onchange = function () {
      const flag = this.checked;
      volumeMesh.meshRenderer.toggleAxis(flag);
    };
    this.orbitalToggle.onchange = function () {
      const flag = this.checked;
      volumeMesh.meshRenderer.toggleOrbital(flag);
    };
    this.resetControlButton.onclick = function () {
      volumeMesh.meshRenderer.resetControl();
      volumeMesh.controller.resetControl();
    };

    //Update renderer size on window resize
    window.addEventListener("resize", () => {
      volumeMesh.meshRenderer.resize();
    });
  }

  toggleSlicerContainer(flag) {
    this.slicerSettingsContainer.style.visibility = flag ? "visible" : "hidden";
  }

  //Reset of all UI elements to default values
  resetRendering() {
    this.shellToggle.checked = true;
    this.meshColorInput.value = "#ffffff";
    this.wireframeToggle.checked = true;
    this.wireframeColorInput.value = "#000000";
    this.boundingBoxToggle.checked = false;
  }

  //Reset of all slicer UI elements to default values
  resetSlicer() {
    this.xSlider.value = maxSliderValue;
    this.xPlaneToggle.checked = true;
    this.xReverseButton.isReversed = false;
    this.xReverseButton.getElementsByTagName("img")[0].src = "./src/assets/img/right_arrow.png";
    this.ySlider.value = maxSliderValue;
    this.yPlaneToggle.checked = true;
    this.yReverseButton.isReversed = false;
    this.yReverseButton.getElementsByTagName("img")[0].src = "./src/assets/img/right_arrow.png";
    this.zSlider.value = maxSliderValue;
    this.zPlaneToggle.checked = true;
    this.zReverseButton.isReversed = false;
    this.zReverseButton.getElementsByTagName("img")[0].src = "./src/assets/img/right_arrow.png";
  }

  /*
  updatePickerSliceSlider(sliderValue) {
    this.xSlider.value = sliderValue;
  }
  */

  //Reset of all control UI elements to default values
  resetControl() {
    this.axisToggle.checked = false;
    this.orbitalToggle.checked = false;
  }
}
