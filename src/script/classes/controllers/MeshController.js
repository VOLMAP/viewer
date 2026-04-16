const minSliderValue = -100;
const maxSliderValue = 100;
const DATASET_REPO = "dataset";
const DATASET_G1 = "G1";

export class MeshController {
  volumeMesh = null;
  //Mesh
  meshInput = null;
  meshLabel = null;
  sampleMeshInput = null;
  isVolOnly = false;

  datasetSelect = null;
  datasetBackButton = null;
  //Rendering
  shellToggle = null;
  meshColorInput = null;
  wireframeToggle = null;
  wireframeColorInput = null;
  separationSlider = null;
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
  diggerModeInputs = null;
  resetDiggerButton = null;
  diggerLinkToggle = null;
  pickerAutoCameraToggle = null;
  pickerDebugNormalToggle = null;

  constructor(volumeMesh, settingsContainer, canvasContainer) {
    this.volumeMesh = volumeMesh;
    const getElement = (container, className) => container.getElementsByClassName(className)[0];

    // Mesh
    this.meshInput = getElement(settingsContainer, "mesh-input");
    this.meshLabel = getElement(canvasContainer, "mesh-label");
    this.sampleMeshInput = getElement(settingsContainer, "sample-mesh-input");

    this.datasetNav = getElement(settingsContainer, "dataset-nav");
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

    const DATASETS = [
      { label: "dataset", org: "VOLMAP", repo: "dataset", path: "" },
      { label: "results", org: "VOLMAP", repo: "results", path: "" },
    ];

    const controller = this;

    const datasetPopulateRoot = () => {
      // Clear existing selects
      controller.datasetNav.innerHTML = '';
      controller.datasetSelects = [];

      const select = document.createElement('select');
      select.className = 'dataset-select';
      select.innerHTML = "<option value=''>select</option>";

      DATASETS.forEach((ds, i) => {
        const option = document.createElement("option");
        option.value = JSON.stringify({ type: "root", index: i });
        option.textContent = ds.label;
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
      // Remove selects after this one
      while (controller.datasetSelects.length > selectIndex + 1) {
        const toRemove = controller.datasetSelects.pop();
        toRemove.remove();
      }
      if (item.type === "root") {
        const ds = DATASETS[item.index];
        controller.activeDataset = ds;
        controller.populateSelectForFolder(ds.org, ds.repo, ds.path);
      } else if (item.type === "dir") {
        controller.populateSelectForFolder(item.org, item.repo, item.path, selectIndex + 1);
      } else if (item.type === "file") {
        volumeMesh.loadRemoteMesh(item.download_url, item.name);

        const isDatasetRepo = controller.activeDataset?.repo === DATASET_REPO;
        const isFromG1 = item.parentPath === DATASET_G1;

        if (isDatasetRepo && isFromG1) {
          const prefix = item.name.replace(/\.(mesh|vtk)$/, "");
          const mesh2Controller = volumeMesh?.volumeMap?.volumeMesh2?.controller;
          if (mesh2Controller) {
            mesh2Controller.populateCompanionFiles(
              controller.activeDataset.org,
              controller.activeDataset.repo,
              prefix,
              volumeMesh.volumeMap.volumeMesh2
            );
          }
        }
      }
    };

    controller.populateSelectForFolder = (org, repo, path, level) => {
      const url = path ? `https://api.github.com/repos/${org}/${repo}/contents/${path}`
        : `https://api.github.com/repos/${org}/${repo}/contents/`;

      const select = document.createElement('select');
      select.className = 'dataset-select';
      select.innerHTML = "<option value=''>loading...</option>";
      select.disabled = true;

      controller.datasetNav.appendChild(select);
      controller.datasetSelects.push(select);
      select.onchange = controller.handleDatasetChange.bind(controller);

      fetch(url)
        .then(response => response.json())
        .then(contents => {
          select.innerHTML = "";
          const placeholder = document.createElement("option");
          placeholder.value = "";
          placeholder.textContent = "select";
          select.appendChild(placeholder);
          const sorted = contents.sort((a, b) => {
            if (a.type === b.type) {
              return a.name.localeCompare(b.name);
            }
            return a.type === "dir" ? -1 : 1;
          });
          sorted.forEach(item => {
            if (item.type !== "dir" && item.type !== "file") return;
            if (item.type === "file" && !item.name.match(/\.(mesh|vtk|txt)$/)) return;
            if (item.type === "file" && controller.isVolOnly && item.name.endsWith(".txt")) return;
            const option = document.createElement("option");
            option.value = JSON.stringify({
              type: item.type,
              org, repo,
              path: item.type === "dir" ? (path ? `${path}/${item.name}` : item.name) : null,
              parentPath: path || "",
              download_url: item.download_url || null,
              name: item.name,
            });
            option.textContent = item.name;
            select.appendChild(option);
          });
          select.disabled = false;
        })
        .catch(err => console.error("Error fetching dataset contents:", err));
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

  async populateCompanionFiles(org, repo, prefix, volumeMesh) {
    this.datasetNav.innerHTML =
      "<span>loading...</span>";
    this.datasetSelects = new Array();

    let rootContents;
    try {
      const resp = await fetch(`https://api.github.com/repos/${org}/${repo}/contents/`);
      rootContents = await resp.json();
    } catch (e) {
      console.error("Error fetching repo root:", e);
      this.datasetNav.innerHTML = "";
      return;
    }

    const folders = rootContents.filter(i => i.type === "dir" && i.name !== DATASET_G1);

    const companionFiles = new Array();
    await Promise.all(folders.map(async (folder) => {
      try {
        const resp = await fetch(`https://api.github.com/repos/${org}/${repo}/contents/${folder.name}`);
        const contents = await resp.json();
        if (!Array.isArray(contents)) return;
        contents.forEach(item => {
          if (item.type !== "file") return;
          if (!item.name.match(/\.(mesh|vtk|txt)$/)) return;
          const nameNoExt = item.name.replace(/\.(mesh|vtk|txt)$/, "");
          if (nameNoExt.startsWith(prefix + "_")) {
            companionFiles.push({
              name: item.name,
              download_url: item.download_url,
              folder: folder.name,
            });
          }
        });
      } catch (e) { }
    }));

    this.datasetNav.innerHTML = "";
    this.datasetSelects = [];

    const DATASETS = [
      { label: "dataset", org: "VOLMAP", repo: "dataset", path: "" },
      { label: "results", org: "VOLMAP", repo: "results", path: "" },
    ];

    const rootSelect = document.createElement('select');
    rootSelect.className = 'dataset-select';
    DATASETS.forEach((ds, i) => {
      const option = document.createElement("option");
      option.value = JSON.stringify({ type: "root", index: i });
      option.textContent = ds.label;
      if (ds.repo === repo) option.selected = true;
      rootSelect.appendChild(option);
    });
    this.datasetNav.appendChild(rootSelect);
    this.datasetSelects.push(rootSelect);
    rootSelect.onchange = this.handleDatasetChange.bind(this);

    if (companionFiles.length === 0) {
      const span = document.createElement("span");
      span.textContent = `No file for "${prefix}"`;
      this.datasetNav.appendChild(span);
      return;
    }

    const select = document.createElement("select");
    select.className = "dataset-select";

    const ph = document.createElement("option");
    ph.value = "";
    ph.textContent = "select";
    select.appendChild(ph);

    companionFiles
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(f => {
        const opt = document.createElement("option");
        opt.value = JSON.stringify({ download_url: f.download_url, name: f.name });
        opt.textContent = f.name;
        select.appendChild(opt);
      });

    select.onchange = function () {
      if (!this.value) return;
      const item = JSON.parse(this.value);
      volumeMesh.loadRemoteMesh(item.download_url, item.name);
    };

    this.datasetNav.appendChild(select);
    this.datasetSelects.push(select);
  }


  restrictToVolOnly() {
    this.isVolOnly = true;
    this.meshInput.accept = ".mesh, .vtk";
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
