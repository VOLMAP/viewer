import * as THREE from "../../../libs/three/three.module.js";
import { MeshSlicer } from "../slicers/MeshSlicer.js";

const white = 0xffffff;
const black = 0x000000;
const yellow = 0xffff00;

const standardMaterial = new THREE.MeshPhysicalMaterial({
  color: white,
  side: THREE.DoubleSide,
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
});

const standardShellMaterial = new THREE.MeshPhysicalMaterial({
  color: white,
  transparent: true,
  opacity: 0.5,
  polygonOffset: true,
  polygonOffsetFactor: 2,
  polygonOffsetUnits: 2,
});

const standardWireframeMaterial = new THREE.LineBasicMaterial({
  color: black,
});

export class VolumeMesh {
  mesh = null;
  colorMaterial = null;
  //textureMaterial = null;
  wireframe = null;
  boundingBox = null;
  slicer = null;

  constructor(geometry, color_ex = null, texture = null) {
    this.colorMaterial = standardMaterial.clone();
    //this.textureMaterial = standardMaterial.clone();

    if (color_ex) {
      this.changeColor(color_ex);
    }
    /*
    if (texture) {
      this.changeTexture(texture);
    }
    */
    this.mesh = new THREE.Mesh(geometry, this.colorMaterial);
    this.mesh.renderOrder = 2;

    this.translateToOrigin();
    this.computeProperties();

    this.setWireframe();

    this.setBoundingBox();
    this.setSlicer();
    this.setShell();
  }

  getMesh() {
    return this.mesh;
  }

  getWireframe() {
    return this.wireframe;
  }

  setWireframe() {
    const faces = this.mesh.geometry.userData.triangles;
    var vertices = this.mesh.geometry.userData.vertices;

    var segments = new Array();

    for (let i = 0; i < faces.length; i += 3) {
      const a = faces[i];
      const b = faces[i + 1];
      const c = faces[i + 2];

      segments.push(a, b, b, c, c, a);
    }

    segments = new Uint32Array(segments);
    vertices = new Float32Array(vertices);

    const wireframeGeometry = new THREE.BufferGeometry();
    wireframeGeometry.setIndex(new THREE.BufferAttribute(segments, 1));
    wireframeGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(vertices, 3)
    );

    this.wireframe = new THREE.LineSegments(
      wireframeGeometry,
      standardWireframeMaterial.clone()
    );

    this.wireframe.renderOrder = 3;
  }

  setShell() {
    this.shell = new THREE.Mesh(
      this.mesh.geometry.clone(),
      standardShellMaterial.clone()
    );

    this.shell.renderOrder = 1;
  }

  getShell() {
    return this.shell;
  }

  getBoundingBox() {
    return this.boundingBox;
  }

  setBoundingBox() {
    const box = this.mesh.geometry.boundingBox;

    this.boundingBox = new THREE.Box3Helper(box, yellow);
  }

  getSlicer() {
    return this.slicer;
  }

  setSlicer() {
    this.slicer = new MeshSlicer(this);
  }

  /* This method translates the mesh to origin */
  translateToOrigin() {
    // Compute the bounding box of the geometry
    this.mesh.geometry.computeBoundingBox();
    const box = this.mesh.geometry.boundingBox;

    // Calculate the translation vector
    const origin = new THREE.Vector3(0, 0, 0);
    const centroid = box.getCenter(new THREE.Vector3());
    const translationVector = new THREE.Vector3().subVectors(origin, centroid);

    // Translate the mesh to the origin
    const positionAttribute = this.mesh.geometry.getAttribute("position");
    const vertices = this.mesh.geometry.userData.vertices;

    for (let i = 0; i < positionAttribute.count; i++) {
      positionAttribute.array[i * 3] += translationVector.x;
      positionAttribute.array[i * 3 + 1] += translationVector.y;
      positionAttribute.array[i * 3 + 2] += translationVector.z;
    }

    for (let i = 0; i < vertices.length; i += 3) {
      vertices[i] += translationVector.x;
      vertices[i + 1] += translationVector.y;
      vertices[i + 2] += translationVector.z;
    }

    positionAttribute.needsUpdate = true;
  }

  /* This method computes useful properties of the mesh's geometry :
    bounding box, vertex normals and face centroids */
  computeProperties() {
    this.mesh.geometry.computeBoundingBox();
    this.mesh.geometry.computeVertexNormals();

    // Compute the centroids of the faces
    const polys = this.mesh.geometry.userData.tetrahedras;
    const numPolys = polys.length / 4;

    const vertices = this.mesh.geometry.userData.vertices;
    let centroids = new Array(numPolys * 3);

    for (let i = 0; i < numPolys; i++) {
      let centroid = [0, 0, 0];

      for (let j = 0; j < 4; j++) {
        const vertexIndex = polys[i * 4 + j];

        for (let k = 0; k < 3; k++) {
          centroid[k] += vertices[vertexIndex * 3 + k];
        }
      }

      for (let k = 0; k < 3; k++) {
        centroid[k] /= 4; // Average the coordinates
        centroids[i * 3 + k] = centroid[k];
      }
    }

    centroids = new Float32Array(centroids);
    this.mesh.geometry.setAttribute(
      "centroid",
      new THREE.BufferAttribute(centroids, 3)
    );
  }

  changeColor(color_ex) {
    this.colorMaterial.color.set(color_ex);
    this.colorMaterial.needsUpdate = true;
  }

  applyMapColor(flag) {
    if (flag) {
      this.mesh.material = standardMaterial.clone();
      this.mesh.material.color.set(null);
      this.mesh.material.vertexColors = true;
      this.slicer.isMapActive = true;
      this.slicer.setVisibleFaces();
    } else {
      this.mesh.material = this.colorMaterial;
      this.slicer.isMapActive = false;
    }
    this.mesh.material.needsUpdate = true;
  }
  /*
  changeTexture(texture) {
    this.textureMaterial.map = texture;
    this.textureMaterial.needsUpdate = true;
  }

  toggleTexture(flag) {
    if (this.textureMaterial.map) {
      if (flag) {
        this.mesh.material = this.textureMaterial;
      } else {
        this.mesh.material = this.colorMaterial;
      }
      this.mesh.material.needsUpdate = true;
      return true;
    } else {
      console.log("Texture not loaded yet.");
      return false;
    }
  }
  */
  changeWireframeColor(color_ex) {
    this.wireframe.material.color.set(color_ex);
    this.wireframe.material.needsUpdate = true;
  }
}
