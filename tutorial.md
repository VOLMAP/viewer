# How to Use VOLMAP Viewer

---

> ### **Table of Contents**
>
> 1. [Uploading Models and Maps](#uploading-models-and-maps)
> 2. [Inspecting Models](#inspect-models)
> 3. [Inspecting Maps](#inspect-maps)
> 4. [Status Bar](#status-bar)

---

## Uploading Models and Maps

### Upload a Model

Click on either the **Mesh 1** or **Mesh 2** panel in the top menu, then use the file input button to select a **_.mesh_** file from your file manager.  
Alternatively, click the dropdown menu to select one of the available **sample meshes**.  
The selected model will be rendered in the chosen canvas.

### Upload a Map

After uploading the first model (domain), repeat the process in the other canvas to upload its corresponding map (codomain).

### Notes on Map Distortion Calculation

Map distortion can be calculated in either direction (domain → codomain or codomain → domain). Therefore, the upload order does not affect the results.  

By default, the model in the first canvas is treated as the **domain**, and the model in the second canvas as the **codomain**.

---

## Inspecting Models

Once a model is loaded into a canvas, various rendering and inspection options are available through two dropdown menus: **Rendering** and **Control**.

### Rendering Options

- **Shell** – Toggle the visibility of the mesh shell. The shell is a semi-transparent boundary of the mesh surface that provides a clear visual reference of the model’s outer shape, remaining visible during slicing operations.  

- **Texture** – Customize the model's texture color using a color picker.  

- **Wireframe** – Toggle the visibility of the mesh wireframe and customize its color using a color picker.  

- **Bounding Box** – Toggle the visibility of the model’s bounding box, the smallest rectangular prism enclosing the entire mesh.  

- **Reset** – Restore the original rendering settings.  

- **Slicer** – Toggle the display of three slicing planes, each perpendicular to one of the main axes (x, y, z). These planes can be moved using dedicated sliders to slice the mesh and inspect its volume. Each plane can also be hidden or have its slicing direction inverted via two dedicated buttons.  

### Control Options

- **Axis** and **Orbital** – Toggle the visibility of the scene axes and the camera's orbital controls via dedicated toggles.  

- **Reset** – Restore the original control settings.  

---

## Inspecting Maps

Once a map is loaded, the **Map** dropdown menu allows you to control both the computation and visualization of the distortion between domain and codomain tetrahedra. Any changes are applied automatically. Available options include:  

- **Map Viewer** – Toggle the visualization of computed distortion on or off.  

- **Energy** – Select the distortion metric used for computation. Options include _Conformal_, _Dirichlet_, _Sym-Dirichlet_ (Symmetric Dirichlet), _ARAP_ (As-Rigid-As-Possible), and _MIPS-3D_ (Most Isometric Parameterizations in 3D).  

- **Clamp** – Set minimum and maximum values for clamping the computed distortion. This enables a more focused visualization that highlights relevant distortion ranges.  

- **Gradient** – Choose the gradient colors for distortion visualization. The left color represents low-distortion tetrahedra, and the right color represents high-distortion tetrahedra. If neither color is white, it will also serve as an intermediate gradient color.  

- **Degenerate** – Toggle highlighting of degenerate tetrahedra, and select the color used for highlighting.  
- **Map Direction** – Reverse the computation direction between domain and codomain (domain → codomain or codomain → domain).  

- **Reset** – Restore all map settings to their default values.  

- **Distortion Slicer** – Slice the mesh based on its tetrahedral distortion values using a dedicated slider. You can also choose to visualize only degenerate elements and reverse the slicing direction using two dedicated buttons.

Users can also use the **tetrahedron picker** to highlight tetrahedra in both meshes:

1. **Shift+Click** on a tetrahedron in either mesh to select it.  
2. The selected tetrahedron will be highlighted in **both meshes** using its **complementary color**.  
3. Simultaneously, the corresponding slicing plane on the **other mesh** will automatically adjust along the **x-axis** to ensure the selected tetrahedron is visible.  

This feature allows easy comparison of corresponding tetrahedra between domain and codomain and facilitates detailed inspection of distortion and spatial relationships.

---

## Status Bar

At the bottom of the viewer, the **status bar** displays key information about the currently loaded model and map:

- **Vertices** – Number of vertices in the mesh.  
- **Faces** – Number of triangles in the mesh.  
- **Polyhedra** – Number of tetrahedra in the mesh.  
- **Energy** – Distortion metric currently selected (e.g., Conformal, Dirichlet, etc.).  
- **Clamp** – Minimum and maximum values used for clamping the distortion.  
- **Gradient** – Gradient visualization of tetrahedral distortion, showing low to high distortion colors.  
- **Picker** – Status of the tetrahedron picker.  
- **Polyhedron** – Index of the currently selected tetrahedron (if any).  
- **Distortion** – Distortion value of the selected tetrahedron (if any).  
- **Code & Tutorial** – Quick access buttons to the GitHub repository and online documentation.
