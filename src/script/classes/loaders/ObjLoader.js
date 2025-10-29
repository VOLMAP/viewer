import * as THREE from "../../../libs/three/three.module.js";
import { SurfaceMesh } from "../wrappers/SurfaceMesh.js";

export class ObjLoader {
  constructor() {}

  /* This method reads a .obj file and returns the surface mesh encrypted in it */
  async load(file) {
    const reader = file.stream().getReader();
    const decoder = new TextDecoder();

    let read = { done: false, value: null };
    let buffer = "";

    var vertices = new Array();
    var numVertices = 0;
    var triangles = new Array();
    var numTriangles = 0;

    var uvs = new Array();
    var numUvs = 0;

    // While there are still bytes to read from the file
    while (!read.done) {
      // Read the next chunk of data from the file
      read = await reader.read();
      buffer += decoder.decode(read.value, { stream: true });

      // While there are still lines to read from the buffer
      while (buffer.includes("\n")) {
        // Read the next line for processing and remove it from the buffer
        const index = buffer.indexOf("\n");
        const line = buffer.slice(0, index).trim();
        buffer = buffer.slice(index + 1);

        if (!line) continue; // Skip empty lines

        const tokens = line.split(/\s+/); // Split the line into tokens

        if (tokens[0] === "v") {
          if (tokens.length != 4) {
            throw new Error("Incorrect number of coordinates for the vertex.");
          }

          // Read the vertex coordinates
          for (let i = 0; i < 3; i++) {
            const coordinate = parseFloat(tokens[i + 1]);
            vertices.push(coordinate);
          }

          numVertices++; // Increment the current vertex index
        } else if (tokens[0] === "f") {
          if (tokens.length != 4) {
            throw new Error("Incorrect number of vertices for the face.");
          }

          // Read the face indices and subtract 1 for zero-based indexing
          for (let i = 0; i < 3; i++) {
            const vertexIndex = parseInt(tokens[i + 1]) - 1;

            if (vertexIndex < 0 || vertexIndex >= numVertices) {
              throw new Error("Invalid vertex index: " + vertexIndex);
            }
            triangles.push(vertexIndex);
          }

          numTriangles++; // Increment the current face index
        } else if (tokens[0] === "vt") {
          if (tokens.length != 3) {
            throw new Error(
              "Incorrect number of coordinates for the texture vertex."
            );
          }

          // Read the texture coordinates
          for (let i = 0; i < 2; i++) {
            const coordinate = parseFloat(tokens[i + 1]);
            uvs.push(coordinate);
          }

          numUvs++; // Increment the current uv index
        } else {
          continue; // Skip unrecognized lines
        }
      }
    }

    if (!numVertices) {
      throw new Error("No vertices found in this file.");
    }

    if (!numTriangles) {
      throw new Error("No faces found in this file.");
    }

    var triangleSoup = this.generateTriangleSoup(vertices, triangles);

    // Create a geometry and a mesh from the vertices and faces
    triangleSoup = new Float32Array(triangleSoup);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(triangleSoup, 3)
    );

    geometry.userData = {
      vertices: vertices,
      triangles: triangles,
      triangleSoup: triangleSoup,
    };

    if (numUvs) {
      uvs = new Float32Array(uvs);
      geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    }

    return new SurfaceMesh(geometry);
  }

  generateTriangleSoup(vertices, triangles) {
    var triangleSoup = new Array();

    for (let i = 0; i < triangles.length; i++) {
      var v = triangles[i];

      triangleSoup.push(
        vertices[v * 3],
        vertices[v * 3 + 1],
        vertices[v * 3 + 2]
      );
    }

    return triangleSoup;
  }
}
