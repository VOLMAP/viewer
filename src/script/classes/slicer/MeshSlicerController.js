import * as utils from "../../main/utils.js";
import * as main from "../../main/main.js";

export class MeshSlicerController {
  meshSlicer = null;

  settingsContainer = null;

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
  degenerateFilterButton = null;

  constructor(meshSlicer, settingsContainer) {
    this.meshSlicer = meshSlicer;
    this.meshSlicer.controller = this;
    this.settingsContainer = settingsContainer;

    const getElement = (container, className) =>
      container.getElementsByClassName(className)[0];

    this.xSlider = getElement(settingsContainer, "X-slider");
    this.ySlider = getElement(settingsContainer, "Y-slider");
    this.zSlider = getElement(settingsContainer, "Z-slider");
    this.distortionSlider = getElement(settingsContainer, "distortion-slider");

    this.xPlaneToggle = getElement(settingsContainer, "X-plane-toggle");
    this.yPlaneToggle = getElement(settingsContainer, "Y-plane-toggle");
    this.zPlaneToggle = getElement(settingsContainer, "Z-plane-toggle");
    this.xReverseButton = getElement(settingsContainer, "X-reverse");

    this.yReverseButton = getElement(settingsContainer, "Y-reverse");
    this.zReverseButton = getElement(settingsContainer, "Z-reverse");

    this.distortionReverseButton = getElement(
      settingsContainer,
      "distortion-reverse"
    );
    this.degenerateFilterButton = getElement(
      settingsContainer,
      "degenerate-filter"
    );

    this.appendEventListeners(this);
  }

  reset() {
    this.xSlider.value = this.meshSlicer.maxSliderValue;
    this.ySlider.value = this.meshSlicer.maxSliderValue;
    this.zSlider.value = this.meshSlicer.maxSliderValue;
    this.distortionSlider.value = this.meshSlicer.minDistSliderValue;

    this.xPlaneToggle.checked = true;
    this.yPlaneToggle.checked = true;
    this.zPlaneToggle.checked = true;

    console.log(this.xReverseButton);
    this.xReverseButton.classList.remove("active-button");

    this.yReverseButton.classList.remove("active-button");
    this.zReverseButton.classList.remove("active-button");
    this.distortionReverseButton.classList.remove("active-button");
    this.degenerateFilterButton.classList.remove("active-button");
  }

  toggleSettingsContainer(flag) {
    this.settingsContainer.style.visibility = flag ? "visible" : "hidden";
  }

  appendEventListeners(controller) {
    this.xSlider.oninput = function () {
      const sliceValue = this.value;
      controller.meshSlicer.slice(sliceValue, 0);
    };

    this.ySlider.oninput = function () {
      const sliceValue = this.value;
      controller.meshSlicer.slice(sliceValue, 1);
    };

    this.zSlider.oninput = function () {
      const sliceValue = this.value;
      controller.meshSlicer.slice(sliceValue, 2);
    };

    this.distortionSlider.oninput = function () {
      const sliceValue = this.value;

      if (
        main.renderers[0].meshSlicer.sliceDistortion(sliceValue) &&
        main.renderers[1].meshSlicer.sliceDistortion(sliceValue)
      ) {
        main.renderers[0].meshSlicer.controller.distortionSlider.value =
          sliceValue;
        main.renderers[1].meshSlicer.controller.distortionSlider.value =
          sliceValue;
      } else {
        main.renderers[0].meshSlicer.controller.distortionSlider.value =
          controller.meshSlicer.maxSliderValue;
        main.renderers[1].meshSlicer.controller.distortionSlider.value =
          controller.meshSlicer.maxSliderValue;
      }
    };

    this.degenerateFilterButton.onclick = function () {
      const currentState =
        controller.degenerateFilterButton.classList.contains("active-button");

      if (
        main.renderers[0].meshSlicer.degenerateFilterToggle(
          !currentState,
          controller.distortionSlider.value
        ) &&
        main.renderers[1].meshSlicer.degenerateFilterToggle(
          !currentState,
          controller.distortionSlider.value
        )
      ) {
        main.renderers[0].meshSlicer.controller.degenerateFilterButton.classList.toggle(
          "active-button"
        );
        main.renderers[1].meshSlicer.controller.degenerateFilterButton.classList.toggle(
          "active-button"
        );
      }
    };

    this.xPlaneToggle.onchange = function () {
      const flag = this.checked;
      if (!controller.meshSlicer.togglePlane(flag, 0)) {
        this.checked = false;
      }
    };

    this.yPlaneToggle.onchange = function () {
      const flag = this.checked;
      if (!controller.meshSlicer.togglePlane(flag, 1)) {
        this.checked = false;
      }
    };

    this.zPlaneToggle.onchange = function () {
      const flag = this.checked;
      if (!controller.meshSlicer.togglePlane(flag, 2)) {
        this.checked = false;
      }
    };

    this.xReverseButton.addEventListener("click", () => {
      if (controller.meshSlicer.reverse(this.xSlider.value, 0)) {
        controller.xReverseButton.classList.toggle("active-button");
      }
    });

    this.yReverseButton.addEventListener("click", () => {
      if (controller.meshSlicer.reverse(this.ySlider.value, 1)) {
        controller.yReverseButton.classList.toggle("active-button");
      }
    });

    this.zReverseButton.addEventListener("click", () => {
      if (controller.meshSlicer.reverse(this.zSlider.value, 2)) {
        controller.zReverseButton.classList.toggle("active-button");
      }
    });

    this.distortionReverseButton.addEventListener("click", () => {
      if (
        main.renderers[0].meshSlicer.reverseDistortion(
          this.distortionSlider.value
        ) &&
        main.renderers[1].meshSlicer.reverseDistortion(
          this.distortionSlider.value
        )
      ) {
        main.renderers[0].meshSlicer.controller.distortionReverseButton.classList.toggle(
          "active-button"
        );
        main.renderers[1].meshSlicer.controller.distortionReverseButton.classList.toggle(
          "active-button"
        );
      }
    });
  }
}
