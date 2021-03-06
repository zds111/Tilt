/*
 * Math.js - Various math helper functions
 * version 0.1
 *
 * Copyright (c) 2011 Victor Porof
 *
 * This software is provided 'as-is', without any express or implied
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
var EXPORTED_SYMBOLS = ["Tilt.Math"];

/**
 * Various math functions required by the engine.
 */
Tilt.Math = {

  /**
   * Helper function, converts degrees to radians.
   *
   * @param {Number} degrees: the degrees to be converted to radians
   * @return {Number} the degrees converted to radians
   */
  radians: function(degrees) {
    return degrees * Math.PI / 180;
  },

  /**
   * Helper function, converts radians to degrees.
   *
   * @param {Number} radians: the radians to be converted to degrees
   * @return {Number} the radians converted to degrees
   */
  degrees: function(radians) {
    return radians * 180 / Math.PI;
  },

  /**
   * Returns if number is power of two.
   *
   * @param {Number} x: the number to be verified
   * @return {Boolean} true if x is power of two
   */
  isPowerOfTwo: function(x) {
    return (x & (x - 1)) === 0;
  },

  /**
   * Returns the next closest power of two greater than a number.
   *
   * @param {Number} x: the number to be converted
   * @return {Number} the next closest power of two for x
   */
  nextPowerOfTwo: function(x) {
    var i;

    --x;
    for (i = 1; i < 32; i <<= 1) {
      x = x | x >> i;
    }
    return x + 1;
  },

  /**
   * A convenient way of limiting values to a set boundary.
   *
   * @param {Number} value: the number to be limited
   * @param {Number} min: the minimum allowed value for the number
   * @param {Number} max: the maximum allowed value for the number
   */
  clamp: function(value, min, max) {
    return Math.max(min, Math.min(max, value));
  },

  /**
   * Creates a rotation quaternion from axis-angle.
   * This function implies that the axis is a normalized vector.
   *
   * @param {Array} axis: an array of elements representing the [x, y, z] axis
   * @param {Number} angle: the angle of rotation
   * @param {Array} out: optional parameter, the array to write the values to
   * @return {Array} the quaternion as [x, y, z, w]
   */
  quat4fromAxis: function(axis, angle, out) {
    angle *= 0.5;

    var sin = Math.sin(angle),
        x = (axis[0] * sin),
        y = (axis[1] * sin),
        z = (axis[2] * sin),
        w = Math.cos(angle);

    if ("undefined" === typeof out) {
      return [x, y, z, w];
    }
    else {
      out[0] = x;
      out[1] = y;
      out[2] = z;
      out[3] = w;
      return out;
    }
  },

  /**
   * Creates a rotation quaternion from Euler angles.
   *
   * @param {Number} yaw: the yaw angle of rotation
   * @param {Number} pitch: the pitch angle of rotation
   * @param {Number} roll: the roll angle of rotation
   * @param {Array} out: optional parameter, the array to write the values to
   * @return {Array} the quaternion as [x, y, z, w]
   */
  quat4fromEuler: function(yaw, pitch, roll, out) {
    // basically we create 3 quaternions, for pitch, yaw and roll
    // and multiply those together
    var w,
      x = pitch * 0.5,
      y = yaw   * 0.5,
      z = roll  * 0.5,
      sinr = Math.sin(x),
      sinp = Math.sin(y),
      siny = Math.sin(z),
      cosr = Math.cos(x),
      cosp = Math.cos(y),
      cosy = Math.cos(z);

    x = sinr * cosp * cosy - cosr * sinp * siny;
    y = cosr * sinp * cosy + sinr * cosp * siny;
    z = cosr * cosp * siny - sinr * sinp * cosy;
    w = cosr * cosp * cosy + sinr * sinp * siny;

    if ("undefined" === typeof out) {
      return [x, y, z, w];
    }
    else {
      out[0] = x;
      out[1] = y;
      out[2] = z;
      out[3] = w;
      return out;
    }
  },

  /**
   * Port of gluUnProject.
   *
   * @param {Array} p: the [x, y, z] coordinates of the point to unproject;
   * the z value should range between 0 and 1, as the near/far clipping planes
   * @param {Array} viewport: the viewport [x, y, width, height] coordinates
   * @param {Array} mvMatrix: the model view matrix
   * @param {Array} projMatrix: the projection matrix
   * @param {Array} out: optional parameter, the array to write the values to
   * @return {Array} the unprojected coordinates
   */
  unproject: function(p, viewport, mvMatrix, projMatrix, out) {
    var mvpMatrix = mat4.create(), coordinates = out || quat4.create();

    // compute the inverse of the perspective x model-view matrix
    mat4.multiply(projMatrix, mvMatrix, mvpMatrix);
    mat4.inverse(mvpMatrix);

    // transformation of normalized coordinates (-1 to 1)
    coordinates[0] = +((p[0] - viewport[0]) / viewport[2] * 2 - 1);
    coordinates[1] = -((p[1] - viewport[1]) / viewport[3] * 2 - 1);
    coordinates[2] = 2 * p[2] - 1;
    coordinates[3] = 1;

    // now transform that vector into object coordinates
    mat4.multiplyVec4(mvpMatrix, coordinates);

    // invert to normalize x, y, and z values.
    coordinates[3] = 1 / coordinates[3];
    coordinates[0] *= coordinates[3];
    coordinates[1] *= coordinates[3];
    coordinates[2] *= coordinates[3];

    return coordinates;
  },

  /**
   * Create a ray between two points using the current modelview & projection
   * matrices. This is useful when creating a ray destined for 3d picking.
   *
   * @param {Array} p0: the [x, y, z] coordinates of the first point
   * @param {Array} p1: the [x, y, z] coordinates of the second point
   * @param {Array} viewport: the viewport [x, y, width, height] coordinates
   * @param {Array} mvMatrix: the model view matrix
   * @param {Array} projMatrix: the projection matrix
   * @return {Object} a ray object containing the direction vector between
   * the two unprojected points, the position and the lookAt
   */
  createRay: function(p0, p1, viewport, mvMatrix, projMatrix) {
    // unproject the two points
    this.unproject(p0, viewport, mvMatrix, projMatrix, p0);
    this.unproject(p1, viewport, mvMatrix, projMatrix, p1);

    return {
      position: p0,
      lookAt: p1,
      direction: vec3.normalize(vec3.subtract(p1, p0))
    };
  },

  /**
   * Intersect a ray with a 3D triangle.
   *
   * @param {Array} v0: the [x, y, z] position of the first triangle point
   * @param {Array} v1: the [x, y, z] position of the second triangle point
   * @param {Array} v2: the [x, y, z] position of the third triangle point
   * @param {Object} ray: a ray, containing position and direction vectors
   * @param {Array} intersection: point to store the intersection to
   * @return {Number} -1 if the triangle is degenerate,
   *                   0 disjoint (no intersection)
   *                   1 intersects in unique point
   *                   2 the ray and the triangle are in the same plane
   */
  intersectRayTriangle: function(v0, v1, v2, ray, intersection) {
    var u = vec3.create(), v = vec3.create(), n = vec3.create(),
        w = vec3.create(), w0 = vec3.create(),
        pos = ray.position, dir = ray.direction,
        a, b, r, uu, uv, vv, wu, wv, D, s, t;

    if ("undefined" === typeof intersection) {
      intersection = vec3.create();
    }

    // get triangle edge vectors and plane normal
    vec3.subtract(v1, v0, u);
    vec3.subtract(v2, v0, v);

    // get the cross product
    vec3.cross(u, v, n);

    // check if triangle is degenerate
    if (n[0] === 0 && n[1] === 0 && n[2] === 0) {
      return -1;
    }

    vec3.subtract(pos, v0, w0);
    a = -vec3.dot(n, w0);
    b = +vec3.dot(n, dir);

    if (Math.abs(b) < 0.0001) { // ray is parallel to triangle plane
      if (a == 0) {             // ray lies in triangle plane
        return 2;
      }
      else {
        return 0;               // ray disjoint from plane
      }
    }

    // get intersect point of ray with triangle plane
    r = a / b;
    if (r < 0) {                // ray goes away from triangle
      return 0;                 // => no intersect
    }

    // intersect point of ray and plane
    vec3.add(pos, vec3.scale(dir, r), intersection);

    // check if the intersection is inside the triangle
    uu = vec3.dot(u, u);
    uv = vec3.dot(u, v);
    vv = vec3.dot(v, v);

    vec3.subtract(intersection, v0, w);
    wu = vec3.dot(w, u);
    wv = vec3.dot(w, v);

    D = uv * uv - uu * vv;

    // get and test parametric coords
    s = (uv * wv - vv * wu) / D;
    if (s < 0 || s > 1) {       // intersection is outside the triangle
      return 0;
    }

    t = (uv * wu - uu * wv) / D;
    if (t < 0 || (s + t) > 1) { // intersection is outside the triangle
      return 0;
    }

    return 1;                   // intersection is inside the triangle
  },

  /**
   * Converts a hex color to rgba.
   *
   * @param {String} a color expressed in hex, or using rgb() or rgba()
   * @return {Array} an array with 4 color components: red, green, blue, alpha
   * with ranges from 0..1
   */
  hex2rgba: function(color) {
    if ("undefined" !== typeof this[color]) {
      return this[color];
    }

    var rgba, r, g, b, a, cr, cg, cb, ca,
      hex = color.charAt(0) === "#" ? color.substring(1) : color;

    // e.g. "f00"
    if (hex.length === 3) {
      cr = hex.charAt(0);
      cg = hex.charAt(1);
      cb = hex.charAt(2);
      hex = [cr, cr, cg, cg, cb, cb, "ff"].join('');
    }
    // e.g. "f008"
    else if (hex.length === 4) {
      cr = hex.charAt(0);
      cg = hex.charAt(1);
      cb = hex.charAt(2);
      ca = hex.charAt(3);
      hex = [cr, cr, cg, cg, cb, cb, ca, ca].join('');
    }
    // e.g. "rgba(255, 0, 0, 128)"
    else if (hex.match("^rgba") == "rgba") {
      rgba = hex.substring(5, hex.length - 1).split(',');
      rgba[0] /= 255;
      rgba[1] /= 255;
      rgba[2] /= 255;
      rgba[3] /= 255;

      this[color] = rgba;
      return rgba;
    }
    // e.g. "rgb(255, 0, 0)"
    else if (hex.match("^rgb") == "rgb") {
      rgba = hex.substring(4, hex.length - 1).split(',');
      rgba[0] /= 255;
      rgba[1] /= 255;
      rgba[2] /= 255;
      rgba[3] = 1;

      this[color] = rgba;
      return rgba;
    }

    r = parseInt(hex.substring(0, 2), 16) / 255;
    g = parseInt(hex.substring(2, 4), 16) / 255;
    b = parseInt(hex.substring(4, 6), 16) / 255;
    a = hex.length === 6 ? 1 : parseInt(hex.substring(6, 8), 16) / 255;

    this[color] = [r, g, b, a];
    return [r, g, b, a];
  }
};
