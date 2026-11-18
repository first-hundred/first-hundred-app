import { useEffect, useRef, useState } from "react";

/*
 * Full-screen pastel background shared by every page (rendered in __root.tsx).
 * A small WebGL shader draws slow, domain-warped "gas"; the pointer stirs it like a hand
 * through water. If WebGL is missing, the CSS blobs below stay as the fallback.
 * Server-safe: window and canvas are only touched inside useEffect.
 */

const VERT = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;

const FRAG = `precision mediump float;
uniform vec2 u_res;
uniform float u_t;
uniform vec2 u_mouse;   // eased pointer, 0..1, y up
uniform vec2 u_vel;     // eased pointer velocity
uniform float u_energy; // decays to 0 when the pointer rests

float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 r=mat2(.8,.6,-.6,.8);
  for(int i=0;i<4;i++){v+=a*n(p);p=r*p*2.02;a*=.5;}return v;}

void main(){
  vec2 uv=gl_FragCoord.xy/u_res;
  float asp=u_res.x/u_res.y;
  vec2 p=vec2(uv.x*asp,uv.y);
  vec2 m=vec2(u_mouse.x*asp,u_mouse.y);
  vec2 d=p-m;
  float fall=exp(-dot(d,d)*5.);
  // stir: push along the pointer's motion and swirl around it
  vec2 swirl=vec2(-d.y,d.x)*fall*u_energy*1.1;
  vec2 push=-u_vel*fall*2.2;
  float ripple=sin(length(d)*26.-u_t*2.4)*fall*u_energy*.035;
  vec2 q=p*1.35+push+swirl+ripple;

  float t=u_t*.035;
  vec2 w1=vec2(fbm(q+vec2(0.,t)),fbm(q+vec2(5.2,1.3)-t));
  vec2 w2=vec2(fbm(q+3.*w1+vec2(1.7,9.2)+t*.6),fbm(q+3.*w1+vec2(8.3,2.8)-t*.4));
  float f=fbm(q+2.6*w2);

  vec3 peach=vec3(1.,.66,.48), blush=vec3(.96,.55,.70), lilac=vec3(.66,.55,.95), sky=vec3(.50,.76,.96);
  vec3 c=mix(peach,blush,smoothstep(.15,.85,uv.x+uv.y*.3-.1));
  c=mix(c,lilac,smoothstep(.35,.75,f));
  c=mix(c,sky,smoothstep(.45,.85,w2.y)*.8);
  c=mix(c,peach,smoothstep(.55,.9,w1.x)*.45);
  c+=fall*u_energy*.025;
  c=mix(c,vec3(1.),.08);
  // fine grain hides banding
  c+=(h(gl_FragCoord.xy+fract(u_t))-.5)/255.;
  gl_FragColor=vec4(c,1.);
}`;

const SCALE = 0.5; // render at half the CSS size; the soft look hides the upscale

export function Background() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gl, setGl] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("webgl", { antialias: false, depth: false, alpha: false, powerPreference: "low-power" });
    if (!ctx) return;

    const compile = (type: number, src: string) => {
      const s = ctx.createShader(type)!;
      ctx.shaderSource(s, src);
      ctx.compileShader(s);
      if (!ctx.getShaderParameter(s, ctx.COMPILE_STATUS)) throw new Error(ctx.getShaderInfoLog(s) ?? "shader");
      return s;
    };
    let prog: WebGLProgram;
    try {
      prog = ctx.createProgram()!;
      ctx.attachShader(prog, compile(ctx.VERTEX_SHADER, VERT));
      ctx.attachShader(prog, compile(ctx.FRAGMENT_SHADER, FRAG));
      ctx.linkProgram(prog);
      if (!ctx.getProgramParameter(prog, ctx.LINK_STATUS)) throw new Error("link");
    } catch {
      return; // keep the CSS fallback
    }
    ctx.useProgram(prog);
    const buf = ctx.createBuffer();
    ctx.bindBuffer(ctx.ARRAY_BUFFER, buf);
    ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), ctx.STATIC_DRAW);
    const loc = ctx.getAttribLocation(prog, "a");
    ctx.enableVertexAttribArray(loc);
    ctx.vertexAttribPointer(loc, 2, ctx.FLOAT, false, 0, 0);
    const uRes = ctx.getUniformLocation(prog, "u_res");
    const uT = ctx.getUniformLocation(prog, "u_t");
    const uMouse = ctx.getUniformLocation(prog, "u_mouse");
    const uVel = ctx.getUniformLocation(prog, "u_vel");
    const uEnergy = ctx.getUniformLocation(prog, "u_energy");

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1);
      canvas.width = Math.max(1, Math.round(window.innerWidth * dpr * SCALE));
      canvas.height = Math.max(1, Math.round(window.innerHeight * dpr * SCALE));
      ctx.viewport(0, 0, canvas.width, canvas.height);
      ctx.uniform2f(uRes, canvas.width, canvas.height);
    };
    resize();

    // pointer state: target (raw), eased position, eased velocity, energy
    const target = { x: 0.5, y: 0.5 };
    const mouse = { x: 0.5, y: 0.5 };
    const vel = { x: 0, y: 0 };
    let energy = 0;
    let last = { x: 0.5, y: 0.5 };

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX / window.innerWidth;
      target.y = 1 - e.clientY / window.innerHeight;
    };

    const draw = (t: number) => {
      ctx.uniform1f(uT, t);
      ctx.uniform2f(uMouse, mouse.x, mouse.y);
      ctx.uniform2f(uVel, vel.x, vel.y);
      ctx.uniform1f(uEnergy, energy);
      ctx.drawArrays(ctx.TRIANGLES, 0, 3);
    };

    let raf = 0;
    const start = performance.now();
    let prev = start;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      // slow follow: the disturbance trails the pointer like a wake
      const k = 1 - Math.exp(-dt * 2.2);
      mouse.x += (target.x - mouse.x) * k;
      mouse.y += (target.y - mouse.y) * k;
      const vx = (mouse.x - last.x) / Math.max(dt, 1e-3);
      const vy = (mouse.y - last.y) / Math.max(dt, 1e-3);
      last = { x: mouse.x, y: mouse.y };
      const kv = 1 - Math.exp(-dt * 3);
      vel.x += (vx * 0.12 - vel.x) * kv;
      vel.y += (vy * 0.12 - vel.y) * kv;
      const speed = Math.hypot(vx, vy);
      energy += (Math.min(1, speed * 0.9) - energy) * (1 - Math.exp(-dt * (speed > energy ? 4 : 0.8)));
      draw((now - start) / 1000);
      raf = requestAnimationFrame(frame);
    };

    const onResize = () => {
      resize();
      if (reduce) draw(0);
    };
    window.addEventListener("resize", onResize);

    if (reduce) {
      draw(0);
    } else {
      window.addEventListener("pointermove", onMove, { passive: true });
      raf = requestAnimationFrame(frame);
    }
    setGl(true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      ctx.deleteBuffer(buf);
      ctx.deleteProgram(prog);
    };
  }, []);

  return (
    <div className="fh-bg" data-gl={gl ? "" : undefined} aria-hidden="true">
      {!gl && (
        <>
          <div className="fh-blob fh-blob-1" />
          <div className="fh-blob fh-blob-2" />
          <div className="fh-blob fh-blob-3" />
          <div className="fh-blob fh-blob-4" />
        </>
      )}
      <canvas ref={canvasRef} className="fh-canvas" />
    </div>
  );
}
