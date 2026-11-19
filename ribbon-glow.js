// Ribbon Glow — Originkit. Original field and finishing shaders supplied for this portfolio.
const LAYERS = 84
const TWIST = 1.25 // radians of swirl at full Hover under the pointer
const DRAG = 0.18 // how far pointer motion drags the plane

const VERT_SRC = `#version 300 es
const vec2 P[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() { gl_Position = vec4(P[gl_VertexID], 0.0, 1.0); }
`

// No backticks anywhere in the shader strings: one inside a GLSL comment would
// end the template literal.
const FIELD_SRC = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uC1;
uniform vec3 uC2;
uniform float uSize;
uniform float uAngle;
uniform vec2 uMouse;
uniform float uOn;
uniform float uReach;
uniform vec2 uVel;
out vec4 o;

const float TAU = 6.28318530718;
const float LAYERS = ${LAYERS.toFixed(1)};
const float TWIST = ${TWIST.toFixed(3)};
const float DRAG = ${DRAG.toFixed(3)};
const float GAIN = 0.62;
const vec2 CENTRE = vec2(-0.62, 0.24);
const float TILT = 0.6;
const float ZOOM = 1.05;
const float THETA = 2.13;
const float SHEAR = 0.963;
const float SHRINK = 0.953;
const vec2 WARP_FREQ = vec2(0.42, 2.4);
const vec2 WARP_AMP = vec2(0.13, 0.027);
const vec2 ASPECT = vec2(2.1, 0.17);
const float OFFSET = 0.36;
const float GLOW = 0.0021;
const float SOFT = 0.0019;
const float FALLOFF = 0.37;
const float PHASE = 12.0;
const float CYCLE = 0.16;
const float HUE_TRAVEL = 2.0;

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }

void main() {
  vec2 R = uRes;
  vec2 pos = (gl_FragCoord.xy - 0.5 * R) / R.y;

  // The plane swirls around the pointer and is dragged by its motion. Skipped
  // outright at zero weight: mouse + (pos - mouse) does not round-trip, so
  // Hover 0 would still nudge the frame by a float ulp.
  vec2 d = pos - uMouse;
  float w = uOn * exp(-dot(d, d) / (uReach * uReach));
  if (w > 1e-4) pos = uMouse + rot(w * TWIST) * d * (1.0 - 0.3 * min(w, 1.0)) - uVel * min(w, 1.0) * DRAG;

  pos = rot(uAngle) * pos / uSize;
  float t = uTime * 0.49 + PHASE;
  float breath = (-sin(uTime * 0.735) + sin(uTime * 0.49 + 1.0)) * 0.25 + 0.5;
  vec2 u = rot(TILT) * ((pos - CENTRE) * (ZOOM - breath * 0.085));
  mat2 fold = mat2(cos(THETA), sin(THETA), -SHEAR, cos(THETA));

  vec3 col = vec3(0.0);
  for (float i = 1.0; i <= LAYERS; i += 1.0) {
    u.x -= sin(u.y * WARP_FREQ.x + t + i * 0.007) * WARP_AMP.x;
    u.y -= sin(u.x * WARP_FREQ.y - t + i * 0.02) * WARP_AMP.y;
    u = fold * u * SHRINK;
    vec2 q = (u - vec2(OFFSET + breath * 0.1, 0.0)) * ASPECT;
    float g = GLOW / (dot(q, q) + SOFT) * (0.25 + breath * 0.4);
    float r = length(u);
    float k = sin(i * CYCLE + t * 1.2 + r * HUE_TRAVEL) * 0.5 + 0.5;
    col += g * mix(uC1, uC2, k) * (0.62 + 0.5 * k) * exp2(-r * FALLOFF);
  }
  vec3 x = max(col * GAIN, 0.0);
  col = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);
  col = pow(clamp(col, 0.0, 1.0), vec3(0.85, 0.92, 0.98));
  col *= 1.0 - smoothstep(0.5, 1.6, length(pos)) * 0.07;
  o = vec4(col, 1.0);
}
`

const FINISH_SRC = `#version 300 es
precision highp float;
uniform sampler2D uField;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uBg;
uniform float uPaper;
out vec4 o;

float ign(vec2 p, float f) { p += 5.588238 * mod(f, 64.0); return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y)); }

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec3 L = max(texture(uField, frag / uRes).rgb, 0.0);
  // Dark ground: the ribbons are light, screened over it. Light ground: the
  // same hues laid on as pigment, the paper showing where the light is dim.
  vec3 dark = uBg + L * (1.0 - uBg);
  float strength = clamp(max(L.r, max(L.g, L.b)), 0.0, 1.0);
  vec3 paper = uBg * (1.0 - strength) + L * 0.96;
  vec3 col = mix(dark, paper, uPaper);
  col += (ign(frag, floor(uTime * 24.0)) - 0.5) / 255.0;
  o = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

const RIBBON_SPEED = .18;
const FRAME_INTERVAL_MS = 32;
const hero = document.getElementById('inicio');
const canvas = hero.querySelector('.ribbon-canvas');
const still = window.matchMedia('(prefers-reduced-motion: reduce)');
let redraw;

function createProgram(gl, fragmentSource) {
  const program = gl.createProgram();
  if (!program) return null;
  for (const [kind, source] of [[gl.VERTEX_SHADER, VERT_SRC], [gl.FRAGMENT_SHADER, fragmentSource]]) {
    const shader = gl.createShader(kind);
    if (!shader) {
      gl.deleteProgram(program);
      return null;
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
  gl.deleteProgram(program);
  return null;
}

function uniforms(gl, program, names) {
  return Object.fromEntries(names.map(name => [name, gl.getUniformLocation(program, name)]));
}

function setup(gl) {
  const field = createProgram(gl, FIELD_SRC);
  const finish = createProgram(gl, FINISH_SRC);
  const texture = gl.createTexture();
  const buffer = gl.createFramebuffer();
  const vao = gl.createVertexArray();
  if (!field || !finish || !texture || !buffer || !vao) return null;

  const fieldUniforms = uniforms(gl, field, ['uRes', 'uTime', 'uC1', 'uC2', 'uSize', 'uAngle', 'uMouse', 'uOn', 'uReach', 'uVel']);
  const finishUniforms = uniforms(gl, finish, ['uRes', 'uBg', 'uField']);
  gl.bindVertexArray(vao);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.useProgram(field);
  gl.uniform3f(fieldUniforms.uC1, 47 / 255, 211 / 255, 242 / 255);
  gl.uniform3f(fieldUniforms.uC2, 123 / 255, 97 / 255, 1);
  gl.uniform1f(fieldUniforms.uSize, 1);
  gl.uniform1f(fieldUniforms.uAngle, Math.PI);
  gl.useProgram(finish);
  gl.uniform3f(finishUniforms.uBg, 11 / 255, 10 / 255, 16 / 255);
  gl.uniform1i(finishUniforms.uField, 0);
  // Leave the finishing pass on a dark ground with fixed noise.
  let allowFloat = Boolean(gl.getExtension('EXT_color_buffer_float'));
  let fieldWidth = 0;
  let fieldHeight = 0;
  return (width, height, time, x, y, vx, vy, presence) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2, 1600 / Math.max(width, height));
    const w = Math.max(1, Math.round(width * dpr));
    const h = Math.max(1, Math.round(height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
    const fw = Math.max(1, Math.round(w / 2));
    const fh = Math.max(1, Math.round(h / 2));
    if (fw !== fieldWidth || fh !== fieldHeight) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      if (allowFloat) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, fw, fh, 0, gl.RGBA, gl.HALF_FLOAT, null);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      if (!allowFloat || gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        allowFloat = false;
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, fw, fh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      }
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) return false;
      fieldWidth = fw;
      fieldHeight = fh;
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.useProgram(field);
    gl.viewport(0, 0, fw, fh);
    gl.uniform2f(fieldUniforms.uRes, fw, fh);
    gl.uniform1f(fieldUniforms.uTime, time);
    gl.uniform2f(fieldUniforms.uMouse, (x - width / 2) / height, (height / 2 - y) / height);
    gl.uniform1f(fieldUniforms.uOn, 2 * presence);
    gl.uniform1f(fieldUniforms.uReach, 240 / height);
    const cap = Math.max(1, Math.hypot(vx, vy) / (height * 3));
    gl.uniform2f(fieldUniforms.uVel, vx / height / cap, -vy / height / cap);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);
    gl.useProgram(finish);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform2f(finishUniforms.uRes, w, h);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return true;
  };
}

let frame = 0;
let last = 0;
let time = 0;
let visible = false;
let inside = false;
let targetX = 0, targetY = 0;
let x = 0, y = 0, vx = 0, vy = 0, presence = 0;

function requestDraw() {
  if (!frame && visible && !document.hidden && !still.matches && redraw) frame = requestAnimationFrame(draw);
}

function pauseDraw() {
  cancelAnimationFrame(frame);
  frame = 0;
  last = 0;
}

function draw(now) {
  frame = 0;
  const width = hero.clientWidth, height = hero.clientHeight;
  if (!width || !height || !visible || document.hidden || still.matches || !redraw) return;
  if (last && now - last < FRAME_INTERVAL_MS) {
    requestDraw();
    return;
  }
  const elapsed = last ? (now - last) / 1000 : 0;
  time += elapsed * RIBBON_SPEED;
  const dt = Math.min(.05, Math.max(.001, elapsed));
  last = now;
  const dx = (targetX - x) * (1 - Math.exp(-dt * 16));
  const dy = (targetY - y) * (1 - Math.exp(-dt * 16));
  x += dx;
  y += dy;
  vx += (dx / dt - vx) * (1 - Math.exp(-dt * 8));
  vy += (dy / dt - vy) * (1 - Math.exp(-dt * 8));
  const targetPresence = inside ? 1 : 0;
  presence += (targetPresence - presence) * (1 - Math.exp(-dt * 5));
  if (Math.abs(targetPresence - presence) < .001) presence = targetPresence;
  canvas.hidden = !redraw(width, height, time, x, y, vx, vy, presence);
  if (!canvas.hidden) requestDraw();
}

function initialize() {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false });
  redraw = gl && setup(gl);
  requestDraw();
}

function pointerMove(event) {
  if (!visible || still.matches || document.hidden) return;
  const rect = hero.getBoundingClientRect();
  targetX = event.clientX - rect.left;
  targetY = event.clientY - rect.top;
  if (!inside && presence < .02) {
    x = targetX;
    y = targetY;
    vx = vy = 0;
  }
  inside = true;
  requestDraw();
}

function leave() {
  inside = false;
  requestDraw();
}

hero.addEventListener('pointermove', pointerMove, { passive: true });
hero.addEventListener('pointerdown', pointerMove, { passive: true });
hero.addEventListener('pointerleave', leave);
hero.addEventListener('pointercancel', leave);
hero.addEventListener('pointerup', event => { if (event.pointerType !== 'mouse') leave(); });

canvas.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  pauseDraw();
  redraw = null;
  canvas.hidden = true;
});
canvas.addEventListener('webglcontextrestored', initialize);
still.addEventListener('change', () => {
  pauseDraw();
  inside = false;
  presence = 0;
  canvas.hidden = true;
  if (!still.matches && !redraw) initialize();
  else requestDraw();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseDraw();
  leave();
});
new ResizeObserver(requestDraw).observe(hero);
new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting;
  if (!visible) {
    pauseDraw();
    inside = false;
    presence = 0;
  }
  requestDraw();
}).observe(hero);
if (!still.matches) initialize();
