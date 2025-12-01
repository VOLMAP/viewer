import * as THREE from "../../../libs/three/three.module.js";
import * as utils from "../../main/utils.js";
import { MeshSlicer } from "../slicer/MeshSlicer.js";

/* PolygonOffset to avoid z-fighting when rendering in external to internal order: 
   wireframe -> mesh -> shell */
const standardWireframeMaterial = new THREE.LineBasicMaterial({
  color: utils.blackHex,
});

const standardMaterial = new THREE.MeshPhysicalMaterial({
  color: utils.whiteHex,
  side: THREE.DoubleSide,
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
});

const standardShellMaterial = new THREE.MeshPhysicalMaterial({
  color: utils.whiteHex,
  transparent: true,
  opacity: 0.5,
  polygonOffset: true,
  polygonOffsetFactor: 2,
  polygonOffsetUnits: 2,
});

export class VolumeMesh {
  mesh = null;
  plainColorMaterial = null;

  wireframe = null;
  shell = null;

  boundingBox = null;

  constructor(geometry, color_ex = null) {
    this.plainColorMaterial = standardMaterial.clone();

    if (color_ex) {
      this.changeColor(color_ex);
    }

    this.mesh = new THREE.Mesh(geometry, this.plainColorMaterial);

    this.translateToOrigin();
    this.computeProperties();

    this.setWireframe();
    this.setShell();

    this.setBoundingBox();

    //RenderOrder to avoid z-fighting when rendering in external to internal order
    this.wireframe.renderOrder = 3;
    this.mesh.renderOrder = 2;
    this.shell.renderOrder = 1;
  }

  getMesh() {
    return this.mesh;
  }

  getWireframe() {
    return this.wireframe;
  }

  getShell() {
    return this.shell;
  }

  getBoundingBox() {
    return this.boundingBox;
  }

  setWireframe() {
    const faces = this.mesh.geometry.userData.triangles;
    const vertices = this.mesh.geometry.userData.vertices;

    var segments = new Array();

    for (let i = 0; i < faces.length; i += 3) {
      const a = faces[i];
      const b = faces[i + 1];
      const c = faces[i + 2];

      segments.push(a, b, b, c, c, a);
    }

    const wireframeGeometry = new THREE.BufferGeometry();
    wireframeGeometry.setIndex(
      new THREE.BufferAttribute(new Uint32Array(segments), 1)
    );
    wireframeGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(vertices), 3)
    );

    this.wireframe = new THREE.LineSegments(
      wireframeGeometry,
      standardWireframeMaterial.clone()
    );
  }

  setShell() {
    this.shell = new THREE.Mesh(
      this.mesh.geometry.clone(),
      standardShellMaterial.clone()
    );
  }

  setBoundingBox() {
    const box = this.mesh.geometry.boundingBox;

    this.boundingBox = new THREE.Box3Helper(box, utils.yellowHex);
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

    this.mesh.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(triangleSoup), 3)
    );
  }

  /* This method computes useful properties of the mesh's geometry :
    bounding box, vertex normals and face centroids */
  computeProperties() {
    this.mesh.geometry.computeBoundingBox();
    this.mesh.geometry.computeVertexNormals();

    // Compute the centroids of the faces
    const polys = this.mesh.geometry.userData.tetrahedra;
    const numPolys = polys.length / 4;

    const vertices = this.mesh.geometry.userData.vertices;
    let centroids = new Array(numPolys * 3);

    for (let i = 0; i < numPolys; i++) {
      let centroid = [0, 0, 0];
      //Visit every vertex of the poly
      for (let j = 0; j < 4; j++) {
        const vertexIndex = polys[i * 4 + j];
        //Visit every coordinate of the vertex and sum it to the other corresponding coordinates
        for (let k = 0; k < 3; k++) {
          centroid[k] += vertices[vertexIndex * 3 + k];
        }
      }

      //Average the sum of the corresponding coordinates and assign it
      for (let k = 0; k < 3; k++) {
        centroid[k] /= 4;
        centroids[i * 3 + k] = centroid[k];
      }
    }

    this.mesh.geometry.userData.polyCentroids = centroids;
  }

  changePlainColor(color_ex) {
    this.plainColorMaterial.color.set(color_ex);
    this.plainColorMaterial.needsUpdate = true;
  }

  toggleMapColor(flag) {
    if (flag) {
      this.mesh.material = standardMaterial.clone();
      this.mesh.material.color.set(null);
      this.mesh.material.vertexColors = true;
    } else {
      this.mesh.material = this.colorMaterial;
    }

    this.mesh.material.needsUpdate = true;
  }

  changeWireframeColor(color_ex) {
    this.wireframe.material.color.set(color_ex);
    this.wireframe.material.needsUpdate = true;
  }
}
