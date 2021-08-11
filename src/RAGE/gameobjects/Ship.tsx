import { BufferAttribute, BufferGeometry, IcosahedronBufferGeometry, LinearFilter, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PerspectiveCamera, PlaneBufferGeometry, Points, PointsMaterial, SpotLight, Sprite, SpriteMaterial, Texture, TextureLoader, Vector3 } from "three";
import createGeometry from "../../lib/three-bmfont-text"
import loadFont from "load-bmfont"
import Shield from "./ShipModules/Shield";

export const shipMaterialStandard = new MeshStandardMaterial({ dithering: true, flatShading: true, color: 0x606060, roughness: 0.25, metalness: 0.75 })
export const shipMaterialBasic = new MeshBasicMaterial({ dithering: true, color: 0x606060 })
const shipGeometry = new IcosahedronBufferGeometry(1, 3)
shipGeometry.computeVertexNormals()

const textCanvas = document.createElement('canvas');
textCanvas.height = 48 * 2;
document.body.appendChild(textCanvas)

const baseSprite = new Sprite()
const spriteGeometry = baseSprite.geometry.clone()
spriteGeometry.translate(0, 2, 0)

function createCharacterLabel(text: string) {

  const ctx = textCanvas.getContext('2d');
  const font = '48px sans-serif';

  ctx.font = font;

  let metrics = ctx.measureText(text);
  let actualHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

  textCanvas.width = Math.ceil(metrics.width);
  textCanvas.height = Math.ceil(actualHeight)

  ctx.clearRect(0, 0, textCanvas.width, textCanvas.height)
  ctx.font = font;
  ctx.fillStyle = 'white';
  ctx.fillText(text, 0, metrics.actualBoundingBoxAscent);

  const spriteMap = new Texture(ctx.getImageData(0, 0, textCanvas.width, textCanvas.height) as any);
  spriteMap.minFilter = spriteMap.magFilter = LinearFilter;
  spriteMap.generateMipmaps = false;
  spriteMap.needsUpdate = true;

  const sprite = new Sprite(new SpriteMaterial({ map: spriteMap, depthWrite: false, fog: false }));
  sprite.geometry = spriteGeometry
  sprite.scale.set(textCanvas.width, textCanvas.height, 1);
  return sprite
}

export default class Ship extends Object3D {

  shield: Shield
  selectionMesh: Mesh
  selectionPoint: Points
  selectionPoint2: Points
  targetPoint: Points
  fuel = 100
  ammo = 100
  missiles = 4
  sp = 100
  hp = 50
  ttt = 0
  target = { object: null }
  onCollision: any
  camera = new PerspectiveCamera(60, 1, 0.1, 1000)
  srot = 0
  nameSprite: Sprite

  constructor(id: number, public controller: any) {
    super()
    this.userData = new ShipUserData(id, controller.id, controller)
    this.name = "Ship"
    this.receiveShadow = true
    this.castShadow = true
    this.add(this.camera)

    if (!controller.nameSprite && controller.name) {
      controller.nameSprite = createCharacterLabel(controller.name)
      controller.nameSprite.scale.multiplyScalar(0.1)
      controller.nameSprite.layers.set(1)
    }
    if (controller.nameSprite) {
      this.nameSprite = controller.nameSprite
    } else {
      this.nameSprite = new Sprite(new SpriteMaterial())
      this.nameSprite.layers.set(1)
      this.nameSprite.visible = false
    }
    this.add(this.nameSprite)

    const mesh = new Mesh(shipGeometry, shipMaterialStandard)
    this.add(mesh)

    this.shield = new Shield()
    this.add(this.shield)

    const lamp1 = new SpotLight(0xffffff, 0.1, 500, Math.PI / 4, 1, 1)
    this.add(lamp1)
    lamp1.position.set(0, 0, -1.25)
    lamp1.target.position.set(0, 0, -2)
    this.add(lamp1.target)
    this.userData.lamp1 = lamp1
    lamp1.castShadow = true

    const basicMaterial = new MeshBasicMaterial({ depthTest: true, depthWrite: true, fog: false, color: 0xffffff })
    basicMaterial.onBeforeCompile = (s, r) => {

      s.vertexShader = `
        #include <common>
        #include <uv_pars_vertex>
        #include <uv2_pars_vertex>
        #include <envmap_pars_vertex>
        #include <color_pars_vertex>
        #include <fog_pars_vertex>
        #include <morphtarget_pars_vertex>
        #include <skinning_pars_vertex>
        #include <logdepthbuf_pars_vertex>
        #include <clipping_planes_pars_vertex>
        varying vec3 vPosition;
        void main() {
          #include <uv_vertex>
          #include <uv2_vertex>
          #include <color_vertex>
          #include <skinbase_vertex>
          #ifdef USE_ENVMAP
          #include <beginnormal_vertex>
          #include <morphnormal_vertex>
          #include <skinnormal_vertex>
          #include <defaultnormal_vertex>
          #endif
          #include <begin_vertex>
          #include <morphtarget_vertex>
          #include <skinning_vertex>
          #include <project_vertex>
          #include <logdepthbuf_vertex>
          #include <worldpos_vertex>
          #include <clipping_planes_vertex>
          #include <envmap_vertex>
          #include <fog_vertex>
          vPosition = position.xyz;
        }
      `

      s.fragmentShader = `
        uniform vec3 diffuse;
        uniform float opacity;
        #ifndef FLAT_SHADED
          varying vec3 vNormal;
        #endif
        #include <common>
        #include <dithering_pars_fragment>
        #include <color_pars_fragment>
        #include <uv_pars_fragment>
        #include <uv2_pars_fragment>
        #include <map_pars_fragment>
        #include <alphamap_pars_fragment>
        #include <aomap_pars_fragment>
        #include <lightmap_pars_fragment>
        #include <envmap_common_pars_fragment>
        #include <envmap_pars_fragment>
        #include <cube_uv_reflection_fragment>
        #include <fog_pars_fragment>
        #include <specularmap_pars_fragment>
        #include <logdepthbuf_pars_fragment>
        #include <clipping_planes_pars_fragment>
        varying vec3 vPosition;
        void main() {

          if(abs(vPosition.x) < 7.0 && abs(vPosition.y) < 7.0) discard;

          vec2 bla = round(abs(vPosition.xy*0.05));
          vec2 bla2 = round(abs(vPosition.xy*0.5));
          float border = clamp(bla.x + bla.y, 0.0, 0.5);
          float border2 = clamp(bla2.x + bla2.y, 0.0, 2.0);
          //if(border == 0.0) discard;
          //if(border2 + border < 1.0) discard;
          #include <clipping_planes_fragment>
          vec4 diffuseColor = vec4( diffuse, opacity );
          #include <logdepthbuf_fragment>
          #include <map_fragment>
          #include <color_fragment>
          #include <alphamap_fragment>
          #include <alphatest_fragment>
          #include <specularmap_fragment>
          ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
          #ifdef USE_LIGHTMAP
          
            vec4 lightMapTexel= texture2D( lightMap, vUv2 );
            reflectedLight.indirectDiffuse += lightMapTexelToLinear( lightMapTexel ).rgb * lightMapIntensity;
          #else
            reflectedLight.indirectDiffuse += vec3( 1.0 );
          #endif
          #include <aomap_fragment>
          reflectedLight.indirectDiffuse *= diffuseColor.rgb;
          vec3 outgoingLight = reflectedLight.indirectDiffuse;
          #include <envmap_fragment>
          gl_FragColor = vec4( outgoingLight, diffuseColor.a );
          #include <tonemapping_fragment>
          #include <encodings_fragment>
          #include <fog_fragment>
          #include <premultiplied_alpha_fragment>
          #include <dithering_fragment>
        }
      `
    }

    const quadPointGeometry = new BufferGeometry()
    quadPointGeometry.setAttribute("position", new BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3))
    quadPointGeometry.scale(2.5, 2.5, 2.5)

    this.selectionPoint = new Points(quadPointGeometry, new PointsMaterial({ color: "white", size: 1.0, fog: false, sizeAttenuation: true }));

    (this.selectionPoint.material as PointsMaterial).onBeforeCompile = (s, r) => {
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
        if(length(gl_PointCoord.xy - 0.5) >= 0.5) discard;
        #include <clipping_planes_fragment>
        vec3 outgoingLight = vec3( 0.0 );
        vec4 diffuseColor = vec4( diffuse, opacity );
        #include <logdepthbuf_fragment>
        #include <map_particle_fragment>
        #include <color_fragment>
        #include <alphatest_fragment>
        outgoingLight = diffuseColor.rgb;
        gl_FragColor = vec4( outgoingLight, diffuseColor.a );
        #include <tonemapping_fragment>
        #include <encodings_fragment>
        #include <fog_fragment>
        #include <premultiplied_alpha_fragment>
      }`
    }

    this.selectionPoint.layers.set(1)
    this.add(this.selectionPoint)

    this.selectionPoint2 = new Points(new BufferGeometry(), new PointsMaterial({ color: "white", size: 1.0, fog: false, sizeAttenuation: true }))
    this.selectionPoint2.geometry.setAttribute("position", new BufferAttribute(new Float32Array([-5, -5, 0, 5, -5, 0, 5, 5, 0, -5, 5, 0]), 3))
    this.selectionPoint2.layers.set(1)

    this.targetPoint = new Points(new BufferGeometry(), new PointsMaterial({ size: 0 }))
    this.targetPoint.geometry.setAttribute("position", new BufferAttribute(new Float32Array([0, 0, 0]), 3))
    this.add(this.targetPoint)
    this.targetPoint.layers.set(1)
    this.targetPoint.visible = false


    this.selectionMesh = new Mesh(new PlaneBufferGeometry(15, 15), basicMaterial)
    this.selectionMesh.layers.set(1)
    this.selectionMesh.visible = false

  }

  /*updateText(camera: PerspectiveCamera) {
    if (!this.userData.text.userData.loaded || !this.userData.text.parent) return
    const cwp = new Vector3()
    camera.getWorldPosition(cwp)
    this.userData.text.userData.update(`${this.controller.name}\n${Math.round(cwp.distanceTo(this.position))}m`)
    camera.getWorldQuaternion(this.userData.text.quaternion)
    this.userData.text.applyQuaternion(this.userData.text.parent!.quaternion.clone().invert())
    this.userData.text.rotateX(Math.PI)
    this.userData.text.position.set(0, 0, 0)
    this.userData.text.translateX(6)
    this.userData.text.geometry.computeBoundingBox()
    this.userData.text.translateY(-this.userData.text.geometry.boundingBox!.min.y / 10 - 5)
  }*/

}


class ShipUserData {
  radius = 2
  velocity = new Vector3()
  angVel = new Vector3()
  isArea = true
  history = []
  constructor(
    public id: number,
    public controller: number,
    public ctrl: any
  ) { }
}

export const AL: any = {
  LatoFnt: null,
  LatoPng: null
}

loadFont(process.env.PUBLIC_URL + '/fonts/Lato.fnt', (error, font) => { AL.LatoFnt = font })

var textureLoader = new TextureLoader();
textureLoader.load(process.env.PUBLIC_URL + '/fonts/Lato.png', function (texture) {
  // we can use a simple ThreeJS material
  texture.minFilter = texture.magFilter = LinearFilter
  AL.LatoPng = texture

})

export function Text3D({ position, text, color, offset }) {

  return <group position={position}>
    <mesh onUpdate={mesh => {
      mesh.userData.loaded = true
      var geometry = createGeometry({
        width: 200,
        align: 'left',
        font: AL.LatoFnt
      }) as any

      mesh.userData.update = (text) => {
        geometry.update(text)
      }
      var material = new MeshBasicMaterial({
        map: AL.LatoPng,
        transparent: true,
        color,
        depthWrite: true,
      })

      // now do something with our mesh!
      mesh.geometry = geometry
      mesh.material = material
      mesh.scale.multiplyScalar(0.1)
      mesh.rotateX(Math.PI)
      mesh.position.fromArray(offset)
      geometry.update(text)
      geometry.computeBoundingBox()
      mesh.position.y += geometry.boundingBox.min.y / 20
    }}></mesh>
  </group>

}

export function makeText(player, camera = null, color = 0xffffff, text = "") {
  const mesh = new Mesh()
  var geometry = createGeometry({
    width: 400,
    align: 'left',
    font: AL.LatoFnt,
    text: text
  }) as any

  mesh.userData.update = (text) => {
    geometry.update(text)
  }

  var material = new MeshBasicMaterial({
    map: AL.LatoPng,
    transparent: true,
    color,
    depthWrite: false
  })
  mesh.geometry = geometry
  mesh.material = material
  mesh.scale.multiplyScalar(0.1)
  mesh.rotateX(Math.PI)
  geometry.computeBoundingBox()

  return mesh
}
