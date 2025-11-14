import { initializeComponents } from "./components.js";
import { MeshRenderer } from "../classes/renderer/MeshRenderer.js";
import { MeshRendererController } from "../classes/renderer/MeshRendererController.js";
import { MapViewer } from "../classes/mapViewer/MapViewer.js";
import { MapViewerController } from "../classes/mapViewer/MapViewerController.js";

await initializeComponents();

const n = 2;
const renderers = [];

for (let i = 1; i <= n; i++) {
  const rendererContainer = document.getElementById(`mesh${i}_renderer`);
  const renderer = new MeshRenderer(rendererContainer);

  const settingsContainer = document.getElementById(`mesh${i}_settings`);
  new MeshRendererController(renderer, settingsContainer);

  renderers.push(renderer);
}

const mapViewer = new MapViewer(renderers);

const mapSettingsContainer = document.getElementById(`map_settings`);
new MapViewerController(mapViewer, mapSettingsContainer);

export { renderers, mapViewer };
