"use client";

import { useEffect, useRef } from "react";

// Full-screen triangle: one draw call, no geometry library needed.
const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;

// Seven luminous "opinion lines" drifting over the midnight canvas. They bend away from the cursor
// and swell with scroll speed, so the page feels alive without ever competing with the text.
const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uVel;
const vec3 CYAN = vec3(0.0, 0.82, 0.698);
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 m = vec2(uMouse.x * aspect, uMouse.y);
  float t = uTime * 0.14;
  vec3 col = vec3(0.0);
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    float amp = (0.04 + 0.018 * sin(fi * 1.7)) * (1.0 + uVel * 3.0);
    float y = 0.16 + fi * 0.105
      + amp * sin(p.x * (1.2 + fi * 0.21) + t * (1.0 + fi * 0.15) + fi * 1.3)
      + amp * 0.55 * sin(p.x * (2.9 - fi * 0.18) - t * 1.4 + fi * 2.1);
    float dm = p.x - m.x;
    y += 0.07 * sign(y - m.y + 0.0001) * exp(-dm * dm * 9.0) * exp(-pow(y - m.y, 2.0) * 30.0);
    float d = abs(p.y - y);
    float core = exp(-d * d * 90000.0);
    float glow = 0.0035 / (d + 0.0035);
    float fade = smoothstep(0.0, 0.35, uv.x) * smoothstep(1.0, 0.6, uv.x) * (0.55 + 0.45 * sin(p.x * 0.8 + t + fi));
    col += mix(CYAN, vec3(1.0), 0.35 + 0.4 * core) * (core * 0.5 + glow * 0.11) * fade;
  }
  col += CYAN * 0.07 * exp(-dot(p - m, p - m) * 7.0);
  float a = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
  gl_FragColor = vec4(min(col, vec3(a)), a);
}`;

function shader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (gl.getShaderParameter(s, gl.COMPILE_STATUS)) return s;
  // decorative only: log and fall back to the CSS gradient instead of breaking the page
  console.error("WaveField shader failed:", gl.getShaderInfoLog(s));
  return null;
}

export function WaveField({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const gl = canvas?.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });
    // no WebGL (old phone, disabled GPU): the CSS mesh gradient behind still carries the mood
    if (!canvas || !gl) return;
    const vs = shader(gl, gl.VERTEX_SHADER, VERT);
    const fs = shader(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) return;

    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const [uRes, uTime, uMouse, uVel] = [u("uRes"), u("uTime"), u("uMouse"), u("uVel")];

    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mouse = { x: 0.7, y: 0.6, tx: 0.7, ty: 0.6 };
    let vel = 0;
    let lastScroll = scrollY;
    let time = 12;
    let last = performance.now();
    let raf = 0;
    let visible = false;

    const draw = () => {
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, time);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uVel, vel);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const resize = () => {
      const dpr = Math.min(devicePixelRatio, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      draw();
    };
    const frame = (now: number) => {
      // clamp dt so a tab coming back from the background doesn't jump the waves
      time += Math.min((now - last) / 1000, 0.05);
      last = now;
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      const speed = Math.min(Math.abs(scrollY - lastScroll) / innerHeight / 0.04, 1);
      lastScroll = scrollY;
      vel += (speed - vel) * 0.06;
      draw();
      raf = requestAnimationFrame(frame);
    };
    const play = () => {
      if (still || raf || !visible || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const pause = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onPointer = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.tx = (e.clientX - r.left) / r.width;
      mouse.ty = 1 - (e.clientY - r.top) / r.height;
    };
    const onVisibility = () => (document.hidden ? pause() : play());

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) play();
      else pause();
    });
    io.observe(canvas);
    if (!still) addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      pause();
      ro.disconnect();
      io.disconnect();
      removeEventListener("pointermove", onPointer);
      // no loseContext() here: Strict Mode re-runs this effect on the same canvas and would get the dead context back
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={`pointer-events-none absolute inset-0 size-full ${className}`} />;
}
