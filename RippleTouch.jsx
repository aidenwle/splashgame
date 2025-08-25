//function for shader click interaction
import React, { useEffect, useRef } from 'react';
import fragSrc from './rippleWaves.frag?raw';

const MAX_RIPPLES = 10;

export default function ShaderCanvas() {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const cleanupRef = useRef(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { 
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      powerPreference: 'high-performance'
    });
    
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();

    const vertexSrc = `
      attribute vec4 a_position;
      void main() {
        gl_Position = a_position;
      }
    `;

    const createShader = (type, src) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vShader = createShader(gl.VERTEX_SHADER, vertexSrc);
    const fShader = createShader(gl.FRAGMENT_SHADER, fragSrc);
    
    if (!vShader || !fShader) return;

    const program = gl.createProgram();
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }
    
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uniforms = {
      iResolution: gl.getUniformLocation(program, 'iResolution'),
      iTime: gl.getUniformLocation(program, 'iTime'),
      pixelCount: gl.getUniformLocation(program, 'u_pixelCount'),
      rippleCount: gl.getUniformLocation(program, 'u_rippleCount'),
      centers: [],
      startTimes: []
    };

    for (let i = 0; i < MAX_RIPPLES; i++) {
      uniforms.centers.push(gl.getUniformLocation(program, `u_rippleCenters[${i}]`));
      uniforms.startTimes.push(gl.getUniformLocation(program, `u_rippleStartTimes[${i}]`));
    }

    const startTime = performance.now();
    const rippleCenters = new Float32Array(MAX_RIPPLES * 2);
    const rippleStartTimes = new Float32Array(MAX_RIPPLES);
    let rippleCount = 0;
    let rippleIndex = 0;

    const addRipple = (normX, normY) => {
      const t = (performance.now() - startTime) / 1000;
      rippleCenters[rippleIndex * 2] = normX;
      rippleCenters[rippleIndex * 2 + 1] = normY;
      rippleStartTimes[rippleIndex] = t;
      rippleIndex = (rippleIndex + 1) % MAX_RIPPLES;
      rippleCount = Math.min(rippleCount + 1, MAX_RIPPLES);
    };

    const handleInteraction = (e) => {
      const isTouch = e.touches != null;
      const clientX = isTouch ? e.touches[0].clientX : e.clientX;
      const clientY = isTouch ? e.touches[0].clientY : e.clientY;
      const rect = canvas.getBoundingClientRect();
      
      addRipple(
        (clientX - rect.left) / rect.width,
        1 - (clientY - rect.top) / rect.height
      );
    };

    const handleRippleEvent = (e) => {
      const { x, y } = e.detail;
      const rect = canvas.getBoundingClientRect();
      
      addRipple(
        (x - rect.left) / rect.width,
        1 - (y - rect.top) / rect.height
      );
    };

    const handleResize = () => {
      resizeCanvas();
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction, { passive: true });
    window.addEventListener('ripple', handleRippleEvent);
    window.addEventListener('resize', handleResize);

    const render = () => {
      const now = (performance.now() - startTime) / 1000;
      
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uniforms.iResolution, canvas.width, canvas.height);
      gl.uniform1f(uniforms.iTime, now);
      gl.uniform1i(uniforms.rippleCount, rippleCount);
      gl.uniform1f(uniforms.pixelCount, 100.0);

      for (let i = 0; i < MAX_RIPPLES; i++) {
        gl.uniform2f(uniforms.centers[i], rippleCenters[i * 2], rippleCenters[i * 2 + 1]);
        gl.uniform1f(uniforms.startTimes[i], rippleStartTimes[i]);
      }

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationRef.current = requestAnimationFrame(render);
    };

    render();

    cleanupRef.current = () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('ripple', handleRippleEvent);
      window.removeEventListener('resize', handleResize);
      
      gl.deleteProgram(program);
      gl.deleteShader(vShader);
      gl.deleteShader(fShader);
      gl.deleteBuffer(buffer);
    };

    return cleanupRef.current;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-screen h-screen -z-10"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none'
      }}
    />
  );
}