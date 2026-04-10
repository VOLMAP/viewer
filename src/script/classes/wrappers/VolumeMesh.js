import * as THREE from "../../../libs/three/three.module.js";
import * as utils from "../../main/utils.js";
import { MeshController } from "../controllers/MeshController.js";
import { MeshLoader } from "../loaders/MeshLoader.js";
import { TetrahedronDigger } from "../map_inspection/TetrahedronDigger.js";
import { MeshRenderer } from "../mesh_inspection/MeshRenderer.js";
import { MeshSlicer } from "../mesh_inspection/MeshSlicer.js";

/* PolygonOffset to avoid z-fighting when rendering, in external to internal order: 
   wireframe -> mesh -> shell */
const standardWireframeMaterial = new THREE.LineBasicMaterial({
  color: utils.blackHex,
});

const standardMaterial = new THREE.MeshPhysicalMaterial({
  color: utils.whiteHex,
  side: THREE.DoubleSide,
  flatShading: true,
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
});

const standardShellMaterial = new THREE.MeshPhysicalMaterial({
  color: utils.whiteHex,
  transparent: true,
  opacity: 0.3,
  polygonOffset: true,
  polygonOffsetFactor: 2,
  polygonOffsetUnits: 2,
});

export class VolumeMesh {
  mesh = null;
  tmpSurfaceMesh = null;
  loadedFileType = null;
  plainColor = utils.whiteHex;

  txtIsValid = false;

  shell = null;
  wireframe = null;
  boundingBox = null;

  separation = 0;

  controller = null;
  meshRenderer = null;
  meshSlicer = null;
  volumeMap = null;

  constructor(settingsContainer, canvasContainer) {
    this.controller = new MeshController(this, settingsContainer, canvasContainer);
    this.meshRenderer = new MeshRenderer(this, canvasContainer);
    this.meshSlicer = new MeshSlicer(this);
    this.digger = new TetrahedronDigger(this)
  }

  setMesh(mesh) {
    const otherMesh = this.volumeMap.volumeMesh1 === this ? this.volumeMap.volumeMesh2 : this.volumeMap.volumeMesh1;

    if (this.volumeMap.tetrahedronPicker.lastPickedPolyhedronIndex !== null) {
      this.volumeMap.tetrahedronPicker.lastPickedPolyhedronIndex = null;
      this.volumeMap.tetrahedronPicker.lastPickedPolyhedronColor = null;
    }

    this.mesh = mesh;
    this.mesh.material = standardMaterial.clone();
    // Translate mesh to origin and compute bounding box
    this.translateToOrigin();
    this.setBoundingBox();

    //Reset wireframe and generate surface mesh and wireframe
    this.setWireframe();
    if (this.volumeMap) {
      this.volumeMap.isValid = false;
    }
    this.updateVisibleFaces(false, false, false);
    // Generate shell from the surface mesh
    this.setShell();
    //RenderOrder to avoid z-fighting when rendering in external to internal order
    this.wireframe.renderOrder = 3;
    this.mesh.renderOrder = 2;
    this.shell.renderOrder = 1;
    //Update the slicer with the new mesh and reset it
    this.meshSlicer.updateMesh();
    this.controller.resetSlicer();
    this.volumeMap.updateMesh(this);
    //Update the renderer with the new mesh and reset it
    this.meshRenderer.updateMesh();
    this.controller.resetRendering();

    //Reset the scene to default rendering objects and colors
    this.resetRendering();
    if (this.meshSlicer.isActive) {
      this.toggleSlicingPlane(true, 0);
      this.toggleSlicingPlane(true, 1);
      this.toggleSlicingPlane(true, 2);
    }

    this.digger.updateMesh();

    if (!this.digger.isActive) {
      this.digger.setActive(true);
    }

    if (otherMesh.tmpSurfaceMesh) {
      otherMesh.loadSurfaceMeshFromTxt(otherMesh.tmpSurfaceMesh);
    }

  }


  setShell() {
    this.shell = new THREE.Mesh(this.mesh.geometry.clone(), standardShellMaterial.clone());
    this.shell.position.copy(this.mesh.position);
  }

  setWireframe() {
    const vertices = this.mesh.geometry.userData.vertices;

    const segments = new Array();

    const wireframeGeometry = new THREE.BufferGeometry();
    const segmentsAttribute = new THREE.BufferAttribute(new Uint32Array(segments), 1);
    const positionsAttribute = new THREE.BufferAttribute(new Float32Array(vertices), 3);

    wireframeGeometry.setIndex(segmentsAttribute);
    wireframeGeometry.setAttribute("position", positionsAttribute);

    this.wireframe = new THREE.LineSegments(wireframeGeometry, standardWireframeMaterial.clone());
    this.wireframe.position.copy(this.mesh.position);
  }

  setBoundingBox() {
    this.mesh.geometry.computeBoundingBox();
    const box = this.mesh.geometry.boundingBox;
    box.translate(this.mesh.position);

    this.boundingBox = new THREE.Box3Helper(box, utils.yellowHex);
  }

  // This method translates the mesh to origin
  translateToOrigin() {
    // Compute the bounding box of the geometry
    this.mesh.geometry.computeBoundingBox();
    const box = this.mesh.geometry.boundingBox;

    // Calculate the translation vector
    const origin = new THREE.Vector3(0, 0, 0);
    const boxCentroid = box.getCenter(new THREE.Vector3());
    const translationVector = new THREE.Vector3().subVectors(origin, boxCentroid);

    this.mesh.position.copy(translationVector);
  }

  updateVisibleFaces(isSlicerActive, isDistortionSlicerActive, isDiggerActive) {
    const adjacencyMap = this.mesh.geometry.userData.adjacencyMap;
    const vertices = this.mesh.geometry.userData.vertices;
    const tetrahedra = this.mesh.geometry.userData.tetrahedra;

    //Mesh attributes
    var tmpTriangleSoup = new Array();
    var tmpFaces = new Array();
    //Wireframe attributes
    var tmpSegments = new Array();

    const isPolyVisible = (polyIndex) => {
      return (
        (!isSlicerActive || this.meshSlicer.isPolyVisible(polyIndex)) &&
        (!isDistortionSlicerActive || this.volumeMap.distortionSlicer.isPolyVisibleByDistortion(polyIndex)) &&
        (!isDiggerActive || this.digger.isPolyVisible(polyIndex))
      );
    };

    const computeCentroid = (vertexIndices) => {
      let centroidX = 0, centroidY = 0, centroidZ = 0;
      vertexIndices.forEach(vertex => {
        centroidX += vertices[vertex * 3];
        centroidY += vertices[vertex * 3 + 1];
        centroidZ += vertices[vertex * 3 + 2];
      });
      return {
        x: (centroidX / vertexIndices.length),
        y: (centroidY / vertexIndices.length),
        z: (centroidZ / vertexIndices.length)
      }
    }

    const computeSeparation = (vertex, centroid) => {
      return {
        x: vertices[vertex * 3] - (vertices[vertex * 3] - centroid.x) * this.separation,
        y: vertices[vertex * 3 + 1] - (vertices[vertex * 3 + 1] - centroid.y) * this.separation,
        z: vertices[vertex * 3 + 2] - (vertices[vertex * 3 + 2] - centroid.z) * this.separation
      }
    }

    if (this.separation > 0) {
      const surfaceVertexIds = new Set();

      for (const [key, value] of adjacencyMap.entries()) {

        if (value.length === 2) {
          const isVisible1 = isPolyVisible(value[0].polyIndex);
          const isVisible2 = isPolyVisible(value[1].polyIndex);

          if (isVisible1 !== isVisible2) {
            key.split(",").map(Number).forEach(id => surfaceVertexIds.add(id));
          }
        } else if (value.length === 1) {
          const isVisible = isPolyVisible(value[0].polyIndex);
          if (isVisible) {
            key.split(",").map(Number).forEach(id => surfaceVertexIds.add(id));
          }
        }
      }

      var wireframeVertexCounter = 0;

      for (let i = 0; i < tetrahedra.length; i += 4) {
        const polyIndex = i / 4;

        if (!isPolyVisible(polyIndex)) continue;

        const v0 = tetrahedra[i];
        const v1 = tetrahedra[i + 1];
        const v2 = tetrahedra[i + 2];
        const v3 = tetrahedra[i + 3];

        if (!surfaceVertexIds.has(v0) && !surfaceVertexIds.has(v1) &&
          !surfaceVertexIds.has(v2) && !surfaceVertexIds.has(v3)) continue;

        const faces = [
          [v0, v2, v1],
          [v0, v1, v3],
          [v0, v3, v2],
          [v1, v2, v3],
        ];

        const centroid = computeCentroid([v0, v1, v2, v3]);

        faces.forEach((face) => {
          const faceKey = [...face].sort((a, b) => a - b).join(",");
          tmpFaces.push(faceKey);

          for (let j = 0; j < 3; j++) {
            const v = face[j];
            const vertexSeparate = computeSeparation(v, centroid);
            tmpTriangleSoup.push(vertexSeparate.x, vertexSeparate.y, vertexSeparate.z);
          }

          tmpSegments.push(wireframeVertexCounter, wireframeVertexCounter + 1);
          tmpSegments.push(wireframeVertexCounter + 1, wireframeVertexCounter + 2);
          tmpSegments.push(wireframeVertexCounter + 2, wireframeVertexCounter);
          wireframeVertexCounter += 3;
        });
      }
    } else {
      for (const key of adjacencyMap.keys()) {
        const value = adjacencyMap.get(key);

        var sortedFace = null;
        var polyIndex = null;

        if (value.length == 2) {
          //Check the visibility of the two adjacent tetrahedra
          const isVisible1 = isPolyVisible(value[0].polyIndex);
          const isVisible2 = isPolyVisible(value[1].polyIndex);
          //If only one of the two is visible, add the face to the triangle soup
          if (isVisible1 !== isVisible2) {
            sortedFace = isVisible1 ? value[0].sortedFace : value[1].sortedFace;
            polyIndex = isVisible1 ? value[0].polyIndex : value[1].polyIndex;
          }
        } else if (value.length == 1) {
          //Check the visibility of the adjacent tetrahedra
          const isVisible = isPolyVisible(value[0].polyIndex);
          //If it's visible, add the face to the triangle soup
          if (isVisible) {
            sortedFace = value[0].sortedFace;
            polyIndex = value[0].polyIndex;
          }
        } else {
          console.error(
            "Adjacency map entry with less than 1 or more than 2 adjacent polyhedra found.",
          );
        }
        //If the face has to be added
        if (sortedFace) {
          for (let i = 0; i < sortedFace.length; i++) {
            // Get vertex index
            const v = sortedFace[i];
            // Push vertex coordinates
            tmpTriangleSoup.push(vertices[v * 3]);
            tmpTriangleSoup.push(vertices[v * 3 + 1]);
            tmpTriangleSoup.push(vertices[v * 3 + 2]);
          }
          // Push polyhedron index
          tmpFaces.push(key);
          // Push wireframe segments (for each face, create its 3 edges)
          tmpSegments.push(sortedFace[0], sortedFace[1]);
          tmpSegments.push(sortedFace[1], sortedFace[2]);
          tmpSegments.push(sortedFace[2], sortedFace[0]);
        }
      }
    }

    //Update mesh geometry
    const positionsAttribute = new THREE.BufferAttribute(new Float32Array(tmpTriangleSoup), 3);
    this.mesh.geometry.setAttribute("position", positionsAttribute);
    this.mesh.geometry.userData.faceKeys = tmpFaces;
    //Compute normals for proper lighting
    this.mesh.geometry.deleteAttribute("normal");
    this.mesh.geometry.computeVertexNormals();
    this.mesh.geometry.needsUpdate = true;
    //Update wireframe geometry
    const segmentsAttribute = new THREE.BufferAttribute(new Uint32Array(tmpSegments), 1);
    this.wireframe.geometry.setIndex(segmentsAttribute);
    let wireframePositionAttribute = null;
    if (this.separation > 0) {
      wireframePositionAttribute = new THREE.BufferAttribute(new Float32Array(tmpTriangleSoup), 3);
    } else {
      wireframePositionAttribute = new THREE.BufferAttribute(new Float32Array(vertices), 3);
    }
    this.wireframe.geometry.setAttribute("position", wireframePositionAttribute);
    this.wireframe.geometry.needsUpdate = true;


    if (this.volumeMap && this.volumeMap.isValid) {
      this.updateVisibleFacesColor();
    }
  }

  updateVisibleFacesColor() {
    const adjacencyMap = this.mesh.geometry.userData.adjacencyMap;
    const faceKeys = this.mesh.geometry.userData.faceKeys;
    const polyColor = this.mesh.geometry.userData.polyColor;
    var tmpColor = new Array();

    for (let i = 0; i < faceKeys.length; i++) {
      const key = faceKeys[i];
      const value = adjacencyMap.get(key);
      const polyIndex = value[0].polyIndex;
      const color = polyColor[polyIndex];

      //One color per vertex
      for (let j = 0; j < 3; j++) {
        tmpColor.push(color.r, color.g, color.b);
      }
    }


    const colorAttribute = new THREE.BufferAttribute(new Float32Array(tmpColor), 3);
    this.mesh.geometry.setAttribute("color", colorAttribute);
    this.mesh.geometry.needsUpdate = true;
  }

  async loadMesh(file) {
    //Convert the filename to lowercase for case-insensitive comparison
    const fileName = file.name.toLowerCase();
    //Get the file format from its extension
    const fileFormat = fileName.split(".").pop();

    if (fileFormat === "txt" && this.controller.isVolOnly) {
      console.warn("txt files not allowed for this mesh");
      return;
    }

    var mesh = null;

    if (fileFormat === "mesh") {
      const loader = new MeshLoader();
      this.loadedFileType = "mesh";
      try {
        mesh = await loader.loadMesh(file);
      } catch (error) {
        console.error("Error loading .mesh file:", error);
      }
    } else if (fileFormat === "vtk") {
      const loader = new MeshLoader();
      this.loadedFileType = "vtk";
      try {
        mesh = await loader.loadVTK(file);
      } catch (error) {
        console.error("Error loading .vtk file:", error);
      }
    } else if (fileFormat === "txt") {
      const loader = new MeshLoader();
      this.loadedFileType = "txt";
      try {
        mesh = await loader.loadTxt(file);
      } catch (error) {
        console.error("Error loading .txt file:", error);
      }

      if (mesh) {
        this.tmpSurfaceMesh = mesh;
        this.loadSurfaceMeshFromTxt(mesh);
      }

      return;
    } else {
      console.error("Invalid file format selected");
    }

    if (mesh) {
      this.setMesh(mesh);
      this.volumeMap.volumeMesh1.updateMeshLabels();

    }
  }

  async loadSampleMesh(fileName) {
    const url = `./src/assets/sample_maps/${fileName}`;
    const response = await fetch(url);
    const blob = await response.blob();
    const file = new File([blob], fileName);

    await this.loadMesh(file);
  }

  async loadRemoteMesh(url, filename) {
    const response = await fetch(url);
    const blob = await response.blob();
    const file = new File([blob], filename);

    await this.loadMesh(file);
  }

  loadSurfaceMeshFromTxt(txtMesh) {
    const volMesh = this.volumeMap.volumeMesh1.mesh;
    if (!volMesh) {
      console.warn("Volumetric mesh not loaded yet.");
      return;
    }

    const adjacencyMap = volMesh.geometry.userData.adjacencyMap;
    const txtVertices = txtMesh.geometry.userData.vertices;
    const txtVerticesIds = txtMesh.geometry.userData.verticesIds;

    const volMeshNumVertices = volMesh.geometry.userData.vertices.length / 3;

    const txtVertexMap = new Map();
    const surfaceVertexIds = new Set();
    const triangleSoup = new Array();

    for (let i = 0; i < txtVerticesIds.length; i++) {
      const id = txtVerticesIds[i];

      txtVertexMap.set(id, {
        x: txtVertices[i * 3],
        y: txtVertices[i * 3 + 1],
        z: txtVertices[i * 3 + 2],
      });
    }


    for (const [key, value] of adjacencyMap.entries()) {
      if (value.length !== 1) {
        continue;
      }

      const faceIds = key.split(",").map(Number);
      faceIds.forEach(id => surfaceVertexIds.add(id));
    }

    for (const id of txtVerticesIds) {
      if (id >= volMeshNumVertices) {
        console.error(`id=${id} is out of range`);
        this.txtIsValid = false;
        this.volumeMap.volumeMesh1.updateMeshLabels(true);
        return;
      }
      if (!surfaceVertexIds.has(id)) {
        console.error(`${id} is not a surface vertex`);
        this.txtIsValid = false;
        this.volumeMap.volumeMesh1.updateMeshLabels(true);
        return;
      }
    }



    for (const [key, value] of adjacencyMap.entries()) {
      if (value.length !== 1) {
        continue;
      }

      const face = value[0].sortedFace;
      for (const id of face) {
        const position = txtVertexMap.get(id);
        triangleSoup.push(position.x, position.y, position.z);
      }
    }

    if (triangleSoup.length === 0) {
      console.error("No surface faces found matching the txt vertex IDs");
      return;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(triangleSoup), 3));
    geometry.computeVertexNormals();

    this.mesh = new THREE.Mesh(geometry, standardMaterial.clone());
    this.mesh.position.set(0, 0, 0);

    this.translateToOrigin();

    this.meshRenderer.updateMesh();

    const wireframeGeometry = new THREE.BufferGeometry();
    wireframeGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(triangleSoup), 3));
    this.wireframe = new THREE.LineSegments(new THREE.WireframeGeometry(wireframeGeometry), standardWireframeMaterial.clone());
    this.wireframe.position.copy(this.mesh.position);
    this.meshRenderer.toggleObject(true, this.wireframe);

    this.tmpSurfaceMesh = null;
    this.txtIsValid = true;
    this.volumeMap.volumeMesh1.updateMeshLabels(false);
  }

  updateMeshLabels(isMismatch = false) {
    const isVolMesh = (t) => t === "mesh" || t === "vtk";

    const mesh1 = this.volumeMap.volumeMesh1;
    const mesh2 = this.volumeMap.volumeMesh2;
    const typeMesh1 = mesh1.loadedFileType;
    const typeMesh2 = mesh2.loadedFileType;

    const mismatchLabel = document.getElementById("mismatch-label");

    if (isMismatch) {
      mesh1.controller.hideMeshLabel();
      mesh2.controller.hideMeshLabel();
      mismatchLabel.querySelector(".mismatch-label-text").textContent = "Mesh mismatch";
      mismatchLabel.classList.remove("hidden");
      return;
    }

    mismatchLabel.classList.add("hidden");

    if (isVolMesh(typeMesh1) && isVolMesh(typeMesh2)) {
      if (!mesh1.mesh || !mesh2.mesh) {
        mesh1.controller.setMeshLabel("Domain tetmesh", false);
        mesh2.controller.setMeshLabel("Codomain tetmesh", false);
        return;
      }

      const vertices1 = mesh1.mesh.geometry.userData.vertices.length;
      const vertices2 = mesh2.mesh.geometry.userData.vertices.length;
      const tetrahedra1 = mesh1.mesh.geometry.userData.tetrahedra.length;
      const tetrahedra2 = mesh2.mesh.geometry.userData.tetrahedra.length;
      const match = (vertices1 === vertices2 && tetrahedra1 === tetrahedra2);

      if (!match) {
        mesh1.controller.hideMeshLabel();
        mesh2.controller.hideMeshLabel();
        mismatchLabel.querySelector(".mismatch-label-text").textContent = "Mesh mismatch";
        mismatchLabel.classList.remove("hidden");
      } else {
        mesh1.controller.setMeshLabel("Domain tetmesh", false);
        mesh2.controller.setMeshLabel("Codomain tetmesh", false);
      }

    } else if (isVolMesh(typeMesh1) && typeMesh2 === "txt") {
      mesh1.controller.setMeshLabel("Input tetmesh", false);
      mesh2.controller.setMeshLabel("Surface constraints", false);
    }
  }

  toggleShell(flag) {
    if (!this.shell) {
      console.warn("Shell not loaded yet");
      return false;
    }

    this.meshRenderer.toggleObject(flag, this.shell);
    return true;
  }

  changePlainColor(color_ex) {
    if (!this.mesh) {
      console.warn("Mesh not loaded yet");
      return false;
    }

    this.plainColor = color_ex;

    if (!this.volumeMap.mapViewer.isActive) {
      this.mesh.material.color.set(color_ex);
      this.mesh.material.needsUpdate = true;
    }

    return true;
  }

  toggleWireframe(flag) {
    if (!this.wireframe) {
      console.warn("Wireframe not loaded yet");
      return false;
    }

    this.meshRenderer.toggleObject(flag, this.wireframe);
    return true;
  }

  changeWireframeColor(color_ex) {
    if (!this.wireframe) {
      console.warn("Wireframe not loaded yet");
      return false;
    }

    this.wireframe.material.color.set(color_ex);
    this.wireframe.material.needsUpdate = true;
    return true;
  }

  toggleBoundingBox(flag) {
    if (!this.boundingBox) {
      console.warn("Bounding box not loaded yet");
      return false;
    }

    this.meshRenderer.toggleObject(flag, this.boundingBox);
    return true;
  }

  toggleMapColor(flag) {
    if (flag) {
      this.mesh.material.color.set(utils.whiteHex);
      this.mesh.material.color.set(null);
      this.mesh.material.vertexColors = true;
    } else {
      this.mesh.material.color.set(this.plainColor);
      this.mesh.material.vertexColors = false;
    }

    this.mesh.material.needsUpdate = true;
  }

  toggleSlicer(flag) {
    if (!this.mesh) {
      console.warn("Mesh not loaded yet");
      return false;
    }

    this.meshSlicer.setActive(flag);
    this.controller.toggleSlicerContainer(flag);
    this.toggleSlicingPlane(flag, 0);
    this.toggleSlicingPlane(flag, 1);
    this.toggleSlicingPlane(flag, 2);

    if (!flag) {
      this.meshSlicer.resetSlicer();
      this.controller.resetSlicer();
      this.updateVisibleFaces(this.meshSlicer.isActive, this.volumeMap.distortionSlicer.isActive, this.digger.isActive);
    }

    return true;
  }

  slice(sliderValue, axisIndex) {
    if (!this.mesh) {
      console.warn("Mesh not loaded yet");
      return false;
    }

    if (!this.meshSlicer.isActive) {
      console.warn("Mesh Slicer is not active");
      return false;
    }

    const result = this.meshSlicer.slice(sliderValue, axisIndex);

    if (result) {
      this.updateVisibleFaces(this.meshSlicer.isActive, this.volumeMap.distortionSlicer.isActive, this.digger.isActive);
    }

    return result;
  }

  toggleSlicingPlane(flag, axisIndex) {
    if (!this.mesh) {
      console.warn("Mesh not loaded yet");
      return false;
    }

    if (flag && !this.meshSlicer.isActive) {
      console.warn("Mesh Slicer is not active");
      return false;
    }

    const plane = this.meshSlicer.getSlicingPlane(axisIndex);

    this.meshRenderer.toggleObject(flag, plane);
    return true;
  }

  reverseSlicingDirection(flag, axisIndex) {
    if (!this.mesh) {
      console.warn("Mesh not loaded yet");
      return false;
    }

    if (!this.meshSlicer.isActive) {
      console.warn("Mesh Slicer is not active");
      return false;
    }

    const result = this.meshSlicer.reverseSlicingDirection(flag, axisIndex);

    if (result) {
      this.updateVisibleFaces(this.meshSlicer.isActive, this.volumeMap.distortionSlicer.isActive, this.digger.isActive);
    }

    return result;
  }

  pickerSlice(pickedPolyhedron) {
    if (!this.mesh) {
      console.warn("Mesh not loaded yet");
      return false;
    }

    if (!this.volumeMap.mapViewer.isActive) {
      console.warn("Map Viewer is not active");
      return false;
    }

    const result = this.meshSlicer.pickerSlice(pickedPolyhedron);

    if (result) {
      this.updateVisibleFaces(true, this.volumeMap.distortionSlicer.isActive, this.digger.isActive);
    }

    return result;
  }

  setDiggerMode(mode) {
    if (!this.mesh) {
      console.warn("Mesh not loaded yet");
      return false;
    }
    this.digger.setMode(mode);
    return true;
  }

  separate(separation) {
    if (!this.mesh) {
      console.warn("Mesh not loaded yet");
      return false;
    }
    this.separation = separation / 100 * 0.2;
    this.updateVisibleFaces(this.meshSlicer.isActive, this.volumeMap.distortionSlicer.isActive, this.digger.isActive);
    return true;
  }

  resetRendering() {
    this.toggleShell(true);
    this.changePlainColor(utils.whiteHex);
    this.toggleWireframe(true);
    this.separation = 0;
    this.changeWireframeColor(utils.blackHex);
    this.toggleBoundingBox(false);
  }
}
