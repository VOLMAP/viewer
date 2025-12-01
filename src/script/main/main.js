import { initializeComponents } from "./components.js";
import { MeshRenderer } from "../classes/renderer/MeshRenderer.js";
import { MeshRendererController } from "../classes/renderer/MeshRendererController.js";
import { MeshSlicer } from "../classes/slicer/MeshSlicer.js";
import { MeshSlicerController } from "../classes/slicer/MeshSlicerController.js";
import { MapViewer } from "../classes/mapViewer/MapViewer.js";
import { MapViewerController } from "../classes/mapViewer/MapViewerController.js";

await initializeComponents();

const n = 2;
const meshRenderers = [];

for (let i = 1; i <= n; i++) {
  const rendererContainer = document.getElementById(`mesh${i}_renderer`);
  const meshRenderer = new MeshRenderer(rendererContainer);

  const settingsContainer = document.getElementById(`mesh${i}_settings`);
  new MeshRendererController(meshRenderer, settingsContainer);

  meshRenderers.push(meshRenderer);

  const meshSlicer = new MeshSlicer(meshRenderer);

  const slicerSettingsContainer =
    rendererContainer.getElementsByClassName("slicer-settings")[0];
  new MeshSlicerController(meshSlicer, slicerSettingsContainer);
}

const mapViewer = new MapViewer(meshRenderers);

const mapSettingsContainer = document.getElementById(`map_settings`);
new MapViewerController(mapViewer, mapSettingsContainer);

export { meshRenderers, mapViewer };
