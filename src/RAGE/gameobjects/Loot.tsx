import seedrandom from "seedrandom";
import { AdditiveBlending, BufferAttribute, Color, DoubleSide, IcosahedronBufferGeometry, InstancedBufferAttribute, InstancedBufferGeometry, InstancedMesh, LinearFilter, Matrix4, Mesh, MeshBasicMaterial, Object3D, PlaneBufferGeometry, Points, PointsMaterial, ShaderMaterial, TextureLoader, Vector3 } from "three";
import { Textures } from "../../Components/IconSVGToTexture";
import { colorFromType, hasCol2, iconFromType, randBox, textFromType } from "../functions";
import { asteroids } from "./AsteroidField";
import createGeometry from "../../lib/three-bmfont-text"
import loadFont from "load-bmfont"
import { BOX_SIZE, BOX_SIZE2 } from "../../config";

type Loot = {
    position: Vector3
    radius: number
    type: number
}

export class LootField extends InstancedMesh {
    constructor() {
        super(new IcosahedronBufferGeometry(), new MeshBasicMaterial(), loots.length)
        updateMesh(this)
        this.name = "Loot"
    }
}

export const loots: Loot[] = []

const rand = seedrandom("yussuf")

for (let i = 0; i < 512; i++) {
    const loot: Loot = {
        position: randBox(BOX_SIZE, undefined, rand),
        radius: 30,
        type: Math.floor(rand() * 4)
    }
    while (hasCol2(loot, loots, BOX_SIZE) || hasCol2(loot, asteroids, BOX_SIZE)) {
        randBox(BOX_SIZE, loot.position, rand)
    }
    loots.push(loot)
}
for (let i = 0; i < 512; i++) {
    loots[i].radius = 15
}

export class LootInstances extends Object3D {
    lf = new LootField()
    lp: Points
    texts: any
    planes: Object3D
    visibleAttribute: InstancedBufferAttribute
    constructor() {
        super()
        //        this.add(this.lf)
        const p32 = new Float32Array(loots.length * 3)
        const c32 = new Float32Array(loots.length * 3)
        const v32 = new Float32Array(loots.length)
        const t32 = new Float32Array(loots.length)
        for (let i = 0; i < loots.length; i++) {
            p32[i * 3 + 0] = loots[i].position.x
            p32[i * 3 + 1] = loots[i].position.y
            p32[i * 3 + 2] = loots[i].position.z
            const color = new Color().setHex(colorFromType(loots[i].type))
            c32[i * 3 + 0] = color.r
            c32[i * 3 + 1] = color.g
            c32[i * 3 + 2] = color.b
            v32[i] = 0
            t32[i] = loots[i].type
        }
        const offsetAttribute = new InstancedBufferAttribute(p32, 3)
        const colorAttribute = new InstancedBufferAttribute(c32, 3)
        const visibleAttribute = new InstancedBufferAttribute(v32, 1)
        const typeAttribute = new InstancedBufferAttribute(t32, 1)
        this.visibleAttribute = visibleAttribute

        const ico = new IcosahedronBufferGeometry(10, 1)
        const geo = new InstancedBufferGeometry()
        geo.setAttribute("position", new BufferAttribute(ico.attributes.position.array, 3))
        geo.setAttribute("offset", offsetAttribute)
        geo.setAttribute("color", colorAttribute)
        geo.setAttribute("visible", visibleAttribute)
        const points = new Points(geo, new LootPointsInstancedMaterial())
        points.frustumCulled = false
        this.lp = points

        const planeGeometry = new PlaneBufferGeometry(10, 10)
        const planeInstanceGeometry = new InstancedBufferGeometry()
        planeInstanceGeometry.setAttribute("position", new BufferAttribute(planeGeometry.attributes.position.array, 3))
        planeInstanceGeometry.setAttribute("uv", new BufferAttribute(planeGeometry.attributes.uv.array, 2))
        planeInstanceGeometry.setIndex(planeGeometry.index)
        planeInstanceGeometry.setAttribute("offset", offsetAttribute)
        planeInstanceGeometry.setAttribute("color", colorAttribute)
        planeInstanceGeometry.setAttribute("visible", visibleAttribute)
        planeInstanceGeometry.setAttribute("type", typeAttribute)

        let planesMaterial = new ShaderMaterial({
            fog: true,
            vertexShader: `
                uniform mat4 meh;
                attribute vec3 offset;
                attribute vec3 color;
                attribute float visible;
                attribute float type;
                varying vec3 vColor;
                varying vec2 vUv;
                #include <common>
                #include <color_pars_vertex>
                #include <fog_pars_vertex>
                varying float vType;
                const float BOX_SIZE = ${BOX_SIZE}.0;
                const float BOX_SIZE2 = BOX_SIZE / 2.0;
                void main() {
                    if(visible < 1.0) return;
                    vColor = color;
                    vUv = uv;
                    vType = type;
                    vec4 rotatedPosition = meh * vec4(position, 1.0);
                    vec3 modPosition = mod(offset + BOX_SIZE2 - cameraPosition, BOX_SIZE) - BOX_SIZE2 + cameraPosition;
                    vec4 mvPosition = viewMatrix * vec4(rotatedPosition.xyz + modPosition, 1.0);
                    gl_Position = projectionMatrix * mvPosition;
                    #include <fog_vertex>
                }
            `,
            fragmentShader: `
                uniform vec3 fogColorAdditive;
                uniform sampler2D icon0;
                uniform sampler2D icon1;
                uniform sampler2D icon2;
                uniform sampler2D icon3;
                uniform sampler2D icon4;
                varying vec3 vColor;
                varying vec2 vUv;
                varying float vType;
                #include <fog_pars_fragment>
                void main() {
                    vec4 tCol;
                    if(vType >= 0.0) tCol = texture2D(icon0, vUv);
                    if(vType >= 0.5) tCol = texture2D(icon1, vUv);
                    if(vType >= 1.5) tCol = texture2D(icon2, vUv);
                    if(vType >= 2.5) tCol = texture2D(icon3, vUv);
                    if(vType >= 3.5) tCol = texture2D(icon4, vUv);


                    
                    gl_FragColor = vec4(vColor, tCol.a);
                    if(tCol.a == 0.0) gl_FragColor = vec4(0);
                    #ifdef USE_FOG
                     	#ifdef FOG_EXP2
                     		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * fogDepth * fogDepth );
                     	#else
                     		float fogFactor = smoothstep( fogNear, fogFar, fogDepth );
                     	#endif
                     	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColorAdditive, fogFactor );
                    #endif 
                }
            `,
            depthWrite: false,
            depthTest: true,
            blending: AdditiveBlending,
            transparent: true,
            uniforms: {
                fogColor: { value: new Color().setHex(0x0f0f0f) },
                fogColorAdditive: { value: new Color().setHex(0x000000) },
                fogNear: { value: 0 },
                fogFar: { value: BOX_SIZE2 },
                meh: { value: new Matrix4().identity() },
                icon0: { value: Textures[iconFromType(0)] },
                icon1: { value: Textures[iconFromType(1)] },
                icon2: { value: Textures[iconFromType(2)] },
                icon3: { value: Textures[iconFromType(3)] },
                icon4: { value: Textures[iconFromType(4)] },
                /*icons: {
                    value: [
                        Textures[iconFromType(0)],
                        Textures[iconFromType(1)],
                        Textures[iconFromType(2)],
                        Textures[iconFromType(3)],
                        Textures[iconFromType(4)]
                    ]
                }*/
            }
        })

        const planes = new Mesh(planeInstanceGeometry, planesMaterial)



        const ti = setInterval(() => {
            if (Object.keys(Textures).length === 6) {
                clearInterval(ti)
                planes.material.uniforms.icon0.value = Textures[iconFromType(0)]
                planes.material.uniforms.icon1.value = Textures[iconFromType(1)]
                planes.material.uniforms.icon2.value = Textures[iconFromType(2)]
                planes.material.uniforms.icon3.value = Textures[iconFromType(3)]
                planes.material.uniforms.icon4.value = Textures[iconFromType(4)]
                /*planes.material.uniforms.icons.value = [
                    Textures[iconFromType(0)],
                    Textures[iconFromType(1)],
                    Textures[iconFromType(2)],
                    Textures[iconFromType(3)],
                    Textures[iconFromType(4)]
                ]*/
            }
        }, 100)

        this.add(planes)
        planes.renderOrder = 100
        planes.frustumCulled = false
        this.planes = planes
        this.add(points)
        points.renderOrder = 10

        loadFont(process.env.PUBLIC_URL + '/fonts/Lato.fnt', (error: any, font: any) => {

            const x9999TextGeometry = createGeometry({
                width: 1000,
                align: 'left',
                font,
                text: "x 999"
            }) as any

            const BLAUVS = []

            for (let i = 0; i < 5; i++) {
                let text = textFromType(i)
                while (text.length < 5) text += " "
                x9999TextGeometry.update(text)
                BLAUVS[i] = x9999TextGeometry.attributes.uv.array
            }

            x9999TextGeometry.update("x 999")
            const geo = new InstancedBufferGeometry()
            geo.setAttribute("position", x9999TextGeometry.attributes.position.clone())

            const indexArray = new Float32Array(32)

            for (let i = 0; i < 32; i++) {
                indexArray[i] = i
            }

            const indexAttribute = new BufferAttribute(indexArray, 1)


            geo.setIndex(x9999TextGeometry.index)
            //geo.setAttribute("uv", x9999TextGeometry.attributes.uv.clone())
            geo.setAttribute("index", indexAttribute)
            geo.setAttribute("offset", offsetAttribute)
            geo.setAttribute("color", colorAttribute)
            geo.setAttribute("visible", visibleAttribute)
            geo.setAttribute("type", typeAttribute)

            var textureLoader = new TextureLoader();
            textureLoader.load(process.env.PUBLIC_URL + '/fonts/Lato.png', (texture) => {
                texture.minFilter = texture.magFilter = LinearFilter
                const tm = new Mesh(geo, new ShaderMaterial({
                    fog: true,
                    side: DoubleSide,
                    vertexShader: `
                        uniform mat4 meh;
                        attribute vec3 offset;
                        attribute vec3 color;
                        attribute float visible;
                        attribute float type;
                        varying vec3 vColor;
                        varying vec2 vUv;
                        #include <common>
                        #include <color_pars_vertex>
                        #include <fog_pars_vertex>
                        varying float vType;

                        attribute float index;

                        const float BOX_SIZE = ${BOX_SIZE}.0;
                        const float BOX_SIZE2 = BOX_SIZE / 2.0;

                        uniform float uvs0[32];
                        uniform float uvs1[32];
                        uniform float uvs2[32];
                        uniform float uvs3[32];
                        uniform float uvs4[32];
                      
                        void main() {


                            if(visible < 1.0) return;
                            vColor = color;
                            if(type == 0.0) {
                                vUv = vec2(uvs0[int(index) * 2], uvs0[int(index) * 2 + 1]);
                            } else if(type == 1.0) {
                                vUv = vec2(uvs1[int(index) * 2], uvs1[int(index) * 2 + 1]);
                            } else if(type == 2.0) {
                                vUv = vec2(uvs2[int(index) * 2], uvs2[int(index) * 2 + 1]);
                            } else if(type == 3.0) {
                                vUv = vec2(uvs3[int(index) * 2], uvs3[int(index) * 2 + 1]);
                            } else if(type == 4.0) {
                                vUv = vec2(uvs4[int(index) * 2], uvs4[int(index) * 2 + 1]);
                            } else return;

                            vType = type;
                            vec4 rotatedPosition = meh * vec4(position * 0.1 + vec3(6.0, 1.0, 0.0), 1.0);
                            vec3 modPosition = mod(offset + BOX_SIZE2 - cameraPosition, BOX_SIZE) - BOX_SIZE2 + cameraPosition;
                            vec4 mvPosition = viewMatrix * vec4(rotatedPosition.xyz + modPosition, 1.0);
                            gl_Position = projectionMatrix * mvPosition;
                            #include <fog_vertex>
                        }
                    `,
                    fragmentShader: `
                        uniform vec3 fogColorAdditive;
                        uniform sampler2D map;
                        varying vec3 vColor;
                        varying vec2 vUv;
                        varying float vType;
                        #include <fog_pars_fragment>
                        void main() {
                            gl_FragColor = texture2D(map, vUv);
                            gl_FragColor.xyz *= vColor;
                            #ifdef USE_FOG
                                #ifdef FOG_EXP2
                                    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * fogDepth * fogDepth );
                                #else
                                    float fogFactor = smoothstep( fogNear, fogFar, fogDepth );
                                #endif
                                gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColorAdditive, fogFactor );
                            #endif
                            //gl_FragColor = vec4(1);
                        }
                    `,
                    depthWrite: false,
                    depthTest: true,
                    blending: AdditiveBlending,
                    transparent: true,
                    uniforms: {
                        fogColor: { value: new Color().setHex(0x0f0f0f) },
                        fogColorAdditive: { value: new Color().setHex(0x000000) },
                        fogNear: { value: 0 },
                        fogFar: { value: BOX_SIZE2 },
                        meh: { value: new Matrix4().identity() },
                        map: { value: texture },
                        uvs0: { value: BLAUVS[0] },
                        uvs1: { value: BLAUVS[1] },
                        uvs2: { value: BLAUVS[2] },
                        uvs3: { value: BLAUVS[3] },
                        uvs4: { value: BLAUVS[4] }
                    }
                }))
                //updateMesh(tm, false)
                tm.frustumCulled = false
                this.add(tm)
                this.texts = tm

            })

        })

    }

}

function updateMesh(mesh: InstancedMesh, scale = true) {
    const tmp = new Object3D()
    mesh.userData = { velocity: new Vector3(), positions: [], radii: [], types: [], velocities: [], isArea: true }
    for (let i = 0; i < loots.length; i++) {
        mesh.userData.positions.push(loots[i].position)
        mesh.userData.radii.push(loots[i].radius)
        mesh.userData.types.push(loots[i].type)
        tmp.position.copy(loots[i].position)
        if (scale) tmp.scale.set(1, 1, 1).multiplyScalar(loots[i].radius)
        tmp.updateMatrix()
        mesh.setMatrixAt(i, tmp.matrix)
        mesh.setColorAt(i, new Color().setHex(colorFromType(loots[i].type)))
    }

    mesh.instanceMatrix.needsUpdate = true
}

export class LootPointsInstancedMaterial extends PointsMaterial {
    constructor() {
        super({ opacity: 0.01, size: 10, transparent: true, depthWrite: false, blending: AdditiveBlending, dithering: true })
        this.onBeforeCompile = (s, r) => {
            s.uniforms.cameraPosition = { value: new Vector3(BOX_SIZE2, BOX_SIZE2, BOX_SIZE2) }
            s.uniforms.fogColorAdditive = { value: new Color(0x000000) }
                ; (this as any).uniforms = s.uniforms
            s.vertexShader = `
                uniform float size;
                uniform float scale;
                #include <common>
                #include <color_pars_vertex>
                #include <fog_pars_vertex>
                #include <morphtarget_pars_vertex>
                #include <logdepthbuf_pars_vertex>
                #include <clipping_planes_pars_vertex>
                attribute vec3 offset;
                attribute vec3 color;
                attribute float visible;
                varying vec3 vColor;
                const float BOX_SIZE = ${BOX_SIZE}.0;
                const float BOX_SIZE2 = BOX_SIZE / 2.0;
                void main() {
                    if(visible == 0.0) return;
                    #include <color_vertex>
                    #include <begin_vertex>
                    #include <morphtarget_vertex>
                    #include <project_vertex>
                    gl_PointSize = size;
                    transformed = position + mod(offset - cameraPosition + BOX_SIZE2, BOX_SIZE) - BOX_SIZE2 + cameraPosition;
                    mvPosition = modelViewMatrix * vec4(transformed, 1.0);
                    gl_Position = projectionMatrix * mvPosition;
                    #ifdef USE_SIZEATTENUATION
                        bool isPerspective = isPerspectiveMatrix( projectionMatrix );
                        if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
                    #endif
                    #include <fog_vertex>
                    vColor = color;
                }
            `
            s.fragmentShader = `
                uniform vec3 fogColorAdditive;
                uniform vec3 diffuse;
                uniform float opacity;
                #include <common>
                #include <color_pars_fragment>
                #include <map_particle_pars_fragment>
                #include <fog_pars_fragment>
                #include <logdepthbuf_pars_fragment>
                #include <clipping_planes_pars_fragment>
                varying vec3 vColor;
                void main() {
                    if(length(gl_PointCoord.xy - 0.5) >= 0.5) discard;
                    #include <clipping_planes_fragment>
                    vec3 outgoingLight = vec3( 0.0 );
                    vec4 diffuseColor = vec4( vColor, opacity );
                    #include <logdepthbuf_fragment>
                    #include <map_particle_fragment>
                    #include <color_fragment>
                    #include <alphatest_fragment>
                    outgoingLight = diffuseColor.rgb;
                    gl_FragColor = vec4( outgoingLight, diffuseColor.a );
                    #include <tonemapping_fragment>
                    #include <encodings_fragment>
                    #ifdef USE_FOG
                        #ifdef FOG_EXP2
                            float fogFactor = 1.0 - exp( - fogDensity * fogDensity * fogDepth * fogDepth );
                        #else
                            float fogFactor = smoothstep( fogNear, fogFar, fogDepth );
                        #endif
                        gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColorAdditive, fogFactor );
                    #endif  
                    #include <premultiplied_alpha_fragment>
                }
            `
        }
    }
}