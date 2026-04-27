// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import {
  StreamManager,
  AvailableStreams,
  TargetStream,
  ApiVersions,
  ConnectionError,
  PeerState,
  fetchWithRedirectAuthorization,
} from '@networkoptix/webrtc-stream-manager';
import type {
  TrackEventDetail,
  StateChangeEventDetail,
  CameraConnection,
  Stream,
  MetadataEventDetail,
  ObjectMetadataPacket,
} from '@networkoptix/webrtc-stream-manager';

import {
  DewarpingRenderer,
  createDefaultMediaData,
  createDefaultViewData,
  FisheyeCameraMount,
  CameraProjection,
  attachCanvasControls,
  createMinimap,
  getPtzLimits,
  boundToLimits,
  toRadians,
  toDegrees,
  DewarpingTransform,
} from 'fisheye-dewarp';
import type { MediaData, ViewData, ControlHandle, MinimapHandle, Point2D } from 'fisheye-dewarp';

import {
  ObjectTrackingOverlay,
  type Renderer as TrackingRenderer,
  type BBox as TrackingBBox,
} from '@networkoptix/object-tracking-overlay';

// SimplexNoise (MIT License, jwagner/simplex-noise)
// @ts-expect-error — inlined minified library, returned as module-local to avoid ESM global issues
const SimplexNoise: any = function(){"use strict";var r=.5*(Math.sqrt(3)-1),e=(3-Math.sqrt(3))/6,t=1/6,a=(Math.sqrt(5)-1)/4,o=(5-Math.sqrt(5))/20;function i(r){var e;e="function"==typeof r?r:r?function(){var r=0,e=0,t=0,a=1,o=(i=4022871197,function(r){r=r.toString();for(var e=0;e<r.length;e++){var t=.02519603282416938*(i+=r.charCodeAt(e));t-=i=t>>>0,i=(t*=i)>>>0,i+=4294967296*(t-=i)}return 2.3283064365386963e-10*(i>>>0)});var i;r=o(" "),e=o(" "),t=o(" ");for(var n=0;n<arguments.length;n++)(r-=o(arguments[n]))<0&&(r+=1),(e-=o(arguments[n]))<0&&(e+=1),(t-=o(arguments[n]))<0&&(t+=1);return o=null,function(){var o=2091639*r+2.3283064365386963e-10*a;return r=e,e=t,t=o-(a=0|o)}}(r):Math.random,this.p=n(e),this.perm=new Uint8Array(512),this.permMod12=new Uint8Array(512);for(var t=0;t<512;t++)this.perm[t]=this.p[255&t],this.permMod12[t]=this.perm[t]%12}function n(r){var e,t=new Uint8Array(256);for(e=0;e<256;e++)t[e]=e;for(e=0;e<255;e++){var a=e+~~(r()*(256-e)),o=t[e];t[e]=t[a],t[a]=o}return t}i.prototype={grad3:new Float32Array([1,1,0,-1,1,0,1,-1,0,-1,-1,0,1,0,1,-1,0,1,1,0,-1,-1,0,-1,0,1,1,0,-1,1,0,1,-1,0,-1,-1]),grad4:new Float32Array([0,1,1,1,0,1,1,-1,0,1,-1,1,0,1,-1,-1,0,-1,1,1,0,-1,1,-1,0,-1,-1,1,0,-1,-1,-1,1,0,1,1,1,0,1,-1,1,0,-1,1,1,0,-1,-1,-1,0,1,1,-1,0,1,-1,-1,0,-1,1,-1,0,-1,-1,1,1,0,1,1,1,0,-1,1,-1,0,1,1,-1,0,-1,-1,1,0,1,-1,1,0,-1,-1,-1,0,1,-1,-1,0,-1,1,1,1,0,1,1,-1,0,1,-1,1,0,1,-1,-1,0,-1,1,1,0,-1,1,-1,0,-1,-1,1,0,-1,-1,-1,0]),noise2D:function(t,a){var o,i,n=this.permMod12,f=this.perm,s=this.grad3,v=0,h=0,l=0,u=(t+a)*r,d=Math.floor(t+u),p=Math.floor(a+u),M=(d+p)*e,m=t-(d-M),c=a-(p-M);m>c?(o=1,i=0):(o=0,i=1);var y=m-o+e,w=c-i+e,g=m-1+2*e,A=c-1+2*e,x=255&d,q=255&p,D=.5-m*m-c*c;if(D>=0){var S=3*n[x+f[q]];v=(D*=D)*D*(s[S]*m+s[S+1]*c)}var U=.5-y*y-w*w;if(U>=0){var b=3*n[x+o+f[q+i]];h=(U*=U)*U*(s[b]*y+s[b+1]*w)}var F=.5-g*g-A*A;if(F>=0){var N=3*n[x+1+f[q+1]];l=(F*=F)*F*(s[N]*g+s[N+1]*A)}return 70*(v+h+l)},noise3D:function(r,e,a){var o,i,n,f,s,v,h,l,u,d,p=this.permMod12,M=this.perm,m=this.grad3,c=(r+e+a)*(1/3),y=Math.floor(r+c),w=Math.floor(e+c),g=Math.floor(a+c),A=(y+w+g)*t,x=r-(y-A),q=e-(w-A),D=a-(g-A);x>=q?q>=D?(s=1,v=0,h=0,l=1,u=1,d=0):x>=D?(s=1,v=0,h=0,l=1,u=0,d=1):(s=0,v=0,h=1,l=1,u=0,d=1):q<D?(s=0,v=0,h=1,l=0,u=1,d=1):x<D?(s=0,v=1,h=0,l=0,u=1,d=1):(s=0,v=1,h=0,l=1,u=1,d=0);var S=x-s+t,U=q-v+t,b=D-h+t,F=x-l+2*t,N=q-u+2*t,C=D-d+2*t,P=x-1+.5,T=q-1+.5,_=D-1+.5,j=255&y,k=255&w,z=255&g,B=.6-x*x-q*q-D*D;if(B<0)o=0;else{var E=3*p[j+M[k+M[z]]];o=(B*=B)*B*(m[E]*x+m[E+1]*q+m[E+2]*D)}var G=.6-S*S-U*U-b*b;if(G<0)i=0;else{var H=3*p[j+s+M[k+v+M[z+h]]];i=(G*=G)*G*(m[H]*S+m[H+1]*U+m[H+2]*b)}var I=.6-F*F-N*N-C*C;if(I<0)n=0;else{var J=3*p[j+l+M[k+u+M[z+d]]];n=(I*=I)*I*(m[J]*F+m[J+1]*N+m[J+2]*C)}var K=.6-P*P-T*T-_*_;if(K<0)f=0;else{var L=3*p[j+1+M[k+1+M[z+1]]];f=(K*=K)*K*(m[L]*P+m[L+1]*T+m[L+2]*_)}return 32*(o+i+n+f)}},i._buildPermutationTable=n;return i}();

const GLITCH_ONE_LINERS = [
  'Sub Second Latency',
  'Rich Object Overlays',
  'Advanced Fisheye Dewarping',
  'Dynamic Stream Optimization',
  'Real-Time Object Tracking',
  'Adaptive Bitrate Streaming',
];

class ParticleField {
  private ctx: CanvasRenderingContext2D;
  private particles: { x: number; y: number; vx: number; vy: number; r: number }[] = [];
  private animId: number | null = null;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    const PARTICLE_COUNT = 60;
    const CONNECT_DIST = 120;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    this.resizeHandler = resize;
    window.addEventListener('resize', resize);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
      });
    }

    const CONNECT_DIST_SQ = CONNECT_DIST * CONNECT_DIST;

    const draw = () => {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(0, 160, 227, 0.15)';
      ctx.lineWidth = 0.5;

      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < this.particles.length; j++) {
          const q = this.particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < CONNECT_DIST_SQ) {
            const dist = Math.sqrt(distSq);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(0, 160, 227, ${0.06 * (1 - dist / CONNECT_DIST)})`;
            ctx.stroke();
          }
        }
      }
      this.animId = requestAnimationFrame(draw);
    };
    draw();
  }

  destroy(): void {
    if (this.animId !== null) cancelAnimationFrame(this.animId);
    window.removeEventListener('resize', this.resizeHandler);
  }
}

class GlitchText {
  private texts: string[];
  private index = 0;
  private textEl: HTMLElement;
  private container: HTMLElement;
  private redShift: Element | null;
  private blueShift: Element | null;
  private interval: ReturnType<typeof setInterval>;
  private swapped = false;
  private rafId: number | null = null;
  private destroyed = false;

  constructor(container: HTMLElement, textEl: HTMLElement, texts: string[]) {
    this.container = container;
    this.textEl = textEl;
    this.texts = texts;

    this.redShift = document.querySelector('#glitch-aberration feOffset[result="red-shift"]');
    this.blueShift = document.querySelector('#glitch-aberration feOffset[result="blue-shift"]');

    this.interval = setInterval(() => this.glitchTransition(), 4800);
  }

  private glitchTransition(): void {
    const container = this.container;
    const textEl = this.textEl;
    const text = textEl.textContent || '';
    const nextIndex = (this.index + 1) % this.texts.length;
    const nextText = this.texts[nextIndex];
    const style = window.getComputedStyle(textEl);
    const fontSize = style.fontSize;
    const color = style.color;

    // Generate random slice boundaries (4-6 horizontal strips)
    const numSlices = 4 + Math.floor(Math.random() * 3);
    const boundaries = [0];
    for (let i = 1; i < numSlices; i++) {
      boundaries.push(Math.random() * 100);
    }
    boundaries.push(100);
    boundaries.sort((a, b) => a - b);

    // Create slice elements
    const slices: { el: HTMLDivElement; span: HTMLSpanElement; offset: number }[] = [];
    for (let i = 0; i < boundaries.length - 1; i++) {
      const top = boundaries[i];
      const bottom = boundaries[i + 1];
      const slice = document.createElement('div');
      slice.className = 'glitch-slice';
      slice.style.clipPath = `inset(${top}% 0 ${100 - bottom}% 0)`;
      const span = document.createElement('span');
      span.textContent = text;
      span.style.fontSize = fontSize;
      span.style.color = color;
      slice.appendChild(span);
      container.appendChild(slice);
      slices.push({ el: slice, span, offset: (Math.random() - 0.5) * 2 });
    }

    // Create noise bands
    const noiseBands: HTMLDivElement[] = [];
    for (let i = 0; i < 3; i++) {
      const band = document.createElement('div');
      band.className = 'glitch-noise';
      band.style.top = `${Math.random() * 100}%`;
      container.appendChild(band);
      noiseBands.push(band);
    }

    // Hide original text
    textEl.style.opacity = '0';

    // Apply SVG chromatic aberration filter to slices
    slices.forEach((s) => {
      s.el.style.filter = 'url(#glitch-aberration)';
    });

    // Animate: ramp up, swap, ramp down
    const totalDuration = 800;
    const startTime = performance.now();
    this.swapped = false;

    const animate = (now: number): void => {
      if (this.destroyed) {
        slices.forEach((s) => s.el.remove());
        noiseBands.forEach((b) => b.remove());
        return;
      }
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / totalDuration, 1);

      let intensity: number;
      if (progress < 0.45) {
        const t = progress / 0.45;
        intensity = t * t;
      } else if (progress < 0.55) {
        intensity = 1;
      } else {
        const t = (progress - 0.55) / 0.45;
        intensity = (1 - t) * (1 - t);
      }

      // Swap text at midpoint
      if (progress >= 0.5 && !this.swapped) {
        this.swapped = true;
        slices.forEach((s) => {
          s.span.textContent = nextText;
          s.offset = (Math.random() - 0.5) * 2;
        });
      }

      // Animate each slice with independent horizontal offset
      const maxOffset = 30;
      slices.forEach((s) => {
        const dx = s.offset * maxOffset * intensity;
        s.el.style.transform = `translateX(${dx}px)`;
        s.el.style.opacity =
          intensity > 0.9 ? `${1 - (intensity - 0.9) * 5 + Math.random() * 0.3}` : '1';
      });

      // Animate SVG chromatic aberration
      const aberrationPx = intensity * 6;
      if (this.redShift) this.redShift.setAttribute('dx', String(aberrationPx));
      if (this.blueShift) this.blueShift.setAttribute('dx', String(-aberrationPx));

      // Noise bands
      const noiseAlpha = progress < 0.5 ? intensity * intensity : intensity * intensity * intensity;
      noiseBands.forEach((band, i) => {
        band.style.opacity = `${noiseAlpha * 0.9}`;
        band.style.top = `${(parseFloat(band.style.top) + (i % 2 === 0 ? 2 : -3)) % 100}%`;
      });

      if (progress < 1) {
        this.rafId = requestAnimationFrame(animate);
      } else {
        // Cleanup
        slices.forEach((s) => s.el.remove());
        noiseBands.forEach((b) => b.remove());
        textEl.textContent = nextText;
        textEl.style.opacity = '1';
        textEl.style.filter = '';
        if (this.redShift) this.redShift.setAttribute('dx', '0');
        if (this.blueShift) this.blueShift.setAttribute('dx', '0');
        this.index = nextIndex;
        this.swapped = false;
      }
    };

    this.rafId = requestAnimationFrame(animate);
  }

  destroy(): void {
    this.destroyed = true;
    clearInterval(this.interval);
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
  }
}

class TypewriterCTA {
  private textEl: HTMLElement;
  private interval: ReturnType<typeof setInterval> | null = null;
  private timeout: ReturnType<typeof setTimeout> | null = null;

  constructor(textEl: HTMLElement) {
    this.textEl = textEl;
  }

  type(text: string, speed = 55, onComplete?: () => void): void {
    this.clear();
    let i = 0;
    this.interval = setInterval(() => {
      this.textEl.textContent = text.substring(0, ++i);
      if (i >= text.length) {
        if (this.interval) clearInterval(this.interval);
        this.interval = null;
        if (onComplete) onComplete();
      }
    }, speed);
  }

  clear(): void {
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
    if (this.timeout) { clearTimeout(this.timeout); this.timeout = null; }
    this.textEl.textContent = '';
  }

  destroy(): void {
    if (this.interval) clearInterval(this.interval);
    if (this.timeout) clearTimeout(this.timeout);
  }
}

class NeuralBurst {
  private wrapper: HTMLElement;
  private canB: HTMLCanvasElement;
  private running = false;
  private raf: number | null = null;
  private resizeHandler: () => void;
  private enterHandler: () => void;
  private leaveHandler: () => void;
  private revealRadius = 0;
  private revealTarget = 0;
  private authInProgress = false;

  constructor(wrapper: HTMLElement, cta: HTMLElement) {
    this.wrapper = wrapper;

    const { PI, cos, sin, abs, random: rng } = Math;
    const TAU = 2 * PI;
    const rand = (n: number) => n * rng();
    const randRange = (n: number) => n - rand(2 * n);
    const fadeInOut = (t: number, m: number) => { const hm = 0.5 * m; return abs((t + hm) % m - hm) / hm; };
    const lerp = (a: number, b: number, s: number) => (1 - s) * a + s * b;

    const COUNT = 400;
    const PROPS = 9;
    const LEN = COUNT * PROPS;
    const baseTTL = 50, rangeTTL = 150;
    const baseSpeed = 0.1, rangeSpeed = 1.5;
    const baseRad = 1, rangeRad = 3;
    const baseHue = 195, rangeHue = 25;
    const noiseSteps = 8;
    const xOff = 0.00125, yOff = 0.00125, zOff = 0.0005;

    const canA = document.createElement('canvas');
    this.canB = document.createElement('canvas');
    this.canB.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:50;';
    wrapper.appendChild(this.canB);

    const ctxA = canA.getContext('2d')!;
    const ctxB = this.canB.getContext('2d')!;
    const simplex = new SimplexNoise();
    const pp = new Float32Array(LEN);
    let W: number, H: number, tick = 0;

    const maxReveal = () => Math.hypot(W, H) * 0.6;

    const resize = () => {
      W = window.innerWidth; H = window.innerHeight;
      canA.width = W; canA.height = H;
      this.canB.width = W; this.canB.height = H;
    };
    resize();
    this.resizeHandler = resize;
    window.addEventListener('resize', resize);

    // Cached per-frame values (updated once in draw())
    let frameCx = 0, frameCy = 0, frameMaxFade = 1;

    const cacheFrameValues = () => {
      const r = cta.getBoundingClientRect();
      frameCx = r.left + r.width / 2;
      frameCy = r.top + r.height / 2;
      frameMaxFade = 0.5 * Math.sqrt(W * W + H * H);
    };

    const spawnRangeX = () => W * 0.5;
    const spawnRangeY = () => H * 0.4;

    const initParticle = (i: number) => {
      pp.set([
        frameCx + randRange(spawnRangeX()),
        frameCy + randRange(spawnRangeY()),
        0, 0, 0,
        baseTTL + rand(rangeTTL),
        baseSpeed + rand(rangeSpeed),
        baseRad + rand(rangeRad),
        baseHue + rand(rangeHue),
      ], i);
    };

    for (let i = 0; i < LEN; i += PROPS) initParticle(i);

    const updateParticle = (i: number) => {
      let x = pp[i], y = pp[i + 1];
      const n = simplex.noise3D(x * xOff, y * yOff, tick * zOff) * noiseSteps * TAU;
      const vx = lerp(pp[i + 2], cos(n), 0.5);
      const vy = lerp(pp[i + 3], sin(n), 0.5);
      const life = pp[i + 4], ttl = pp[i + 5], speed = pp[i + 6];
      const x2 = x + vx * speed, y2 = y + vy * speed;
      const radius = pp[i + 7], hue = pp[i + 8];

      const distX = x2 - frameCx, distY = y2 - frameCy;
      const dist = Math.sqrt(distX * distX + distY * distY);
      const distAlpha = Math.max(0, 1 - (dist / frameMaxFade) * (dist / frameMaxFade));
      const alpha = fadeInOut(life, ttl) * 0.5 * distAlpha;

      ctxA.save();
      ctxA.lineCap = 'round';
      ctxA.lineWidth = radius;
      ctxA.strokeStyle = `hsla(${hue},60%,45%,${alpha})`;
      ctxA.beginPath();
      ctxA.moveTo(x, y);
      ctxA.lineTo(x2, y2);
      ctxA.stroke();
      ctxA.restore();

      pp[i] = x2; pp[i + 1] = y2; pp[i + 2] = vx; pp[i + 3] = vy; pp[i + 4] = life + 1;
      if (x2 > W || x2 < 0 || y2 > H || y2 < 0 || life + 1 > ttl) initParticle(i);
    };

    const draw = () => {
      tick++;
      const dt = 1 / 60;
      const mr = maxReveal();
      if (this.revealTarget > this.revealRadius) {
        const remaining = (this.revealTarget - this.revealRadius) / (mr || 1);
        this.revealRadius = Math.min(this.revealTarget, this.revealRadius + dt * mr * (0.3 + remaining * 2.5));
      } else if (this.revealTarget < this.revealRadius) {
        this.revealRadius = Math.max(this.revealTarget, this.revealRadius - dt * mr * 4.0);
      }

      // Short-circuit: skip all particle work when fully contracted
      if (this.revealRadius < 0.5 && this.revealTarget === 0) {
        ctxB.clearRect(0, 0, W, H);
        if (this.running && this.revealTarget > 0) {
          this.raf = requestAnimationFrame(draw);
        } else {
          this.running = false;
        }
        return;
      }

      // Cache per-frame values (1 getBoundingClientRect instead of 400+)
      cacheFrameValues();

      ctxA.clearRect(0, 0, W, H);
      ctxB.clearRect(0, 0, W, H);
      for (let i = 0; i < LEN; i += PROPS) updateParticle(i);

      const clipX = frameCx, clipY = frameCy;
      ctxB.save();
      ctxB.beginPath();
      ctxB.arc(clipX, clipY, this.revealRadius, 0, Math.PI * 2);
      ctxB.clip();

      ctxB.save();
      ctxB.filter = 'blur(8px) brightness(150%)';
      ctxB.globalCompositeOperation = 'lighter';
      ctxB.drawImage(canA, 0, 0);
      ctxB.restore();

      ctxB.save();
      ctxB.filter = 'blur(4px) brightness(150%)';
      ctxB.globalCompositeOperation = 'lighter';
      ctxB.drawImage(canA, 0, 0);
      ctxB.restore();

      ctxB.save();
      ctxB.globalCompositeOperation = 'lighter';
      ctxB.drawImage(canA, 0, 0);
      ctxB.restore();

      ctxB.restore();

      if (this.running && (this.revealRadius > 0.5 || this.revealTarget > 0)) {
        this.raf = requestAnimationFrame(draw);
      } else {
        this.running = false;
      }
    };

    const startLoop = () => {
      if (!this.running) { this.running = true; this.raf = requestAnimationFrame(draw); }
    };

    this.enterHandler = () => { this.revealTarget = maxReveal(); startLoop(); };
    this.leaveHandler = () => { if (!this.authInProgress) this.revealTarget = 0; };
    wrapper.addEventListener('mouseenter', this.enterHandler);
    wrapper.addEventListener('mouseleave', this.leaveHandler);

  }

  destroy(): void {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resizeHandler);
    this.wrapper.removeEventListener('mouseenter', this.enterHandler);
    this.wrapper.removeEventListener('mouseleave', this.leaveHandler);
    this.canB.remove();
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Remove braces from GUID strings. */
const clean = (id: string): string => id.replace(/[{}]/g, '');

/** Default traffic relay host template — no proxy or settings fetch needed. */
const TRAFFIC_RELAY_HOST = '{systemId}.relay.vmsproxy.com';

/** Retry budget for fetchWithRedirectAuthorization at the demo level.
 *  1 = just enough for the redirect-strips-auth retry (ticket has its own 401 refresh).
 *  2 = redirect retry + one transient 401 for bulk fetches. */
const TICKET_FETCH_RETRIES = 1;
const RELAY_FETCH_RETRIES = 2;

/** Safely populate a <select> element from an array of option descriptors. */
const populateSelect = (
  selectEl: HTMLSelectElement,
  options: { value: string; text: string; disabled?: boolean; group?: string }[],
): void => {
  while (selectEl.firstChild) selectEl.removeChild(selectEl.firstChild);

  // Partition into ungrouped (enabled) and grouped (by group label)
  const ungrouped: typeof options = [];
  const groups = new Map<string, typeof options>();
  for (const opt of options) {
    if (opt.group) {
      if (!groups.has(opt.group)) groups.set(opt.group, []);
      groups.get(opt.group)!.push(opt);
    } else {
      ungrouped.push(opt);
    }
  }

  const makeOption = (opt: typeof options[0]): HTMLOptionElement => {
    const el = document.createElement('option');
    el.value = opt.value;
    el.textContent = opt.text;
    if (opt.disabled) el.disabled = true;
    return el;
  };

  for (const opt of ungrouped) selectEl.appendChild(makeOption(opt));

  for (const [label, opts] of groups) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = label;
    for (const opt of opts) optgroup.appendChild(makeOption(opt));
    selectEl.appendChild(optgroup);
  }
};

// ── Interfaces ──────────────────────────────────────────────────────────────

interface TokenInfo {
  access_token: string;
  refresh_token: string;
  expires_in: string;
  expires_at: string;
  token_type: string;
  scope: string;
}

interface BasicSystemInfo {
  id: string;
  name: string;
  stateOfHealth: string;
  version: string;
  customization: string;
}

interface ParsedDewarpingParams {
  enabled: boolean;
  viewMode: 'wall' | 'ceiling' | 'table';
  fovRot: number;
  xCenter: number;
  yCenter: number;
  radius: number;
  hStretch: number;
  cameraProjection: string;
  sphereAlpha: number;
  sphereBeta: number;
}

interface BasicCameraInfo {
  id: string;
  name: string;
  status: string;
  deviceType: string;
  serverId: string;
  dewarpingParams: ParsedDewarpingParams | null;
  mediaStreams: Stream[];
  hasAnalytics: boolean;
}

interface BasicServerInfo {
  id: string;
  name: string;
}

// ── Session persistence keys ────────────────────────────────────────────────

const SESSION_KEYS = {
  cloudToken: 'v2_cloudToken',
  cloudInstance: 'v2_cloudInstance',
  selectedSystemId: 'v2_selectedSystemId',
  selectedCameraId: 'v2_selectedCameraId',
} as const;

const saveSession = (key: keyof typeof SESSION_KEYS, value: string): void => {
  sessionStorage.setItem(SESSION_KEYS[key], value);
};

const loadSession = (key: keyof typeof SESSION_KEYS): string | null =>
  sessionStorage.getItem(SESSION_KEYS[key]);

// ── Global state ────────────────────────────────────────────────────────────

let cloudInstance: string = 'https://meta.nxvms.com';
let cloudToken: TokenInfo | null = null;
let systemToken: TokenInfo;
let systemsInfo: BasicSystemInfo[] = [];
let cameras: BasicCameraInfo[] = [];
let systemRelay: string;
let systemId: string;

// Track whether system selection has completed (relay + token are available)
let systemReady = false;

// Native v2 API cleanup
let currentNativeConnection: CameraConnection | null = null;
let nativeUnsubscribers: (() => void)[] = [];
let streamManagerConfigured = false;

// Shared state
let resolutionUpdateHandler: (() => void) | null = null;
let codecPollTimer: ReturnType<typeof setInterval> | null = null;

// Dewarping state
let dewarpRenderer: DewarpingRenderer | null = null;
let dewarpActive = false;
let dewarpRafId: number | null = null;
let dewarpControlHandle: ControlHandle | null = null;
let dewarpMinimapHandle: MinimapHandle | null = null;
let currentMediaData: MediaData = createDefaultMediaData();
let currentViewData: ViewData = createDefaultViewData();
let currentCameraDewarpable = false;
let dewarpAutoEnabled = false; // true when dewarp was auto-enabled by zoom tracking
let dewarpTransform: DewarpingTransform | null = null;

/** Map a source-frame bbox through the dewarp transform, returning a view-space bbox or null. */
const mapBBoxToView = (
  transform: DewarpingTransform,
  bb: { x: number; y: number; width: number; height: number },
): { x: number; y: number; width: number; height: number } | null => {
  // Map center of source bbox to dewarped view
  const cx = bb.x + bb.width / 2;
  const cy = bb.y + bb.height / 2;
  const center = transform.mapToView(cx, cy);
  if (!center) return null; // center behind camera — object truly not visible

  // Hide if center is not within the visible dewarped viewport.
  // Without this check, objects far off-axis still pass the z>0 test in
  // mapToView and get projected to extreme coordinates. Their edge midpoints
  // create enormous half-widths that intersect [0,1], causing phantom boxes
  // that slide around the viewport edge during panning.
  if (center.x < 0 || center.x > 1 || center.y < 0 || center.y > 1) return null;

  // Map edge midpoints to compute stable width/height in view space.
  // Using center-based sizing prevents the box from shrinking when corners
  // go behind the camera at the edge of the rectilinear projection.
  const right = transform.mapToView(bb.x + bb.width, cy);
  const bottom = transform.mapToView(cx, bb.y + bb.height);
  const left = transform.mapToView(bb.x, cy);
  const top = transform.mapToView(cx, bb.y);

  // Compute half-widths from center to each edge midpoint.
  // At high FOV, rectilinear distortion (x = f·tan θ) causes edge midpoints
  // near the projection boundary to project to extreme positions. Cap each
  // individual edge distance to prevent one heavily-stretched side from
  // inflating the whole box.
  const MAX_STRETCH = 4; // max view-space halfW/H relative to source
  const maxHalfW = bb.width * MAX_STRETCH;
  const maxHalfH = bb.height * MAX_STRETCH;

  const clampedDist = (val: number, max: number): number =>
    Math.min(Math.abs(val), max);

  const rDist = right ? clampedDist(right.x - center.x, maxHalfW) : null;
  const lDist = left ? clampedDist(center.x - left.x, maxHalfW) : null;
  const bDist = bottom ? clampedDist(bottom.y - center.y, maxHalfH) : null;
  const tDist = top ? clampedDist(center.y - top.y, maxHalfH) : null;

  // Use asymmetric extents so stretching on one side doesn't inflate the other
  const extLeft = lDist ?? rDist ?? bb.width * 0.5;
  const extRight = rDist ?? lDist ?? bb.width * 0.5;
  const extTop = tDist ?? bDist ?? bb.height * 0.5;
  const extBottom = bDist ?? tDist ?? bb.height * 0.5;

  let viewX = center.x - extLeft;
  let viewY = center.y - extTop;
  let viewR = center.x + extRight;
  let viewB = center.y + extBottom;

  // Clamp to viewport — show only the visible portion
  viewX = Math.max(0, viewX);
  viewY = Math.max(0, viewY);
  viewR = Math.min(1, viewR);
  viewB = Math.min(1, viewB);

  const viewW = viewR - viewX;
  const viewH = viewB - viewY;

  if (viewW <= 0 || viewH <= 0) return null;

  return { x: viewX, y: viewY, width: viewW, height: viewH };
};

// Analytics state
let analyticsActive = false;
let analyticsRevealed = false;
type OverlayMode = 'none' | 'outline';
let overlayMode: OverlayMode = 'outline';
let trackingOverlay: ObjectTrackingOverlay | null = null;
let trackingContainer: HTMLDivElement | null = null;
let trackingRenderer: AnalyticsRenderer | null = null;
let panelManuallyCollapsed = false;
let analyticsUnsubscriber: (() => void) | null = null;
let lastMetadataPacket: ObjectMetadataPacket | null = null;
let analyticsRafId: number | null = null;

// Object tracking zoom state
type Rect = { x: number; y: number; w: number; h: number };

interface ZoomState {
  status: 'idle' | 'zooming-in' | 'zoomed';
  targetTrackId: string | null;
  currentRect: Rect;
  lastGoalBBoxW?: number;
  lastGoalBBoxH?: number;
}

let zoomState: ZoomState = {
  status: 'idle',
  targetTrackId: null,
  currentRect: { x: 0, y: 0, w: 1, h: 1 },
};
let lastZoomContainerSize = { w: 0, h: 0 };

const ZOOM_PAD_FACTOR = 1.5;
const ZOOM_MIN_SIZE = 0.3;
const ZOOM_TRANSITION_MS = 350;

// ── Velocity-based smooth tracking ──────────────────────────────────────────
// Exponential smoothing factor for velocity estimation (0 = ignore new, 1 = no smoothing)
const VELOCITY_SMOOTHING = 0.3;
// How far ahead (ms) to predict object position for lookahead
const LOOKAHEAD_MS = 80;
// Base lerp rate per 16.67ms frame — controls how fast the camera follows
const FOLLOW_LERP = 0.08;
// When object speed exceeds this (normalized units/ms), increase follow rate
const FAST_SPEED_THRESHOLD = 0.0003;
// Maximum lerp rate to cap adaptive acceleration
const MAX_LERP = 0.25;

// ── Bounding box smoothing & dead zones ─────────────────────────────────────
// Minimum center drift (fraction of current zoom rect) before recomputing goal
const CENTER_DRIFT_THRESHOLD = 0.05;
// Minimum size change (fraction of last goal bbox) before recomputing goal
const ZOOM_SIZE_CHANGE_THRESHOLD = 0.08;
// Fraction of distance remaining after one full data interval (lower = snappier)
const BBOX_LERP_RESIDUAL = 0.05;

interface VelocityState {
  prevCx: number;
  prevCy: number;
  prevTime: number;
  vx: number;
  vy: number;
}

let velocityState: VelocityState | null = null;

// Activity polling state
let activityPollingActive = false;
let activityPollTimer: ReturnType<typeof setTimeout> | null = null;

// Capture RTCPeerConnection instances for codec/transport stats
const activePeerConnections: Set<RTCPeerConnection> = new Set();
const OriginalRTCPeerConnection = window.RTCPeerConnection;
window.RTCPeerConnection = function (...args: ConstructorParameters<typeof RTCPeerConnection>) {
  const pc = new OriginalRTCPeerConnection(...args);
  activePeerConnections.add(pc);
  pc.addEventListener('connectionstatechange', () => {
    if (pc.connectionState === 'closed' || pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
      activePeerConnections.delete(pc);
    }
  });
  return pc;
} as unknown as typeof RTCPeerConnection;
Object.assign(window.RTCPeerConnection, OriginalRTCPeerConnection);
window.RTCPeerConnection.prototype = OriginalRTCPeerConnection.prototype;

// Capture MSE codec info from addSourceBuffer calls
let lastMseCodec = '';
const OrigAddSourceBuffer = MediaSource.prototype.addSourceBuffer;
MediaSource.prototype.addSourceBuffer = function (mimeType: string) {
  if (mimeType.includes('video')) {
    if (mimeType.includes('avc') || mimeType.toLowerCase().includes('h264'))
      lastMseCodec = 'H264';
    else if (mimeType.includes('hev') || mimeType.includes('hvc') || mimeType.toLowerCase().includes('h265'))
      lastMseCodec = 'H265';
    else
      lastMseCodec = mimeType.split('codecs="')[1]?.replace('"', '') || 'unknown';
  }
  return OrigAddSourceBuffer.call(this, mimeType);
};

// ── DOM references ──────────────────────────────────────────────────────────


const systemSelect = document.querySelector<HTMLSelectElement>('#selectedSystem')!;
const cameraSelect = document.querySelector<HTMLSelectElement>('#selectedCamera')!;
const positionInput = document.querySelector<HTMLInputElement>('#selectedPosition')!;
const speedSelect = document.querySelector<HTMLSelectElement>('#selectedSpeed')!;
const streamQualitySelect = document.querySelector<HTMLSelectElement>('#streamQuality')!;
const videoElement = document.querySelector<HTMLVideoElement>('#targetVideo')!;
const currentStreamSpan = document.querySelector<HTMLSpanElement>('#currentStream')!;
const currentResolutionSpan = document.querySelector<HTMLSpanElement>('#currentResolution')!;
const connectionStateSpan = document.querySelector<HTMLSpanElement>('#connectionState')!;
const currentCodecSpan = document.querySelector<HTMLSpanElement>('#currentCodec')!;
const currentTransportSpan = document.querySelector<HTMLSpanElement>('#currentTransport')!;
const sessionInfoEl = document.querySelector<HTMLParagraphElement>('#sessionInfo')!;
const sidebar = document.querySelector<HTMLElement>('#sidebar')!;
const sidebarToggle = document.querySelector<HTMLButtonElement>('#sidebarToggle')!;
const authOverlay = document.querySelector<HTMLDivElement>('#authOverlay')!;
const appLayout = document.querySelector<HTMLDivElement>('.app-layout')!;
const sidebarFooter = document.querySelector<HTMLDivElement>('#sidebarFooter')!;
const logoutBtn = document.querySelector<HTMLButtonElement>('#logoutBtn')!;
const cameraFilterBar = document.querySelector<HTMLDivElement>('#cameraFilterBar')!;
const customizationGroup = document.querySelector<HTMLDivElement>('#customizationGroup')!;
const customizationSelect = document.querySelector<HTMLSelectElement>('#selectedCustomization')!;

// Dewarping DOM
let dewarpCanvas = document.querySelector<HTMLCanvasElement>('#dewarpCanvas')!;
const dewarpToggleItem = document.querySelector<HTMLDivElement>('#dewarpToggleItem')!;
const dewarpToggleBtn = document.querySelector<HTMLButtonElement>('#dewarpToggle')!;
const dewarpStateSpan = document.querySelector<HTMLSpanElement>('#dewarpState')!;
const dewarpControlsPanel = document.querySelector<HTMLDivElement>('#dewarpControls')!;
const dewarpPanSlider = document.querySelector<HTMLInputElement>('#dewarpPan')!;
const dewarpTiltSlider = document.querySelector<HTMLInputElement>('#dewarpTilt')!;
const dewarpZoomSlider = document.querySelector<HTMLInputElement>('#dewarpZoom')!;
const dewarpRotationSlider = document.querySelector<HTMLInputElement>('#dewarpRotation')!;
const dewarpPanValue = document.querySelector<HTMLSpanElement>('#dewarpPanValue')!;
const dewarpTiltValue = document.querySelector<HTMLSpanElement>('#dewarpTiltValue')!;
const dewarpZoomValue = document.querySelector<HTMLSpanElement>('#dewarpZoomValue')!;
const dewarpRotationValue = document.querySelector<HTMLSpanElement>('#dewarpRotationValue')!;
const dewarpResetBtn = document.querySelector<HTMLButtonElement>('#dewarpReset')!;
const minimapContainer = document.querySelector<HTMLDivElement>('#minimapContainer')!;
const minimapCanvas = document.querySelector<HTMLCanvasElement>('#dewarpMinimap')!;

// Analytics DOM
const analyticsToggleBtn = document.querySelector<HTMLButtonElement>('#analyticsToggle')!;
const analyticsStateSpan = document.querySelector<HTMLSpanElement>('#analyticsState')!;
const analyticsPanel = document.querySelector<HTMLElement>('#analyticsPanel')!;
const analyticsLog = document.querySelector<HTMLDivElement>('#analyticsLog')!;
const overlayModesContainer = document.getElementById('overlayModes')!;
const analyticsClearBtn = document.querySelector<HTMLButtonElement>('#analyticsClear')!;
const analyticsPanelToggle = document.querySelector<HTMLButtonElement>('#analyticsPanelToggle')!;
const analyticsPanelHeader = document.querySelector<HTMLDivElement>('.analytics-panel-header')!;
const analyticsOverlayCanvas = document.querySelector<HTMLCanvasElement>('#analyticsOverlay')!;
const analyticsHtmlOverlay = document.querySelector<HTMLDivElement>('#analyticsHtmlOverlay')!;
const analyticsOverlayInner = document.querySelector<HTMLDivElement>('#analyticsOverlayInner')!;

// Zoom DOM
const zoomContainer = document.querySelector<HTMLDivElement>('#zoomContainer')!;
const zoomTransformTarget = document.querySelector<HTMLDivElement>('#zoomTransformTarget')!;

const analyticsActivityList = document.querySelector<HTMLDivElement>('#analyticsActivityList')!;
const activityPollGroup = document.querySelector<HTMLDivElement>('#activityPollGroup')!;

// Landing page DOM
const ctaButton = document.querySelector<HTMLAnchorElement>('#ctaButton')!;
const ctaText = document.querySelector<HTMLSpanElement>('#ctaText')!;
const switchUserLink = document.querySelector<HTMLAnchorElement>('#switchUserLink')!;
const particleCanvas = document.querySelector<HTMLCanvasElement>('#particleField')!;
const glitchContainer = document.querySelector<HTMLDivElement>('#glitchContainer')!;
const glitchTarget = document.querySelector<HTMLParagraphElement>('#glitchTarget')!;
const neuralCtaWrapper = document.querySelector<HTMLDivElement>('#neuralCtaWrapper')!;

// Landing page effects
let particleFieldEffect: ParticleField | null = null;
let glitchTextEffect: GlitchText | null = null;
let neuralBurstEffect: NeuralBurst | null = null;
let typewriterCta: TypewriterCTA | null = null;

// ── Dynamic analytics-log sizing ─────────────────────────────────────────────
// Track the count of visible analytics events over a rolling 60 s window so the
// log section ratchets to the recent max instead of jumping on every add/remove.
const LOG_SIZE_WINDOW_MS = 60_000;
const LOG_SIZE_PADDING = 3; // extra rows above the rolling max
const LOG_MAX_PANEL_FRACTION = 2 / 3;
const logCountHistory: { t: number; n: number }[] = [];

/** Measure the average height of a single log entry (cached after first call). */
let cachedRowHeight: number | null = null;
const getLogRowHeight = (): number => {
  if (cachedRowHeight !== null) return cachedRowHeight;
  const first = analyticsLog.querySelector<HTMLElement>('.analytics-log-entry');
  if (!first) return 24; // sensible fallback
  const style = getComputedStyle(first);
  cachedRowHeight =
    first.getBoundingClientRect().height +
    parseFloat(style.marginTop || '0') +
    parseFloat(style.marginBottom || '0');
  return cachedRowHeight;
};

const updateLogMaxHeight = (): void => {
  const now = Date.now();
  const count = analyticsLog.children.length;

  logCountHistory.push({ t: now, n: count });
  // Prune entries older than the window
  while (logCountHistory.length > 0 && now - logCountHistory[0].t > LOG_SIZE_WINDOW_MS) {
    logCountHistory.shift();
  }

  const rollingMax = logCountHistory.reduce((mx, e) => Math.max(mx, e.n), 0);
  const targetRows = rollingMax + LOG_SIZE_PADDING;
  const rowPx = getLogRowHeight();
  // padding on .analytics-log is 0.5rem top + 0.5rem bottom ≈ 16px
  const logPadding = 16;
  const contentHeight = targetRows * rowPx + logPadding;
  const panelHeight = analyticsPanel.getBoundingClientRect().height;
  const maxByFraction = panelHeight * LOG_MAX_PANEL_FRACTION;

  analyticsLog.style.height = `${Math.min(contentHeight, maxByFraction)}px`;
};
const activityPollSelect = document.querySelector<HTMLSelectElement>('#activityPollInterval')!;

// ── Device Filter ────────────────────────────────────────────────────────────

/**
 * Generic device filter — accepts any predicate over the device info type.
 * Designed to be reusable across demos; just supply different filters/data.
 */
interface DeviceFilter<T> {
  label: string;
  predicate: (device: T) => boolean;
}

const makePill = (label: string, count: number, pressed: boolean): HTMLButtonElement => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'filter-pill';
  btn.setAttribute('aria-pressed', String(pressed));

  btn.textContent = label;
  const countSpan = document.createElement('span');
  countSpan.className = 'filter-count';
  countSpan.textContent = String(count);
  btn.appendChild(countSpan);

  if (count === 0 && !pressed) btn.disabled = true;
  return btn;
};

const createDeviceFilterBar = <T>(
  container: HTMLElement,
  filters: DeviceFilter<T>[],
  onFilterChange: (activeFilter: DeviceFilter<T> | null) => void,
): {
  /** Call after device list changes to update counts and reset selection. */
  update: (devices: T[]) => void;
  /** Reset filter to "All" (fires onFilterChange). */
  reset: () => void;
} => {
  let activeIndex = 0; // 0 = "All"
  let buttons: HTMLButtonElement[] = [];
  let currentDevices: T[] = [];

  const render = (): void => {
    while (container.firstChild) container.removeChild(container.firstChild);
    buttons = [];

    const allBtn = makePill('All', currentDevices.length, activeIndex === 0);
    allBtn.addEventListener('click', () => select(0));
    container.appendChild(allBtn);
    buttons.push(allBtn);

    filters.forEach((f, i) => {
      const count = currentDevices.filter(f.predicate).length;
      const btn = makePill(f.label, count, activeIndex === i + 1);
      btn.addEventListener('click', () => select(i + 1));
      container.appendChild(btn);
      buttons.push(btn);
    });
  };

  const select = (index: number): void => {
    activeIndex = index;
    buttons.forEach((btn, i) => btn.setAttribute('aria-pressed', i === index ? 'true' : 'false'));
    onFilterChange(index === 0 ? null : filters[index - 1]);
  };

  const update = (devices: T[]): void => {
    currentDevices = devices;
    activeIndex = 0;
    render();
  };

  const reset = (): void => {
    if (activeIndex !== 0) select(0);
  };

  return { update, reset };
};

// ── Form visibility ─────────────────────────────────────────────────────────

const show = (formName: 'endpoint-data' | 'cloud-data' = 'cloud-data'): void => {
  if (formName === 'cloud-data') {
    authOverlay.hidden = false;
    appLayout.classList.remove('active');
    // Initialize landing page effects
    if (!particleFieldEffect) particleFieldEffect = new ParticleField(particleCanvas);
    if (!glitchTextEffect) glitchTextEffect = new GlitchText(glitchContainer, glitchTarget, GLITCH_ONE_LINERS);
    if (!neuralBurstEffect) neuralBurstEffect = new NeuralBurst(neuralCtaWrapper, ctaButton);
    if (!typewriterCta) typewriterCta = new TypewriterCTA(ctaText);
  } else {
    // Destroy landing effects before hiding
    particleFieldEffect?.destroy(); particleFieldEffect = null;
    glitchTextEffect?.destroy(); glitchTextEffect = null;
    neuralBurstEffect?.destroy(); neuralBurstEffect = null;
    typewriterCta?.destroy(); typewriterCta = null;
    authOverlay.hidden = true;
    appLayout.classList.add('active');
    document.querySelector<HTMLFormElement>('[name="endpoint-data"]')!.style.display = 'block';
  }
};

// ── Token helpers ───────────────────────────────────────────────────────────

const tokenEndpoint = (): string => `${cloudInstance}/oauth/token/`;
/** CDB endpoint — returns all systems across customizations (no customization filter). */
const systemsEndpoint = (): string => `${cloudInstance}/cdb/system/get`;

const getToken = (payload: unknown): Promise<Response> =>
  fetch(tokenEndpoint(), {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });

const getSystemToken = (sysId: string): Promise<TokenInfo> => {
  const payload = {
    client_id: 'cloud',
    grant_type: 'refresh_token',
    response_type: 'token',
    refresh_token: cloudToken!.refresh_token,
    scope: `cloudSystemId=${sysId}`,
  };
  return getToken(payload).then((res) => res.json());
};

/** Fetch a one-time ticket from the relay, refreshing the system token on 401. */
let tokenRefreshInFlight: Promise<TokenInfo> | null = null;

const fetchOneTimeTicket = async (retried = false): Promise<string> => {
  const serverId = cameras.find((c) => c.id === cameraSelect.value)?.serverId;
  const serverParam = serverId ? `?x-server-guid=${clean(serverId)}` : '';
  const ticketUrl = `https://${systemRelay}/rest/v3/login/tickets${serverParam}`;
  const res = await fetchWithRedirectAuthorization(ticketUrl, {
    method: 'POST',
    headers: { authorization: `Bearer ${systemToken.access_token}` },
  }, TICKET_FETCH_RETRIES);

  // 401 = system token expired.  Refresh once, then retry.
  if (res.status === 401 && !retried) {
    // Deduplicate concurrent refreshes (multiple connections may hit this).
    if (!tokenRefreshInFlight) {
      tokenRefreshInFlight = getSystemToken(systemSelect.value);
    }
    try {
      systemToken = await tokenRefreshInFlight;
    } finally {
      tokenRefreshInFlight = null;
    }
    return fetchOneTimeTicket(true);
  }

  if (!res.ok) {
    throw new Error(`Ticket request failed: ${res.status}`);
  }

  // Cache the resolved data plane host per-server so WebSocket URLs go
  // directly there.  The `---` multiplexing prefix DNS only exists on the
  // data plane, not the relay router.  Different servers in the same system
  // may route to different data planes, so the serverId is passed to avoid
  // one server's data plane overwriting another's cached value.
  try {
    const resHost = new URL(res.url).host;
    if (resHost !== systemRelay && streamManagerConfigured) {
      StreamManager.getInstance().setResolvedRelayHost(
        systemId,
        resHost,
        serverId ? clean(serverId) : undefined,
      );
    }
  } catch { /* ignore */ }

  const data = await res.json();
  return data.token;
};

// ── UI helpers ──────────────────────────────────────────────────────────────

const updateCurrentStreamDisplay = (stream: AvailableStreams | null): void => {
  if (stream === null) {
    currentStreamSpan.textContent = 'Not Started';
    currentStreamSpan.style.color = '';
  } else if (stream === AvailableStreams.PRIMARY) {
    currentStreamSpan.textContent = 'Primary (High)';
    currentStreamSpan.style.color = 'var(--nx-green)';
  } else if (stream === AvailableStreams.SECONDARY) {
    currentStreamSpan.textContent = 'Secondary (Low)';
    currentStreamSpan.style.color = 'var(--nx-sapphire)';
  }
};

const updateConnectionState = (state: string): void => {
  connectionStateSpan.textContent = state;
  connectionStateSpan.className = 'status-value';
  switch (state) {
    case PeerState.connecting:
      connectionStateSpan.classList.add('state-connecting');
      break;
    case PeerState.connected:
      connectionStateSpan.classList.add('state-connected');
      break;
    case PeerState.failed:
      connectionStateSpan.classList.add('state-failed');
      break;
    default:
      connectionStateSpan.classList.add('state-idle');
      break;
  }
};

const getTargetStreamFromQuality = (quality: string): TargetStream => {
  switch (quality) {
    case 'high':
      return TargetStream.HIGH;
    case 'low':
      return TargetStream.LOW;
    case 'auto':
    default:
      return TargetStream.AUTO;
  }
};

const attachResolutionTracker = (): void => {
  if (resolutionUpdateHandler) {
    videoElement.removeEventListener('loadedmetadata', resolutionUpdateHandler);
    videoElement.removeEventListener('resize', resolutionUpdateHandler);
  }

  resolutionUpdateHandler = () => {
    if (videoElement.videoWidth && videoElement.videoHeight) {
      currentResolutionSpan.textContent = `${videoElement.videoWidth}x${videoElement.videoHeight}`;
      const isHighRes = videoElement.videoHeight >= 720;
      updateCurrentStreamDisplay(
        isHighRes ? AvailableStreams.PRIMARY : AvailableStreams.SECONDARY,
      );
    }
  };

  resolutionUpdateHandler();
  videoElement.addEventListener('loadedmetadata', resolutionUpdateHandler);
  videoElement.addEventListener('resize', resolutionUpdateHandler);

  startCodecPolling();
};

const startCodecPolling = (): void => {
  stopCodecPolling();

  codecPollTimer = setInterval(async () => {
    const stream = videoElement.srcObject as MediaStream | null;
    const activeTrack = stream?.getVideoTracks()[0] ?? null;
    if (!activeTrack) return;

    let matchedPc: RTCPeerConnection | null = null;
    for (const pc of activePeerConnections) {
      if (pc.connectionState !== 'connected') continue;
      try {
        for (const receiver of pc.getReceivers()) {
          if (receiver.track === activeTrack) {
            matchedPc = pc;
            break;
          }
        }
      } catch { /* PC may be closed */ }
      if (matchedPc) break;
    }

    if (matchedPc) {
      currentTransportSpan.textContent = 'SRTP';
      try {
        const stats = await matchedPc.getStats();
        let codecId: string | undefined;
        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            codecId = report.codecId;
          }
        });
        if (codecId) {
          const codecStat = stats.get(codecId);
          if (codecStat) {
            const mime = codecStat.mimeType ?? '';
            currentCodecSpan.textContent = mime.replace('video/', '');
          }
        }
      } catch { /* PC may have closed */ }
    } else {
      currentTransportSpan.textContent = 'MSE';
      currentCodecSpan.textContent = lastMseCodec || '(via MSE)';
    }
  }, 2000);
};

const stopCodecPolling = (): void => {
  if (codecPollTimer) {
    clearInterval(codecPollTimer);
    codecPollTimer = null;
  }
};

const handleStreamError = (error: ConnectionError | string): void => {
  console.error('[v2-example] Stream error:', error);

  if (error === ConnectionError.invalidAccessToken || error === 'invalidAccessToken') {
    getSystemToken(systemSelect.value).then((tokenInfo) => {
      systemToken = tokenInfo;
      autoConnect();
    });
  } else {
    console.error(`Error playing back stream: ${error}`);
    connectionStateSpan.textContent = `Error: ${error}`;
    connectionStateSpan.className = 'status-value state-failed';
  }
};

// ── Native v2 stream ────────────────────────────────────────────────────────

const ensureStreamManagerConfigured = (): void => {
  if (streamManagerConfigured) return;
  StreamManager.configure({
    relayUrl: systemRelay.replace(systemSelect.value, '{systemId}'),
    useRelayPrefix: true,
    maxBehind: 5,
    useUnreliableDataChannel: true,
    logger: console,
  });
  streamManagerConfigured = true;
};

const startNativeStream = (
  sysId: string,
  cameraId: string,
  positionMs: number,
  speed: number | 'unlimited',
): void => {
  cleanupNativeConnection();
  ensureStreamManagerConfigured();

  // Find the selected camera's mediaStreams for codec-aware stream selection.
  const selectedCamera = cameras.find((c) => clean(c.id) === cameraId);
  const urlConfig = {
    systemId: sysId,
    cameraId,
    serverId: selectedCamera?.serverId ? clean(selectedCamera.serverId) : undefined,
    accessToken: () => systemToken.access_token,
    targetStream: getTargetStreamFromQuality(streamQualitySelect.value),
    mediaStreams: selectedCamera?.mediaStreams,
    position: positionMs,
    speed,
    apiContext: {
      version: ApiVersions.v2,
      oneTimeToken: () => fetchOneTimeTicket(),
    },
  };

  updateCurrentStreamDisplay(null);
  updateConnectionState(PeerState.connecting);
  currentResolutionSpan.textContent = '--';

  const connection = StreamManager.getInstance().connect(urlConfig, videoElement);
  currentNativeConnection = connection;

  nativeUnsubscribers.push(
    connection.on('track', (detail: TrackEventDetail) => {
      const newStream = detail.streams[0] ?? null;
      // Only reassign srcObject when the stream identity changes (first track).
      // Upgrade track events reuse the same managedStream — reassigning srcObject
      // to the same object resets the video pipeline and can kill playback.
      if (videoElement.srcObject !== newStream) {
        videoElement.srcObject = newStream;
        videoElement.poster = '';
        videoElement.muted = true;
        videoElement.autoplay = true;
        videoElement.play().catch(() => {/* interrupted by new load — expected during rapid switch */});
      }
      attachResolutionTracker();
    }),
  );

  nativeUnsubscribers.push(
    connection.on('statechange', (detail: StateChangeEventDetail) => {
      updateConnectionState(detail.state);
    }),
  );

  nativeUnsubscribers.push(
    connection.on('error', (error: ConnectionError) => {
      updateConnectionState(PeerState.failed);
      handleStreamError(error);
    }),
  );

  // Always subscribe to metadata events for auto-reveal detection.
  // handleMetadataEvent only renders overlay/log when analyticsActive is true;
  // otherwise it just triggers auto-reveal on first metadata message.
  subscribeToMetadata();
};

// ── Cleanup helpers ─────────────────────────────────────────────────────────

const cleanupNativeConnection = (): void => {
  for (const unsub of nativeUnsubscribers) unsub();
  nativeUnsubscribers = [];
  currentNativeConnection = null;
};

const stopAndCleanup = (): void => {
  console.log('[v2-example] Stopping and cleaning up...');
  resetZoom(false);

  if (dewarpActive) disableDewarping();

  unsubscribeFromMetadata();
  stopAnalyticsLoop();
  clearTrackedObjects();
  clearOverlay();
  lastMetadataPacket = null;
  analyticsRevealed = false;
  analyticsActive = false;
  analyticsToggleBtn.setAttribute('aria-pressed', 'false');
  analyticsStateSpan.textContent = 'Off';
  analyticsPanel.hidden = true;
  analyticsPanelToggle.textContent = '\u00ab'; // « (expand)
  analyticsPanelToggle.classList.remove('panel-open');
  panelManuallyCollapsed = false; // Reset so next enable auto-opens

  cleanupNativeConnection();
  try {
    StreamManager.reset();
  } catch {
    // StreamManager may not have been configured yet
  }
  streamManagerConfigured = false;

  if (resolutionUpdateHandler) {
    videoElement.removeEventListener('loadedmetadata', resolutionUpdateHandler);
    videoElement.removeEventListener('resize', resolutionUpdateHandler);
    resolutionUpdateHandler = null;
  }

  if (videoElement.srcObject) {
    const mediaStream = videoElement.srcObject as MediaStream;
    mediaStream.getTracks().forEach((track) => track.stop());
    videoElement.srcObject = null;
  }

  // Clear any freeze-frame poster so stale frames from the previous camera
  // don't flash when a new camera begins loading.
  videoElement.poster = '';

  stopCodecPolling();
  lastMseCodec = '';

  updateCurrentStreamDisplay(null);
  updateConnectionState('Idle');
  currentResolutionSpan.textContent = '--';
  currentCodecSpan.textContent = '--';
  currentTransportSpan.textContent = '--';
};

// ── Auto-connect ────────────────────────────────────────────────────────────

const autoConnect = (): void => {
  // Guard: don't connect until system is ready and a real camera is selected
  if (!systemReady || !cameraSelect.value || cameraSelect.value === 'loading' || cameraSelect.value === 'error') return;

  // Lightweight camera-switch cleanup: preserve StreamManager config & analytics panel state.
  // Full reset (StreamManager.reset) only happens in systemSelected() on system change.
  if (currentNativeConnection || videoElement.srcObject) {
    freezeFrame();
    resetZoom(false);
    if (dewarpActive) disableDewarping();

    unsubscribeFromMetadata();
    clearTrackedObjects();
    // Recreate tracking overlay if still in outline mode (clearTrackedObjects destroys it)
    if (overlayMode === 'outline') createTrackingOverlay();
    lastMetadataPacket = null;
    analyticsRevealed = false; // Allow auto-reveal for new camera

    // Disconnect and dispose the old CameraConnection from StreamManager's cache
    // so it releases WebSocket/PeerConnection resources before a new one is created.
    if (currentNativeConnection && streamManagerConfigured) {
      StreamManager.getInstance().disconnect(currentNativeConnection.connectionKey);
    }
    cleanupNativeConnection();

    if (videoElement.srcObject) {
      const mediaStream = videoElement.srcObject as MediaStream;
      mediaStream.getTracks().forEach((track) => track.stop());
      videoElement.srcObject = null;
    }

    stopCodecPolling();
    lastMseCodec = '';
  }

  const selectedCamera = clean(cameraSelect.value);
  const positionMs = parseFloat(positionInput.value) || 0;
  const speed: number | 'unlimited' =
    speedSelect.value === 'unlimited' ? 'unlimited' : parseFloat(speedSelect.value);

  startNativeStream(systemId, selectedCamera, positionMs, speed);
};

// ── OAuth flow ──────────────────────────────────────────────────────────────

const getEmailFromToken = (token: string): string | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.email || payload.sub || null;
  } catch {
    return null;
  }
};

const showLogoutButton = (): void => {
  const email = getEmailFromToken(cloudToken!.access_token);
  logoutBtn.textContent = email ? `Logout ${email}` : 'Logout';
  sidebarFooter.hidden = false;
};

const redirectOauth = (event?: SubmitEvent): void => {
  event?.preventDefault?.();
  const authorizationUrl = `${cloudInstance}/authorize?redirect_uri=${window.location.origin}${window.location.pathname}`;
  window.location.href = authorizationUrl;
};

// ── Dewarping ───────────────────────────────────────────────────────────

const MOUNT_MAP: Record<string, FisheyeCameraMount> = {
  wall: FisheyeCameraMount.Wall,
  ceiling: FisheyeCameraMount.Ceiling,
  table: FisheyeCameraMount.Table,
};

const PROJECTION_MAP: Record<string, CameraProjection> = {
  equidistant: CameraProjection.Equidistant,
  stereographic: CameraProjection.Stereographic,
  equisolid: CameraProjection.Equisolid,
  equirectangular360: CameraProjection.Equirectangular360,
};

/** Extract Stream[] from the API's mediaStreams parameter ({ streams: [...] } or raw array). */
const parseMediaStreams = (raw: unknown): Stream[] => {
  // The /rest/v2/ API nests streams inside { streams: [...] }
  const arr = Array.isArray(raw)
    ? raw
    : (typeof raw === 'object' && raw !== null && Array.isArray((raw as Record<string, unknown>).streams))
      ? (raw as Record<string, unknown>).streams as unknown[]
      : [];
  return arr
    .filter(
      (s): s is { codec: number; encoderIndex?: number } =>
        typeof s === 'object' &&
        s !== null &&
        typeof (s as Record<string, unknown>).codec === 'number' &&
        // Exclude transcoding pseudo-streams (encoderIndex === -1).
        (s as Record<string, unknown>).encoderIndex !== -1,
    )
    .map((s) => ({
      codec: s.codec,
      // Primary stream omits encoderIndex (defaults to 0).
      encoderIndex: (typeof s.encoderIndex === 'number' ? s.encoderIndex : 0) as AvailableStreams,
    }));
};

const parseDewarpingParams = (raw: string | undefined | null): ParsedDewarpingParams | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || !parsed.enabled) return null;
    return parsed as ParsedDewarpingParams;
  } catch {
    return null;
  }
};

const toLibraryMediaData = (params: ParsedDewarpingParams): MediaData => {
  const media = createDefaultMediaData();
  media.enabled = true;
  media.viewMode = MOUNT_MAP[params.viewMode] ?? FisheyeCameraMount.Ceiling;
  media.fovRot = params.fovRot ?? 0;
  media.xCenter = params.xCenter ?? 0.5;
  media.yCenter = params.yCenter ?? 0.5;
  media.radius = params.radius ?? 0.5;
  media.hStretch = params.hStretch ?? 1;
  media.cameraProjection = PROJECTION_MAP[params.cameraProjection] ?? CameraProjection.Equidistant;
  media.sphereAlpha = params.sphereAlpha ?? 0;
  media.sphereBeta = params.sphereBeta ?? 0;
  return media;
};

const enforceViewLimits = (): void => {
  const limits = getPtzLimits(currentMediaData, currentViewData);
  const canvasAspect = dewarpCanvas.clientWidth / dewarpCanvas.clientHeight || 16 / 9;
  const bounded = boundToLimits(
    currentViewData.xAngle, currentViewData.yAngle, currentViewData.fov,
    limits, canvasAspect, currentViewData.panoFactor,
  );
  currentViewData.xAngle = bounded.pan;
  currentViewData.yAngle = bounded.tilt;
  currentViewData.fov = bounded.fov;
};

const updateDewarpSliders = (): void => {
  const pan = Math.round(toDegrees(currentViewData.xAngle));
  const tilt = Math.round(toDegrees(currentViewData.yAngle));
  const zoom = Math.round(toDegrees(currentViewData.fov));
  const rotation = Math.round(currentMediaData.fovRot);

  dewarpPanSlider.value = String(pan);
  dewarpPanValue.textContent = `${pan}\u00B0`;
  dewarpTiltSlider.value = String(tilt);
  dewarpTiltValue.textContent = `${tilt}\u00B0`;
  dewarpZoomSlider.value = String(zoom);
  dewarpZoomValue.textContent = `${zoom}\u00B0`;
  dewarpRotationSlider.value = String(rotation);
  dewarpRotationValue.textContent = `${rotation}\u00B0`;
};

const startDewarpRenderLoop = (): void => {
  if (dewarpRafId !== null) return;

  const loop = (): void => {
    if (!dewarpRenderer || !dewarpActive) return;

    // Rotation from slider (not modified by interactive controls)
    currentMediaData.fovRot = parseFloat(dewarpRotationSlider.value);

    // Enforce constraints every frame
    enforceViewLimits();

    // Canvas resolution scaled by device pixel ratio.
    // Use clientWidth/clientHeight — NOT getBoundingClientRect() — because
    // ancestor CSS transforms (analytics zoom scale) inflate getBoundingClientRect
    // while clientWidth/clientHeight report the actual CSS layout size.
    const dpr = window.devicePixelRatio || 1;
    const outW = Math.round(dewarpCanvas.clientWidth * dpr);
    const outH = Math.round(dewarpCanvas.clientHeight * dpr);

    if (outW > 0 && outH > 0 && videoElement.readyState >= 2) {
      try {
        dewarpRenderer.render(videoElement, currentMediaData, currentViewData, outW, outH);
      } catch (e) {
        console.error('[dewarp] Render error:', e);
      }

      // Snapshot the WebGL canvas into a 2D buffer while the buffer is still
      // valid (preserveDrawingBuffer: false clears after compositing).
      if (trackingRenderer) trackingRenderer.snapshotDewarp();

      if (dewarpTransform) {
        dewarpTransform.setParams(
          currentMediaData, currentViewData,
          videoElement.videoWidth || 1920, videoElement.videoHeight || 1080,
          outW, outH,
        );
        // Reposition overlays immediately so they stay in sync with the
        // rendered dewarped frame (avoids 1-frame lag from separate rAF loop).
        repositionDewarpOverlays();
      }

      // Update minimap with current video frame
      if (dewarpMinimapHandle) {
        dewarpMinimapHandle.setSourceImage(videoElement);
        dewarpMinimapHandle.render();
      }
    }

    updateDewarpSliders();
    dewarpRafId = requestAnimationFrame(loop);
  };
  dewarpRafId = requestAnimationFrame(loop);
};

const stopDewarpRenderLoop = (): void => {
  if (dewarpRafId !== null) {
    cancelAnimationFrame(dewarpRafId);
    dewarpRafId = null;
  }
};

/** Replace the canvas DOM element to guarantee a fresh GPU context. */
const recreateDewarpCanvas = (): void => {
  const old = dewarpCanvas;
  const fresh = document.createElement('canvas');
  fresh.id = 'dewarpCanvas';
  old.parentNode!.replaceChild(fresh, old);
  dewarpCanvas = fresh;
};

const enableDewarping = async (): Promise<void> => {
  // Destroy stale renderer — WebGPU contexts may be invalidated after the
  // canvas was hidden (display: none → 0×0 layout).
  if (dewarpRenderer) {
    dewarpRenderer.destroy();
    dewarpRenderer = null;
  }

  // Replace canvas element to guarantee a fresh GPU context (mirrors the
  // pattern from the reference dewarping demo's recreateCanvas()).
  recreateDewarpCanvas();

  // Canvas must be visible before creating the renderer — WebGPU/WebGL
  // context creation on a 0×0 hidden canvas crashes the GPU process.
  dewarpCanvas.hidden = false;
  videoElement.style.visibility = 'hidden';
  videoElement.style.position = 'absolute';

  dewarpRenderer = await DewarpingRenderer.create({ canvas: dewarpCanvas, preferWebGL2: true });

  dewarpActive = true;
  dewarpTransform = new DewarpingTransform(
    currentMediaData, currentViewData,
    videoElement.videoWidth || 1920, videoElement.videoHeight || 1080,
    dewarpCanvas.clientWidth, dewarpCanvas.clientHeight,
  );
  dewarpToggleBtn.setAttribute('aria-pressed', 'true');
  dewarpStateSpan.textContent = 'On';
  dewarpControlsPanel.hidden = false;

  dewarpControlHandle = attachCanvasControls(
    dewarpCanvas,
    () => currentViewData,
    () => currentMediaData,
    (view) => { currentViewData = view; },
  );

  dewarpMinimapHandle = createMinimap(
    minimapCanvas,
    () => currentViewData,
    () => currentMediaData,
    (view) => { currentViewData = view; },
    () => dewarpCanvas.clientWidth / dewarpCanvas.clientHeight || 16 / 9,
  );
  minimapContainer.hidden = false;

  startDewarpRenderLoop();
  updateDewarpSliders();

  // Update tracking renderer to crop from dewarp canvas
  if (trackingRenderer) trackingRenderer.dewarpCanvas = dewarpCanvas;

  // If zoomed into an analytics object, remap the zoom rect from
  // fisheye source space to dewarped view space.
  syncZoomToActiveView();
};

const disableDewarping = (): void => {
  dewarpActive = false;
  dewarpTransform = null;
  stopDewarpRenderLoop();

  if (dewarpControlHandle) {
    dewarpControlHandle.dispose();
    dewarpControlHandle = null;
  }

  if (dewarpMinimapHandle) {
    dewarpMinimapHandle.dispose();
    dewarpMinimapHandle = null;
  }
  minimapContainer.hidden = true;

  // Destroy renderer before hiding canvas — prevents stale GPU state.
  if (dewarpRenderer) {
    dewarpRenderer.destroy();
    dewarpRenderer = null;
  }

  dewarpCanvas.hidden = true;
  videoElement.style.visibility = '';
  videoElement.style.position = '';
  dewarpToggleBtn.setAttribute('aria-pressed', 'false');
  dewarpStateSpan.textContent = 'Off';
  dewarpControlsPanel.hidden = true;

  // Revert tracking renderer to raw video source
  if (trackingRenderer) trackingRenderer.dewarpCanvas = null;

  // If zoomed into an analytics object, remap the zoom rect from
  // dewarped view space back to fisheye source space.
  syncZoomToActiveView();
};

const toggleDewarping = (): void => {
  dewarpAutoEnabled = false; // manual toggle overrides auto-dewarp tracking
  if (dewarpActive) {
    disableDewarping();
  } else {
    enableDewarping();
  }
};

const updateDewarpForCamera = (camera: BasicCameraInfo | undefined): void => {
  currentCameraDewarpable = !!camera?.dewarpingParams?.enabled;

  if (currentCameraDewarpable && camera!.dewarpingParams) {
    currentMediaData = toLibraryMediaData(camera!.dewarpingParams);
    currentViewData = createDefaultViewData();
    enforceViewLimits();
    dewarpToggleItem.hidden = false;
  } else {
    dewarpToggleItem.hidden = true;
    if (dewarpActive) disableDewarping();
  }
};

// ── Analytics ────────────────────────────────────────────────────────────────

/** Compute the actual video display rect within the viewport (accounts for object-fit: contain). */
const getVideoDisplayRect = (): { x: number; y: number; w: number; h: number } => {
  const containerW = videoElement.clientWidth;
  const containerH = videoElement.clientHeight;
  const videoW = videoElement.videoWidth || containerW;
  const videoH = videoElement.videoHeight || containerH;
  const scale = Math.min(containerW / videoW, containerH / videoH);
  const w = videoW * scale;
  const h = videoH * scale;
  return { x: (containerW - w) / 2, y: (containerH - h) / 2, w, h };
};

// ── Zoom Rect Utilities ──────────────────────────────────────────────────────

const expandRect = (
  bb: { x: number; y: number; width: number; height: number },
  factor: number,
): Rect => {
  const cx = bb.x + bb.width / 2;
  const cy = bb.y + bb.height / 2;
  const w = bb.width * factor;
  const h = bb.height * factor;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
};

const clampRect = (r: Rect): Rect => {
  const w = Math.min(r.w, 1);
  const h = Math.min(r.h, 1);
  const x = Math.max(0, Math.min(r.x, 1 - w));
  const y = Math.max(0, Math.min(r.y, 1 - h));
  return { x, y, w, h };
};

const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  w: a.w + (b.w - a.w) * t,
  h: a.h + (b.h - a.h) * t,
});

const computeZoomRect = (
  bb: { x: number; y: number; width: number; height: number },
  targetCx?: number,
  targetCy?: number,
): Rect => {
  const padded = expandRect(bb, ZOOM_PAD_FACTOR);
  const w = Math.max(padded.w, ZOOM_MIN_SIZE);
  const h = Math.max(padded.h, ZOOM_MIN_SIZE);
  const cx = targetCx ?? bb.x + bb.width / 2;
  const cy = targetCy ?? bb.y + bb.height / 2;
  return clampRect({ x: cx - w / 2, y: cy - h / 2, w, h });
};

// ── Zoom Transform ───────────────────────────────────────────────────────────

const applyZoomTransform = (rect: Rect, animate: boolean): void => {
  const display = dewarpActive
    ? { x: 0, y: 0, w: dewarpCanvas.clientWidth, h: dewarpCanvas.clientHeight }
    : getVideoDisplayRect();
  const containerW = zoomContainer.clientWidth;
  const containerH = zoomContainer.clientHeight;

  // Map normalized rect to pixel coordinates within container
  const px = display.x + rect.x * display.w;
  const py = display.y + rect.y * display.h;
  const pw = rect.w * display.w;
  const ph = rect.h * display.h;

  // Scale to fill container while preserving aspect ratio
  const scale = Math.min(containerW / pw, containerH / ph);

  // Center the cropped region within the container
  let tx = -px * scale + (containerW - pw * scale) / 2;
  let ty = -py * scale + (containerH - ph * scale) / 2;

  // Clamp translation so the scaled video always covers the container —
  // prevents exposing the black background behind the video element.
  const videoLeft = display.x * scale;
  const videoRight = (display.x + display.w) * scale;
  const videoTop = display.y * scale;
  const videoBottom = (display.y + display.h) * scale;

  tx = Math.min(tx, -videoLeft);                      // don't expose left black
  tx = Math.max(tx, containerW - videoRight);          // don't expose right black
  ty = Math.min(ty, -videoTop);                        // don't expose top black
  ty = Math.max(ty, containerH - videoBottom);         // don't expose bottom black

  zoomTransformTarget.style.transition = animate
    ? `transform ${ZOOM_TRANSITION_MS}ms ease-out`
    : 'none';
  zoomTransformTarget.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;

  // Publish scale for CSS counter-scaling of labels/tooltips
  zoomTransformTarget.style.setProperty('--zoom-scale', String(scale));
};

const applyZoom = (trackId: string): void => {
  const obj = trackedObjects.get(trackId);
  if (!obj) return;

  // Remove previous zoom target styling
  if (zoomState.targetTrackId) {
    const prev = trackedObjects.get(zoomState.targetTrackId);
    if (prev) {
      prev.overlayBox.classList.remove('analytics-box--zoom-target');
      prev.panelRow.classList.remove('analytics-row--zoom-target');
    }
  }

  let zoomBBox = obj.displayBBox;
  if (dewarpActive && dewarpTransform) {
    const mapped = mapBBoxToView(dewarpTransform, zoomBBox);
    if (!mapped) return; // Object not visible in dewarped view
    zoomBBox = mapped;
  }
  const rect = computeZoomRect(zoomBBox);
  zoomState = { status: 'zooming-in', targetTrackId: trackId, currentRect: rect };

  // Initialize velocity tracking from interpolated center
  const cx = zoomBBox.x + zoomBBox.width / 2;
  const cy = zoomBBox.y + zoomBBox.height / 2;
  velocityState = { prevCx: cx, prevCy: cy, prevTime: performance.now(), vx: 0, vy: 0 };

  obj.overlayBox.classList.add('analytics-box--zoom-target');
  obj.panelRow.classList.add('analytics-row--zoom-target');

  // Collapse any expanded tracking overlay tile — doesn't make sense when zoomed
  if (trackingOverlay) {
    trackingOverlay.collapse();
    trackingHoverTrackId = null;
    if (trackingHoverDebounce) { clearTimeout(trackingHoverDebounce); trackingHoverDebounce = null; }
  }

  // Hide non-target overlays
  analyticsOverlayInner.classList.add('zoom-active');

  applyZoomTransform(rect, true);
  lastZoomContainerSize = { w: zoomContainer.clientWidth, h: zoomContainer.clientHeight };

  // Auto-enable dewarp for fisheye cameras so zoom tracking shows a
  // rectilinear view. syncZoomToActiveView() at the end of
  // enableDewarping() will remap the zoom rect to dewarped space.
  if (currentCameraDewarpable && !dewarpActive) {
    dewarpAutoEnabled = true;
    enableDewarping();
  }
};

const resetZoom = (animate = true): void => {
  if (zoomState.status === 'idle') return;

  // Capture before clearing zoom state — auto-revert dewarp after reset.
  const shouldRevertDewarp = dewarpAutoEnabled && dewarpActive;
  dewarpAutoEnabled = false;

  if (zoomState.targetTrackId) {
    const obj = trackedObjects.get(zoomState.targetTrackId);
    if (obj) {
      obj.overlayBox.classList.remove('analytics-box--zoom-target');
      obj.panelRow.classList.remove('analytics-row--zoom-target');
    }
  }

  zoomState = { status: 'idle', targetTrackId: null, currentRect: { x: 0, y: 0, w: 1, h: 1 } };
  velocityState = null;

  // Restore non-target overlays
  analyticsOverlayInner.classList.remove('zoom-active');

  zoomTransformTarget.style.transition = animate
    ? `transform ${ZOOM_TRANSITION_MS}ms ease-out`
    : 'none';
  zoomTransformTarget.style.transform = 'none';

  // Reset counter-scale variable
  zoomTransformTarget.style.setProperty('--zoom-scale', '1');

  // Auto-revert dewarp if it was auto-enabled by zoom tracking
  // and the user hasn't manually toggled it since.
  if (shouldRevertDewarp) {
    disableDewarping();
  }
};

/**
 * Instantly remap the zoom rect into the current coordinate space.
 * Called when toggling dewarp on/off so the CSS zoom targets the correct
 * region of whichever surface (video or dewarp canvas) is now visible.
 */
const syncZoomToActiveView = (): void => {
  if (zoomState.status === 'idle' || !zoomState.targetTrackId) return;
  const obj = trackedObjects.get(zoomState.targetTrackId);
  if (!obj) { resetZoom(false); return; }

  let bb: { x: number; y: number; width: number; height: number } = obj.displayBBox;
  if (dewarpActive && dewarpTransform) {
    const mapped = mapBBoxToView(dewarpTransform, bb);
    if (!mapped) { resetZoom(false); return; }
    bb = mapped;
  }

  zoomState.currentRect = computeZoomRect(bb);
  zoomState.lastGoalBBoxW = bb.width;
  zoomState.lastGoalBBoxH = bb.height;
  if (zoomState.status === 'zooming-in') zoomState.status = 'zoomed';

  // Reset velocity to avoid carryover from the old coordinate space
  velocityState = {
    prevCx: bb.x + bb.width / 2,
    prevCy: bb.y + bb.height / 2,
    prevTime: performance.now(),
    vx: 0, vy: 0,
  };

  applyZoomTransform(zoomState.currentRect, false);
};

// ── Tracked Object State ─────────────────────────────────────────────────────

interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TrackedObject {
  trackId: string;
  typeId: string;
  boundingBox: BBox;       // raw latest from server (kept for tooltip display)
  targetBBox: BBox;        // what we lerp toward
  displayBBox: BBox;       // interpolated — drives overlay + zoom
  lastDataTime: number;    // performance.now() of most recent data arrival
  dataInterval: number;    // EMA-smoothed ms between data updates
  _lastFrameTime?: number; // for frame-dt calculation in rAF loop
  attributes?: Array<{ name: string; value: string }>;
  confidence?: number;
  analyticsEngineId?: string;
  firstSeenMs: number;
  lastSeenMs: number;
  panelRow: HTMLDivElement;
  overlayBox: HTMLDivElement;
  durationSpan: HTMLSpanElement;
  attrsSpan: HTMLSpanElement;
  tooltipDl: HTMLDListElement;
}

const trackedObjects = new Map<string, TrackedObject>();

// ── Container-level dblclick: hit-test against overlay boxes ──────────────────
// Analytics boxes use pointer-events:none so that drag/wheel pass through to the
// dewarp canvas. The label keeps pointer-events:auto for tooltip hover. Double-
// click detection uses DOM ancestry first (reliable for label clicks at edge of
// projection), then falls back to coordinate hit-testing for canvas clicks.
zoomContainer.addEventListener('dblclick', (e: MouseEvent) => {
  // 1. DOM-based: if the click target is inside an analytics-box, use its trackId
  const clickedBox = (e.target as HTMLElement).closest?.('.analytics-box') as HTMLElement | null;
  if (clickedBox?.dataset.trackId) {
    const trackId = clickedBox.dataset.trackId;
    if (trackedObjects.has(trackId)) {
      if (zoomState.targetTrackId === trackId) {
        resetZoom();
      } else {
        applyZoom(trackId);
      }
      return;
    }
  }

  // 2. Coordinate-based: hit-test for clicks on the canvas/video surface
  const rect = analyticsOverlayInner.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;

    for (const [trackId, obj] of trackedObjects) {
      if (obj.overlayBox.style.display === 'none') continue;

      let bb = obj.displayBBox;
      if (dewarpActive && dewarpTransform) {
        const mapped = mapBBoxToView(dewarpTransform, bb);
        if (!mapped) continue;
        bb = mapped;
      }

      if (nx >= bb.x && nx <= bb.x + bb.width &&
          ny >= bb.y && ny <= bb.y + bb.height) {
        if (zoomState.targetTrackId === trackId) {
          resetZoom();
        } else {
          applyZoom(trackId);
        }
        return;
      }
    }
  }

  // Double-click on empty area while zoomed → reset
  if (zoomState.status !== 'idle') {
    resetZoom();
  }
});

// ── Coordinate-based hover detection for tracking overlay ─────────────────────
// Static overlay elements use pointer-events:none so drag/wheel pass through to
// the dewarp canvas. Hover detection is done via coordinate hit-testing here.
let trackingHoverTrackId: string | null = null;
let trackingHoverDebounce: ReturnType<typeof setTimeout> | null = null;
// "Sticky hover": when an expanded tile is showing, keep it open if the mouse
// hasn't moved far from where the expansion was triggered. This prevents collapse
// when the detected object drifts out from under a stationary cursor.
let trackingHoverAnchorX = 0;
let trackingHoverAnchorY = 0;
const STICKY_HOVER_RADIUS_PX = 6;

zoomContainer.addEventListener('pointermove', (e: PointerEvent) => {
  if (overlayMode !== 'outline' || !trackingOverlay) return;
  // Don't expand when zoomed into an object
  if (zoomState.status !== 'idle') return;

  const rect = analyticsOverlayInner.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;

  const nx = (e.clientX - rect.left) / rect.width;
  const ny = (e.clientY - rect.top) / rect.height;

  // Hit-test against tracked objects (prefer smallest matching box)
  let hitTrackId: string | null = null;
  let hitArea = Infinity;
  for (const [trackId, obj] of trackedObjects) {
    if (obj.overlayBox.style.display === 'none') continue;

    let bb = obj.displayBBox;
    if (dewarpActive && dewarpTransform) {
      const mapped = mapBBoxToView(dewarpTransform, bb);
      if (!mapped) continue;
      bb = mapped;
    }

    if (nx >= bb.x && nx <= bb.x + bb.width &&
        ny >= bb.y && ny <= bb.y + bb.height) {
      const area = bb.width * bb.height;
      if (area < hitArea) {
        hitTrackId = trackId;
        hitArea = area;
      }
    }
  }

  if (hitTrackId) {
    // Cancel any pending collapse
    if (trackingHoverDebounce) {
      clearTimeout(trackingHoverDebounce);
      trackingHoverDebounce = null;
    }
    if (hitTrackId !== trackingHoverTrackId) {
      trackingHoverTrackId = hitTrackId;
      trackingHoverAnchorX = e.clientX;
      trackingHoverAnchorY = e.clientY;
      trackingOverlay.expand([hitTrackId]);
    }
  } else if (trackingHoverTrackId) {
    // Sticky hover: if the cursor barely moved from the trigger point,
    // the object probably drifted away — keep the tile expanded.
    const dx = e.clientX - trackingHoverAnchorX;
    const dy = e.clientY - trackingHoverAnchorY;
    if (dx * dx + dy * dy < STICKY_HOVER_RADIUS_PX * STICKY_HOVER_RADIUS_PX) {
      // Cancel any pending collapse — cursor is essentially stationary.
      if (trackingHoverDebounce) {
        clearTimeout(trackingHoverDebounce);
        trackingHoverDebounce = null;
      }
      return;
    }

    // Mouse left all objects — debounce the collapse
    if (!trackingHoverDebounce) {
      trackingHoverDebounce = setTimeout(() => {
        trackingHoverDebounce = null;
        trackingHoverTrackId = null;
        if (trackingOverlay) trackingOverlay.collapse();
      }, 150);
    }
  }
});

zoomContainer.addEventListener('pointerleave', () => {
  if (trackingHoverTrackId && trackingOverlay) {
    if (trackingHoverDebounce) {
      clearTimeout(trackingHoverDebounce);
      trackingHoverDebounce = null;
    }
    trackingHoverTrackId = null;
    trackingOverlay.collapse();
  }
});

interface DeviceActivity {
  deviceId: string;
  cameraName: string;
  activeTrackCount: number;
  objectTypes: Map<string, number>;
  lastActiveMs: number;
}

const deviceActivityMap = new Map<string, DeviceActivity>();

// ── Expanded Overlay Renderer ────────────────────────────────────────────────

/** Map analytics typeId to a display color. */
function analyticsTypeColor(typeId: string): string {
  const lower = typeId.toLowerCase();
  if (lower.includes('person') || lower.includes('human')) return '#00c896';   // --nx-green
  if (lower.includes('vehicle') || lower.includes('car') || lower.includes('truck')) return '#3b82f6'; // --nx-blue
  return '#64748b'; // --nx-overlay0
}

/** Shorten a typeId to a display label. */
function analyticsTypeLabel(typeId: string): string {
  const parts = typeId.split('.');
  return parts[parts.length - 1] || typeId;
}

class AnalyticsRenderer implements TrackingRenderer {
  private video: HTMLVideoElement;
  private _dewarpCanvas: HTMLCanvasElement | null = null;
  /** 2D snapshot of the WebGL dewarp canvas — avoids preserveDrawingBuffer timing issues. */
  private _dewarpSnapshot: HTMLCanvasElement | null = null;

  constructor(video: HTMLVideoElement) {
    this.video = video;
  }

  /** Set the dewarp canvas as the video source (or null to revert to raw video). */
  set dewarpCanvas(canvas: HTMLCanvasElement | null) {
    this._dewarpCanvas = canvas;
    if (canvas) {
      this._dewarpSnapshot = document.createElement('canvas');
    } else {
      this._dewarpSnapshot = null;
    }
  }

  /**
   * Snapshot the WebGL dewarp canvas into a persistent 2D canvas.
   * Must be called from the dewarp render loop (same rAF callback)
   * while the WebGL buffer is still valid (preserveDrawingBuffer: false).
   */
  snapshotDewarp(): void {
    if (!this._dewarpCanvas || !this._dewarpSnapshot) return;
    const w = this._dewarpCanvas.width;
    const h = this._dewarpCanvas.height;
    if (w === 0 || h === 0) return;
    if (this._dewarpSnapshot.width !== w) this._dewarpSnapshot.width = w;
    if (this._dewarpSnapshot.height !== h) this._dewarpSnapshot.height = h;
    const ctx = this._dewarpSnapshot.getContext('2d');
    if (ctx) ctx.drawImage(this._dewarpCanvas, 0, 0);
  }

  createElement(trackId: string, metadata?: Record<string, unknown>): HTMLElement {
    const typeId = (metadata?.typeId as string) ?? '';
    const color = analyticsTypeColor(typeId);

    const el = document.createElement('div');
    el.style.position = 'relative';
    el.style.borderRadius = '4px';
    el.style.overflow = 'hidden';
    el.style.pointerEvents = 'none';

    // Canvas for video crop — fills the entire tile
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.dataset.role = 'videoCrop';
    el.appendChild(canvas);

    // Label badge at top-left (matching outline overlay style)
    const label = document.createElement('span');
    label.textContent = analyticsTypeLabel(typeId);
    label.style.position = 'absolute';
    label.style.top = '0';
    label.style.left = '0';
    label.style.padding = '2px 6px';
    label.style.fontSize = '10px';
    label.style.fontFamily = "'Outfit', system-ui, sans-serif";
    label.style.fontWeight = '600';
    label.style.color = '#070b11'; // nx-base
    label.style.background = color;
    label.style.borderRadius = '0 0 4px 0';
    label.style.whiteSpace = 'nowrap';
    label.style.userSelect = 'none';
    label.style.pointerEvents = 'none';
    label.style.zIndex = '1';
    el.appendChild(label);

    return el;
  }

  update(_trackId: string, originalBBox: TrackingBBox, _expandedBBox: TrackingBBox, element: HTMLElement): void {
    const canvas = element.querySelector('canvas[data-role="videoCrop"]') as HTMLCanvasElement | null;
    if (!canvas) return;

    // Choose source: 2D snapshot of dewarp canvas (when dewarping) or raw video.
    // We use the snapshot (not the WebGL canvas directly) because the dewarp
    // canvas has preserveDrawingBuffer:false — its buffer is only valid inside
    // the dewarp rAF callback. The snapshot is a regular 2D canvas that persists.
    const source = this._dewarpSnapshot ?? this.video;
    const sourceW = this._dewarpSnapshot ? this._dewarpSnapshot.width : this.video.videoWidth;
    const sourceH = this._dewarpSnapshot ? this._dewarpSnapshot.height : this.video.videoHeight;
    if (!sourceW || !sourceH) return;

    // Size canvas to match element pixel size for crisp rendering
    const w = element.offsetWidth;
    const h = element.offsetHeight;
    if (w === 0 || h === 0) return;

    // Only resize canvas if dimensions changed (avoids clearing on every frame)
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Source crop based on detection bbox (dewarped or raw coordinates)
    const sx = originalBBox.x * sourceW;
    const sy = originalBBox.y * sourceH;
    const sw = originalBBox.width * sourceW;
    const sh = originalBBox.height * sourceH;

    // Draw the cropped region to fill the canvas
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, w, h);
  }

  destroy(_trackId: string, _element: HTMLElement): void {}
}

/** Create the tracking overlay container and ObjectTrackingOverlay instance. */
function createTrackingOverlay(): void {
  if (trackingOverlay) return;

  trackingContainer = document.createElement('div');
  trackingContainer.className = 'analytics-tracking-overlay';
  trackingContainer.style.position = 'absolute';
  trackingContainer.style.pointerEvents = 'none';
  trackingContainer.style.overflow = 'hidden';

  // Copy position from the outline overlay container
  const inner = analyticsOverlayInner;
  if (inner.style.left) {
    trackingContainer.style.left = inner.style.left;
    trackingContainer.style.top = inner.style.top;
    trackingContainer.style.width = inner.style.width;
    trackingContainer.style.height = inner.style.height;
  }

  analyticsHtmlOverlay.appendChild(trackingContainer);

  trackingRenderer = new AnalyticsRenderer(videoElement);
  if (dewarpActive) trackingRenderer.dewarpCanvas = dewarpCanvas;

  trackingOverlay = new ObjectTrackingOverlay(trackingContainer, {
    renderer: trackingRenderer as unknown as TrackingRenderer,
  });

  // Feed all currently tracked objects
  for (const [trackId, obj] of trackedObjects) {
    let feedBBox = obj.displayBBox;
    if (dewarpActive && dewarpTransform) {
      const mapped = mapBBoxToView(dewarpTransform, feedBBox);
      if (!mapped) continue;
      feedBBox = mapped;
    }
    const color = analyticsTypeColor(obj.typeId);
    trackingOverlay.upsert(trackId, feedBBox as TrackingBBox, {
      typeId: obj.typeId,
      label: analyticsTypeLabel(obj.typeId),
      color,
    });
  }
}

/** Destroy the tracking overlay and its container. */
function destroyTrackingOverlay(): void {
  if (trackingOverlay) {
    trackingOverlay.destroy();
    trackingOverlay = null;
  }
  if (trackingContainer) {
    trackingContainer.remove();
    trackingContainer = null;
  }
  trackingRenderer = null;
}

/** Switch overlay mode, managing DOM elements and overlay instances. */
function setOverlayMode(mode: OverlayMode): void {
  if (mode === overlayMode) return;

  const previousMode = overlayMode;
  overlayMode = mode;

  // Update button active state
  for (const btn of overlayModesContainer.querySelectorAll('.overlay-mode-btn')) {
    btn.classList.toggle('active', (btn as HTMLElement).dataset.mode === mode);
  }

  // Tear down previous mode
  if (previousMode === 'outline') {
    destroyTrackingOverlay();
  }

  // Set up new mode
  if (mode === 'outline') {
    createTrackingOverlay();
  }
}

// ── Tracked Object DOM Helpers ───────────────────────────────────────────────

const boxTypeClass = (typeId: string): string => {
  const lower = typeId.toLowerCase();
  if (lower.includes('person')) return 'analytics-box--person';
  if (lower.includes('vehicle') || lower.includes('car')) return 'analytics-box--vehicle';
  return '';
};

const formatDuration = (ms: number): string => {
  const s = Math.floor(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${s % 60}s`;
};

const createTrackedObjectDom = (
  obj: { trackId: string; typeId: string; boundingBox: { x: number; y: number; width: number; height: number }; attributes?: Array<{ name: string; value: string }>; confidence?: number; analyticsEngineId?: string },
): { panelRow: HTMLDivElement; overlayBox: HTMLDivElement; durationSpan: HTMLSpanElement; attrsSpan: HTMLSpanElement; tooltipDl: HTMLDListElement } => {
  const shortType = analyticsTypeLabel(obj.typeId);
  const typeClass = boxTypeClass(obj.typeId);
  const logTypeClass = analyticsTypeClass(obj.typeId);

  // ── Panel row ──
  const panelRow = document.createElement('div');
  panelRow.className = `analytics-log-entry ${logTypeClass}`;
  panelRow.dataset.trackId = obj.trackId;

  const typeSpan = document.createElement('span');
  typeSpan.className = 'analytics-log-type';
  typeSpan.textContent = shortType;

  const metaSpan = document.createElement('span');
  metaSpan.className = 'analytics-log-meta';
  metaSpan.textContent = obj.trackId.substring(0, 8);

  const durationSpan = document.createElement('span');
  durationSpan.className = 'analytics-log-duration';
  durationSpan.textContent = '0s';

  const attrsSpan = document.createElement('span');
  attrsSpan.className = 'analytics-log-attrs';
  if (obj.attributes?.length) {
    attrsSpan.textContent = obj.attributes.map(a => `${a.name}: ${a.value}`).join(', ');
  }

  panelRow.append(typeSpan, metaSpan, durationSpan);
  if (obj.attributes?.length) panelRow.append(attrsSpan);

  // ── Overlay box ──
  const overlayBox = document.createElement('div');
  overlayBox.className = `analytics-box ${typeClass}`;
  overlayBox.dataset.trackId = obj.trackId;

  const label = document.createElement('span');
  label.className = 'analytics-box-label';
  label.textContent = shortType;

  const tooltip = document.createElement('div');
  tooltip.className = 'analytics-box-tooltip';
  const tooltipDl = document.createElement('dl');
  tooltip.append(tooltipDl);
  label.append(tooltip);
  overlayBox.append(label);

  // Clamp tooltip within overlay bounds when hovering the label
  label.addEventListener('mouseenter', () => clampTooltip(tooltip));

  // ── Hover highlighting (panel → overlay direction only;
  //    overlay boxes use pointer-events:none so canvas drag works through them) ──
  panelRow.addEventListener('mouseenter', () => {
    overlayBox.classList.add('highlighted');
    if (overlayMode === 'outline' && trackingOverlay) {
      trackingOverlay.expand([obj.trackId]);
    }
  });
  panelRow.addEventListener('mouseleave', () => {
    overlayBox.classList.remove('highlighted');
    if (overlayMode === 'outline' && trackingOverlay) {
      trackingOverlay.collapse();
    }
  });

  // ── Double-click panel row to zoom ──
  panelRow.addEventListener('dblclick', (e: Event) => {
    e.stopPropagation();
    if (zoomState.targetTrackId === obj.trackId) {
      resetZoom();
    } else {
      applyZoom(obj.trackId);
    }
  });

  return { panelRow, overlayBox, durationSpan, attrsSpan, tooltipDl };
};

const updateTooltip = (
  dl: HTMLDListElement,
  obj: { trackId: string; typeId: string; boundingBox: { x: number; y: number; width: number; height: number }; attributes?: Array<{ name: string; value: string }>; confidence?: number; analyticsEngineId?: string },
): void => {
  dl.textContent = '';

  const add = (label: string, value: string): void => {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    dl.append(dt, dd);
  };

  add('Track ID', obj.trackId);
  add('Type', obj.typeId);
  if (typeof obj.confidence === 'number') {
    add('Confidence', `${(obj.confidence * 100).toFixed(0)}%`);
  }
  const bb = obj.boundingBox;
  add('Bounding Box', `x:${bb.x.toFixed(3)} y:${bb.y.toFixed(3)} w:${bb.width.toFixed(3)} h:${bb.height.toFixed(3)}`);
  if (obj.analyticsEngineId) {
    add('Engine', obj.analyticsEngineId);
  }
  if (obj.attributes?.length) {
    for (const attr of obj.attributes) {
      add(attr.name, attr.value);
    }
  }
};

/** Clamp a single tooltip to stay within the overlay inner container bounds. */
const clampTooltip = (tooltip: HTMLElement): void => {
  const containerRect = analyticsOverlayInner.getBoundingClientRect();
  if (!containerRect.width || !containerRect.height) return;

  // Reset overrides before measuring natural position
  tooltip.style.removeProperty('left');
  tooltip.style.removeProperty('top');
  tooltip.style.removeProperty('bottom');

  const freshRect = tooltip.getBoundingClientRect();
  if (!freshRect.width) return;

  // Horizontal: keep within container
  let leftOffset = 0;
  if (freshRect.right > containerRect.right) {
    leftOffset = containerRect.right - freshRect.right - 4;
  } else if (freshRect.left < containerRect.left) {
    leftOffset = containerRect.left - freshRect.left + 4;
  }
  if (leftOffset !== 0) {
    tooltip.style.left = `${leftOffset}px`;
  }

  // Vertical: if tooltip extends below container, flip above the label
  if (freshRect.bottom > containerRect.bottom) {
    tooltip.style.top = 'auto';
    tooltip.style.bottom = 'calc(100% + 4px)';
  }
  // If tooltip extends above container, ensure it stays below
  if (freshRect.top < containerRect.top) {
    tooltip.style.top = 'calc(100% + 4px)';
    tooltip.style.bottom = 'auto';
  }
};

const upsertTrackedObject = (
  objData: { trackId: string; typeId: string; boundingBox: { x: number; y: number; width: number; height: number }; attributes?: Array<{ name: string; value: string }>; confidence?: number },
  analyticsEngineId?: string,
): void => {
  const now = Date.now();
  const existing = trackedObjects.get(objData.trackId);

  if (existing) {
    existing.typeId = objData.typeId;
    existing.boundingBox = objData.boundingBox;
    existing.targetBBox = { ...objData.boundingBox };

    // Update data arrival interval (EMA, α=0.3)
    const arrivalNow = performance.now();
    const rawInterval = arrivalNow - existing.lastDataTime;
    // Clamp to sane range [16ms, 2000ms] to avoid outliers
    if (rawInterval > 16 && rawInterval < 2000) {
      existing.dataInterval += (rawInterval - existing.dataInterval) * 0.3;
    }
    existing.lastDataTime = arrivalNow;

    existing.attributes = objData.attributes;
    existing.confidence = objData.confidence;
    existing.analyticsEngineId = analyticsEngineId;
    existing.lastSeenMs = now;

    existing.overlayBox.classList.remove('stale');
    existing.panelRow.classList.remove('stale');

    if (objData.attributes?.length) {
      existing.attrsSpan.textContent = objData.attributes.map(a => `${a.name}: ${a.value}`).join(', ');
      if (!existing.panelRow.contains(existing.attrsSpan)) {
        existing.panelRow.append(existing.attrsSpan);
      }
    }

    updateTooltip(existing.tooltipDl, { ...objData, analyticsEngineId });
  } else {
    const dom = createTrackedObjectDom({ ...objData, analyticsEngineId });
    const tracked: TrackedObject = {
      ...objData,
      analyticsEngineId,
      firstSeenMs: now,
      lastSeenMs: now,
      targetBBox: { ...objData.boundingBox },
      displayBBox: { ...objData.boundingBox },
      lastDataTime: performance.now(),
      dataInterval: 200,
      ...dom,
    };
    trackedObjects.set(objData.trackId, tracked);

    analyticsLog.prepend(dom.panelRow);
    // In outline mode, feed the new object to the tracking overlay (not the raw overlayBox).
    if (overlayMode === 'outline' && trackingOverlay) {
      let feedBBox = tracked.displayBBox;
      if (dewarpActive && dewarpTransform) {
        const mapped = mapBBoxToView(dewarpTransform, feedBBox);
        if (mapped) feedBBox = mapped;
      }
      const color = analyticsTypeColor(tracked.typeId);
      trackingOverlay.upsert(tracked.trackId, feedBBox as TrackingBBox, {
        typeId: tracked.typeId,
        label: analyticsTypeLabel(tracked.typeId),
        color,
      });
    }

    updateTooltip(dom.tooltipDl, { ...objData, analyticsEngineId });
  }
};

const clearTrackedObjects = (): void => {
  resetZoom(false);
  for (const obj of trackedObjects.values()) {
    obj.panelRow.remove();
    obj.overlayBox.remove();
  }
  trackedObjects.clear();
  destroyTrackingOverlay();
};

// ── Overlay Wrapper & rAF Loop ───────────────────────────────────────────────

/**
 * Reposition all dewarp overlay boxes using the current transform.
 * Called from the dewarp render loop (after setParams) so overlays are
 * perfectly in sync with the rendered dewarped frame — no 1-frame lag.
 */
const repositionDewarpOverlays = (): void => {
  if (!dewarpTransform) return;
  for (const obj of trackedObjects.values()) {
    const mapped = mapBBoxToView(dewarpTransform, obj.displayBBox);
    if (!mapped) {
      obj.overlayBox.style.display = 'none';
    } else {
      obj.overlayBox.style.display = '';
      obj.overlayBox.style.left = `${(mapped.x * 100).toFixed(2)}%`;
      obj.overlayBox.style.top = `${(mapped.y * 100).toFixed(2)}%`;
      obj.overlayBox.style.width = `${(mapped.width * 100).toFixed(2)}%`;
      obj.overlayBox.style.height = `${(mapped.height * 100).toFixed(2)}%`;
    }
  }
};

const updateOverlayWrapper = (): void => {
  if (dewarpActive) {
    // Dewarped canvas fills container — no letterboxing
    analyticsOverlayInner.style.left = '0px';
    analyticsOverlayInner.style.top = '0px';
    analyticsOverlayInner.style.width = `${dewarpCanvas.clientWidth}px`;
    analyticsOverlayInner.style.height = `${dewarpCanvas.clientHeight}px`;
  } else {
    const display = getVideoDisplayRect();
    analyticsOverlayInner.style.left = `${display.x}px`;
    analyticsOverlayInner.style.top = `${display.y}px`;
    analyticsOverlayInner.style.width = `${display.w}px`;
    analyticsOverlayInner.style.height = `${display.h}px`;
  }

  if (trackingContainer) {
    trackingContainer.style.left = analyticsOverlayInner.style.left;
    trackingContainer.style.top = analyticsOverlayInner.style.top;
    trackingContainer.style.width = analyticsOverlayInner.style.width;
    trackingContainer.style.height = analyticsOverlayInner.style.height;
  }
};

const STALE_THRESHOLD_MS = 1500;
const REMOVE_THRESHOLD_MS = 2500;
let lastLogResizeMs = 0;

const analyticsFrame = (): void => {
  if (!analyticsActive) {
    analyticsRafId = null;
    return;
  }

  const now = Date.now();
  const perfNow = performance.now();

  updateOverlayWrapper();

  for (const [trackId, obj] of trackedObjects) {
    const age = now - obj.lastSeenMs;

    if (age > REMOVE_THRESHOLD_MS) {
      obj.panelRow.remove();
      obj.overlayBox.remove();
      if (overlayMode === 'outline' && trackingOverlay) {
        trackingOverlay.remove(trackId);
      }
      trackedObjects.delete(trackId);
    } else if (age > STALE_THRESHOLD_MS) {
      obj.panelRow.classList.add('stale');
      obj.overlayBox.classList.add('stale');
    }

    if (trackedObjects.has(trackId)) {
      const isStale = age > STALE_THRESHOLD_MS;

      // ── Interpolate displayBBox toward targetBBox (skip for stale objects) ──
      const frameDt = perfNow - (obj._lastFrameTime ?? perfNow);
      obj._lastFrameTime = perfNow;

      if (!isStale && frameDt > 0 && frameDt < 500) {
        const alpha = 1 - Math.pow(BBOX_LERP_RESIDUAL, frameDt / obj.dataInterval);
        obj.displayBBox.x += (obj.targetBBox.x - obj.displayBBox.x) * alpha;
        obj.displayBBox.y += (obj.targetBBox.y - obj.displayBBox.y) * alpha;
        obj.displayBBox.width += (obj.targetBBox.width - obj.displayBBox.width) * alpha;
        obj.displayBBox.height += (obj.targetBBox.height - obj.displayBBox.height) * alpha;
      }

      // Render interpolated position
      if (dewarpActive && dewarpTransform) {
        const mapped = mapBBoxToView(dewarpTransform, obj.displayBBox);
        if (!mapped) {
          obj.overlayBox.style.display = 'none';
          // Object not visible in dewarped view — remove from tracking overlay
          if (overlayMode === 'outline' && trackingOverlay) {
            trackingOverlay.remove(trackId);
          }
          continue;
        }
        obj.overlayBox.style.display = '';
        obj.overlayBox.style.left = `${(mapped.x * 100).toFixed(2)}%`;
        obj.overlayBox.style.top = `${(mapped.y * 100).toFixed(2)}%`;
        obj.overlayBox.style.width = `${(mapped.width * 100).toFixed(2)}%`;
        obj.overlayBox.style.height = `${(mapped.height * 100).toFixed(2)}%`;

        if (overlayMode === 'outline' && trackingOverlay) {
          const color = analyticsTypeColor(obj.typeId);
          trackingOverlay.upsert(trackId, mapped as TrackingBBox, {
            typeId: obj.typeId,
            label: analyticsTypeLabel(obj.typeId),
            color,
          });
        }
      } else {
        obj.overlayBox.style.display = '';
        obj.overlayBox.style.left = `${(obj.displayBBox.x * 100).toFixed(2)}%`;
        obj.overlayBox.style.top = `${(obj.displayBBox.y * 100).toFixed(2)}%`;
        obj.overlayBox.style.width = `${(obj.displayBBox.width * 100).toFixed(2)}%`;
        obj.overlayBox.style.height = `${(obj.displayBBox.height * 100).toFixed(2)}%`;

        if (overlayMode === 'outline' && trackingOverlay) {
          const color = analyticsTypeColor(obj.typeId);
          trackingOverlay.upsert(trackId, obj.displayBBox as TrackingBBox, {
            typeId: obj.typeId,
            label: analyticsTypeLabel(obj.typeId),
            color,
          });
        }
      }

      obj.durationSpan.textContent = formatDuration(now - obj.firstSeenMs);
    }
  }

  // Update the analytics-log max-height every ~500 ms (not every frame)
  if (now - lastLogResizeMs > 500) {
    lastLogResizeMs = now;
    updateLogMaxHeight();
  }

  // ── Object tracking zoom: removal check & smooth velocity-predicted following ──
  if (zoomState.status !== 'idle' && zoomState.targetTrackId) {
    const zoomTarget = trackedObjects.get(zoomState.targetTrackId);
    if (!zoomTarget) {
      resetZoom();
    } else if (zoomState.status === 'zoomed' && velocityState) {
      let db = zoomTarget.displayBBox;
      if (dewarpActive && dewarpTransform) {
        const mapped = mapBBoxToView(dewarpTransform, db);
        if (!mapped) {
          resetZoom(); // Object lost visibility in dewarped view
        } else {
          db = mapped;
        }
      }
      // Guard: resetZoom above may have set status to idle
      if (zoomState.status === 'idle' as string || !velocityState) {
        // noop — zoom was cancelled
      } else {
      const cx = db.x + db.width / 2;
      const cy = db.y + db.height / 2;
      const nowMs = performance.now();
      const dt = nowMs - velocityState.prevTime;

      if (dt > 0) {
        const rawVx = (cx - velocityState.prevCx) / dt;
        const rawVy = (cy - velocityState.prevCy) / dt;
        velocityState.vx += (rawVx - velocityState.vx) * VELOCITY_SMOOTHING;
        velocityState.vy += (rawVy - velocityState.vy) * VELOCITY_SMOOTHING;
        velocityState.prevCx = cx;
        velocityState.prevCy = cy;
        velocityState.prevTime = nowMs;
      }

      // Dead-zone check: only recompute goal rect if center drifted enough
      const driftX = Math.abs(cx - (zoomState.currentRect.x + zoomState.currentRect.w / 2));
      const driftY = Math.abs(cy - (zoomState.currentRect.y + zoomState.currentRect.h / 2));
      const centerDrifted =
        driftX > zoomState.currentRect.w * CENTER_DRIFT_THRESHOLD ||
        driftY > zoomState.currentRect.h * CENTER_DRIFT_THRESHOLD;

      const sizeChanged = zoomState.lastGoalBBoxW != null
        ? Math.abs(db.width - zoomState.lastGoalBBoxW) / zoomState.lastGoalBBoxW > ZOOM_SIZE_CHANGE_THRESHOLD ||
          Math.abs(db.height - zoomState.lastGoalBBoxH!) / zoomState.lastGoalBBoxH! > ZOOM_SIZE_CHANGE_THRESHOLD
        : false;

      if (centerDrifted || sizeChanged) {
        const predCx = cx + velocityState.vx * LOOKAHEAD_MS;
        const predCy = cy + velocityState.vy * LOOKAHEAD_MS;

        const goalRect = computeZoomRect(db, predCx, predCy);
        zoomState.lastGoalBBoxW = db.width;
        zoomState.lastGoalBBoxH = db.height;

        const speed = Math.sqrt(
          velocityState.vx * velocityState.vx + velocityState.vy * velocityState.vy,
        );
        const speedBoost = Math.min(speed / FAST_SPEED_THRESHOLD, 1);
        const baseLerp = FOLLOW_LERP + (MAX_LERP - FOLLOW_LERP) * speedBoost;
        const t = 1 - Math.pow(1 - baseLerp, dt / 16.67);

        zoomState.currentRect = lerpRect(zoomState.currentRect, goalRect, t);
        applyZoomTransform(zoomState.currentRect, false);
      }
      }
    }
  }

  // Keep zoom transform in sync with container size changes (no animation)
  if (zoomState.status !== 'idle') {
    const cw = zoomContainer.clientWidth;
    const ch = zoomContainer.clientHeight;
    if (cw !== lastZoomContainerSize.w || ch !== lastZoomContainerSize.h) {
      lastZoomContainerSize = { w: cw, h: ch };
      applyZoomTransform(zoomState.currentRect, false);
    }
  }

  analyticsRafId = requestAnimationFrame(analyticsFrame);
};

const startAnalyticsLoop = (): void => {
  if (analyticsRafId !== null) return;
  analyticsRafId = requestAnimationFrame(analyticsFrame);
};

const stopAnalyticsLoop = (): void => {
  if (analyticsRafId !== null) {
    cancelAnimationFrame(analyticsRafId);
    analyticsRafId = null;
  }
};

/** @see analyticsTypeColor — single source for typeId→color mapping */
const boxColor = analyticsTypeColor;

const clearOverlay = (): void => {
  const ctx = analyticsOverlayCanvas.getContext('2d');
  if (ctx) ctx.clearRect(0, 0, analyticsOverlayCanvas.width, analyticsOverlayCanvas.height);
};

const renderOverlayNormal = (
  ctx: CanvasRenderingContext2D,
  metadata: ObjectMetadataPacket,
): void => {
  const display = getVideoDisplayRect();
  for (const obj of metadata.objectMetadataList) {
    const bb = obj.boundingBox;
    const color = boxColor(obj.typeId);
    const x = display.x + bb.x * display.w;
    const y = display.y + bb.y * display.h;
    const w = bb.width * display.w;
    const h = bb.height * display.h;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    const shortType = analyticsTypeLabel(obj.typeId);
    const label = typeof obj.confidence === 'number'
      ? shortType + ' ' + (obj.confidence * 100).toFixed(0) + '%'
      : shortType;
    ctx.font = '11px Outfit, system-ui, sans-serif';
    const tm = ctx.measureText(label);
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = color;
    ctx.fillRect(x, y - 16, tm.width + 6, 16);
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = '#070b11';
    ctx.fillText(label, x + 3, y - 4);
  }
};

const renderOverlay = (metadata: ObjectMetadataPacket): void => {
  const canvas = analyticsOverlayCanvas;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(canvas.clientWidth * dpr);
  canvas.height = Math.round(canvas.clientHeight * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(dpr, dpr);

  // Normal mode rendering; dewarped overlay requires DewarpingTransform (future follow-up).
  renderOverlayNormal(ctx, metadata);
};

const analyticsTypeClass = (typeId: string): string => {
  const lower = typeId.toLowerCase();
  if (lower.includes('person')) return 'analytics-log-entry--person';
  if (lower.includes('vehicle') || lower.includes('car')) return 'analytics-log-entry--vehicle';
  return '';
};



const handleMetadataEvent = (detail: MetadataEventDetail): void => {
  const { metadata } = detail;
  lastMetadataPacket = metadata;

  // Auto-reveal: first metadata message opens the analytics panel automatically.
  // Only auto-reveal once the video has actual data — prevents overlay/video desync
  // when the data channel connects before media arrives (e.g. relay auth failure).
  if (!analyticsRevealed && !analyticsActive) {
    if (videoElement.readyState < 2) return; // wait for HAVE_CURRENT_DATA
    analyticsRevealed = true;
    enableAnalytics();
    return; // enableAnalytics() subscribes and will handle subsequent events
  }

  // Only update tracked objects when analytics UI is active.
  if (!analyticsActive) return;

  // Don't render overlay data when video has no frames — prevents showing
  // one camera's analytics boxes on another camera's frozen/blank frame.
  if (videoElement.readyState < 2) return;

  for (const obj of metadata.objectMetadataList) {
    upsertTrackedObject(obj, metadata.analyticsEngineId);
  }

  // Canvas overlay is still available as fallback — render if overlay enabled AND canvas mode desired.
  // By default, the HTML overlay handles rendering via upsertTrackedObject.
};

const subscribeToMetadata = (): void => {
  if (!currentNativeConnection || analyticsUnsubscriber) return;
  analyticsUnsubscriber = currentNativeConnection.on('metadata', handleMetadataEvent);
};

const unsubscribeFromMetadata = (): void => {
  analyticsUnsubscriber?.();
  analyticsUnsubscriber = null;
};

/** Update which panel sections are visible based on analytics state. */
const updatePanelSections = (): void => {
  // Analytics header (Overlay/Clear buttons) + events log only show when analytics is on
  analyticsPanelHeader.hidden = !analyticsActive;
  analyticsLog.hidden = !analyticsActive;
};

const showPanel = (): void => {
  analyticsPanel.hidden = false;
  analyticsPanelToggle.textContent = '\u00bb'; // » (collapse)
  analyticsPanelToggle.classList.add('panel-open');
  updatePanelSections();
};

const collapsePanel = (manual: boolean): void => {
  if (manual) panelManuallyCollapsed = true;
  analyticsPanel.hidden = true;
  analyticsPanelToggle.textContent = '\u00ab'; // « (expand)
  analyticsPanelToggle.classList.remove('panel-open');
};

const expandPanel = (): void => {
  panelManuallyCollapsed = false;
  showPanel();
};

const enableAnalytics = (): void => {
  analyticsActive = true;
  analyticsRevealed = true; // Prevent auto-reveal from re-opening after manual toggle
  analyticsToggleBtn.setAttribute('aria-pressed', 'true');
  analyticsStateSpan.textContent = 'On';
  panelManuallyCollapsed = false; // Reset manual collapse on explicit enable
  showPanel(); // Auto-open panel (also reveals analytics header/log)

  subscribeToMetadata();
  startAnalyticsLoop();

  // Eagerly create the tracking overlay if already in outline mode.
  // setOverlayMode() only creates it on mode *transitions*, so we need
  // this for the initial load case where overlayMode starts as 'outline'.
  if (overlayMode === 'outline') createTrackingOverlay();
};

const disableAnalytics = (): void => {
  resetZoom(false);
  analyticsActive = false;
  analyticsRevealed = true; // Prevent auto-reveal from re-opening
  analyticsToggleBtn.setAttribute('aria-pressed', 'false');
  analyticsStateSpan.textContent = 'Off';
  updatePanelSections(); // Hide analytics header/log but keep activity section
  unsubscribeFromMetadata();
  stopAnalyticsLoop();
  clearTrackedObjects();
  clearOverlay();
  lastMetadataPacket = null;

  // Disable metadata to save bandwidth (reconnects without enableMetadata param).
  if (currentNativeConnection) {
    currentNativeConnection.disableMetadata();
  }
};

// ── Cross-Device Activity Polling ─────────────────────────────────────────────

const ACTIVITY_STALE_MS = 120_000;

let pollInFlight = false;

const pollActiveObjects = async (): Promise<void> => {
  if (!systemRelay || !systemToken || pollInFlight) return;
  pollInFlight = true;

  try {
    const authHeaders = { Authorization: `Bearer ${systemToken.access_token}` };
    // Use a sliding time window — always look back to capture currently active tracks
    const windowMs = Date.now() - ACTIVITY_STALE_MS;
    const url = `https://${systemRelay}/rest/v4/analytics/objectTracks`
      + `?startTimeMs=${windowMs}&sortOrder=asc&limit=500`;
    const resp = await fetchWithRedirectAuthorization(url, { headers: authHeaders }, RELAY_FETCH_RETRIES);
    if (!resp.ok) {
      console.warn(`[activity-poll] HTTP ${resp.status}`);
      return;
    }
    const tracks: Array<{
      id: string;
      deviceId: string;
      objectTypeId: string;
      startTimeMs: number;
      endTimeMs?: number;
    }> = await resp.json();

    // Rebuild device activity from scratch each poll (sliding window = fresh data)
    deviceActivityMap.clear();

    const now = Date.now();
    for (const t of tracks) {
      const deviceId = clean(t.deviceId);
      let activity = deviceActivityMap.get(deviceId);
      if (!activity) {
        const cam = cameras.find(c => clean(c.id) === deviceId);
        activity = {
          deviceId,
          cameraName: cam?.name ?? deviceId.substring(0, 8),
          activeTrackCount: 0,
          objectTypes: new Map(),
          lastActiveMs: 0,
        };
        deviceActivityMap.set(deviceId, activity);
      }
      activity.activeTrackCount++;
      const typeShort = t.objectTypeId.split('.').pop() || t.objectTypeId;
      activity.objectTypes.set(typeShort, (activity.objectTypes.get(typeShort) ?? 0) + 1);
      const end = t.endTimeMs ?? t.startTimeMs;
      if (end > activity.lastActiveMs) activity.lastActiveMs = end;
    }

    renderActivityList();
  } catch (e) {
    console.warn('[activity-poll] Error:', e);
  } finally {
    pollInFlight = false;
    if (activityPollingActive) {
      const interval = parseInt(activityPollSelect.value, 10) || 15000;
      activityPollTimer = setTimeout(pollActiveObjects, interval);
    }
  }
};

const renderActivityList = (): void => {
  analyticsActivityList.textContent = '';

  const sorted = [...deviceActivityMap.values()]
    .sort((a, b) => b.lastActiveMs - a.lastActiveMs);

  // Auto-expand panel if not manually collapsed and there's activity on other devices
  if (sorted.length > 0 && !panelManuallyCollapsed && analyticsPanel.hidden) {
    showPanel();
  }

  if (sorted.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'color: var(--nx-overlay0); font-size: 0.65rem; padding: 0.3rem 0.4rem;';
    empty.textContent = 'No recent activity';
    analyticsActivityList.append(empty);
    return;
  }

  const now = Date.now();
  for (const activity of sorted) {
    const isActive = (now - activity.lastActiveMs) < 10_000;

    const item = document.createElement('div');
    item.className = 'analytics-activity-item';

    const dot = document.createElement('span');
    dot.className = `analytics-activity-dot ${isActive ? 'analytics-activity-dot--active' : 'analytics-activity-dot--stale'}`;

    const name = document.createElement('span');
    name.className = 'analytics-activity-name';
    name.textContent = activity.cameraName;

    const count = document.createElement('span');
    count.className = 'analytics-activity-count';
    count.textContent = `${activity.activeTrackCount} obj`;

    item.append(dot, name, count);

    if (activity.objectTypes.size > 0) {
      const types = document.createElement('span');
      types.className = 'analytics-activity-types';
      types.textContent = [...activity.objectTypes.entries()]
        .map(([type, n]) => `${type} x${n}`)
        .join(', ');
      item.append(types);
    }

    item.addEventListener('click', () => {
      const cam = cameras.find(c => clean(c.id) === activity.deviceId);
      if (cam) {
        // If a filter is active and this camera isn't in the dropdown, reset to "All"
        const inDropdown = [...cameraSelect.options].some(o => o.value === cam.id);
        if (!inDropdown) cameraFilter.reset();
        cameraSelect.value = cam.id;
        cameraSelect.dispatchEvent(new Event('change'));
      }
    });

    analyticsActivityList.append(item);
  }
};

const startActivityPolling = (): void => {
  if (activityPollingActive) return;
  activityPollingActive = true;
  deviceActivityMap.clear();
  activityPollGroup.hidden = false;
  pollActiveObjects(); // fire immediately
};

const stopActivityPolling = (): void => {
  activityPollingActive = false;
  if (activityPollTimer !== null) {
    clearTimeout(activityPollTimer);
    activityPollTimer = null;
  }
  deviceActivityMap.clear();
  analyticsActivityList.textContent = '';
  activityPollGroup.hidden = true;
};

const toggleAnalytics = (): void => {
  if (analyticsActive) {
    disableAnalytics();
  } else {
    // Re-enable metadata on the connection if it was disabled.
    if (currentNativeConnection && !currentNativeConnection.metadataEnabled) {
      currentNativeConnection.enableMetadata();
    }
    enableAnalytics();
  }
};

// ── Camera filters ──────────────────────────────────────────────────────────

const cameraFilters: DeviceFilter<BasicCameraInfo>[] = [
  {
    label: 'Fisheye',
    predicate: (d) => d.dewarpingParams?.enabled === true,
  },
  {
    label: 'Analytics',
    predicate: (d) => d.hasAnalytics,
  },
];

/** Populated lazily in systemSelected; holds repopulation callback. */
let repopulateCameras: ((filter: DeviceFilter<BasicCameraInfo> | null) => void) | null = null;

const cameraFilter = createDeviceFilterBar(
  cameraFilterBar,
  cameraFilters,
  (activeFilter) => repopulateCameras?.(activeFilter),
);

// ── System / Camera selection ───────────────────────────────────────────────

const compatibleOnlineSystem = (system: BasicSystemInfo): boolean =>
  system.stateOfHealth === 'online';

let systemSelectedEpoch = 0;

const systemSelected = async (): Promise<void> => {
  const epoch = ++systemSelectedEpoch;
  systemReady = false;
  stopActivityPolling();
  stopAndCleanup(); // Full reset when switching systems

  const cameraGroup = document.querySelector<HTMLDivElement>('#cameraGroup')!;
  cameraGroup.style.display = 'flex';

  try {
  populateSelect(cameraSelect, [{ value: 'loading', text: 'Loading Cameras...' }]);

  systemRelay = TRAFFIC_RELAY_HOST.replace('{systemId}', systemSelect.value);
  systemId = systemSelect.value;
  saveSession('selectedSystemId', systemId);

  systemToken = await getSystemToken(systemSelect.value);
  if (epoch !== systemSelectedEpoch) return;

  const authHeaders = { Authorization: `Bearer ${systemToken.access_token}` };

  const [devicesRes, serversRes] = await Promise.all([
    fetchWithRedirectAuthorization(`https://${systemRelay}/rest/v3/devices`, { headers: authHeaders }, RELAY_FETCH_RETRIES),
    fetchWithRedirectAuthorization(`https://${systemRelay}/rest/v2/servers`, { headers: authHeaders }, RELAY_FETCH_RETRIES),
  ]);
  if (epoch !== systemSelectedEpoch) return;

  if (!devicesRes.ok || !serversRes.ok) {
    throw new Error(`Fetch failed: devices=${devicesRes.status}, servers=${serversRes.status}`);
  }
  const rawDevices: Array<Record<string, unknown>> = await devicesRes.json();
  cameras = rawDevices.map((d) => ({
    id: d.id as string,
    name: d.name as string,
    status: d.status as string,
    deviceType: d.deviceType as string,
    serverId: d.serverId as string,
    dewarpingParams: parseDewarpingParams(
      (d.options as Record<string, unknown> | undefined)?.dewarpingParams as string | undefined,
    ),
    mediaStreams: parseMediaStreams(
      (d.mediaStreams as unknown) ?? (d.parameters as Record<string, unknown> | undefined)?.mediaStreams,
    ),
    hasAnalytics: Array.isArray(d.userEnabledAnalyticsEngineIds)
      && (d.userEnabledAnalyticsEngineIds as unknown[]).length > 0,
  }));
  const servers: BasicServerInfo[] = await serversRes.json();
  const serverNameById = new Map(servers.map((s) => [s.id, s.name]));

  const videoDeviceTypes = new Set(['Camera', 'MultisensorCamera']);
  const streamableStatuses = new Set(['Online', 'Recording']);

  const isStreamable = (d: BasicCameraInfo): boolean =>
    videoDeviceTypes.has(d.deviceType) && streamableStatuses.has(d.status);

  const cameraGroupLabel = (d: BasicCameraInfo): string | undefined => {
    if (isStreamable(d)) {
      return serverNameById.get(d.serverId) ?? 'Unknown Server';
    }
    if (!videoDeviceTypes.has(d.deviceType)) return d.deviceType || 'No Video';
    return d.status;
  };

  const populateCameraSelect = (filter: DeviceFilter<BasicCameraInfo> | null): void => {
    const previousValue = cameraSelect.value;

    const filtered = filter
      ? cameras.filter((c) => isStreamable(c) && filter.predicate(c))
      : cameras;

    const cameraOptions = filtered
      .sort((a, b) => {
        const aOk = isStreamable(a) ? 0 : 1;
        const bOk = isStreamable(b) ? 0 : 1;
        if (aOk !== bOk) return aOk - bOk;
        return a.name.localeCompare(b.name);
      })
      .map((camera) => ({
        value: camera.id,
        text: camera.name,
        disabled: !isStreamable(camera),
        group: cameraGroupLabel(camera),
      }));

    populateSelect(cameraSelect, cameraOptions);

    const savedCameraId = loadSession('selectedCameraId');
    if (savedCameraId && filtered.some((c) => c.id === savedCameraId && isStreamable(c))) {
      cameraSelect.value = savedCameraId;
    } else {
      const firstStreamable = filtered.find(isStreamable);
      if (firstStreamable) cameraSelect.value = firstStreamable.id;
    }

    if (cameraSelect.value !== previousValue) {
      cameraSelect.dispatchEvent(new Event('change'));
    }
  };

  // Update filter bar with streamable cameras and wire repopulation
  const streamableCameras = cameras.filter(isStreamable);
  cameraFilter.update(streamableCameras);
  repopulateCameras = populateCameraSelect;
  populateCameraSelect(null);

  // Mark system as ready (relay + token available)
  systemReady = true;
  startActivityPolling();

  cameraSelect.dispatchEvent(new Event('change'));

  } catch (err) {
    if (epoch !== systemSelectedEpoch) return;
    console.error('[v2-example] systemSelected failed:', err);
    populateSelect(cameraSelect, [{
      value: 'error',
      text: `Error: ${err instanceof Error ? err.message : String(err)}`,
    }]);
  }
};

const cameraSelected = (): void => {
  saveSession('selectedCameraId', cameraSelect.value);
  const selectedCamera = cameras.find((c) => c.id === cameraSelect.value);
  updateDewarpForCamera(selectedCamera);
  autoConnect();
};

// ── Speed selector toggle ───────────────────────────────────────────────────

const toggleSpeedSelector = (): void => {
  speedSelect.disabled = positionInput.value === '0';
};

// ── Sidebar toggle ──────────────────────────────────────────────────────────

const CHEVRON_LEFT = '\u00AB';  // «
const CHEVRON_RIGHT = '\u00BB'; // »

const toggleSidebar = (): void => {
  sidebar.classList.toggle('collapsed');
  sidebarToggle.textContent = sidebar.classList.contains('collapsed') ? CHEVRON_RIGHT : CHEVRON_LEFT;
};

// ── Initialize ──────────────────────────────────────────────────────────────

const urlParams = new URLSearchParams(window.location.search);

const tryRestoreSession = (): boolean => {
  const savedTokenStr = loadSession('cloudToken');
  if (!savedTokenStr) return false;

  try {
    cloudToken = JSON.parse(savedTokenStr);
    if (!cloudToken?.access_token || !cloudToken?.refresh_token) {
      cloudToken = null;
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

/** Populate the system select from a filtered subset of systems. */
const populateSystems = (systems: BasicSystemInfo[]): void => {
  // Sort: online first, then alphabetical
  const sorted = [...systems].sort((a, b) => {
    const aOnline = a.stateOfHealth === 'online' ? 0 : 1;
    const bOnline = b.stateOfHealth === 'online' ? 0 : 1;
    if (aOnline !== bOnline) return aOnline - bOnline;
    return a.name.localeCompare(b.name);
  });

  const systemOptions = sorted.map((system) => ({
    value: system.id,
    text: system.name,
    disabled: !compatibleOnlineSystem(system),
  }));

  populateSelect(systemSelect, systemOptions);

  const savedSystemId = loadSession('selectedSystemId');
  if (savedSystemId && sorted.some((s) => s.id === savedSystemId)) {
    systemSelect.value = savedSystemId;
  } else {
    const defaultSystem = sorted.find(compatibleOnlineSystem) || sorted[0];
    if (defaultSystem) systemSelect.value = defaultSystem.id;
  }

  systemSelect.dispatchEvent(new Event('change'));
};

const initEndpointForm = async (accessToken: string): Promise<void> => {
  show('endpoint-data');
  showLogoutButton();

  const cdbResponse = await fetch(systemsEndpoint(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then((res) => res.json());
  const systems: BasicSystemInfo[] = cdbResponse.systems ?? cdbResponse;

  systemsInfo = systems;

  // Collect distinct customizations, ranked by most online then most total
  const customizations = [...new Set(systems.map((s) => s.customization))];
  const ranked = customizations
    .map((c) => {
      const group = systems.filter((s) => s.customization === c);
      return { c, online: group.filter((s) => s.stateOfHealth === 'online').length, total: group.length };
    })
    .sort((a, b) => b.online - a.online || b.total - a.total);

  if (ranked.length > 1) {
    // Show customization dropdown
    customizationGroup.hidden = false;
    populateSelect(customizationSelect, ranked.map(({ c }) => ({ value: c, text: c })));
    customizationSelect.value = ranked[0].c;

    customizationSelect.addEventListener('change', () => {
      populateSystems(systems.filter((s) => s.customization === customizationSelect.value));
    });

    populateSystems(systems.filter((s) => s.customization === ranked[0].c));
  } else {
    // Single customization — hide dropdown, show all
    populateSystems(systems);
  }
};

const handleOAuthCallback = async (): Promise<void> => {
  const code = urlParams.get('code');
  if (!code) return;

  try {
    const res = await getToken({
      grant_type: 'authorization_code',
      response_type: 'token',
      code,
    });
    cloudToken = await res.json();
    saveSession('cloudToken', JSON.stringify(cloudToken));
    await initEndpointForm(cloudToken!.access_token);
  } catch {
    show();
  } finally {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
};

// ── Boot sequence ───────────────────────────────────────────────────────────

(async () => {
  if (urlParams.has('code')) {
    // OAuth callback — show "AUTHORIZING..." then proceed
    show();
    typewriterCta?.type('AUTHORIZING...', 35, async () => {
      await handleOAuthCallback();
    });
  } else if (tryRestoreSession()) {
    // Has valid session — show "CONTINUE AS {email}"
    show();
    const email = getEmailFromToken(cloudToken!.access_token);
    const ctaLabel = email ? `CONTINUE AS ${email.toUpperCase()}` : 'CONTINUE';
    setTimeout(() => {
      typewriterCta?.type(ctaLabel, 30);
    }, 1400);

    // CTA click → proceed to app
    ctaButton.addEventListener('click', async (e) => {
      e.preventDefault();
      typewriterCta?.clear();
      typewriterCta?.type('LOADING...', 50, async () => {
        await initEndpointForm(cloudToken!.access_token);
      });
    });

    // "Login as another user" — clear session, redirect to OAuth
    switchUserLink.hidden = false;
    switchUserLink.addEventListener('click', (e) => {
      e.preventDefault();
      sessionStorage.clear();
      localStorage.removeItem('cloudInstance');
      redirectOauth();
    });
  } else {
    // Not authenticated — show "CONNECT VIA CLOUD"
    show();
    setTimeout(() => {
      typewriterCta?.type('CONNECT VIA CLOUD', 55);
    }, 1400);

    // CTA click → redirect to OAuth
    ctaButton.addEventListener('click', (e) => {
      e.preventDefault();
      redirectOauth();
    });
  }
})();

// ── Event listeners ─────────────────────────────────────────────────────────

logoutBtn.addEventListener('click', () => {
  sessionStorage.clear();
  localStorage.removeItem('cloudInstance');
  window.location.reload();
});

systemSelect.addEventListener('change', systemSelected);
cameraSelect.addEventListener('change', cameraSelected);
positionInput.addEventListener('change', toggleSpeedSelector);
positionInput.addEventListener('input', toggleSpeedSelector);
sidebarToggle.addEventListener('click', toggleSidebar);

speedSelect.addEventListener('change', () => {
  if (currentNativeConnection) {
    const speed: number | 'unlimited' =
      speedSelect.value === 'unlimited' ? 'unlimited' : parseFloat(speedSelect.value);
    currentNativeConnection.updateSpeed(speed);
  }
});

// ── Dewarp event listeners ──────────────────────────────────────────────

dewarpToggleBtn.addEventListener('click', toggleDewarping);

dewarpPanSlider.addEventListener('input', () => {
  currentViewData.xAngle = toRadians(parseFloat(dewarpPanSlider.value));
  enforceViewLimits();
});

dewarpTiltSlider.addEventListener('input', () => {
  currentViewData.yAngle = toRadians(parseFloat(dewarpTiltSlider.value));
  enforceViewLimits();
});

dewarpZoomSlider.addEventListener('input', () => {
  currentViewData.fov = toRadians(parseFloat(dewarpZoomSlider.value));
  enforceViewLimits();
});

dewarpRotationSlider.addEventListener('input', () => {
  currentMediaData.fovRot = parseFloat(dewarpRotationSlider.value);
});

dewarpResetBtn.addEventListener('click', () => {
  currentViewData = createDefaultViewData();
  currentMediaData.fovRot = 0;
  updateDewarpSliders();
});

// ── Analytics event listeners ────────────────────────────────────────────

analyticsToggleBtn.addEventListener('click', toggleAnalytics);
analyticsClearBtn.addEventListener('click', () => { clearTrackedObjects(); });
analyticsPanelToggle.addEventListener('click', () => {
  if (analyticsPanel.hidden) {
    expandPanel();
  } else {
    collapsePanel(true);
  }
});
overlayModesContainer.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest('.overlay-mode-btn') as HTMLElement | null;
  if (!btn?.dataset.mode) return;
  setOverlayMode(btn.dataset.mode as OverlayMode);
});
activityPollSelect.addEventListener('change', () => {
  if (activityPollingActive) {
    if (activityPollTimer !== null) clearTimeout(activityPollTimer);
    activityPollTimer = setTimeout(pollActiveObjects, 0);
  }
});

// ── Zoom keyboard shortcut ───────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && zoomState.status !== 'idle') {
    resetZoom();
  }
});

// ── Zoom transition listener ─────────────────────────────────────────────
zoomTransformTarget.addEventListener('transitionend', (e) => {
  if (e.propertyName === 'transform' && zoomState.status === 'zooming-in') {
    zoomState.status = 'zoomed';
  }
});

/**
 * Freeze the current video frame as the poster so the browser shows it
 * instead of black during the brief track-swap gap.
 */
const freezeFrame = (): void => {
  if (!videoElement.videoWidth) return;
  const c = document.createElement('canvas');
  c.width = videoElement.videoWidth;
  c.height = videoElement.videoHeight;
  c.getContext('2d')!.drawImage(videoElement, 0, 0);
  videoElement.poster = c.toDataURL('image/jpeg', 0.85);
};

/**
 * Seamless MSE reconnect: detach the old connection from StreamManager
 * (keeping it alive so the video keeps playing), create a new connection
 * with the desired quality, and only dispose the old one once the new
 * connection has produced its first track.
 */
const seamlessMseReconnect = (): void => {
  if (!systemReady || !cameraSelect.value || cameraSelect.value === 'loading') return;

  // Lightweight analytics cleanup — preserve panel state across reconnect
  unsubscribeFromMetadata();
  clearTrackedObjects();
  lastMetadataPacket = null;
  analyticsRevealed = false; // Allow auto-reveal if reconnecting to a different camera

  const oldConnection = currentNativeConnection;
  const oldUnsubs = nativeUnsubscribers;
  nativeUnsubscribers = [];
  currentNativeConnection = null;

  // Detach old connection from StreamManager so connect() creates a fresh one,
  // but the old connection stays alive — video keeps playing its MSE buffer.
  if (oldConnection) {
    StreamManager.getInstance().detach(oldConnection.connectionKey);
  }

  // Freeze frame as safety net in case the old MSE source closes early.
  freezeFrame();

  const selectedCamera = cameras.find((c) => clean(c.id) === clean(cameraSelect.value));
  const cameraId = clean(cameraSelect.value);
  const positionMs = parseFloat(positionInput.value) || 0;
  const speed: number | 'unlimited' =
    speedSelect.value === 'unlimited' ? 'unlimited' : parseFloat(speedSelect.value);

  const urlConfig = {
    systemId,
    cameraId,
    serverId: selectedCamera?.serverId ? clean(selectedCamera.serverId) : undefined,
    accessToken: () => systemToken.access_token,
    targetStream: getTargetStreamFromQuality(streamQualitySelect.value),
    mediaStreams: selectedCamera?.mediaStreams,
    position: positionMs,
    speed,
    apiContext: {
      version: ApiVersions.v2,
      oneTimeToken: () => fetchOneTimeTicket(),
    },
  };

  updateConnectionState(PeerState.connecting);

  const connection = StreamManager.getInstance().connect(urlConfig, videoElement);
  currentNativeConnection = connection;

  nativeUnsubscribers.push(
    connection.on('track', (detail: TrackEventDetail) => {
      const newStream = detail.streams[0];
      const newTrack = newStream?.getVideoTracks()[0];
      if (!newTrack) return;

      const currentStream = videoElement.srcObject as MediaStream | null;

      // If we have a live stream on the video element, swap tracks in-place
      // so srcObject identity never changes (avoids pipeline rebuild gap).
      if (currentStream && currentStream.getVideoTracks().length > 0) {
        currentStream.addTrack(newTrack);

        const finalize = () => {
          for (const old of currentStream.getVideoTracks()) {
            if (old !== newTrack) currentStream.removeTrack(old);
          }
          for (const unsub of oldUnsubs) unsub();
          oldConnection?.dispose();
          videoElement.poster = '';
          attachResolutionTracker();
        };

        // Defer old-track removal until new track has produced a frame.
        if (newTrack.muted) {
          newTrack.addEventListener('unmute', finalize, { once: true });
        } else {
          finalize();
        }
      } else {
        // No existing stream — first connection, just set srcObject directly.
        for (const unsub of oldUnsubs) unsub();
        oldConnection?.dispose();
        videoElement.srcObject = newStream;
        videoElement.poster = '';
        videoElement.muted = true;
        videoElement.autoplay = true;
        videoElement.play().catch(() => {/* interrupted by new load — expected during rapid switch */});
        attachResolutionTracker();
      }
    }),
  );

  nativeUnsubscribers.push(
    connection.on('statechange', (detail: StateChangeEventDetail) => {
      updateConnectionState(detail.state);
    }),
  );

  nativeUnsubscribers.push(
    connection.on('error', (error: ConnectionError) => {
      // On error, clean up old connection too.
      for (const unsub of oldUnsubs) unsub();
      oldConnection?.dispose();
      updateConnectionState(PeerState.failed);
      handleStreamError(error);
    }),
  );

  // Always subscribe to metadata events for auto-reveal detection.
  subscribeToMetadata();
};

// Quality change: SRTP cameras use in-place track swap via the managed stream;
// MSE cameras need a full reconnect but use seamless overlap to avoid black flash.
streamQualitySelect.addEventListener('change', () => {
  if (!currentNativeConnection) {
    autoConnect();
    return;
  }

  if (currentNativeConnection.deliveryMethod === 'mse') {
    seamlessMseReconnect();
    return;
  }

  freezeFrame();

  // Set targetStream — this tells the optimizer to respect the user's choice
  // and immediately triggers requestHighRes/releaseHighRes as needed.
  currentNativeConnection.targetStream = getTargetStreamFromQuality(streamQualitySelect.value);
});
