import { DodecahedronBufferGeometry, InstancedMesh, MeshBasicMaterial, MeshLambertMaterial, MeshPhongMaterial, MeshPhysicalMaterial, MeshStandardMaterial, Object3D, Vector3 } from "three"
import seedrandom from "seedrandom"
import { hasCol2, randBox } from "../functions"
import { BOX_SIZE } from "../../config";

export const asteroids = []
const rand = seedrandom("yussuf")
const maxR = 100
const minR = 10

for (let i = 0; i < 16 * 16; i++) {
    const asteroid = {
        position: randBox(BOX_SIZE, undefined, rand),
        radius: (maxR - minR) - rand() * rand() * rand() * (maxR - minR) + minR,
        userData: { radius: 1 }
    }
    while (hasCol2(asteroid, asteroids, BOX_SIZE)) {
        randBox(BOX_SIZE, asteroid.position, rand)
        asteroid.radius = (maxR - minR) - rand() * rand() * rand() * (maxR - minR) + minR
    }
    asteroid.userData.radius = asteroid.radius
    asteroids.push(asteroid)
}

export type AsteroidFieldProps = {
    seed: string,
    boxSize: number,
    boxSizeHalf: number,
    num: number,
    minR: number,
    maxR: number,
    flexR: boolean
}

const asteroidGeometry = new DodecahedronBufferGeometry(1, 1)
asteroidGeometry.computeVertexNormals()
export const asteroidMaterialStandard = new MeshStandardMaterial({ dithering: true, color: 0xffffff })
export const asteroidMaterialBasic = new MeshBasicMaterial({ dithering: true, color: 0x000000 })

export const AsteroidFieldMaterials = {
    Lambert: new MeshLambertMaterial({ dithering: true }),
    Phong: new MeshPhongMaterial({ dithering: true }),
    Standard: new MeshStandardMaterial({ dithering: true }),
    Physical: new MeshPhysicalMaterial({ dithering: true })
}

export default class AsteroidField extends InstancedMesh {
    constructor() {
        super(asteroidGeometry, asteroidMaterialStandard, asteroids.length)
        this.layers.enable(2)
        updateMesh(this)
        this.receiveShadow = true
        this.castShadow = true
    }
}

function updateMesh(mesh: InstancedMesh) {
    const tmp = new Object3D()

    mesh.userData = { velocity: new Vector3(), positions: [], radii: [], velocities: [] }

    for (let i = 0; i < asteroids.length; i++) {
        mesh.userData.positions.push(asteroids[i].position)
        mesh.userData.radii.push(asteroids[i].radius)
        //        mesh.userData.velocities.push(new Vector3(rand(), rand(), rand()).subScalar(0.5).divideScalar(radius * 0.001))
        tmp.position.copy(asteroids[i].position)
        tmp.scale.set(1, 1, 1).multiplyScalar(asteroids[i].radius)
        tmp.updateMatrix()
        mesh.setMatrixAt(i, tmp.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
}