import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

export function createBackground(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const pointer = new THREE.Vector2(0.5, 0.5);
  const targetPointer = new THREE.Vector2(0.5, 0.5);
  const pointerVelocity = new THREE.Vector2();
  const targetVelocity = new THREE.Vector2();
  const zeroVelocity = new THREE.Vector2();
  const flowMouse = new THREE.Vector2(-1, -1);
  let lastPointerEvent = null;
  let pointerMoved = false;

  const flowScene = new THREE.Scene();
  const flowCamera = new THREE.Camera();
  const flowOptions = {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
  };
  let flowRead = new THREE.WebGLRenderTarget(128, 128, flowOptions);
  let flowWrite = new THREE.WebGLRenderTarget(128, 128, flowOptions);

  const flowMaterial = new THREE.ShaderMaterial({
    uniforms: {
      tMap: { value: flowRead.texture },
      uMouse: { value: flowMouse },
      uVelocity: { value: pointerVelocity },
      uAspect: { value: 1 },
      uFalloff: { value: 0.098 },
      uAlpha: { value: 0.25 },
      uDissipation: { value: 0.8 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform sampler2D tMap;
      uniform vec2 uMouse;
      uniform vec2 uVelocity;
      uniform float uAspect;
      uniform float uFalloff;
      uniform float uAlpha;
      uniform float uDissipation;
      varying vec2 vUv;

      void main() {
        vec4 flow = texture2D(tMap, vUv) * uDissipation;
        vec2 cursor = vUv - uMouse;
        cursor.x *= uAspect;
        float speed = min(1.0, length(uVelocity));
        vec3 stamp = vec3(uVelocity * vec2(1.0, -1.0), 1.0 - pow(1.0 - speed, 3.0));
        float falloff = smoothstep(uFalloff, 0.0, length(cursor)) * uAlpha;
        flow.rgb = mix(flow.rgb, stamp, falloff);
        gl_FragColor = flow;
      }
    `,
    depthWrite: false,
    depthTest: false,
  });

  flowScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), flowMaterial));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uPointer: { value: pointer },
      uFlow: { value: flowRead.texture },
    },
    vertexShader: `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;

      uniform float uTime;
      uniform vec2 uResolution;
      uniform vec2 uPointer;
      uniform sampler2D uFlow;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float valueNoise(vec2 p) {
        vec2 cell = floor(p);
        vec2 local = fract(p);
        local = local * local * (3.0 - 2.0 * local);

        float a = hash(cell);
        float b = hash(cell + vec2(1.0, 0.0));
        float c = hash(cell + vec2(0.0, 1.0));
        float d = hash(cell + vec2(1.0, 1.0));

        return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
      }

      float flowNoise(vec2 p) {
        float total = 0.0;
        float weight = 0.55;

        for (int i = 0; i < 4; i++) {
          total += valueNoise(p) * weight;
          p = p * 2.03 + vec2(4.7, 1.3);
          weight *= 0.48;
        }

        return total;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / uResolution.xy;
        float aspect = uResolution.x / uResolution.y;
        float time = uTime * 0.105;
        vec2 pointerOffset = (uPointer - 0.5) * vec2(0.045, 0.035);
        vec4 cursorFlow = texture2D(uFlow, uv);

        // Build the noise in stream-space so every layer travels in the same
        // direction and reads as one continuous current.
        vec2 flowUv = uv + pointerOffset - cursorFlow.rg * 0.055;
        float portraitLayout = 1.0 - step(0.8, aspect);
        float portraitHeight = mix(1.0, 1.12, portraitLayout);
        flowUv.y = (flowUv.y - 0.5) * portraitHeight + 0.5;
        vec2 flowDirection = normalize(vec2(1.0, 0.46));
        float alongFlow = dot(flowUv, flowDirection);
        float acrossFlow = flowUv.y - flowUv.x * 0.46;
        vec2 streamUv = vec2(alongFlow - time * 1.45, acrossFlow);

        float broadWarp = flowNoise(streamUv * vec2(1.35, 2.15));
        float fineWarp = flowNoise(streamUv * vec2(3.1, 4.0) + vec2(time * 0.38, 7.2));
        float backDrift = flowNoise(streamUv * vec2(0.72, 1.12) + vec2(time * 0.2, 3.7));
        float surfaceNoise = flowNoise(streamUv * vec2(2.15, 3.35) + vec2(-time * 0.28, 11.4));
        // A large travelling S bends the whole current. The second harmonic
        // prevents the motion from feeling like a mechanically perfect sine.
        float sWave = sin(alongFlow * 3.25 - time * 4.8) * 0.34;
        sWave += sin(alongFlow * 6.1 - time * 3.25 + 1.4) * 0.085;

        // Positive offset lowers the complete current in screen space.
        float stream = acrossFlow - sWave + 0.075;
        stream += (broadWarp - 0.5) * 0.42 + (fineWarp - 0.5) * 0.12;

        float warmBand = 1.0 - smoothstep(0.12, 0.48, abs(stream - 0.28));
        float hotBand = 1.0 - smoothstep(0.035, 0.22, abs(stream - 0.18));
        float yellowBand = 1.0 - smoothstep(0.055, 0.34, abs(stream - 0.57));

        vec3 color = mix(
          vec3(0.945, 0.935, 0.90),
          vec3(0.91, 0.66, 0.49),
          smoothstep(0.02, 0.78, stream)
        );
        color = mix(color, vec3(0.96, 0.74, 0.14), yellowBand * 0.7);
        color = mix(color, vec3(0.97, 0.31, 0.015), warmBand * 0.84);
        color = mix(color, vec3(0.88, 0.075, 0.012), hotBand * 0.48);

        // Broad procedural texture carried by the flow, rather than a
        // screen-space film-grain overlay.
        float organicTexture = (surfaceNoise - 0.5) * 0.16;
        color *= 1.0 + organicTexture;
        color = mix(color, color + vec3(0.035, 0.018, 0.0), broadWarp * 0.12);

        // As the S turns downward, briefly reveal the pale field in the upper
        // right. Tying this opening to the wave keeps it part of the flow.
        float upperRight = smoothstep(0.58, 0.96, uv.x) * smoothstep(0.58, 0.94, uv.y);
        float openingPhase = smoothstep(0.1, 0.34, sWave);
        float flowingOpening = upperRight * openingPhase * (0.78 + (backDrift - 0.5) * 0.22);
        color = mix(color, vec3(0.975, 0.965, 0.925), flowingOpening * 0.88);

        // Keep the lower field open and milky, with slow motion visible behind it.
        float lowerField = 1.0 - smoothstep(0.015, 0.39, uv.y + (backDrift - 0.5) * 0.2);
        vec3 milkyBase = mix(vec3(0.93, 0.91, 0.86), vec3(0.985, 0.975, 0.94), backDrift);
        color = mix(color, milkyBase, lowerField * 0.56);

        // Curated complementary palette: preserve the stream's structure but
        // translate its warm regions into navy, blue, cyan and aqua.
        vec3 coolColor = vec3(0.031, 0.102, 0.2);
        coolColor = mix(coolColor, vec3(0.086, 0.278, 0.847), yellowBand * 0.9);
        coolColor = mix(coolColor, vec3(0.086, 0.545, 1.0), warmBand * 0.82);
        coolColor = mix(coolColor, vec3(0.098, 0.835, 0.902), hotBand * 0.72);
        coolColor = mix(coolColor, vec3(0.608, 0.949, 0.91), hotBand * hotBand * 0.7);
        coolColor *= 1.0 + organicTexture * 0.7;

        float flowStrength = smoothstep(0.015, 0.28, cursorFlow.b);
        color = mix(color, coolColor, flowStrength * 0.92);

        gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
      }
    `,
  });

  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

  function resize() {
    const pixelRatioCap = window.innerWidth < 800 ? 1 : 1.5;
    const pixelRatio = Math.min(window.devicePixelRatio, pixelRatioCap);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    material.uniforms.uResolution.value.set(window.innerWidth * pixelRatio, window.innerHeight * pixelRatio);
    flowMaterial.uniforms.uAspect.value = window.innerWidth / window.innerHeight;
  }

  function onPointerMove(event) {
    targetPointer.set(event.clientX / window.innerWidth, 1 - event.clientY / window.innerHeight);
    flowMouse.copy(targetPointer);

    const now = performance.now();
    if (lastPointerEvent) {
      const delta = Math.max(14, now - lastPointerEvent.time);
      targetVelocity.set(
        (event.clientX - lastPointerEvent.x) / delta,
        (event.clientY - lastPointerEvent.y) / delta,
      );
    }
    lastPointerEvent = { x: event.clientX, y: event.clientY, time: now };
    pointerMoved = true;
  }

  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", onPointerMove, { passive: true });

  const clock = new THREE.Clock();
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function render() {
    pointer.lerp(targetPointer, reduceMotion ? 1 : 0.22);
    pointerVelocity.lerp(pointerMoved ? targetVelocity : zeroVelocity, pointerMoved ? 0.5 : 0.1);
    if (!pointerMoved) flowMouse.set(-1, -1);

    flowMaterial.uniforms.tMap.value = flowRead.texture;
    renderer.setRenderTarget(flowWrite);
    renderer.render(flowScene, flowCamera);
    renderer.setRenderTarget(null);

    const previousFlow = flowRead;
    flowRead = flowWrite;
    flowWrite = previousFlow;
    material.uniforms.uFlow.value = flowRead.texture;

    pointerMoved = false;
    targetVelocity.set(0, 0);
    material.uniforms.uTime.value = reduceMotion ? 0 : clock.getElapsedTime();
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  render();
}
