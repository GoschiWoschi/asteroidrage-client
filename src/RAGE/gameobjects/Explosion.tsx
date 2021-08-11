import { AdditiveBlending, BufferAttribute, BufferGeometry, Object3D, Points, PointsMaterial, Vector3 } from "three";
import { randomSphere } from '../functions';

const positions32 = new Float32Array(256 * 3)
for (let i = 0; i < 256; i++) {
    const position = randomSphere(new Vector3(), Math.random, 1)
    positions32[i * 3 + 0] = position.x
    positions32[i * 3 + 1] = position.y
    positions32[i * 3 + 2] = position.z
}

const explosionGeometry = new BufferGeometry()
explosionGeometry.setAttribute("position", new BufferAttribute(positions32, 3))

class ExplosionMaterial extends PointsMaterial {
    constructor(color: number, scale: number) {
        super({ dithering: true, color, opacity: 1, size: 0, transparent: true, blending: AdditiveBlending, depthWrite: false })
        this.onBeforeCompile = (s, r) => {
            s.vertexShader = `
            uniform float size;
            uniform float scale;
            #include <common>
            #include <color_pars_vertex>
            #include <fog_pars_vertex>
            #include <morphtarget_pars_vertex>
            #include <logdepthbuf_pars_vertex>
            #include <clipping_planes_pars_vertex>
            void main() {
                #include <color_vertex>
                #include <begin_vertex>
                #include <morphtarget_vertex>
                #include <project_vertex>
                gl_PointSize = size;
                #ifdef USE_SIZEATTENUATION
                    bool isPerspective = isPerspectiveMatrix( projectionMatrix );
                    if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
                #endif
                #include <logdepthbuf_vertex>
                #include <clipping_planes_vertex>
                #include <worldpos_vertex>
                #include <fog_vertex>
            }`

            s.fragmentShader = `
            uniform vec3 diffuse;
            uniform float opacity;
            #include <common>
            #include <color_pars_fragment>
            #include <map_particle_pars_fragment>
            #include <fog_pars_fragment>
            #include <logdepthbuf_pars_fragment>
            #include <clipping_planes_pars_fragment>
            void main() {
                float inCircle = max(0.0, 1.0 - length(gl_PointCoord.xy * 2.0 - 1.0));
                #include <clipping_planes_fragment>
                vec3 outgoingLight = vec3( 0.0 );
                vec4 diffuseColor = vec4( diffuse, opacity );
                #include <logdepthbuf_fragment>
                #include <map_particle_fragment>
                #include <color_fragment>
                #include <alphatest_fragment>
                outgoingLight = diffuseColor.rgb;
                diffuseColor.a *= inCircle;
                gl_FragColor = vec4( outgoingLight, diffuseColor.a );
                #include <tonemapping_fragment>
                #include <encodings_fragment>
                #ifdef USE_FOG
                    #ifdef FOG_EXP2
                        float fogFactor = 1.0 - exp( - fogDensity * fogDensity * fogDepth * fogDepth );
                    #else
                        float fogFactor = smoothstep( fogNear, fogFar, fogDepth );
                    #endif
                    gl_FragColor.rgb = mix( gl_FragColor.rgb, vec3(0), fogFactor );
                #endif   
                #include <premultiplied_alpha_fragment>
            }`
        }
    }

}

export default class Explosion extends Object3D {

    material: ExplosionMaterial

    constructor(color: number, scale: number) {
        super()
        const points = new Points(explosionGeometry, new ExplosionMaterial(color, scale))
        this.userData = new ExplosionUserData()
        this.userData.scale = scale
        this.name = "Explosion"
        this.add(points)
        this.material = points.material
    }

}

class ExplosionUserData {
    radius = 1
    velocity = new Vector3()
    scale = 1
}