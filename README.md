# Tilt: a WebGL-based 3D visualization of a Webpage
#### [Development Blog](http://blog.mozilla.com/tilt/)
#### [Tilt Project Page](https://wiki.mozilla.org/Tilt_Project_Page)

### Installation
In the bin folder you will find the latest [Tilt.xpi](https://github.com/victorporof/Tilt/raw/master/bin/Tilt.xpi) extension build. Download, then drag and drop it to Firefox. After the installation is complete, restart, and open the extension using `Ctrl+Shift+M` (or `Cmd+Shift+M` if you're on a mac), or find it inside the Tools menu. Close it at any time with the `Esc` key.

### Description
> Tilt represents a new way of visualizing a web page. This tool creates a 3D representation of the document, with the purpose of displaying, understanding and easily analyzing the DOM. It will take advantage of the great tools Firefox has to offer, as it is an extension which contains a WebGL implementation, providing rich user-experience, fun interaction and useful information, while taking full advantage of 3D hardware acceleration, GLSL shaders and what OpenGL ES 2.0 has to offer.

> The implementation consists of a Firefox extension containing a 3D representation of a web page, as both a fun visualization tool and a developer-friendly environment for debugging the document’s structure, contents and nesting of the DOM tree. Various information besides the actual contents will be displayed on request, regarding each node’s type, class, id, and other attributes if available. The rendering will be dynamic, in-browser, using WebGL and GLSL shaders.
#### [Additional info](http://www.google-melange.com/gsoc/proposal/review/google/gsoc2011/victorporof/1#)

### How to build
Building is done using the [build script](https://github.com/victorporof/Tilt/blob/master/src/build). There are two parts of the project which can be used: the engine and the extension itself. To build everything and also minify the sources, run the following `./build` command from a terminal:

    ./build all minify

Alternatively, you can just use the `engine` or `extension` param to build only a part of the project.

    ./build engine
    ./build extension

You can append the `minify` parameter to minify the sources when building, but this is recommended only when building a final release, as it takes quite a lot of time.
The compiled files are in the [bin](https://github.com/victorporof/Tilt/tree/master/bin) folder. If the extension was also built, inside [build](https://github.com/victorporof/Tilt/tree/master/bin/build) you can find the unpacked [Tilt.xpi](https://github.com/victorporof/Tilt/raw/master/bin/Tilt.xpi) archive.

### How to automatically install
To install the extension automatically in Firefox with the `make install` or `./build` command, first edit the [makefile](https://github.com/victorporof/Tilt/blob/master/src/Makefile) and change the `profile_dir` to match your profile in Firefox. If you don't do this, installation will fail. Additionally, you may need to have the `tilt@mozilla.com` folder created in the extension profile directory, depending on the OS and Firefox version. After this quick setup (provided you already compiled everything with `./build`), run the following command to install the extension:

    export OSTYPE; make install;

Or, to automatically compile everything, minify and also install:

    ./build all minify install

Tilt uses the [Google Closure compiler](https://github.com/victorporof/Tilt/tree/master/bin/google-closure) to minify the Javascript files, with the `--compilation_level ADVANCED_OPTIMIZATIONS` flag. Therefore, some [Javascript externs](https://github.com/victorporof/Tilt/blob/master/bin/google-closure/tilt-externs.jsext) must be specified so important variable names are not renamed.

### Principles
Before developing this extension, I’ve experimented with various techniques of achieving the desired visualization results and polished user experience, by implementing a few of the required features and asking for feedback from knowledgeable people working in the domain. As a result, some key aspects must be pointed out:

*		Building an internal representation of the DOM shall be achieved by creating an iframe overlay in XUL as a Firefox extension. From experience, other techniques like injecting code into a web page, using already existing extensions (like Firebug), or depending on cloud services or CGI scripts are all bad ideas, as they are not scalable, deliver inconsistent user experience and don’t leave the original DOM intact.
* 	Each node will be rendered as a stack element, roughly described as representing a “box”, having the X and Y positions grabbed from the object’s off-screen rendered coordinates using HTML5 canvas functions (therefore avoiding manually redrawing the entire web-page), and distributed on the Z depth axis based on the actual node depth in the DOM tree.
* 	The base node will be represented by the BODY, upon which the child elements are layered to form a 3D stack of platforms. These platforms shall be build at the addition of DIVS, ULs or other nodes containing children.
* 	Some elements are positioned in absolute or floating manners; these could be graphically represented in different ways, like a shadowing plane, or by graphically adding a floating animation.
* 	Various other minimal information, characteristics or attributes will be visually attached to each stack representation of a node, with the possibility of displaying these properties more in depth at the user’s interaction with the visualization. Therefore, it’s a good idea to implement features that help understanding and analyzing the DOM, not just displaying it.
* 	If required, a useful “map” of the DOM tree will be available, used for rapid navigation/orientation through the visualization.
* 	The display will require intuitive controls, therefore an arcball controlled camera will be used, from the papers of Ken Shoemake, describing general purpose 3D rotation. Moreover, panning will be required for navigation, and other yaw, pitch and roll controls could be implemented.
* 	Sliders or other UI elements could be used for modifying or setting the visualization parameters, like the distance between node layers, auto-rotation, and other effects.
* 	The tool will be used as part of a web-page inspector, therefore a clean visualization will be more suited. A polished representation, not a bloated one, with subtle screen space ambient occlusion, a bit of lighting and shadowing is more appropriate and visually pleasing, adding a “stark” feel to it, thus focusing on the beauty of the web page itself and the DOM, and not on the achievable effects.
* 	Ways of exporting the visualization to other WebGL compatible browsers should be implemented, for cross-platform and cross-browser user experience. This can be done by saving the representation parameters and passing them to other browsers. In the end, the export feature will actually be an URL.
* 	As Tilt is designed to also be fun, a few easter-eggs could be implemented :)

#### The final deliverables
1. A stand-alone Firefox extension which will contain the visualization
2. A WebGL javascript library designed to facilitate creating web page DOM visualizations
3. Examples, test-cases, stress-tests and documentation, so that the tool will continue to be developed even after the finalization of GSoC, both by me and the desiring community.