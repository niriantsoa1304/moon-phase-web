/*
 * moon3d.js — Lune 3D en WebGL, sans dépendance.
 * Issue de la maquette « Moon Phase Calculator ».
 *
 * Utilisation :
 *   <canvas id="moon" width="1240" height="1240" style="width:620px;height:620px"></canvas>
 *   <script src="moon3d.js"></script>
 *   <script>
 *     const moon = createMoon3D(document.getElementById("moon"), { texture: "moon.jpg" });
 *     moon.setPhase(0.35);   // fraction du cycle : 0 = nouvelle lune, 0.5 = pleine lune
 *     // moon.destroy();     // arrête l'animation
 *   </script>
 *
 * - Rotation libre à la souris / au doigt (horizontal + vertical).
 * - Rotation automatique lente, désactivée si prefers-reduced-motion.
 * - texture : carte de la Lune équirectangulaire (sinon surface procédurale).
 * - Renvoie null si WebGL n'est pas disponible (prévoir une image de secours).
 */
(function (global) {
  var VS = "attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}";
  var FS = [
    "precision highp float;",
    "uniform vec2 uRes;uniform vec3 uSun;uniform float uRot;uniform float uTilt;uniform sampler2D uTex;uniform float uHasTex;",
    "float h1(vec3 p){p=fract(p*0.3183099+0.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}",
    "float vn(vec3 x){vec3 i=floor(x);vec3 f=fract(x);f=f*f*(3.0-2.0*f);",
    " return mix(mix(mix(h1(i),h1(i+vec3(1,0,0)),f.x),mix(h1(i+vec3(0,1,0)),h1(i+vec3(1,1,0)),f.x),f.y),",
    "            mix(mix(h1(i+vec3(0,0,1)),h1(i+vec3(1,0,1)),f.x),mix(h1(i+vec3(0,1,1)),h1(i+vec3(1,1,1)),f.x),f.y),f.z);}",
    "float fbm(vec3 p){float a=0.5;float s=0.0;for(int i=0;i<5;i++){s+=a*vn(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=0.5;}return s;}",
    "float craters(vec3 p){vec3 i=floor(p);vec3 f=fract(p);float v=0.0;",
    " for(int x=-1;x<=1;x++){for(int y=-1;y<=1;y++){for(int z=-1;z<=1;z++){",
    "  vec3 o=vec3(float(x),float(y),float(z));vec3 c=i+o;",
    "  if(h1(c+5.1)<0.5){vec3 rp=vec3(h1(c),h1(c+7.13),h1(c+13.7));",
    "   float rad=0.18+0.22*h1(c+3.3);float k=length(o+rp-f)/rad;",
    "   if(k<1.0){v-=0.6*(1.0-k*k);}v+=0.45*exp(-(k-1.0)*(k-1.0)*40.0);}",
    " }}}return v;}",
    "void main(){",
    " vec2 uv=(gl_FragCoord.xy*2.0-uRes)/uRes.y;float R=0.8;float r=length(uv);float px=2.0/uRes.y;",
    " vec3 sun=normalize(uSun);float ill=0.5+0.5*sun.z;",
    " float g=exp(-max(r-R,0.0)*10.0)*0.20*(0.15+0.85*ill);",
    " vec4 glow=vec4(vec3(0.93,0.87,0.72)*g,g);",
    " if(r>R){gl_FragColor=glow;return;}",
    " vec3 n=vec3(uv/R,0.0);n.z=sqrt(max(0.0,1.0-dot(n.xy,n.xy)));",
    " float ct=cos(uTilt);float st=sin(uTilt);vec3 q=vec3(n.x,ct*n.y-st*n.z,st*n.y+ct*n.z);",
    " float cy=cos(uRot);float sy=sin(uRot);vec3 p=vec3(cy*q.x+sy*q.z,q.y,-sy*q.x+cy*q.z);",
    " float alb;",
    " if(uHasTex>0.5){float lon=atan(p.x,p.z);float lat=asin(clamp(p.y,-1.0,1.0));alb=texture2D(uTex,vec2(0.5+lon/6.2831853,0.5-lat/3.1415927)).r*1.18;}",
    " else{float maria=smoothstep(0.47,0.63,fbm(p*1.5+vec3(2.0,5.0,1.0)));alb=0.74-0.32*maria+0.20*(fbm(p*8.0)-0.5)+0.10*craters(p*5.0)+0.06*craters(p*13.0);}",
    " alb=clamp(alb,0.05,1.0);",
    " float ndl=dot(n,sun);",
    " float light=smoothstep(-0.03,0.22,ndl)*(0.62+0.38*max(ndl,0.0));",
    " vec3 col=vec3(0.96,0.94,0.89)*alb*light;",
    " col+=vec3(0.09,0.12,0.20)*alb*0.22*(1.0-smoothstep(-0.1,0.12,ndl));",
    " col*=0.85+0.15*n.z;",
    " float a=1.0-smoothstep(R-px*1.5,R,r);",
    " gl_FragColor=vec4(col*a,a)+glow*(1.0-a);",
    "}"
  ].join("\n");

  function createMoon3D(canvas, opts) {
    opts = opts || {};
    var gl = null;
    try { gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: true }); } catch (e) {}
    if (!gl) return null;

    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return null;
    var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);

    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, "a"); gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var uRes = gl.getUniformLocation(pr, "uRes"), uSun = gl.getUniformLocation(pr, "uSun"),
        uRot = gl.getUniformLocation(pr, "uRot"), uTilt = gl.getUniformLocation(pr, "uTilt"),
        uTex = gl.getUniformLocation(pr, "uTex"), uHasTex = gl.getUniformLocation(pr, "uHasTex");
    var hasTex = 0; gl.uniform1i(uTex, 0);
    if (opts.texture) {
      var img = new Image();
      img.onload = function () {
        try {
          var t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, t);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
          hasTex = 1;
        } catch (e) { hasTex = 0; }
      };
      img.src = opts.texture;
    }

    var state = { phase: opts.phase || 0, rotY: 0.0, tilt: 0.08, drag: null, raf: 0 };
    var speed = opts.dragSpeed || 0.008;
    var reduce = false;
    try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

    canvas.style.touchAction = "none";
    canvas.style.cursor = "grab";
    function down(e) { state.drag = { x: e.clientX, y: e.clientY }; try { canvas.setPointerCapture(e.pointerId); } catch (_) {} canvas.style.cursor = "grabbing"; }
    function move(e) {
      if (!state.drag) return;
      state.rotY -= (e.clientX - state.drag.x) * speed;
      state.tilt -= (e.clientY - state.drag.y) * speed;
      state.drag.x = e.clientX; state.drag.y = e.clientY;
    }
    function up() { state.drag = null; canvas.style.cursor = "grab"; }
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);

    function frame() {
      if (!state.drag && !reduce) state.rotY += 0.0015;
      var th = 2 * Math.PI * state.phase;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform3f(uSun, Math.sin(th), 0.0, -Math.cos(th)); // croissante éclairée à droite (hémisphère nord)
      gl.uniform1f(uRot, state.rotY);
      gl.uniform1f(uTilt, state.tilt);
      gl.uniform1f(uHasTex, hasTex);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      state.raf = requestAnimationFrame(frame);
    }
    frame();

    return {
      setPhase: function (f) { state.phase = ((f % 1) + 1) % 1; },
      destroy: function () {
        cancelAnimationFrame(state.raf);
        canvas.removeEventListener("pointerdown", down);
        canvas.removeEventListener("pointermove", move);
        canvas.removeEventListener("pointerup", up);
        canvas.removeEventListener("pointercancel", up);
      }
    };
  }

  global.createMoon3D = createMoon3D;
})(window);