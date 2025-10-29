import * as THREE from "../../../libs/three/three.module.js";

import { ObjSlicer } from "../slicers/ObjSlicer.js"; // Import the MeshSlider class

const white = 0xffffff;
const black = 0x000000;
const yellow = 0xffff00;

const standardMaterial = new THREE.MeshPhysicalMaterial({
  color: white,
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
  side: THREE.DoubleSide, // Make the material double-sided
});

const standardWireframeMaterial = new THREE.LineBasicMaterial({
  color: black,
});

/*
function randomColorMesh(mesh) {
  var faces = mesh.geometry.getAttribute("position").count / 3,
    colors = [];

  mesh.material.vertexColors = true;

  for (var i = 0; i < faces; i++) {
    var r = Math.random(),
      g = Math.random(),
      b = Math.random();
    colors.push(r, g, b);
    colors.push(r, g, b);
    colors.push(r, g, b);
  }

  mesh.geometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(colors, 3)
  );
}
*/
export class SurfaceMesh {
  mesh = null; // Mesh object
  colorMaterial = null; // Color material object
  //textureMaterial = null; // Texture object
  boundingBox = null; // Bounding box object
  wireframe = null; // Wireframe object
  slicer = null; // Slicer object

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
    // Create a mesh with the geometry and material
    this.mesh = new THREE.Mesh(geometry, this.colorMaterial);
    //randomColorMesh(this.mesh);

    this.translateToOrigin();
    this.computeProperties();

    this.setBoundingBox();
    this.setWireframe();
    this.setSlicer();
  }

  getMesh() {
    return this.mesh;
  }

  getBoundingBox() {
    return this.boundingBox;
  }

  setBoundingBox() {
    const box = this.mesh.geometry.boundingBox;

    this.boundingBox = new THREE.Box3Helper(box, yellow);
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

    segments = new Uint16Array(segments);
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

    this.wireframe.renderOrder = 1;
  }

  getSlicer() {
    return this.slicer;
  }

  setSlicer() {
    this.slicer = new ObjSlicer(this);
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
    const faces = this.mesh.geometry.userData.triangles;
    const numFaces = faces.length / 3;

    const vertices = this.mesh.geometry.userData.vertices;
    let centroids = new Array(numFaces * 3);

    for (let i = 0; i < numFaces; i++) {
      let centroid = [0, 0, 0];

      for (let j = 0; j < 3; j++) {
        const vertexIndex = faces[i * 3 + j];

        for (let k = 0; k < 3; k++) {
          centroid[k] += vertices[vertexIndex * 3 + k];
        }
      }

      for (let k = 0; k < 3; k++) {
        centroid[k] /= 3; // Average the coordinates
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
