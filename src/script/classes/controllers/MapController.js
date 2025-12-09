const minDistSliderValue = -100;
const maxDistSliderValue = 100;

export class MapController {
  volumeMap = null;
  // Map Settings Elements
  mapViewerToggle = null;
  energyInput = null;
  clampStartInput = null;
  clampEndInput = null;
  gradientStartInput = null;
  gradientEndInput = null;
  degenerateColorToggle = null;
  degenerateColorInput = null;
  reverseMapButton = null;
  resetButton = null;
  distortionSlicerToggle = null;
  // Model Info
  verticesCount = null;
  facesCount = null;
  polyhedraCount = null;
  // Map Info
  mapEnergy = null;
  mapClamp = null;
  mapGradint = null;
  // Picker Info
  pickerPolyhedron = null;
  pickerDistortion = null;
  // Distortion Slicer
  distortionSlicerContainer = null;
  distortionSlider = null;
  degenerateFilterToggle = null;
  distortionReverseButton = null;

  constructor(volumeMap, settingsContainer, statusBarContainer) {
    this.volumeMap = volumeMap;

    const getElement = (container, className) => container.getElementsByClassName(className)[0];

    //Map Settings Elements
    this.mapViewerToggle = getElement(settingsContainer, "map-viewer-toggle");
    this.energyInput = getElement(settingsContainer, "energy-input");
    this.clampStartInput = getElement(settingsContainer, "clamp-start-input");
    this.clampEndInput = getElement(settingsContainer, "clamp-end-input");
    this.gradientStartInput = getElement(settingsContainer, "gradient-start-input");
    this.gradientEndInput = getElement(settingsContainer, "gradient-end-input");
    this.degenerateColorToggle = getElement(settingsContainer, "degenerate-color-toggle");
    this.degenerateColorInput = getElement(settingsContainer, "degenerate-color-input");
    this.reverseMapButton = getElement(settingsContainer, "reverse-map-button");
    this.resetButton = getElement(settingsContainer, "reset-button");
    this.distortionSlicerToggle = getElement(settingsContainer, "distortion-slicer-toggle");
    // Model Info
    this.verticesCount = getElement(statusBarContainer, "vertices-count");
    this.facesCount = getElement(statusBarContainer, "faces-count");
    this.polyhedraCount = getElement(statusBarContainer, "polyhedra-count");
    // Map Info
    this.mapEnergy = getElement(statusBarContainer, "map-energy");
    this.mapClamp = getElement(statusBarContainer, "map-clamp");
    this.mapGradient = getElement(statusBarContainer, "map-gradient");
    // Picker Info
    this.pickerPolyhedron = getElement(statusBarContainer, "picker-polyhedron");
    this.pickerDistortion = getElement(statusBarContainer, "picker-distortion");
    //Distortion Slicer
    this.distortionSlicerContainer = getElement(document, "distortion-slicer-settings-container");
    this.distortionSlider = getElement(this.distortionSlicerContainer, "distortion-slider");
    this.degenerateFilterToggle = getElement(this.distortionSlicerContainer, "degenerate-filter");
    this.distortionReverseButton = getElement(
      this.distortionSlicerContainer,
      "distortion-reverse-button"
    );

    this.appendEventListeners(this.volumeMap);
  }

  appendEventListeners(volumeMap) {
    this.mapViewerToggle.addEventListener("change", function () {
      const flag = this.checked;

      if (!volumeMap.toggleMapViewer(flag)) {
        this.checked = !flag;
      }
    });

    this.energyInput.addEventListener("change", function () {
      if (this.oldIndex === undefined) this.oldIndex = 0;

      const energy = this.value;

      if (!volumeMap.changeEnergy(energy)) {
        this.selectedIndex = this.oldIndex;
      } else {
        this.oldIndex = this.selectedIndex;
      }
    });

    this.clampStartInput.addEventListener("change", function () {
      if (!this.dataset.previousValue) this.dataset.previousValue = 1;
      const value = Number(this.value);

      if (!volumeMap.changeClampLimits(value, volumeMap.mapViewer.clampEnd)) {
        this.value = this.dataset.previousValue;
      } else {
        this.dataset.previousValue = this.value;
      }
    });

    this.clampEndInput.addEventListener("change", function () {
      if (!this.dataset.previousValue) this.dataset.previousValue = 12;
      const value = Number(this.value);

      if (!volumeMap.changeClampLimits(volumeMap.mapViewer.clampStart, value)) {
        this.value = this.dataset.previousValue;
      } else {
        this.dataset.previousValue = this.value;
      }
    });

    this.gradientStartInput.addEventListener("change", function () {
      if (!this.oldValue) this.oldValue = "#ffffff";
      const colorEx = parseInt(this.value.replace("#", ""), 16);
      
      if (!volumeMap.changeGradientLimits(colorEx, volumeMap.mapViewer.gradientEnd)) {
        this.value = this.oldValue;
      } else {
        this.oldValue = this.value;
      }
    });

    this.gradientEndInput.addEventListener("change", function () {
      if (!this.oldValue) this.oldValue = "#ff0000";
      const colorEx = parseInt(this.value.replace("#", ""), 16);
      
      if (!volumeMap.changeGradientLimits(volumeMap.mapViewer.gradientStart, colorEx)) {
        this.value = this.oldValue;
      } else {
        this.oldValue = this.value;
      }
    });

    this.degenerateColorToggle.addEventListener("change", function () {
      const flag = this.checked;

      if (!volumeMap.toggleDegenerateColor(flag)) {
        this.checked = !flag;
      }
    });

    this.degenerateColorInput.addEventListener("change", function () {
      if (!this.oldValue) this.oldValue = "#ffff00";
      const colorEx = parseInt(this.value.replace("#", ""), 16);
      
      if (!volumeMap.changeDegenerateColor(colorEx)) {
        this.value = this.oldValue;
      } else {
        this.oldValue = this.value;
      }
    });

    this.reverseMapButton.addEventListener("click", function () {
      //Initialize isReversed if undefined
      if (!this.isReversed) this.isReversed = false;

      const img = this.getElementsByTagName("img")[0];

      if (volumeMap.reverseMapDirection(this.isReversed)) {
        this.isReversed = !this.isReversed;
        img.src = this.isReversed
          ? "./src/assets/img/left_arrow.png"
          : "./src/assets/img/right_arrow.png";
      }
    });

    this.resetButton.addEventListener("click", function () {
      volumeMap.resetMapViewer();
      volumeMap.controller.resetMapViewerSettings();
    });

    this.distortionSlicerToggle.addEventListener("change", function () {
      const flag = this.checked;

      if (!volumeMap.toggleDistortionSlicer(flag)) {
        this.checked = !flag;
      } else {
        volumeMap.controller.toggleDistortionSlicerContainer(flag);
      }
    });
    this.distortionSlider.addEventListener("input", function () {
      if (!this.oldValue) this.oldValue = this.value;
      const value = this.value;
      if (!volumeMap.sliceDistortion(value)) {
        this.value = this.oldValue;
      } else {
        this.oldValue = this.value;
      }
    });
    this.degenerateFilterToggle.addEventListener("click", function () {
      if (!this.checked) this.checked = false;

      const flag = !this.checked;

      if (volumeMap.toggleDegenerateFilter(flag)) {
        this.checked = flag;
        this.classList.toggle("active", flag);
      }
    });
    this.distortionReverseButton.addEventListener("click", function () {
      if (!this.isReversed) this.isReversed = false;

      const img = this.getElementsByTagName("img")[0];

      if (volumeMap.reverseDistortionSlicingDirection()) {
        this.isReversed = !this.isReversed;
        img.src = this.isReversed
          ? "./src/assets/img/left_arrow.png"
          : "./src/assets/img/right_arrow.png";
      }
    });
  }

  resetMapViewerSettings() {
    this.energyInput.value = "Conformal";
    this.clampStartInput.value = "1";
    this.clampEndInput.value = "12";
    this.gradientStartInput.value = "#ffffff";
    this.gradientEndInput.value = "#ff0000";
    this.degenerateColorToggle.checked = false;
    this.degenerateColorInput.value = "#ffff00";
    this.reverseMapButton.isReversed = false;
    this.reverseMapButton.getElementsByTagName("img")[0].src = "./src/assets/img/right_arrow.png";
  }

  updateModelInfo(numVertices, numFaces, numPolyhedra) {
    this.verticesCount.textContent = numVertices;
    this.facesCount.textContent = numFaces;
    this.polyhedraCount.textContent = numPolyhedra;
  }

  updateMapInfo(energy, gradientStart, gradientEnd, whiteMid, clampStart, clampEnd) {
    this.updateEnergyInfo(energy);
    this.updateClampInfo(clampStart, clampEnd);
    this.updateGradientInfo(gradientStart, gradientEnd, whiteMid);
  }

  updateEnergyInfo(energy) {
    this.mapEnergy.textContent = energy;
  }

  updateClampInfo(start, end) {
    this.mapClamp.textContent = `[${start}, ${end}]`;
  }

  updateGradientInfo(start, end, whiteMid) {
    start = "#" + start.toString(16).padStart(6, "0");
    end = "#" + end.toString(16).padStart(6, "0");

    if (whiteMid) {
      const gradientMid = "#ffffff";
      this.mapGradient.style.setProperty(
        "background",
        `linear-gradient(to right, ${start}, ${gradientMid}, ${end})`
      );
    } else {
      this.mapGradient.style.setProperty(
        "background",
        `linear-gradient(to right, ${start}, ${end})`
      );
    }
  }

  updatePickerInfo(polyhedronIndex, distortion) {
    this.polyhedronInfo.textContent = polyhedronIndex;

    function limitDecimals(num, max = 5) {
      if (isNaN(num)) return "Degenerate";

      const factor = 10 ** max;
      return Math.trunc(num * factor) / factor;
    }

    this.distortionInfo.textContent = limitDecimals(distortion, 5);
  }

  toggleDistortionSlicerContainer(flag) {
    this.distortionSlicerContainer.style.visibility = flag ? "visible" : "hidden";
  }

  resetSlicer() {
    this.distortionSlider.value = minDistSliderValue;
  }

  toggleMapViewer(flag) {
    this.mapViewerToggle.checked = flag;
  }
}
