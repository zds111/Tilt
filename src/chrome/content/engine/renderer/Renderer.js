/*
 * Renderer.js - Helper drawing functions for WebGL
 * version 0.1
 *
 * Copyright (c) 2011 Victor Porof
 *
 * This software is provided "as-is", without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 *    1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    appreciated but is not required.
 *
 *    2. Altered source versions must be plainly marked as such, and must not
 *    be misrepresented as being the original software.
 *
 *    3. This notice may not be removed or altered from any source
 *    distribution.
 */
"use strict";

var Tilt = Tilt || {};
var EXPORTED_SYMBOLS = ["Tilt.Renderer"];

/**
 * Tilt.Renderer constructor.
 *
 * @param {HTMLCanvasElement} canvas: the canvas element used for rendering
 * @param {Function} successCallback: to be called if gl initialization worked
 * @param {Function} failCallback: to be called if gl initialization failed
 * @return {Tilt.Renderer} the newly created object
 */
Tilt.Renderer = function(canvas, failCallback, successCallback) {

  /**
   * The WebGL context obtained from the canvas element, used for drawing.
   */
  this.canvas = canvas;
  this.gl = this.create3DContext(canvas);

  // first, clear the cache
  Tilt.clearCache();
  Tilt.$gl = this.gl;
  Tilt.$renderer = this;

  // check if the context was created successfully
  if ("undefined" !== typeof this.gl && this.gl !== null) {
    // set up some global enums
    this.TRIANGLES = this.gl.TRIANGLES;
    this.TRIANGLE_STRIP = this.gl.TRIANGLE_STRIP;
    this.TRIANGLE_FAN = this.gl.TRIANGLE_FAN;
    this.LINES = this.gl.LINES;
    this.LINE_STRIP = this.gl.LINE_STRIP;
    this.LINE_LOOP = this.gl.LINE_LOOP;
    this.POINTS = this.gl.POINTS;
    this.COLOR_BUFFER_BIT = this.gl.COLOR_BUFFER_BIT;
    this.DEPTH_BUFFER_BIT = this.gl.DEPTH_BUFFER_BIT;
    this.STENCIL_BUFFER_BIT = this.gl.STENCIL_BUFFER_BIT;

    // if successful, run a success callback function if available
    if ("function" === typeof successCallback) {
      successCallback();
    }
  } else {
    // if unsuccessful, log the error and run a fail callback if available
    Tilt.Console.log(Tilt.StringBundle.get("initWebGL.error"));
    if ("function" === typeof failCallback) {
      failCallback();
      return;
    }
  }

  /**
   * Variables representing the current framebuffer width and height.
   */
  this.width = canvas.width;
  this.height = canvas.height;

  /**
   * A model view matrix stack, used for push/pop operations.
   */
  this.mvMatrixStack = [];

  /**
   * The current model view matrix;
   */
  this.mvMatrix = mat4.identity(mat4.create());

  /**
   * The current projection matrix;
   */
  this.projMatrix = mat4.identity(mat4.create());

  /**
   * The current clear color used to clear the color buffer bit.
   */
  this.clearColor = [0, 0, 0, 0];

  /**
   * The current tint color applied to any objects which can be tinted.
   * These mostly represent images or primitives which are textured.
   */
  this.tintColor = [0, 0, 0, 0];

  /**
   * The current fill color applied to any objects which can be filled.
   * These are rectangles, circles, boxes, 2d or 3d primitives in general.
   */
  this.fillColor = [0, 0, 0, 0];

  /**
   * The current stroke color applied to any objects which can be stroked.
   * This property mostly refers to lines.
   */
  this.strokeColor = [0, 0, 0, 0];

  /**
   * Variable representing the current stroke weight.
   */
  this.strokeWeightValue = 0;

  /**
   * A shader useful for drawing vertices with only a color component.
   */
  var color$vs = Tilt.Shaders.Color.vs;
  var color$fs = Tilt.Shaders.Color.fs;
  this.colorShader = new Tilt.Program(color$vs, color$fs);

  /**
   * A shader useful for drawing vertices with both a color component and
   * texture coordinates.
   */
  var texture$vs = Tilt.Shaders.Texture.vs;
  var texture$fs = Tilt.Shaders.Texture.fs;
  this.textureShader = new Tilt.Program(texture$vs, texture$fs);

  /**
   * Vertices buffer representing the corners of a rectangle.
   */
  this.rectangle = new Tilt.Rectangle();
  this.rectangleWireframe = new Tilt.RectangleWireframe();

  /**
   * Vertices buffer representing the corners of a cube.
   */
  this.cube = new Tilt.Cube();
  this.cubeWireframe = new Tilt.CubeWireframe();

  /**
   * Helpers for managing variables like frameCount, frameRate, frameDelta,
   * used internally, in the requestAnimFrame function.
   */
  this.lastTime = 0;
  this.currentTime = null;

  /**
   * Time passed since initialization.
   */
  this.elapsedTime = 0;

  /**
   * Counter for the number of frames passed since initialization.
   */
  this.frameCount = 0;

  /**
   * Variable retaining the current frame rate.
   */
  this.frameRate = 0;

  /**
   * Variable representing the delta time elapsed between frames.
   * Use this to create smooth animations regardless of the frame rate.
   */
  this.frameDelta = 0;

  // set the default model view and projection matrices
  this.origin();
  this.perspective();

  // set the default tint, fill, stroke and stroke weight
  this.defaults();
};

Tilt.Renderer.prototype = {

  /**
   * Clears the color and depth buffers to a specific color.
   * The color components are represented in the 0..1 range.
   *
   * @param {Number} r: the red component of the clear color
   * @param {Number} g: the green component of the clear color
   * @param {Number} b: the blue component of the clear color
   * @param {Number} a: the alpha component of the clear color
   */
  clear: function(r, g, b, a) {
    // cache some variables for easy access
    var col = this.clearColor,
      gl = this.gl;

    if (col[0] !== r || col[1] !== g || col[2] !== b || col[3] !== a) {
      col[0] = r;
      col[1] = g;
      col[2] = b;
      col[3] = a;
      gl.clearColor(r, g, b, a);

      r *= 255;
      g *= 255;
      b *= 255;
      a *= 255;
      this.canvas.setAttribute("style",
        "background: rgba(" + r + ", " + g + ", " + b + ", " + a + "); " + 
        "width: 100%; height: 100%;");
    }

    // clear the color and depth buffers
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  },

  /**
   * Clears the canvas context (usually at the beginning of each frame).
   * If the color is undefined, it will default to opaque black.
   * It is not recommended but possible to pass a number as a parameter,
   * in which case the color will be [n, n, n, 255], or directly an array of
   * [r, g, b, a] values, all in the 0..255 interval.
   *
   * @param {String} color: the color, defined in hex or as rgb() or rgba()
   */
  background: function(color) {
    var rgba;

    if ("string" === typeof color) {
      rgba = Tilt.Math.hex2rgba(color);
    } else if ("undefined" === typeof color) {
      rgba = [0, 0, 0, 1];
    } else if ("number" === typeof color) {
      rgba = [color / 255, color / 255, color / 255, 1];
    } else {
      rgba = [color[0] / 255, color[1] / 255, color[2] / 255, color[3] / 255];
    }

    // clear the color and depth buffers
    this.clear(rgba[0], rgba[1], rgba[2], rgba[3]);
  },

  /**
   * Sets a default perspective projection, with the near frustum rectangle
   * mapped to the canvas width and height bounds.
   */
  perspective: function() {
    var fov = 45,
      w = this.width,
      h = this.height,
      x = w / 2,
      y = h / 2,
      z = y / Math.tan(Tilt.Math.radians(45) / 2),
      znear = z / 10,
      zfar = z * 100,
      aspect = w / h;

    mat4.perspective(fov, aspect, znear, zfar, this.projMatrix, true);
    mat4.translate(this.projMatrix, [-x, -y, -z]);
  },

  /**
   * Sets a default orthographic projection (recommended for 2d rendering).
   */
  ortho: function() {
    mat4.ortho(0, this.width, this.height, 0, -1000, 1000, this.projMatrix);
  },

  /**
   * Sets a custom projection matrix.
   * @param {Array} matrix: the custom projection matrix to be used
   */
  projection: function(matrix) {
    mat4.set(matrix, this.projMatrix);
  },

  /**
   * Pushes the current model view matrix on a stack, to be popped out later.
   * This can be used, for example, to create complex animations and be able
   * to revert back to the current model view.
   */
  pushMatrix: function() {
    this.mvMatrixStack.push(mat4.create(this.mvMatrix));
  },

  /**
   * Pops an existing model view matrix from stack.
   * Use this only after pushMatrix() has been previously called.
   */
  popMatrix: function() {
    if (this.mvMatrixStack.length > 0) {
      this.mvMatrix = this.mvMatrixStack.pop();
    }
  },

  /**
   * Resets the model view matrix to identity.
   * This is a default matrix with no rotation, no scaling, at (0, 0, 0);
   */
  origin: function() {
    mat4.identity(this.mvMatrix);
  },

  /**
   * Transforms the model view matrix with a new matrix.
   * Useful for creating custom transformations.
   *
   * @param {Array} matrix: the matrix to be multiply the model view with
   */
  transform: function(matrix) {
    mat4.multiply(this.mvMatrix, matrix);
  },

  /**
   * Translates the model view by the x, y and z coordinates.
   *
   * @param {Number} x: the x amount of translation
   * @param {Number} y: the y amount of translation
   * @param {Number} z: the z amount of translation
   */
  translate: function(x, y, z) {
    mat4.translate(this.mvMatrix, [x, y, z || 0]);
  },

  /**
   * Rotates the model view by a specified angle on the x, y and z axis.
   *
   * @param {Number} angle: the angle expressed in radians
   * @param {Number} x: the x axis of the rotation
   * @param {Number} y: the y axis of the rotation
   * @param {Number} z: the z axis of the rotation
   */
  rotate: function(angle, x, y, z) {
    mat4.rotate(this.mvMatrix, angle, [x, y, z]);
  },

  /**
   * Rotates the model view by a specified angle on the x axis.
   * @param {Number} angle: the angle expressed in radians
   */
  rotateX: function(angle) {
    mat4.rotateX(this.mvMatrix, angle);
  },

  /**
   * Rotates the model view by a specified angle on the y axis.
   * @param {Number} angle: the angle expressed in radians
   */
  rotateY: function(angle) {
    mat4.rotateY(this.mvMatrix, angle);
  },

  /**
   * Rotates the model view by a specified angle on the z axis.
   * @param {Number} angle: the angle expressed in radians
   */
  rotateZ: function(angle) {
    mat4.rotateZ(this.mvMatrix, angle);
  },

  /**
   * Scales the model view by the x, y and z coordinates.
   *
   * @param {Number} x: the x amount of scaling
   * @param {Number} y: the y amount of scaling
   * @param {Number} z: the z amount of scaling
   */
  scale: function(x, y, z) {
    mat4.scale(this.mvMatrix, [x, y, z || 0]);
  },

  /**
   * Sets a default visual style throughout the renderer.
   */
  defaults: function() {
    this.blendMode("alpha");
    this.depthTest(false);
    this.tint("#fff");
    this.fill("#fff");
    this.stroke("#000");
    this.strokeWeight(1);    
  },

  /**
   * Sets the current tint color.
   * @param {String} color: the color, defined in hex or as rgb() or rgba()
   */
  tint: function(color) {
    this.tintColor = Tilt.Math.hex2rgba(color);
  },

  /**
   * Disables the current tint color value.
   */
  noTint: function() {
    var tint = this.tintColor;
    tint[0] = 1;
    tint[1] = 1;
    tint[2] = 1;
    tint[3] = 1;
  },

  /**
   * Sets the current fill color.
   * @param {String} color: the color, defined in hex or as rgb() or rgba()
   */
  fill: function(color) {
    this.fillColor = Tilt.Math.hex2rgba(color);
  },

  /**
   * Disables the current fill color value.
   */
  noFill: function() {
    var fill = this.fillColor;
    fill[0] = 0;
    fill[1] = 0;
    fill[2] = 0;
    fill[3] = 0;
  },

  /**
   * Sets the current stroke color.
   * @param {String} color: the color, defined in hex or as rgb() or rgba()
   */
  stroke: function(color) {
    this.strokeColor = Tilt.Math.hex2rgba(color);
  },

  /**
   * Disables the current stroke color value.
   */
  noStroke: function() {
    var stroke = this.strokeColor;
    stroke[0] = 0;
    stroke[1] = 0;
    stroke[2] = 0;
    stroke[3] = 0;
  },

  /**
   * Sets the current stroke weight (line width).
   * @param {Number} weight: the stroke weight
   */
  strokeWeight: function(value) {
    if (this.strokeWeightValue !== value) {
      this.strokeWeightValue = value;
      this.gl.lineWidth(value);
    }
  },

  /**
   * Sets blending, either "alpha" or "add" (additive blending).
   * Anything else disables blending.
   *
   * @param {String} mode: blending, either "alpha", "add" or undefined
   */
  blendMode: function(mode) {
    var gl = this.gl;

    if ("alpha" === mode) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    } else if ("add" === mode || "additive" === mode) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    } else {
      gl.disable(gl.BLEND);
    }
  },

  /**
   * Sets if depth testing should be enabled or not.
   * Disabling could be useful when handling transparency (for example).
   *
   * @param {Boolean} mode: true if depth testing should be enabled
   */
  depthTest: function(mode) {
    var gl = this.gl;

    if (mode) {
      gl.enable(gl.DEPTH_TEST);
    } else {
      gl.disable(gl.DEPTH_TEST);
    }
  },

  /**
   * Helper function to set active the color shader with required params.
   *
   * @param {Tilt.VertexBuffer} verticesBuffer: a buffer of vertices positions
   * @param {Array} color: the color used, as [r, g, b, a] with 0..1 range
   */
  useColorShader: function(verticesBuffer, color) {
    var program = this.colorShader;

    // use this program
    program.use();

    // bind the attributes and uniforms as necessary
    program.bindVertexBuffer("vertexPosition", verticesBuffer);
    program.bindUniformMatrix("mvMatrix", this.mvMatrix);
    program.bindUniformMatrix("projMatrix", this.projMatrix);
    program.bindUniformVec4("color", color);
  },

  /**
   * Helper function to set active the texture shader with required params.
   *
   * @param {Tilt.VertexBuffer} verticesBuffer: a buffer of vertices positions
   * @param {Tilt.VertexBuffer} texCoordBuffer: a buffer of texture coords
   * @param {Array} color: the color used, as [r, g, b, a] with 0..1 range
   * @param {Tilt.Texture} texture: the texture to be applied
   */
  useTextureShader: function(verticesBuffer, texCoordBuffer, color, texture) {
    var program = this.textureShader;

    // use this program
    program.use();

    // bind the attributes and uniforms as necessary
    program.bindVertexBuffer("vertexPosition", verticesBuffer);
    program.bindVertexBuffer("vertexTexCoord", texCoordBuffer);
    program.bindUniformMatrix("mvMatrix", this.mvMatrix);
    program.bindUniformMatrix("projMatrix", this.projMatrix);
    program.bindUniformVec4("color", color);
    program.bindTexture("sampler", texture);
  },

  /**
   * Draw a single triangle.
   * Do not abuse this function, it is quite slow, use for debugging only!
   *
   * @param {Array} v0: the [x, y, z] position of the first triangle point
   * @param {Array} v1: the [x, y, z] position of the second triangle point
   * @param {Array} v2: the [x, y, z] position of the third triangle point
   */
  triangle: function(v0, v1, v2) {
    var vertices = new Tilt.VertexBuffer(v0.concat(v1, v2), 3),
      fill = this.fillColor,
      stroke = this.strokeColor;

    // draw the outline only if the stroke alpha channel is not transparent
    if (stroke[3]) {
      // use the necessary shader and draw the vertices
      this.useColorShader(vertices, stroke);
      this.drawVertices(this.LINE_LOOP, vertices.numItems);
    }

    // draw the triangle only if the fill alpha channel is not transparent
    if (fill[3]) {
      // use the necessary shader and draw the vertices
      this.useColorShader(vertices, fill);
      this.drawVertices(this.TRIANGLE_STRIP, vertices.numItems);
    }
  },

  /**
   * Modifies the location from which rectangles draw. The default mode is
   * rectMode("corner"), which specifies the location to be the upper left
   * corner of the shape and uses the third and fourth parameters of rect() to
   * specify the width and height. Use rectMode("center") to draw centered
   * at the given x and y position.
   *
   * @param {String} mode: either "corner" or "center"
   */
  rectMode: function(mode) {
    this.rectangle.rectModeValue = mode;
  },

  /**
   * Draws a rectangle using the specified parameters.
   *
   * @param {Number} x: the x position of the object
   * @param {Number} y: the y position of the object
   * @param {Number} width: the width of the object
   * @param {Number} height: the height of the object
   */
  rect: function(x, y, width, height) {
    var rectangle = this.rectangle,
      wireframe = this.rectangleWireframe,
      fill = this.fillColor,
      stroke = this.strokeColor;

    // if rectMode is set to "center", we need to offset the origin
    if ("center" === this.rectangle.rectModeValue) {
      x -= width / 2;
      y -= height / 2;
    }

    // in memory, the rectangle is represented as a perfect 1x1 square, so
    // some transformations are applied to achieve the desired shape
    this.pushMatrix();
    this.translate(x, y, 0);
    this.scale(width, height, 1);

    // draw the outline only if the stroke alpha channel is not transparent
    if (stroke[3]) {
      // use the necessary shader and draw the vertices
      this.useColorShader(wireframe.vertices, stroke);
      this.drawVertices(this.LINE_STRIP, wireframe.vertices.numItems);
    }

    // draw the rectangle only if the fill alpha channel is not transparent
    if (fill[3]) {
      // use the necessary shader and draw the vertices
      this.useColorShader(rectangle.vertices, fill);
      this.drawVertices(this.TRIANGLE_STRIP, rectangle.vertices.numItems);
    }

    this.popMatrix();
  },

  /**
   * Modifies the location from which images draw. The default mode is
   * imageMode("corner"), which specifies the location to be the upper left
   * corner and uses the fourth and fifth parameters of image() to set the
   * image"s width and height. Use imageMode("center") to draw images centered
   * at the given x and y position.
   *
   * @param {String} mode: either "corner" or "center"
   */
  imageMode: function(mode) {
    this.rectangle.imageModeValue = mode;
  },

  /**
   * Draws an image using the specified parameters.
   *
   * @param {Tilt.Textrue} t: the texture to be used
   * @param {Number} x: the x position of the object
   * @param {Number} y: the y position of the object
   * @param {Number} width: the width of the object
   * @param {Number} height: the height of the object
   * @param {Tilt.VertexBuffer} texCoord: optional, custom texture coordinates
   */
  image: function(t, x, y, width, height, texCoord) {
    var rectangle = this.rectangle,
      tint = this.tintColor,
      stroke = this.strokeColor,
      texCoordBuffer = texCoord || rectangle.texCoord;

    // if the width and height are not specified, we use the embedded
    // texture dimensions, from the source image or framebuffer
    if ("undefined" === typeof width || "undefined" === typeof height) {
      width = t.width;
      height = t.height;
    }

    // if imageMode is set to "center", we need to offset the origin
    if ("center" === rectangle.imageModeValue) {
      x -= width / 2;
      y -= height / 2;
    }

    // draw the image only if the tint alpha channel is not transparent
    if (tint[3]) {
      // in memory, the rectangle is represented as a perfect 1x1 square, so
      // some transformations are applied to achieve the desired shape
      this.pushMatrix();
      this.translate(x, y, 0);
      this.scale(width, height, 1);

      // use the necessary shader and draw the vertices
      this.useTextureShader(rectangle.vertices, texCoordBuffer, tint, t);
      this.drawVertices(this.TRIANGLE_STRIP, rectangle.vertices.numItems);

      this.popMatrix();
    }
  },

  /**
   * Draws a box using the specified parameters.
   *
   * @param {Number} width: the width of the object
   * @param {Number} height: the height of the object
   * @param {Number} depth: the depth of the object
   * @param {Tilt.Texture} texture: the texture to be used
   */
  box: function(width, height, depth, texture) {
    var cube = this.cube,
      wireframe = this.cubeWireframe,
      tint = this.tintColor,
      fill = this.fillColor,
      stroke = this.strokeColor;

    // in memory, the box is represented as a simple perfect 1x1 cube, so
    // some transformations are applied to achieve the desired shape
    this.pushMatrix();
    this.scale(width, height, depth);

    // draw the outline only if the stroke alpha channel is not transparent
    if (stroke[3]) {
      // use the necessary shader and draw the vertices
      this.useColorShader(wireframe.vertices, stroke);
      this.drawIndexedVertices(this.LINES, wireframe.indices);
    }

    if (texture) {
      // draw the box only if the tint alpha channel is not transparent
      if (tint[3]) {
        // use the necessary shader and draw the vertices
        this.useTextureShader(cube.vertices, cube.texCoord, tint, texture);
        this.drawIndexedVertices(this.TRIANGLES, cube.indices);
      }
    } else {
      // draw the box only if the fill alpha channel is not transparent
      if (fill[3]) {
        // use the necessary shader and draw the vertices
        this.useColorShader(cube.vertices, fill);
        this.drawIndexedVertices(this.TRIANGLES, cube.indices);
      }
    }

    this.popMatrix();
  },

  /**
   * Draws bound vertex buffers using the specified parameters.
   *
   * @param {Number} drawMode: WebGL enum, like Tilt.TRIANGLES
   * @param {Number} count: the number of indices to be rendered
   */
  drawVertices: function(drawMode, count) {
    this.gl.drawArrays(drawMode, 0, count);
  },

  /**
   * Draws bound vertex buffers using the specified parameters.
   * This function also makes use of an index buffer.
   *
   * @param {Number} drawMode: WebGL enum, like Tilt.TRIANGLES
   * @param {Tilt.IndexBuffer} indicesBuffer: indices for the vertices buffer
   */
  drawIndexedVertices: function(drawMode, indicesBuffer) {
    var gl = this.gl;

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer.ref);
    gl.drawElements(drawMode, indicesBuffer.numItems, gl.UNSIGNED_SHORT, 0);
  },

  /**
   * Helper function to create a 3D context in a cross browser way.
   *
   * @param {HTMLCanvasElement} canvas: the canvas to get the WebGL context
   * @param {Object} opt_attribs: optional attributes used for initialization
   */
  create3DContext: function(canvas, opt_attribs) {
    var names = ["experimental-webgl", "webgl", "webkit-3d", "moz-webgl"];
    var context, i, len;

    for (i = 0, len = names.length; i < len; ++i) {
      try {
        context = canvas.getContext(names[i], opt_attribs);
      }
      catch(e) {}

      if (context) {
        break;
      }
    }
    return context;
  },

  /**
   * Requests the next animation frame in an efficient way.
   * Also handles variables like frameCount, frameRate, frameDelta internally,
   * and resets the model view and projection matrices.
   * Use it at the beginning of your loop function, like this:
   *
   *      function draw() {
   *        tilt.loop(draw);
   *
   *        // do rendering
   *        ...
   *      };
   *      draw();
   *
   * @param {Function} draw: the function to be called each frame
   */
  loop: function(draw) {
    window.requestAnimFrame(draw);

    // reset the model view and projection matrices
    this.origin();
    this.perspective();

    // calculate the frame delta and frame rate using the current time
    this.currentTime = new Date().getTime();

    if (this.lastTime !== 0) {
      this.frameDelta = this.currentTime - this.lastTime;
      this.frameRate = 1000 / this.frameDelta;
    }
    this.lastTime = this.currentTime;

    // increment the elapsed time and total frame count
    this.elapsedTime += this.frameDelta;
    this.frameCount++;
  },

  /**
   * Clears the Tilt cache, destroys this object and deletes all members.
   */
  destroy: function() {
    Tilt.clearCache();

    for (var i in this) {
      try {
        if ("function" === typeof this[i].destroy) {
          this[i].destroy();
        }
      }
      catch(e) {}
      finally {
        delete this[i];
      }
    }
  }
};
