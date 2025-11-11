#version 460 core
#extension GL_ARB_separate_shader_objects : enable

//attribute
layout(location = 0) in vec3 vPosition;
layout(location = 1) in vec3 vTexCoord;
layout(location = 0) out vec3 out_TexCoord;

//uniform
layout(binding = 0) uniform MVPMatrix
{
    mat4 modelMatrix;
    mat4 viewMatrix;
    mat4 projectionMatrix;
    vec4 fireParams;
    vec4 fireScale;
    vec3 viewPos;
} uMVP;

void main (void)
{
    vec4 worldPos = uMVP.modelMatrix * vec4(vPosition, 1.0);
    gl_Position = uMVP.projectionMatrix * uMVP.viewMatrix * worldPos;

    out_TexCoord = vTexCoord;
}
