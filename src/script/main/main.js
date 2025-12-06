import { initializeComponents } from "./components.js";
import { VolumeMesh } from "../classes/wrappers/VolumeMesh.js";

await initializeComponents();

const volumeMeshes = [];

for (let i = 1; i <= 2; i++) {
  const settingsContainer = document.getElementById(`mesh${i}_settings`);
  const canvasContainer = document.getElementById(`mesh${i}_canvas`);

  const volumeMesh = new VolumeMesh(settingsContainer, canvasContainer);

  volumeMeshes.push(volumeMesh);
}

volumeMeshes[0].loadSampleMesh("hand_aigerman.mesh");
volumeMeshes[1].loadSampleMesh("hand_pc_aigerman.mesh");

/*
const mapper = new MeshMapper(renderers);

const mapSettingsContainer = document.getElementById(`map_settings`);
new MeshMapperController(mapper, mapSettingsContainer);

const domainUrl = "./src/assets/maps/hand_aigerman.mesh";
const codomainUrl = "./src/assets/maps/hand_pc_aigerman.mesh";

const domainFile = await fetch(domainUrl);
const codomainFile = await fetch(codomainUrl);

const domainBlob = await domainFile.blob();
const codomainBlob = await codomainFile.blob();

const loader = new MeshLoader();

const domainMesh = await loader.load(domainBlob);
renderers[0].setMesh(domainMesh);
renderers[0].controller.reset();

const codomainMesh = await loader.load(codomainBlob);
renderers[1].setMesh(codomainMesh);
renderers[1].controller.reset();
*/
