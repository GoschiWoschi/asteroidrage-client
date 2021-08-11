import { IcosahedronBufferGeometry, Mesh, MeshBasicMaterial, Vector3 } from "three";
import Ship from "./Ship";
import { modV3, randBox } from '../functions';
import { BOX_SIZE, BOX_SIZE2 } from "../../config";

const missileGeometry = new IcosahedronBufferGeometry(0.2, 1)
const missileMaterial = new MeshBasicMaterial({ dithering: true, color: 0x007fff, fog: false })

export default class Missile extends Mesh {

    constructor(shooter: Ship, target: Ship) {
        super(missileGeometry, missileMaterial)
        this.userData = new MissileUserData(shooter, target)
        this.position.copy(shooter.position).add(new Vector3(0, -1, -1).applyQuaternion(shooter.quaternion))
        this.name = "Missile"
        this.quaternion.copy(shooter.quaternion)
    }

    updateVelocity(dt_s: number) {
        if (!this.userData.active) return
        let target = this.userData.target
        if (!target) target = { userData: { velocity: this.userData.velocity.clone().add(new Vector3(0, 0, -20).applyQuaternion(this.quaternion)) }, position: this.position.clone().add(new Vector3(0, 0, -100).applyQuaternion(this.quaternion)) }
        var vLength = this.userData.velocity.length()
        var r = target.position.clone().sub(this.position)
        modV3(r.addScalar(BOX_SIZE2), BOX_SIZE).subScalar(BOX_SIZE2)
        var rvLength = r.clone().normalize().multiplyScalar(vLength)
        var vDiff = rvLength.clone().sub(this.userData.velocity).add(target.userData.velocity)
        var dLength = vDiff.length() * 200
        var rest = Math.max(0, 200 - dLength) * 0
        var acc = vDiff.normalize().multiplyScalar(Math.min(dLength, 400))
        //acc = new Vector3()
        acc.add(r.clone().normalize().multiplyScalar(rest))
        //acc.normalize().multiplyScalar(400)
        this.userData.velocity.add(acc.clone().multiplyScalar(dt_s))
    }

}

class MissileUserData {
    radius = 0.2
    spawnTime = Date.now()
    velocity = new Vector3()
    active = false
    constructor(
        public shooter: Ship,
        public target: Ship
    ) {
        const shootVec = new Vector3(0, 0, -20).add(randBox(20, new Vector3()).subScalar(10)).normalize().multiplyScalar(50).applyQuaternion(shooter.quaternion)
        this.velocity.copy(shooter.userData.velocity).add(shootVec)//.add(randomBox(new Vector3(), Math.random, 0.1)).normalize().multiplyScalar(10).applyQuaternion(shooter.quaternion))
    }
}