import { initializeComponents } from "./components.js";
import { VolumeMesh } from "../classes/wrappers/VolumeMesh.js";
import { VolumeMap } from "../classes/wrappers/VolumeMap.js";

await initializeComponents();

const volumeMeshes = [];

for (let i = 1; i <= 2; i++) {
  const settingsContainer = document.getElementById(`mesh${i}_settings`);
  const canvasContainer = document.getElementById(`mesh${i}_canvas`);

  const volumeMesh = new VolumeMesh(settingsContainer, canvasContainer);

  volumeMeshes.push(volumeMesh);
}

const mapSettingsContainer = document.getElementById(`map_settings`);
const statusBarContainer = document.getElementById(`status_bar`);

const volumeMap = new VolumeMap(
  volumeMeshes[0],
  volumeMeshes[1],
  mapSettingsContainer,
  statusBarContainer
);

volumeMeshes[0].loadSampleMesh("hand_aigerman.mesh");
volumeMeshes[1].loadSampleMesh("hand_pc_aigerman.mesh");
