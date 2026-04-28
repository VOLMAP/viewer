const minSliderValue = -100;
const maxSliderValue = 100;

const DATASET_REPO = "dataset";
const DATASET_G1 = "G1";
const RESULTS_REPO = "results";
const DATASETS = [
  { label: "dataset", repo: "dataset", path: "" },
  { label: "results", repo: "results", path: "" },
];

const DATASET_SUFFIXES = ["cube", "tet", "octa", "pyr", "star", "sphere", "pc"];

export class MeshController {
  volumeMesh = null;
  meshInput = null;
  meshLabel = null;
  sampleMeshInput = null;
  isVolOnly = false;

  datasetSelect = null;
  datasetBackButton = null;

  shellToggle = null;
  meshColorInput = null;
  wireframeToggle = null;
  wireframeColorInput = null;
  separationSlider = null;
  boundingBoxToggle = null;
  slicerToggle = null;
  resetRenderingButton = null;

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

  axisToggle = null;
  orbitalToggle = null;
  resetControlButton = null;
  diggerModeInputs = null;
  resetDiggerButton = null;
  diggerLinkToggle = null;
  pickerAutoCameraToggle = null;
  pickerDebugNormalToggle = null;

  constructor(volumeMesh, settingsContainer, canvasContainer) {
    this.volumeMesh = volumeMesh;
    this.datasetIndex = null;

    Promise.all([
      fetch("./src/dataset/dataset.json").then(res => res.json()),
      fetch("./src/dataset/results.json").then(res => res.json()),
    ]).then(([datasetData, resultsData]) => {
      this.datasetIndex = {
        dataset: datasetData.dataset,
        results: resultsData.results,
      };
    });

    const getElement = (container, className) => container.getElementsByClassName(className)[0];

    // Mesh
    this.meshInput = getElement(settingsContainer, "mesh-input");
    this.meshLabel = getElement(canvasContainer, "mesh-label");
    this.sampleMeshInput = getElement(settingsContainer, "sample-mesh-input");

    this.datasetNav = getElement(settingsContainer, "dataset-nav");
    this.datasetLabel = this.datasetNav.closest(".setting").querySelector("p");
    this.datasetSelects = new Array();
    // Rendering
    this.shellToggle = getElement(settingsContainer, "shell-toggle");
    this.meshColorInput = getElement(settingsContainer, "mesh-color-input");
    this.wireframeToggle = getElement(settingsContainer, "wireframe-toggle");
    this.wireframeColorInput = getElement(settingsContainer, "wireframe-color-input");
    this.separationSlider = getElement(settingsContainer, "separation-slider");
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
    this.diggerModeInputs = settingsContainer.getElementsByClassName("digger-mode");
    this.resetDiggerButton = getElement(settingsContainer, "reset-digger");
    this.diggerLinkToggle = getElement(settingsContainer, "digger-link-toggle");
    this.pickerAutoCameraToggle = getElement(settingsContainer, "picker-auto-camera-toggle");
    this.pickerDebugNormalToggle = getElement(settingsContainer, "picker-debug-normal-toggle");

    this.appendEventListeners(this.volumeMesh);
  }

  // Add event listeners to the HTML elements
  appendEventListeners(volumeMesh) {
    // Mesh
    this.meshInput.onchange = async function () {
      const file = this.files[0];
      if (!file) return;

      volumeMesh.loadMesh(file);
    };

    this.sampleMeshInput.onchange = async function () {
      const sample = this.value;

      volumeMesh.loadSampleMesh(sample);
    };

    const controller = this;

    const datasetPopulateRoot = () => {
      controller.datasetNav.innerHTML = '';
      controller.datasetSelects = new Array();

      const select = document.createElement('select');
      select.className = 'dataset-select';
      select.innerHTML = "<option value=''>select</option>";

      DATASETS.forEach((dataset, i) => {
        const option = document.createElement("option");
        option.value = JSON.stringify({ type: "root", index: i });
        option.textContent = dataset.label;
        select.appendChild(option);
      });

      controller.datasetNav.appendChild(select);
      controller.datasetSelects.push(select);
      select.onchange = controller.handleDatasetChange.bind(controller);
    };

    controller.handleDatasetChange = (event) => {
      const select = event.target;
      const selected = select.options[select.selectedIndex];
      if (!selected || !selected.value) return;

      const item = JSON.parse(selected.value);
      const selectIndex = controller.datasetSelects.indexOf(select);

      while (controller.datasetSelects.length > selectIndex + 1) {
        const toRemove = controller.datasetSelects.pop();
        toRemove.remove();
      }

      if (item.type === "root") {
        const dataset = DATASETS[item.index];
        controller.activeDataset = dataset;
        controller.populateSelectForFolder(dataset.repo, dataset.path);

      } else if (item.type === "dir") {
        controller.populateSelectForFolder(item.repo, item.path);

      } else if (item.type === "file") {
        volumeMesh.loadRemoteMesh(item.download_url, item.name);

        const mesh2Controller = volumeMesh.volumeMap.volumeMesh2.controller;

        const isDatasetRepo = controller.activeDataset.repo === DATASET_REPO;
        const isFromG1 = item.parentPath === DATASET_G1;


        if (isDatasetRepo && isFromG1) {
          const prefix = item.name.replace(/\.(mesh|vtk|ovm)$/, "");
          if (mesh2Controller) {
            mesh2Controller.populateDatasetCompanion(
              controller.activeDataset.repo,
              prefix,
              volumeMesh.volumeMap.volumeMesh2
            );
          }
        }

        const isResultsRepo = controller.activeDataset.repo === RESULTS_REPO;
        if (isResultsRepo && item.parentPath) {
          if (mesh2Controller) {
            mesh2Controller.populateResultsCompanion(
              item.parentPath,
              item.name,
              item.download_url,
              volumeMesh.volumeMap.volumeMesh2
            );
          }
        }


        if (mesh2Controller) {
          mesh2Controller.datasetNav.closest(".setting").style.setProperty("display", "flex", "important");
          if (isDatasetRepo) mesh2Controller.datasetLabel.textContent = "Constraint:";
          else if (isResultsRepo) mesh2Controller.datasetLabel.textContent = "Map:";
        }
      }
    };

    controller.populateSelectForFolder = (repo, path = "") => {
      if (!controller.datasetIndex) return;

      const data = controller.datasetIndex[repo];
      if (!data) return;

      const select = document.createElement('select');
      select.className = 'dataset-select';
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "select";
      select.appendChild(placeholder);
      controller.datasetNav.appendChild(select);
      controller.datasetSelects.push(select);
      select.onchange = controller.handleDatasetChange.bind(controller);

      Object.keys(data).forEach(key => {
        const isInPath = path === "" ? true : key === path || key.startsWith(path + "/");
        if (!isInPath) return;

        const relative = path === "" ? key : key.slice(path.length).replace(/^\/+/, "");
        const parts = relative.split("/").filter(Boolean);

        if (parts.length === 0) {
          data[key].forEach(file => {
            if (!file.name.match(/\.(mesh|vtk|ovm)$/)) return;

            const option = document.createElement("option");
            option.value = JSON.stringify({
              type: "file",
              repo,
              path: null,
              parentPath: key,
              download_url: file.download_url,
              name: file.name,
            });
            option.textContent = file.name;
            select.appendChild(option);
          });
        } else {
          const dirName = parts[0];
          const dirPath = path ? `${path}/${dirName}` : dirName;

          if (select.querySelector(`option[data-dir="${dirName}"]`)) return;

          const option = document.createElement("option");
          option.dataset.dir = dirName;
          option.value = JSON.stringify({
            type: "dir",
            repo,
            path: dirPath,
            parentPath: "",
            download_url: null,
            name: dirName,
          });
          option.textContent = dirName;
          select.appendChild(option);
        }
      });
    };

    datasetPopulateRoot();

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

    this.separationSlider.onchange = function () {
      volumeMesh.separate(this.value);
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
    window.addEventListener("keydown", (event) => {
      if (event.key === "r" || event.key === "R") {
        this.resetControlButton.click();
      }
    });
    Array.from(this.diggerModeInputs).forEach(function (radio) {
      radio.onchange = function () {
        volumeMesh.setDiggerMode(this.value);
      };
    });
    this.resetDiggerButton.onclick = function () {
      volumeMesh.digger.resetDigger();
    };
    this.diggerLinkToggle.onchange = function () {
      const flag = this.checked;
      volumeMesh.digger.setLinkActive(flag);
    };
    this.pickerAutoCameraToggle.onchange = function () {
      const flag = this.checked;
      volumeMesh.meshRenderer.toggleAutoCamera(flag);
    };
    this.pickerDebugNormalToggle.onchange = function () {
      const flag = this.checked;
      volumeMesh.volumeMap.volumeMesh1.meshRenderer.toggleDebug(flag);
      volumeMesh.volumeMap.volumeMesh2.meshRenderer.toggleDebug(flag);
    };

    //Update renderer size on window resize
    window.addEventListener("resize", () => {
      volumeMesh.meshRenderer.resize();
    });
  }

  async populateDatasetCompanion(repo, prefix, volumeMesh) {
    const data = this.datasetIndex[repo];
    if (!data) return;

    const g1Files = data[DATASET_G1] || [];
    const meshFile = g1Files.find(f => f.name.replace(/\.(mesh|vtk|ovm)$/, "") === prefix);
    if (!meshFile) return;

    const companionFiles = [];
    DATASET_SUFFIXES.forEach(suffix => {
      const url = meshFile[suffix];
      if (!url) return;
      const name = url.split("/").pop();
      companionFiles.push({ suffix, name, download_url: url });
    });

    this.datasetNav.innerHTML = "";
    this.datasetSelects = [];

    const select = document.createElement("select");
    select.className = "dataset-select";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = companionFiles.length > 0 ? "companion" : "no companion";
    select.appendChild(placeholder);

    companionFiles.forEach(f => {
      const option = document.createElement("option");
      option.value = JSON.stringify(f);
      option.textContent = `${f.suffix}`;
      select.appendChild(option);
    });

    select.onchange = function () {
      if (!this.value) return;
      const item = JSON.parse(this.value);
      volumeMesh.loadRemoteMesh(item.download_url, item.name);
    };

    this.datasetNav.appendChild(select);
    this.datasetSelects.push(select);

    if (companionFiles.length > 0) {
      const first = companionFiles[0];
      select.value = JSON.stringify(first);
      volumeMesh.loadRemoteMesh(first.download_url, first.name);
    }
  }


  async populateResultsCompanion(parentPath, fileName, selectedUrl, volumeMesh) {
    const data = this.datasetIndex[RESULTS_REPO];
    if (!data) return;

    const files = data[parentPath] || [];

    const isInput = /_(input)\.(mesh|vtk|ovm)$/i.test(fileName);
    const isOutput = /_(output)\.(mesh|vtk|ovm)$/i.test(fileName);
    if (!isInput && !isOutput) return;

    const prefix = fileName
      .replace(/_(input|output)\.(mesh|vtk|ovm)$/i, "");

    const oppositeType = isInput ? "output" : "input";
    const companion = files.find(f => {
      const nameNoExt = f.name.replace(/\.(mesh|vtk|ovm)$/i, "");
      return nameNoExt === `${prefix}_${oppositeType}`;
    });

    this.datasetNav.innerHTML = "";
    this.datasetSelects = new Array();

    if (companion) {
      const label = document.createElement("span");
      label.className = "dataset-companion-label";
      label.textContent = `${companion.path}`;
      this.datasetNav.appendChild(label);
      volumeMesh.loadRemoteMesh(companion.download_url, companion.name);
    } else {
      const label = document.createElement("span");
      label.className = "dataset-companion-label";
      label.textContent = "no companion";
      this.datasetNav.appendChild(label);
    }
  }

  restrictToVolOnly() {
    this.isVolOnly = true;
    this.meshInput.accept = ".mesh, .vtk, .ovm";
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
    this.separationSlider.value = 0;
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

  updatePickerSliceSlider(sliderValue) {
    this.xSlider.value = sliderValue;
  }

  //Reset of all control UI elements to default values
  resetControl() {
    this.axisToggle.checked = false;
    this.orbitalToggle.checked = false;
    this.diggerModeInputs[0].checked = true;
    this.pickerAutoCameraToggle.checked = true;
    this.pickerDebugNormalToggle.checked = false;
  }
}
