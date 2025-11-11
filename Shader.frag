#version 460 core
#extension GL_ARB_separate_shader_objects : enable

layout(location = 0) in vec3 out_TexCoord;
layout(binding = 1) uniform sampler2D uTextureSampler;
layout(binding = 2) uniform sampler2D uNoiseSampler;
layout(location = 0) out vec4 vFragColor;

layout(binding = 0) uniform MVPMatrix
{
    mat4 modelMatrix;
    mat4 viewMatrix;
    mat4 projectionMatrix;
    vec4 fireParams;
    vec4 fireScale;
    vec3 viewPos;
} uMVP;

const float FIRE_NOISE_MODULUS = 61.0;

vec2 mBBS(vec2 val)
{
    val = mod(val, FIRE_NOISE_MODULUS);
    return mod(val * val, FIRE_NOISE_MODULUS);
}

float mnoise(vec3 pos)
{
    float intArg = floor(pos.z);
    float fracArg = fract(pos.z);
    vec2 hash = mBBS(vec2(intArg) * 3.0 + vec2(0.0, 3.0));

    vec4 g = vec4(
        texture(uNoiseSampler, (vec2(pos.x, pos.y + hash.x)) / FIRE_NOISE_MODULUS).xy,
        texture(uNoiseSampler, (vec2(pos.x, pos.y + hash.y)) / FIRE_NOISE_MODULUS).xy
    ) * 2.0 - 1.0;

    float g0 = g.x + g.y * fracArg;
    float g1 = g.z + g.w * (fracArg - 1.0);
    return mix(g0, g1, smoothstep(0.0, 1.0, fracArg));
}

float turbulence(vec3 pos)
{
    float sum = 0.0;
    float freq = 1.0;
    float amp = 1.0;

    for(int i = 0; i < 4; ++i)
    {
        sum += abs(mnoise(pos * freq)) * amp;
        freq *= 2.0;
        amp *= 0.5;
    }

    return sum;
}

void main (void)
{
    vec3 loc = out_TexCoord;
    loc.xz = loc.xz * 2.0 - 1.0;

    float clampedHeight = clamp(loc.y, 0.0, 1.0);
    vec2 st = vec2(length(loc.xz), clampedHeight);

    vec4 scale = vec4(uMVP.fireParams.y, uMVP.fireParams.z, uMVP.fireParams.w, uMVP.fireScale.x);
    float time = uMVP.fireParams.x;
    float magnitude = uMVP.fireScale.y;

    loc.y = clampedHeight - time * scale.w;
    loc *= scale.xyz;

    float offset = sqrt(clampedHeight) * magnitude * turbulence(loc);
    st.y += offset;

    if (st.y > 1.0)
    {
        vFragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    vec4 result = texture(uTextureSampler, st);

    float bottomFade = smoothstep(0.0, 0.1, st.y);
    float topFade = 1.0 - smoothstep(0.75, 1.0, st.y);
    float radialFade = 1.0 - smoothstep(0.6, 1.0, st.x);

    float flameMask = result.a * bottomFade * topFade * radialFade;
    vec3 fireColor = result.rgb * flameMask * 1.2;

    vFragColor = vec4(fireColor, flameMask);
}
