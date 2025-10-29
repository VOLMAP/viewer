const white = "#ffffff";
const red = "#ff0000";
export class MeshMapperController {
  meshMapper = null;
  mapSettingsContainer = null;
  modelInfoContainer = null;
  mapInfoContainer = null;
  pickerInfoContainer = null;

  mapToggle = null;
  energyInput = null;
  gradientStartInput = null;
  gradientEndInput = null;
  reverseToggle = null;
  clampStartInput = null;
  clampEndInput = null;
  resetButton = null;

  verticesInfo = null;
  facesInfo = null;
  polyhedraInfo = null;

  energyInfo = null;
  clampInfo = null;
  gradientInfo = null;

  polyhedronInfo = null;
  distortionInfo = null;

  degenerateToggle = null;
  degenerateColorInput = null;

  constructor(meshMapper, mapSettingsContainer) {
    this.meshMapper = meshMapper;
    this.meshMapper.controller = this;
    this.mapSettingsContainer = mapSettingsContainer;

    this.modelInfoContainer = document.getElementById("model-info");
    this.mapInfoContainer = document.getElementById("map-info");
    this.pickerInfoContainer = document.getElementById("picker-info");

    const getElement = (container, className) =>
      container.getElementsByClassName(className)[0];

    this.mapToggle = getElement(mapSettingsContainer, "map-toggle");
    this.energyInput = getElement(mapSettingsContainer, "energy-input");
    this.gradientStartInput = getElement(
      mapSettingsContainer,
      "gradient-start-input"
    );

    this.gradientEndInput = getElement(
      mapSettingsContainer,
      "gradient-end-input"
    );

    this.reverseToggle = getElement(mapSettingsContainer, "reverse-toggle");

    this.clampStartInput = getElement(
      mapSettingsContainer,
      "clamp-start-input"
    );
    this.clampEndInput = getElement(mapSettingsContainer, "clamp-end-input");

    this.resetButton = getElement(mapSettingsContainer, "reset-button");

    this.degenerateToggle = getElement(
      mapSettingsContainer,
      "degenerate-toggle"
    );
    this.degenerateColorInput = getElement(
      mapSettingsContainer,
      "degenerate-color-input"
    );

    this.dropdowns = Array.from(
      mapSettingsContainer.getElementsByClassName("dropdown")
    );

    this.verticesInfo = getElement(this.modelInfoContainer, "vertices-count");
    this.facesInfo = getElement(this.modelInfoContainer, "faces-count");
    this.polyhedraInfo = getElement(this.modelInfoContainer, "polyhedra-count");

    this.energyInfo = getElement(this.mapInfoContainer, "map-energy");
    this.gradientInfo = getElement(this.mapInfoContainer, "map-gradient");
    this.clampInfo = getElement(this.mapInfoContainer, "map-clamp");

    this.polyhedronInfo = getElement(
      this.pickerInfoContainer,
      "picker-polyhedron"
    );
    this.distortionInfo = getElement(
      this.pickerInfoContainer,
      "picker-distortion"
    );

    this.appendEventListeners(this);
  }

  appendEventListeners(controller) {
    this.mapToggle.onchange = function () {
      const isMapActive = this.checked;

      let start = performance.now();
      if (!controller.meshMapper.toggleMap(isMapActive)) {
        this.checked = false;
      }
      let end = performance.now();
      let numTetrahedra =
        controller.meshMapper.meshRenderers[0].mesh.getMesh().geometry.userData
          .tetrahedras.length / 4;
      console.log(
        "Tempo esecuzione mapping:",
        (end - start).toFixed(3),
        "ms",
        "Numero di tetraedri:",
        numTetrahedra
      );
    };

    this.energyInput.oninput = function () {
      controller.meshMapper.changeEnergy(this.value);
    };

    this.gradientStartInput.oninput = function () {
      const previousValue = this.dataset.previousValue || this.value;

      if (!controller.meshMapper.changeGradientStart(this.value)) {
        this.value = previousValue;
      } else {
        this.dataset.previousValue = this.value;
      }
    };

    this.gradientEndInput.oninput = function () {
      const previousValue = this.dataset.previousValue || this.value;

      if (!controller.meshMapper.changeGradientEnd(this.value)) {
        this.value = previousValue;
      } else {
        this.dataset.previousValue = this.value;
      }
    };

    this.reverseToggle.onchange = function () {
      controller.meshMapper.reverse(this.checked);
    };

    this.clampStartInput.onchange = function () {
      const previousValue = this.dataset.previousValue || this.value;

      if (!controller.meshMapper.changeClampStart(Number(this.value))) {
        this.value = previousValue;
      } else {
        this.dataset.previousValue = this.value;
      }
    };

    this.clampEndInput.onchange = function () {
      const previousValue = this.dataset.previousValue || this.value;

      if (!controller.meshMapper.changeClampEnd(Number(this.value))) {
        this.value = previousValue;
      } else {
        this.dataset.previousValue = this.value;
      }
    };

    this.resetButton.onclick = function () {
      controller.meshMapper.reset();
    };

    this.degenerateToggle.onchange = function () {
      controller.meshMapper.changeDegenerateToggle(this.checked);
    };

    this.degenerateColorInput.oninput = function () {
      controller.meshMapper.changeDegenerateColor(this.value);
    };

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
    this.mapToggle.checked = false;
    this.energyInput.value = "CONFORMAL";
    this.gradientStartInput.value = white;
    this.gradientEndInput.value = red;
    this.reverseToggle.checked = false;
    this.degenerateToggle.checked = false;
    this.degenerateColorInput.value = "#ffff00";
  }

  updateClamping(start, end) {
    this.clampStartInput.value = start;
    this.clampStartInput.dataset.previousValue = start;
    this.clampEndInput.value = end;
    this.clampEndInput.dataset.previousValue = end;
  }

  updateModelInfo(numVertices, numFaces, numPolyhedra) {
    this.verticesInfo.textContent = numVertices;
    this.facesInfo.textContent = numFaces;
    this.polyhedraInfo.textContent = numPolyhedra;
  }

  updateMapInfo(
    energy,
    gradientStart,
    gradientEnd,
    whiteMid,
    clampStart,
    clampEnd
  ) {
    this.updateEnergy(energy);
    this.updateGradient(gradientStart, gradientEnd, whiteMid);
    this.updateClampInfo(clampStart, clampEnd);
  }

  updateEnergy(energy) {
    this.energyInfo.textContent = energy;
  }

  updateGradient(start, end, whiteMid) {
    start = "#" + start.toString(16).padStart(6, "0");
    end = "#" + end.toString(16).padStart(6, "0");

    console.log(getComputedStyle(this.gradientInfo).background);
    if (whiteMid) {
      const gradientMid = "#ffffff";
      this.gradientInfo.style.setProperty(
        "background",
        `linear-gradient(to right, ${start}, ${gradientMid}, ${end})`
      );
      console.log(
        `linear-gradient(to right, ${start}, ${gradientMid}, ${end})`
      );
    } else {
      this.gradientInfo.style.setProperty(
        "background",
        `linear-gradient(to right, ${start}, ${end})`
      );
      console.log(`linear-gradient(to right, ${start}, ${end})`);
    }
    setTimeout(() => {
      console.log(getComputedStyle(this.gradientInfo).background);
    }, 2);
  }

  updateClampInfo(start, end) {
    this.clampInfo.textContent = `[${start}, ${end}]`;
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
}
