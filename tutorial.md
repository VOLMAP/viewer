# How to use VOLMAP Viewer

---

> ### **Table of Contents**
>
> 1. [Uploading models and maps](#uploading-models-and-maps)
> 1. [Inspect models](#setup-and-launch)
> 1. [Inspect map](#usage)

---

## Uploading models and maps

### Upload a Model

Click on either the **Mesh 1** or **Mesh 2** panel in the top menu, then click on the file input button to select a **_.mesh_** file from your file manager. The model will be rendered in the corresponding canvas.

### Upload a Map

After uploading the first model, repeat the process in the other canvas to upload the corresponding map.

### Notes on Map Distortion Calculation

The calculation of map distortion can be performed in either direction (domain → codomain or codomain → domain). Therefore, the order in which you upload the models does not affect the result.

By default, the model in the first canvas is treated as the domain, and the model in the second canvas as the codomain.

## Inspect Models

Once a model is loaded into the canvas, various inspection and rendering options are provided trough two dropdown menus avaiable under the following buttons: **Rendering** and **Control**.

### Rendering

The user has the following rendering options:

- **Texture Color** – Change the mesh texture color using a color picker

- **Wireframe** – View and customize the color of the mesh wireframe

- **Shell** – Show or hide the mesh shell. The shell is a semi-transparent outline of the mesh surface, it provides a clear visual reference of the model’s outer shape as it remains visible during slicing operations.

- **Bounding Box** – Show or hide the model’s bounding box, the smallest rectangular frame that completely encloses the entire mesh.

- **Slicer** – TODO

### Control

Inside the control panel, the user can:

- toggle the visibility of the mesh's axes and orbitals trough dedicated checkboxes.

- reset the rendering and control options restoring the original state of the mesh after the upload.

## Inspect Map

The **Map** panel allows you to control both the calculation and visualization of the distortion between two loaded meshes. Any changes made to the options will automatically update the distortion calculation and its visualization. The available options are:

- **View Map** – Toggle the distortion visualization on or off. If the two models are not loaded or are incompatible for mapping, an error message will appear.

- **Energy** – Select the type of energy used for distortion calculation. Available options include _Conformal_, _Dirichlet_, _Symmetric-Dirichlet_, _ARAP_, and _MIPS-3D_.

- **Gradient** – Select the colors for the distortion visualization. The left color represents low-distortion tetrahedra, and the right color represents high-distortion tetrahedra. If neither color is white, it will also serve as an intermediate color in the gradient.

- **Degenerate** – Toggle the highlighting of degenerate tetrahedra. You can also select the color used for highlighting.

- **Clamping** – Set minimum and maximum values for clamping the calculated distortions. This allows for a more focused visualization that better highlights the distortions of interest.

- **Reverse** – Toggle to reverse the calculation direction between the domain and the codomain (from domain → codomain to codomain → domain).

- **Reset** – Restore all map settings to their default values.
