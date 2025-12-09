import * as THREE from "../../../libs/three/three.module.js";
import * as utils from "../../main/utils.js";
import { MeshController } from "../controllers/MeshController.js";
import { MeshLoader } from "../loaders/MeshLoader.js";
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
  plainColor = utils.whiteHex;

  shell = null;
  wireframe = null;
  boundingBox = null;

  controller = null;
  meshRenderer = null;
  meshSlicer = null;
  volumeMap = null;

  constructor(settingsContainer, canvasContainer) {
    this.controller = new MeshController(this, settingsContainer, canvasContainer);
    this.meshRenderer = new MeshRenderer(this, canvasContainer);
    this.meshSlicer = new MeshSlicer(this);
  }

  setMesh(mesh) {
    this.mesh = mesh;
    this.mesh.material = standardMaterial.clone();
    // Translate mesh to origin and compute bounding box
    this.translateToOrigin();
    this.setBoundingBox();
    //Reset wireframe and generate surface mesh and wireframe
    this.setWireframe();
    this.updateVisibleFaces(false, false);
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
  }

  setShell() {
    this.shell = new THREE.Mesh(this.mesh.geometry.clone(), standardShellMaterial.clone());
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
  }

  setBoundingBox() {
    this.mesh.geometry.computeBoundingBox();
    const box = this.mesh.geometry.boundingBox;

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

    // Translate the mesh to the origin
    var vertices = this.mesh.geometry.userData.vertices;
    var triangleSoup = this.mesh.geometry.userData.triangleSoup;

    for (let i = 0; i < triangleSoup.length; i += 3) {
      triangleSoup[i] += translationVector.x;
      triangleSoup[i + 1] += translationVector.y;
      triangleSoup[i + 2] += translationVector.z;
    }

    for (let i = 0; i < vertices.length; i += 3) {
      vertices[i] += translationVector.x;
      vertices[i + 1] += translationVector.y;
      vertices[i + 2] += translationVector.z;
    }

    const positionAttribute = new THREE.BufferAttribute(new Float32Array(triangleSoup), 3);
    this.mesh.geometry.setAttribute("position", positionAttribute);
  }

  updateVisibleFaces(isSlicerActive, isDistortionSlicerActive) {
    const adjacencyMap = this.mesh.geometry.userData.adjacencyMap;
    const vertices = this.mesh.geometry.userData.vertices;
    //Mesh attributes
    var tmpTriangleSoup = new Array();
    var tmpPoly = new Array();
    //Wireframe attributes
    var tmpSegments = new Array();

    for (const key of adjacencyMap.keys()) {
      const value = adjacencyMap.get(key);

      var sortedFace = null;
      var polyIndex = null;

      if (value.length == 2) {
        //Check the visibility of the two adjacent tetrahedra
        const isVisible1 =
          (!isSlicerActive || this.meshSlicer.isPolyVisible(value[0].polyIndex)) &&
          (!isDistortionSlicerActive ||
            this.volumeMap.distortionSlicer.isPolyVisibleByDistortion(value[0].polyIndex));
        const isVisible2 =
          (!isSlicerActive || this.meshSlicer.isPolyVisible(value[1].polyIndex)) &&
          (!isDistortionSlicerActive ||
            this.volumeMap.distortionSlicer.isPolyVisibleByDistortion(value[1].polyIndex));
        //If only one of the two is visible, add the face to the triangle soup
        if (isVisible1 !== isVisible2) {
          sortedFace = isVisible1 ? value[0].sortedFace : value[1].sortedFace;
          polyIndex = isVisible1 ? value[0].polyIndex : value[1].polyIndex;
        }
      } else if (value.length == 1) {
        //Check the visibility of the adjacent tetrahedra
        const isVisible =
          (!isSlicerActive || this.meshSlicer.isPolyVisible(value[0].polyIndex)) &&
          (!isDistortionSlicerActive ||
            this.volumeMap.distortionSlicer.isPolyVisibleByDistortion(value[0].polyIndex));
        //If it's visible, add the face to the triangle soup
        if (isVisible) {
          sortedFace = value[0].sortedFace;
          polyIndex = value[0].polyIndex;
        }
      } else {
        console.error(
          "Adjacency map entry with less than 1 or more than 2 adjacent polyhedra found."
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
        tmpPoly.push(polyIndex);
        // Push wireframe segments (for each face, create its 3 edges)
        tmpSegments.push(sortedFace[0], sortedFace[1]);
        tmpSegments.push(sortedFace[1], sortedFace[2]);
        tmpSegments.push(sortedFace[2], sortedFace[0]);
      }
    }
    //Update mesh geometry
    const positionsAttribute = new THREE.BufferAttribute(new Float32Array(tmpTriangleSoup), 3);
    this.mesh.geometry.setAttribute("position", positionsAttribute);
    const polyAttribute = new THREE.BufferAttribute(new Uint32Array(tmpPoly), 1);
    this.mesh.geometry.setAttribute("polyIndex", polyAttribute);
    //Compute normals for proper lighting
    this.mesh.geometry.computeVertexNormals();
    this.mesh.geometry.needsUpdate = true;
    //Update wireframe geometry
    const segmentsAttribute = new THREE.BufferAttribute(new Uint32Array(tmpSegments), 1);
    this.wireframe.geometry.setIndex(segmentsAttribute);
    this.wireframe.geometry.needsUpdate = true;

    if (this.volumeMap && this.volumeMap.isValid) {
      this.updateVisibleFacesColor();
    }
  }

  updateVisibleFacesColor() {
    const polyIndex = this.mesh.geometry.getAttribute("polyIndex");
    const polyColor = this.mesh.geometry.userData.polyColor;
    var tmpColor = new Array();

    for (let i = 0; i < polyIndex.count; i++) {
      const pIndex = polyIndex.array[i];
      if (polyColor) {
        const color = polyColor[pIndex];
        //One color per vertex
        for (let j = 0; j < 3; j++) {
          tmpColor.push(color.r, color.g, color.b);
        }
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

    var mesh = null;

    if (fileFormat === "mesh") {
      const loader = new MeshLoader();
      try {
        mesh = await loader.load(file);
      } catch (error) {
        console.error("Error loading .mesh file:", error);
      }
    } else {
      console.error("Invalid file format selected");
    }

    if (mesh) {
      this.setMesh(mesh);
    }
  }

  async loadSampleMesh(fileName) {
    const url = `./src/assets/sample_maps/${fileName}`;
    const response = await fetch(url);
    const blob = await response.blob();
    const file = new File([blob], fileName);

    await this.loadMesh(file);
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

    if (this.volumeMap.mapViewer.isActive) {
      console.warn("Cannot change plain color while map is active");
      return false;
    }

    this.plainColor = color_ex;
    // TODO Change color only if map is not active !this.volumeMap.isMapActive
    if (true) {
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
      this.updateVisibleFaces(this.meshSlicer.isActive, this.volumeMap.distortionSlicer.isActive);
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
      this.updateVisibleFaces(this.meshSlicer.isActive, this.volumeMap.distortionSlicer.isActive);
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
      this.updateVisibleFaces(this.meshSlicer.isActive, this.volumeMap.distortionSlicer.isActive);
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
      this.updateVisibleFaces(true, this.volumeMap.distortionSlicer.isActive);
    }

    return result;
  }

  resetRendering() {
    this.toggleShell(true);
    this.changePlainColor(utils.whiteHex);
    this.toggleWireframe(true);
    this.changeWireframeColor(utils.blackHex);
    this.toggleBoundingBox(false);
  }
}
