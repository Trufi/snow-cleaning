attribute vec2 a_vec2_vertex;
attribute vec4 a_vec4_normals;
attribute vec4 a_vec4_color;

uniform mat4 u_mat4_mvp;
uniform float u_float_width;
uniform float u_float_tile_to_pixel_ratio;

varying vec4 v_vec4_color;
varying vec2 v_vec2_normal;
varying float v_float_half_width;

const float g_w_factor = 1e-6;
const float normal_unpack_multiplier = 0.011135539861205473;

void main()
{
    v_vec4_color = a_vec4_color;
    float half_width = 0.5 * (u_float_width + 1.0);
    vec4 normals = a_vec4_normals * normal_unpack_multiplier * half_width;
    vec2 extender = normals.xy;
    vec2 normal = normals.zw;
    vec4 shifted_vertex = vec4(a_vec2_vertex + extender * u_float_tile_to_pixel_ratio, 0.0, 1.0);
    gl_Position = g_w_factor * u_mat4_mvp * shifted_vertex;
    v_vec2_normal = normal;
    v_float_half_width = half_width;
}
