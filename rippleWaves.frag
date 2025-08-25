// rippleWaves.frag

precision mediump float;

uniform float iTime;
uniform vec2  iResolution;
uniform float u_pixelCount;

#define MAX_RIPPLES 10
uniform vec2  u_rippleCenters[MAX_RIPPLES];
uniform float u_rippleStartTimes[MAX_RIPPLES];
uniform int   u_rippleCount;


float colormap_red(float x) {
    if (x < 0.0) {
        return 54.0 / 255.0;
    } else if (x < 20049.0 / 82979.0) {
        return (829.79 * x + 54.51) / 255.0;
    } else {
        return 1.0;
    }
}

float colormap_green(float x) {
    if (x < 20049.0 / 82979.0) {
        return 0.0;
    } else if (x < 327013.0 / 810990.0) {
        return (8546482679670.0 / 10875673217.0 * x
                - 2064961390770.0 / 10875673217.0) / 255.0;
    } else if (x <= 1.0) {
        return (103806720.0 / 483977.0 * x
                + 19607415.0 / 483977.0) / 255.0;
    } else {
        return 1.0;
    }
}

float colormap_blue(float x) {
    if (x < 0.0) {
        return 54.0 / 255.0;
    } else if (x < 7249.0 / 82979.0) {
        return (829.79 * x + 54.51) / 255.0;
    } else if (x < 20049.0 / 82979.0) {
        return 127.0 / 255.0;
    } else if (x < 327013.0 / 810990.0) {
        return (792.0224934136139 * x - 64.36479073560233) / 255.0;
    } else {
        return 1.0;
    }
}

vec3 rgb2hsl(vec3 c) {
    float r = c.r, g = c.g, b = c.b;
    float maxc = max(max(r, g), b);
    float minc = min(min(r, g), b);
    float h, s, l = (maxc + minc) * 0.5;

    if (maxc == minc) {
        h = s = 0.0;
    } else {
        float d = maxc - minc;
        s = l > 0.5 ? d / (2.0 - maxc - minc) : d / (maxc + minc);
        if (maxc == r) {
            h = (g - b) / d + (g < b ? 6.0 : 0.0);
        } else if (maxc == g) {
            h = (b - r) / d + 2.0;
        } else {
            h = (r - g) / d + 4.0;
        }
        h /= 6.0;
    }
    return vec3(h, s, l);
}

float hue2rgb(float p, float q, float t) {
    if (t < 0.0) t += 1.0;
    if (t > 1.0) t -= 1.0;
    if (t < 1.0 / 6.0) return p + (q - p) * 6.0 * t;
    if (t < 1.0 / 2.0) return q;
    if (t < 2.0 / 3.0) return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
    return p;
}

vec3 hsl2rgb(vec3 hsl) {
    float h = hsl.x, s = hsl.y, l = hsl.z;
    float r, g, b;

    if (s == 0.0) {
        r = g = b = l;
    } else {
        float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
        float p = 2.0 * l - q;
        r = hue2rgb(p, q, h + 1.0 / 3.0);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1.0 / 3.0);
    }

    return vec3(r, g, b);
}

vec4 colormap(float x) {
    vec3 orig = vec3(
        colormap_red(x),
        colormap_green(x),
        colormap_blue(x)
    );
    vec3 hsl = rgb2hsl(orig);

    hsl.x = mod(hsl.x + 0.62 + 0.04 * sin(x * 8.0), 1.0);

    float shadowMask = smoothstep(0.3, 0.0, hsl.z);
    hsl.x = mod(hsl.x + shadowMask * 0.4, 1.0);

    hsl.y *= 0.6;
    hsl.z = pow(hsl.z, 1.0);

    vec3 shifted = hsl2rgb(hsl);
    return vec4(shifted, 1.0);
}

float rand(vec2 n) {
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 ip = floor(p);
    vec2 u = fract(p) * fract(p) * (3.0 - 2.0 * fract(p));
    float res = mix(
        mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x),
        mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x),
        u.y
    );
    return res * res;
}

const mat2 mtx = mat2(0.80, 0.60, -0.60, 0.80);

float fbm(vec2 p) {
    float f = 0.0;
    float t = iTime * 0.75;
    f += 0.500000 * noise(p + t);
    p = mtx * p * 2.02;
    f += 0.031250 * noise(p);
    p = mtx * p * 2.01;
    f += 0.250000 * noise(p);
    p = mtx * p * 2.03;
    f += 0.125000 * noise(p);
    p = mtx * p * 2.01;
    f += 0.062500 * noise(p);
    p = mtx * p * 2.04;
    f += 0.015625 * noise(p + sin(t));
    return f / 0.96875;
}

float pattern(vec2 p) {
    return fbm(p + fbm(p + fbm(p)));
}

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    float aspect = iResolution.x / iResolution.y;
    uv.x *= aspect;
 
    float shade = pattern(uv);

    float rippleSum = 0.0;
    for (int i = 0; i < MAX_RIPPLES; i++) {
        if (i < u_rippleCount) {
            float t = iTime - u_rippleStartTimes[i];
            float maxLife = 1.5;
            float fadeStart = 0.4;
            if (t >= 0.0 && t < maxLife) {
                // Square the ripple center to match uv distortion
                vec2 rippleUV = u_rippleCenters[i];
                rippleUV.x *= aspect;

                vec2 toFrag = uv - rippleUV;
                float dist = length(toFrag);
                float wave = sin(dist * 40.0 - t * 7.0) * exp(-10.0 * dist);
                float fade = 1.0 - smoothstep(fadeStart, maxLife, t);
                rippleSum += wave * fade;
            }
        }
    }

    shade += 0.3 * rippleSum;

    gl_FragColor = vec4(colormap(shade).rgb, 1.0);
}