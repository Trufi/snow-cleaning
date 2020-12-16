#extension GL_OES_standard_derivatives: enable

precision mediump float;

varying vec4 v_vec4_color;
varying vec2 v_vec2_normal;
varying float v_float_half_width;

//! Аффинный переход от 0 до 1.
float affine_step(const float edge0, const float edge1, const float x)
{
	return clamp((x - edge0) / (edge1 - edge0), 0., 1.);
}

void main()
{
    // Вычисляем прозрачность сглаживания
    float opacity = 1.0 - affine_step(
        v_float_half_width - length(fwidth(v_vec2_normal)),
        v_float_half_width,
        length(v_vec2_normal)
    );

    gl_FragColor = vec4(v_vec4_color.rgb, 1.) * opacity;
}
