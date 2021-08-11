import { AdditiveBlending, Color, DoubleSide, IcosahedronBufferGeometry, Mesh, ShaderMaterial, Vector3 } from "three";

const shieldGeometry = new IcosahedronBufferGeometry(2, 1)
shieldGeometry.computeVertexNormals()

export default class Shield extends Mesh {

    constructor(geometry = shieldGeometry) {
        super(geometry, new ShieldMaterial())
        this.userData.isArea = true
    }

}

export class ShieldMaterial extends ShaderMaterial {

    hitIndex = 0
    energy = 1

    constructor(public maxHits = 16) {
        super({
            uniforms: {
                time: { value: 0 },
                energy: { value: 1 },
                hitPositions: { value: new Float32Array(maxHits * 3) },
                hitTimes: { value: new Float32Array(maxHits) },
                fogColor: { value: new Color(0x000000) },
                fogNear: { value: 0 },
                fogFar: { value: 50000 },
                opacity: { value: 1 }
            },
            fog: true,
            dithering: true,
            blending: AdditiveBlending,
            depthWrite: false,
            side: DoubleSide,
            transparent: true,
            vertexShader: `
            varying vec3 vCamPosition;
            varying vec3 vNormal;
            varying vec3 vPosition;
            #include <fog_pars_vertex>
            void main() {
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_Position = projectionMatrix * mvPosition;
                vCamPosition = normalize(mvPosition.xyz - cameraPosition);
                vNormal = normalMatrix * normal;
                vPosition = position;
                #include <fog_vertex>
            }`,
            fragmentShader: `
            const int MAX_HITS = ${maxHits};
            uniform vec3[MAX_HITS] hitPositions;
            uniform float[MAX_HITS] hitTimes;
            uniform float time;
            uniform float energy;
            uniform vec3 diffuse;
            uniform float opacity;
            varying vec3 vCamPosition;
            varying vec3 vNormal;
            varying vec3 vPosition;
            #include <common>
            #include <dithering_pars_fragment>
            #include <color_pars_fragment>
            #include <fog_pars_fragment>
            void main() {
                /*float fogNear = 0.0;
                float fogFar = 500.0;
                vec3 fogColor = vec3(0);*/
                vec3 pNormal = -vNormal;
                vec3 tone = vec3(1.0 - energy, energy * 0.5, energy);

                float am = 0.0;
                for(int i = 0; i < MAX_HITS; i++) {
                    float deltaTime = time - hitTimes[i];
                    if(deltaTime > 0.0) {
                        vec3 hit = normalize(hitPositions[i]);
                        float dt = max(0.0, 1.0 - deltaTime);
                        float a = pow(max(0.0,1.0 - length(hit - normalize(vPosition))), 2.0) * dt;
                        if(dt > 0.8) a *= deltaTime * 5.0;
                        am = max(a, am);
                        am += a * 0.5;
                    }
                }

                gl_FragColor = vec4(tone, 1.0);
                gl_FragColor.rgb *= pow((max(1.0 - abs(pNormal.z),0.0)), 3.0) * pow(energy, 0.5);
                gl_FragColor.rgb += am*am*(tone+1.0) * 0.5;

                float fogFactor = smoothstep( fogNear, fogFar, fogDepth );
                gl_FragColor.rgb = mix( gl_FragColor.rgb, vec3(0), fogFactor );
                gl_FragColor.a *= opacity;
                #include <dithering_fragment>
            }`
        })
    }

    setTime(time: number) {
        this.uniforms.time.value = time
    }

    addHit(time: number, point: Vector3, damage: number) {
        this.uniforms.hitPositions.value[this.hitIndex * 3 + 0] = point.x
        this.uniforms.hitPositions.value[this.hitIndex * 3 + 1] = point.y
        this.uniforms.hitPositions.value[this.hitIndex * 3 + 2] = point.z
        this.uniforms.hitTimes.value[this.hitIndex] = time
        this.hitIndex++
        this.hitIndex = this.hitIndex % this.maxHits
        this.energy = Math.max(0, this.energy - damage)
        this.uniformsNeedUpdate = true
    }

}