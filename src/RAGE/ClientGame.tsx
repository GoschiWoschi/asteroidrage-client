import { AudioLoader, Audio, AudioListener, Mesh, MeshBasicMaterial, PositionalAudio, Raycaster, Vector3, CylinderBufferGeometry, Vector2, Frustum, Matrix4, Quaternion, Scene, PerspectiveCamera, Object3D, WebGLRenderer, Intersection, PointsMaterial, AdditiveBlending } from "three"
import { modAround, hasCollision, keysApply, randomBox, time_of_impact } from "./functions"
import AsteroidField, { asteroidMaterialBasic, asteroidMaterialStandard } from "./gameobjects/AsteroidField"
import Explosion from "./gameobjects/Explosion"
import LightGroup from "./gameobjects/LightGroup"
import { LootField, LootInstances } from "./gameobjects/Loot"
import Missile from "./gameobjects/Missile"
import { ClientPacket } from "./networking/GameNetworkPacket"
import Physics, { BodyTypes } from "./physics/physics"
import Ship, { shipMaterialBasic, shipMaterialStandard } from "./gameobjects/Ship"
import { Settings } from "../Components/Settings"
import Game from "./Game"
import { BOX_SIZE, BOX_SIZE2 } from "../config";
import { ShieldMaterial } from "./gameobjects/ShipModules/Shield"

class AudioHelper {

    buffers: { [name: string]: AudioBuffer } = {}

    load(name: string, url: string) {
        const _self = this
        const loader = new AudioLoader()
        loader.load(url, (buffer) => {
            _self.buffers[name] = buffer
        })
    }

}

export const audioHelper = new AudioHelper()
audioHelper.load("projectile", process.env.PUBLIC_URL + '/sounds/projectile.wav')
audioHelper.load("missile", process.env.PUBLIC_URL + '/sounds/missile.wav')
audioHelper.load("explosion", process.env.PUBLIC_URL + '/sounds/explosion.wav')
audioHelper.load("engine", process.env.PUBLIC_URL + '/sounds/engine.wav')
audioHelper.load("loot", process.env.PUBLIC_URL + '/sounds/loot.wav')
export const listener = new AudioListener();

const projectileGeometry = new CylinderBufferGeometry(0.1, 0.1, 2, 10, 1, false)
projectileGeometry.rotateX(Math.PI / 2)

const projectileCD = 66
const missileCD = 200

type GameDisplay = {
    gl: WebGLRenderer,
    scene: Scene,
    camera: PerspectiveCamera,
    setState: (s: any) => any,
    createShip: (cb: (model: Object3D) => void) => void,
    messageHandle: any,
    shipPrefab: Object3D
}

export default class ClientGame {

    mode = "observer"
    followShip = null
    display: undefined | GameDisplay
    game: Game = new Game()
    physics = Physics()
    myID = -1
    myShip: Ship = null
    asteroidField = new AsteroidField()
    lootInstances = new LootInstances()

    //projectileLights = new LightGroup(16, 0xff7f00, 1, 50, 1)
    //missileLights = new LightGroup(16, 0x007fff, 1, 100, 1)

    lights = new LightGroup(16, 0xffffff, 1, 100, 1)

    keys = {}
    buttons = {}
    mousepos = new Vector2()
    projectileFireTimeout = null
    missileFireTimeout = null

    throttleStick = {
        active: false,
        pos: new Vector2()
    }

    projectileSound = [new Audio(listener), new Audio(listener), new Audio(listener), new Audio(listener)]
    projectileSoundIndex = 0

    missileSound = [new Audio(listener), new Audio(listener), new Audio(listener), new Audio(listener)]
    missileSoundIndex = 0
    viewMode = 0

    cameraFollow = new Object3D()
    srotTarget = null

    activeGunSide = 0

    runTime = 0
    estimatedServerTime = 0
    time = Date.now()
    startTime = Date.now()

    constructor(private settings: Settings, private send: (msg: any) => void, private device: any) { }

    setSettings(settings: Settings) {
        this.settings = settings

        if (this.settings.graphics.lightsDisabled) {
            this.lights.visible = false
            this.asteroidField.material = asteroidMaterialBasic
            this.game.ships.forEach(s => { s.material = shipMaterialBasic })
        }
        else {
            this.lights.visible = true
            this.asteroidField.material = asteroidMaterialStandard
            this.game.ships.forEach(s => { s.material = shipMaterialStandard })
        }
        //this.settings.controls = settings.controls
        //this.asteroidField.material = AsteroidFieldMaterials[settings.graphics.shaders]
    }

    setR3F(r3f: GameDisplay) {
        this.display = r3f
        this.display.scene.add(this.asteroidField)
        this.physics.addObject(this.asteroidField, BodyTypes.STATIC)
        this.display.scene.add(this.lootInstances)
        this.physics.addObject(this.lootInstances.lf, BodyTypes.STATIC)
        this.display.scene.add(this.lights)

        window.addEventListener("keydown", e => this.keys[e.code] = true)
        window.addEventListener("keyup", e => delete this.keys[e.code])
        window.addEventListener("keydown", e => {
            if (e.code === "KeyT") {
                this.tabTargets(this.display.camera, this.myShip, true)
            }
            if (keysApply(this.keys, this.buttons, this.settings.controls.camera.viewToggle, false)) {
                if (this.myShip) {
                    this.viewMode = 1 - this.viewMode
                }
            }
        })
        window.addEventListener("keydown", e => {
            if (e.code === "KeyF") {
                //this.myShip
            }
        })
        window.addEventListener("blur", e => {
            this.buttons = {}
            this.keys = {}
            this.mousepos.set(0, 0)
        })

        this.display.gl.domElement.addEventListener("mousedown", e => this.buttons[e.button] = true)
        this.display.gl.domElement.addEventListener("mouseup", e => delete this.buttons[e.button])
        this.display.gl.domElement.addEventListener("mousemove", e => {
            const size = new Vector2()
            this.display.gl.getSize(size)
            this.mousepos.set(
                e.clientX / size.width,
                e.clientY / size.height
            ).multiplyScalar(2).subScalar(1)
        })
        this.display.gl.domElement.addEventListener("mousedown", e => {

            if (keysApply(this.keys, this.buttons, this.settings.controls.weapons.weapon1, true)) {
                const fire = () => {
                    if (keysApply(this.keys, this.buttons, this.settings.controls.weapons.weapon1, true)) {
                        if (this.projectileFireTimeout) return
                        if (this.myShip && this.myShip.ammo > 0) {
                            this.myShip.ammo--
                            this.fireProjectile(this.myShip)
                            this.send(ClientPacket.Projectile())
                            this.projectileFireTimeout = setTimeout(() => {
                                this.projectileFireTimeout = null
                                fire()
                            }, projectileCD)
                        }
                    }
                }
                fire()
            }
            if (keysApply(this.keys, this.buttons, this.settings.controls.weapons.weapon2, true)) {
                const fire = () => {
                    if (keysApply(this.keys, this.buttons, this.settings.controls.weapons.weapon2, true)) {
                        if (this.missileFireTimeout) return
                        if (this.myShip && this.myShip.missiles > 0) {
                            if (this.myShip.target.object) {
                                this.myShip.missiles--
                                this.fireMissile(this.myShip, this.myShip.target.object)
                                this.send(ClientPacket.Missile(this.myShip.target.object?.userData.id || 0))
                            }
                            this.missileFireTimeout = setTimeout(() => {
                                this.missileFireTimeout = null
                                fire()
                            }, missileCD)
                        }
                    }
                }
                fire()
            }
        })
    }

    tabTargets(camera: PerspectiveCamera, myShip, colorize = false) {
        if (!myShip) return

        myShip.target.object = null

        camera.updateMatrix()
        camera.updateMatrixWorld()
        camera.updateProjectionMatrix()
        camera.updateWorldMatrix(true, true)

        var frustum = new Frustum()
        frustum.setFromProjectionMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));

        var inside = []

        this.game.ships.forEach((s) => {
            if (s === myShip) return
            if (colorize) {
                s.selectionMesh.material.color.setHex(0xffffff)
                s.selectionPoint.material.color.setHex(0xffffff)
            }
            if (frustum.containsPoint(modAround(s.position, myShip.position, BOX_SIZE, BOX_SIZE2))) {

                const r = s.position.clone().sub(myShip.position).normalize()
                const rc = new Raycaster(myShip.position, r, 0, 500)
                const inter = rc.intersectObject(this.asteroidField)
                var d = s.position.distanceTo(myShip.position)
                let ainway = false
                if (inter.length && inter[0].distance < d) {
                    ainway = true
                }
                if (!ainway) {
                    for (var i = 0; i < inside.length; i++) {
                        if (inside[i].d > d) {
                            break;
                        }
                    }
                    inside.splice(i, 0, {
                        d: d,
                        s: s
                    })
                }
            }

        })

        if (inside.length) {
            const bl0 = myShip.ttt % Math.min(3, inside.length)
            myShip.target.object = inside[bl0].s
            myShip.ttt = (myShip.ttt + 1) % Math.min(3, inside.length)
        }

        if (myShip.target.object && colorize) {
            myShip.target.object.selectionMesh.material.color.setHex(0xff0000)
            myShip.target.object.selectionPoint.material.color.setHex(0xff0000)
        }
    }

    getPlayer(id) {
        for (let i = 0; i < this.game.players.length; i++) if (this.game.players[i].id === id) return this.game.players[i]
    }

    getBot(id) {
        for (let i = 0; i < this.game.bots.length; i++) if (this.game.bots[i].id === id) return this.game.bots[i]
    }

    getShip(id: number): Ship {
        for (let i = 0; i < this.game.ships.length; i++) if (this.game.ships[i].userData.id === id) return this.game.ships[i]
    }

    createShip(m) {

        var isbot = false
        let controller = this.getPlayer(m.controller)
        if (!controller) {
            controller = this.getBot(m.controller)
            if (controller) {
                isbot = true
            }
        }
        if (!controller) return

        const ship = new Ship(m.id, controller)
        //const prefab = this.display.shipPrefab.clone()
        //prefab.visible = true
        //ship.add(prefab)
        ship.onCollision = this.onShipCollision.bind(this)
        this.display.scene.add(ship)
        this.game.ships.push(ship)
        randomBox(ship.position, Math.random, BOX_SIZE)
        while (hasCollision(ship.position, 2, this.asteroidField.userData.positions, this.asteroidField.userData.radii, BOX_SIZE, BOX_SIZE2)) {
            randomBox(ship.position, Math.random, BOX_SIZE)
        }
        if (isbot) {

            //+bot bullshit weil sonst is es .player und wird nicht als bot erkannt -_-
            //NEVERMIND GEHT TROTZDEM NICHT HURE
            ship.userData.ctrl.msg = "+bot"

        }

        isbot && this.game.bots.forEach(bot => {
            if (bot.id === m.controller) {
                bot.ship = ship
            }
        })



        ship.userData.lamp1.visible = false
        if (m.controller === this.myID && !isbot) {
            ship.userData.lamp1.visible = true
            this.physics.addObject(ship, BodyTypes.DYNAMIC)
            const sound = new Audio(listener)
            sound.setBuffer(audioHelper.buffers["engine"])
            sound.setLoop(true)
            sound.setVolume(0.1)
            sound.setPlaybackRate(1)
            ship.add(sound)
            sound.play()

            const sound2 = new Audio(listener)
            sound2.setBuffer(audioHelper.buffers["engine"])
            sound2.setLoop(true)
            sound2.setVolume(0.5)
            sound2.setPlaybackRate(0.5)
            ship.add(sound2)
            sound2.play()

            ship.userData.engineSounds = { sound, sound2 }

            //ship.add(this.display.camera)
            this.display.camera.position.set(0, 0, 0)
            this.display.camera.rotation.set(0, 0, 0)
            ship.add(this.cameraFollow)
            ship.selectionMesh.visible = false
            ship.selectionPoint.visible = false
            this.send(ClientPacket.UpdateShip(ship))
            this.myShip = ship
            this.display.setState(state => ({ ...state, myShip: ship }))
            this.display.camera.add(listener)
        } else {
            if (isbot) {
                this.physics.addObject(ship, BodyTypes.DYNAMIC)
            } else {
                this.physics.addObject(ship, BodyTypes.STATIC)
            }
        }

        if (this.mode === "observer") {
            //            ship.add(this.display.camera)
            //          this.display.camera.position.set(0, 0, 0)
            //        this.followShip = ship
        }

    }

    removeShip(id) {
        for (let i = 0; i < this.game.ships.length; i++) {
            if (this.game.ships[i].userData.id === id) {

                this.game.missiles.forEach(m => {
                    if (m.shooter === this.game.ships[i]) this.removeMissile(m)
                })

                if (this.myShip && this.myShip.target && this.game.ships[i] === this.myShip.target.object) this.myShip.target.object = null

                if (this.game.ships[i] === this.myShip) {
                    this.myShip.userData.engineSounds.sound.stop()
                    this.myShip.userData.engineSounds.sound2.stop()
                    delete this.myShip
                    this.display.setState(state => ({ ...state, myShip: undefined }))
                }

                const explosion = new Explosion(0xff9933, 1)
                explosion.position.copy(this.game.ships[i].position)
                explosion.userData.velocity.copy(this.game.ships[i].userData.velocity)
                this.display.scene.add(explosion)
                this.physics.addObject(explosion, BodyTypes.KINEMATIC)
                this.game.explosions.push(explosion)
                explosion.userData.creationTime = Date.now()
                explosion.userData.lifeTime = 2000

                this.display.scene.remove(this.game.ships[i])
                this.physics.removeObject(this.game.ships[i], BodyTypes.DYNAMIC)
                this.game.ships.splice(i, 1)

                const sound = new PositionalAudio(listener)
                explosion.add(sound)
                sound.setMaxDistance(BOX_SIZE2)
                sound.setRefDistance(1)
                sound.setRolloffFactor(0.02)
                sound.setBuffer(audioHelper.buffers["explosion"])
                sound.setVolume(1)
                sound.play()

                const light = this.lights.getLight()
                if (light) {
                    explosion.add(light)
                    explosion.userData.light = light
                    light.color.setHex(0xff9933)
                    light.distance = 250
                    light.intensity = 0
                }

                break
            }
        }
    }

    fireProjectile(ship: Ship) {

        const proj = new Mesh(projectileGeometry, new MeshBasicMaterial({ color: 0xff7f00, opacity: 1, transparent: true, blending: AdditiveBlending, depthWrite: true }))
        proj.layers.enable(10)
        this.display.scene.add(proj)
        proj.position.copy(ship.position).add(new Vector3(0, 0, -2).applyQuaternion(ship.quaternion))

        const aimVector = new Vector3(0, 0, -1).add(randomBox(new Vector3(), Math.random, 0.01)).applyQuaternion(ship.quaternion)
        proj.applyQuaternion(ship.quaternion)
        proj.translateX(this.activeGunSide ? 1.1 : -1.1)
        this.activeGunSide = 1 - this.activeGunSide
        if (!this.device.isMobile && !this.device.isTablet) {
            if (this.myShip && ship === this.myShip) {
                const rc = new Raycaster()
                rc.setFromCamera(this.mousepos.clone().multiply(new Vector2(1, -1)), this.display.camera)
                aimVector.copy(rc.ray.direction)
            }
        }

        proj.lookAt(proj.position.clone().add(aimVector))
        aimVector.multiplyScalar(1000)
        proj.userData.velocity = ship.userData.velocity.clone().add(aimVector)
        proj.userData.radius = 0.05
        proj.userData.shooter = ship

        this.game.projectiles.push(proj);

        (proj as any).onCollision = this.onProjectileCollision.bind(this)

        if (!this.device.isMobile && !this.device.isTablet) {
            if (this.myShip && ship === this.myShip && this.myShip.target.object) {
                const target = this.myShip.target.object
                const targetVelocity = target.userData.velocity.clone()
                const dp = proj.position.clone().sub(target.position)
                const dv = this.myShip.userData.velocity.clone().sub(targetVelocity)
                const huhgo = time_of_impact(dp.x, dp.y, dp.z, dv.x, dv.y, dv.z, 1000)
                const tp = target.position.clone().add(targetVelocity.clone().multiplyScalar(huhgo))
                const vel = tp.sub(proj.position).normalize().multiplyScalar(1000)
                proj.userData.velocity = vel
                proj.lookAt(proj.position.clone().add(vel))
            }
        }

        proj.userData.creationTime = Date.now()
        proj.userData.lifeTime = 1000

        this.physics.addObject(proj, BodyTypes.KINEMATIC);

        if (this.myShip && ship === this.myShip) this.playProjectileSound()

        const light = this.lights.getLight()
        if (light) {
            proj.add(light)
            proj.userData.light = light
            light.color.setHex(0xff7f00)
            light.distance = 50
            light.intensity = 0
        }

        return proj
    }

    playProjectileSound() {
        const sound = this.projectileSound[this.projectileSoundIndex]
        this.projectileSoundIndex = (this.projectileSoundIndex + 1) % this.projectileSound.length
        sound.setBuffer(audioHelper.buffers["projectile"])
        sound.setPlaybackRate(0.5 + Math.random() * 0.01)
        sound.setVolume(1)
        try {
            sound.stop()
        } catch (e) { }
        sound.play()
    }

    fireMissile(ship, target) {
        const proj = new Missile(ship, target)
        proj.layers.enable(10)
        this.display.scene.add(proj)
        this.game.missiles.push(proj)
        this.physics.addObject(proj, BodyTypes.KINEMATIC);
        (proj as any).onCollision = this.onMissileCollision.bind(this)
        proj.userData.creationTime = Date.now()
        proj.userData.lifeTime = 5000
        if (this.myShip && this.myShip === ship) {
            this.playMissileSound()
        }
        const light = this.lights.getLight()
        if (light) {
            proj.add(light)
            proj.userData.light = light
            light.color.setHex(0x007fff)
            light.distance = 100
            light.intensity = 0
        }
    }

    playMissileSound() {
        const sound = this.missileSound[this.missileSoundIndex]
        this.missileSoundIndex = (this.missileSoundIndex + 1) % this.missileSound.length
        sound.setBuffer(audioHelper.buffers["missile"])
        sound.setPlaybackRate(1 + Math.random() * 0.05)
        sound.setVolume(1)
        try {
            sound.stop()
        } catch (e) { }
        sound.play()
    }

    onProjectileCollision(projectile, collision) {

        if (projectile.userData.shooter === collision.object || projectile.userData.shooter === collision.object.parent) return

        if (collision.object.name === "Loot") return

        let ship = null
        if (collision.object.name === "Ship") ship = collision.object
        else if (collision.object.parent.name === "Ship") ship = collision.object.parent

        if (ship && projectile.userData.shooter === this.myShip) {
            ship.shield.material.addHit(this.runTime, collision.face.normal, 0.02)
            this.send(ClientPacket.ProjectileHit(ship.userData.id))
        }
        if (collision.object.name !== "Loot") this.removeProjectile(projectile)
    }

    removeProjectile(projectile) {
        if (projectile.userData.light) {
            this.lights.returnLight(projectile.userData.light)
        }
        projectile.userData.light = null
        this.display.scene.remove(projectile)
        this.physics.removeObject(projectile, BodyTypes.KINEMATIC)
        const index = this.game.projectiles.indexOf(projectile)
        if (index !== -1) this.game.projectiles.splice(index, 1)
    }

    onMissileCollision(projectile, collision) {

        if (collision.object.name === "Loot") return
        var ship = null
        var isbot = false
        let controller = this.getPlayer(projectile.userData.shooter.controller.id)
        if (!controller) {
            controller = this.getBot(projectile.userData.shooter.controller.id)
            if (controller) {
                isbot = true
            }
        }

        if (collision.object.name === "Ship") ship = collision.object
        else if (collision.object.parent.name === "Ship") ship = collision.object.parent

        if (ship !== null && projectile.userData.shooter === this.myShip && ship !== this.myShip) {
            ship.shield.material.addHit(this.runTime, collision.face.normal, 0.4)
            this.send(ClientPacket.MissileHit(projectile.userData.shooter.controller.id, ship.userData.id))
        }
        else if (ship !== null && isbot && projectile.userData.shooter.controller.controller === this.myID) {
            if (ship !== projectile.userData.shooter) {
                ship.shield.material.addHit(this.runTime, collision.face.normal, 0.4)
                this.send(ClientPacket.MissileHit(projectile.userData.shooter.controller.id, ship.userData.id))
            }
        }

        if (collision.object !== projectile.userData.shooter && collision.object.parent !== projectile.userData.shooter) this.removeMissile(projectile)
    }

    removeMissile(projectile) {
        if (projectile.userData.light) {
            this.lights.returnLight(projectile.userData.light)
        }
        this.display.scene.remove(projectile)
        this.physics.removeObject(projectile, BodyTypes.KINEMATIC)
        const index = this.game.missiles.indexOf(projectile)
        if (index !== -1) {
            this.game.missiles.splice(index, 1)

            const explosion = new Explosion(0x337fff, 0.1)
            this.game.explosions.push(explosion)
            explosion.position.copy(projectile.position)
            explosion.userData.velocity = projectile.userData.velocity.clone().multiplyScalar(0.5)
            explosion.userData.type = "missileExplosion"
            this.display.scene.add(explosion)
            this.physics.addObject(explosion, BodyTypes.KINEMATIC)
            explosion.userData.creationTime = Date.now()
            explosion.userData.lifeTime = 500

            const sound = new PositionalAudio(listener)
            explosion.add(sound)
            sound.setPlaybackRate(2)
            sound.setMaxDistance(BOX_SIZE2)
            sound.setRefDistance(1)
            sound.setRolloffFactor(0.02)
            sound.setBuffer(audioHelper.buffers["explosion"])
            sound.setVolume(0.5)
            sound.play()

            const light = this.lights.getLight()
            if (light) {
                explosion.add(light)
                explosion.userData.light = light
                light.color.setHex(0x007fff)
                light.distance = 100
                light.intensity = 0
            }

        }


    }

    onShipCollision(ship, collision) {
        if (collision.object instanceof LootField && ship === this.myShip) {
            if (this.lootInstances.visibleAttribute.array[collision.instanceId] === 1) {
                (this.lootInstances.visibleAttribute.array as Float32Array)[collision.instanceId] = 0
                this.send(ClientPacket.Looted(collision.instanceId))
            }
        }
    }

    removeExplosion(explosion) {
        const index = this.game.explosions.indexOf(explosion)
        if (index > -1) this.game.explosions.splice(index, 1)
        this.display.scene.remove(explosion)
        this.physics.removeObject(explosion, BodyTypes.KINEMATIC)
        if (explosion.userData.light) this.lights.returnLight(explosion.userData.light)
    }

    animate() {

        const dt_s = (Date.now() - this.time) / 1000
        this.time = Date.now()
        this.runTime = (this.time - this.startTime) / 1000

        this.estimatedServerTime = Date.now() - this.game.serverTime.local + this.game.serverTime.server - 500

        this.game.ships.forEach(ship => {
            if (ship.userData.ctrl.msg === "+bot") {
                const rc = new Raycaster(ship.position, new Vector3(0, 0, -1).applyQuaternion(ship.quaternion), 2.5, 250)
                const ints = rc.intersectObject(this.asteroidField)
                if (ints.length) {
                    ship.rotateX(Math.PI * (Math.random() - 0.5) * 0.125)
                    ship.rotateY(Math.PI * (Math.random() - 0.5) * 0.125)
                }
                ship.userData.velocity.add(new Vector3(0, 0, -50).applyQuaternion(ship.quaternion).sub(ship.userData.velocity).multiplyScalar(dt_s * 2))
            } else if (ship.userData.ctrl.msg === "+player" || ship.userData.ctrl.msg === ".player") {
                if (ship !== this.myShip) {
                    for (let i = 0; i < ship.userData.history.length - 1; i++) {
                        if (ship.userData.history[i].time <= this.estimatedServerTime && ship.userData.history[i + 1].time > this.estimatedServerTime) {
                            const pos1 = new Vector3().fromArray(ship.userData.history[i].position)
                            const pos2 = new Vector3().fromArray(ship.userData.history[i + 1].position)
                            const factor = (this.estimatedServerTime - ship.userData.history[i].time) / (ship.userData.history[i + 1].time - ship.userData.history[i].time)
                            ship.position.copy(pos1).multiplyScalar(1 - factor)
                            ship.position.add(pos2.clone().multiplyScalar(factor))
                            ship.rotation.fromArray(ship.userData.history[i].rotation)
                            //TODO: slerp quaternion
                            ship.userData.velocity.copy(pos2).sub(pos1).divideScalar((ship.userData.history[i + 1].time - ship.userData.history[i].time) / 1000)
                        }
                    }
                }
            }
        })

        this.game.ships.forEach(ship => {
            while (ship.userData.history.length > 50) ship.userData.history.shift()
        })

        if (this.myShip) this.physics.applyShipControls(this.myShip, this.keys, this.buttons, this.mousepos, dt_s, this.settings, this.throttleStick)

        this.game.projectiles.forEach(proj => {
            if (Date.now() - proj.userData.creationTime > proj.userData.lifeTime) this.removeProjectile(proj)
            else {
                proj.material.opacity = Math.min(1, proj.material.opacity + 0.2)
                proj.userData.light.intensity = Math.min(1, proj.userData.light.intensity + dt_s * 10)
            }
        })

        this.physics.checkCollisions(dt_s, BOX_SIZE, BOX_SIZE2)
        this.physics.updatePositions(dt_s)

        this.game.missiles.forEach(m => {
            if (Date.now() - m.userData.creationTime > m.userData.lifeTime) this.removeMissile(m)
            else {
                if (Date.now() - m.userData.creationTime > 150) m.userData.active = true
                m.updateVelocity(dt_s)
                m.userData.light.intensity = Math.min(1, m.userData.light.intensity + dt_s)
            }
        })

        if (this.mode === "player" && this.myShip) this.physics.repeatingBoundaries(this.myShip, BOX_SIZE, BOX_SIZE2)
        else if (this.mode === "observer" && this.followShip) this.physics.repeatingBoundaries(this.followShip, BOX_SIZE, BOX_SIZE2)

        this.game.ships.forEach((ship: Ship) => {
            (ship.shield.material as any).setTime(this.runTime)
        })

        if (this.myShip || true) {
            this.game.ships.forEach(ship => {
                const blaQ = new Quaternion()
                this.display.camera.getWorldQuaternion(blaQ)
                ship.selectionMesh.quaternion.copy(blaQ)
                ship.selectionMesh.applyQuaternion(ship.quaternion.clone().invert())
                ship.selectionPoint.quaternion.copy(blaQ)
                ship.selectionPoint.applyQuaternion(ship.quaternion.clone().invert())
                ship.selectionPoint2.quaternion.copy(blaQ)
                ship.selectionPoint2.applyQuaternion(ship.quaternion.clone().invert())

                const text = ship.userData.text
                if (!text) return
                text.quaternion.copy(blaQ)
                text.applyQuaternion(ship.quaternion.clone().invert())
                text.rotateX(Math.PI)
            })
        }
        this.game.loots.forEach(ship => {
            const blaQ = new Quaternion()
            this.display.camera.getWorldQuaternion(blaQ)
            const text = ship.userData.text
            if (!text) return
            text.quaternion.copy(blaQ)
            text.position.set(0, 0, 0)
            text.applyQuaternion(ship.quaternion.clone().invert())
            text.rotateX(Math.PI)
            text.translateX(6)
            if (text.geometry.boundingBox) {
                text.translateY(-0.1 * text.geometry.boundingBox!.min.y / 2)
            }
        })

        this.game.explosions.forEach(explosion => {
            const timeAlive = Date.now() - explosion.userData.creationTime
            if (timeAlive > explosion.userData.lifeTime) {
                this.removeExplosion(explosion)
                return
            }
            if (explosion.userData.type === "missileExplosion") {
                explosion.material.size += dt_s * 25
                explosion.scale.addScalar(dt_s * 25)
                explosion.material.opacity = Math.min(1, Math.max(0, explosion.material.opacity - dt_s * 2))
                if (timeAlive <= explosion.userData.lifeTime * 0.5) {
                    explosion.userData.light.intensity += dt_s * 5
                } else {
                    explosion.userData.light.intensity -= dt_s * 5
                }
            } else {
                explosion.material.size += dt_s * 50
                explosion.scale.addScalar(dt_s * 50)
                explosion.material.opacity = Math.min(1, Math.max(0, explosion.material.opacity - dt_s * 0.5))
                if (timeAlive <= explosion.userData.lifeTime * 0.5) {
                    explosion.userData.light.intensity += dt_s * 10
                } else {
                    explosion.userData.light.intensity -= dt_s * 10
                }
            }
        })
        if (this.myShip) {

            const rc = new Raycaster()
            rc.layers.set(1)
            rc.setFromCamera(this.mousepos.clone().multiply(new Vector2(1, -1)), this.display.camera)
            rc.params.Points = { threshold: 30 }

            const ints: Intersection[] = []
            this.srotTarget = null
            this.game.ships.forEach((ship: Ship) => {
                if (ship === this.myShip) return
                ship.updateMatrix()
                ship.updateWorldMatrix(true, true)
                ship.updateMatrixWorld()
                const material = ship.selectionPoint.material as PointsMaterial
                const material2 = ship.selectionPoint2.material as PointsMaterial
                material.size = 1
                material.color.setRGB(1, 1, 1)
                material2.size = 1
                material2.color.setRGB(1, 1, 1)
                rc.intersectObject(ship.targetPoint, false, ints)
            })

            if (ints.length) {
                const material = (ints[0].object.parent as Ship).selectionPoint.material as PointsMaterial
                const material2 = (ints[0].object.parent as Ship).selectionPoint2.material as PointsMaterial
                material.size = 2
                material.color.setRGB(1, 0, 0)
                material2.size = 2
                material2.color.setRGB(1, 0, 0)
                this.srotTarget = ints[0].object.parent
            }

            this.game.ships.forEach(ship => {
                if (ship === this.srotTarget) ship.srot += ((Math.PI / 4) - ship.srot) * dt_s * 10
                else ship.srot += (0 - ship.srot) * dt_s * 10
                ship.selectionPoint.rotateZ(-ship.srot)
                ship.selectionPoint.scale.set(1, 1, 1).multiplyScalar(ship.srot * 0.5 + 1)
                ship.selectionPoint2.rotateZ(ship.srot)
                ship.nameSprite.material.opacity = ship.srot
            })

            this.myShip.target.object = null

            if (this.srotTarget) {
                this.myShip.target.object = this.srotTarget
            }

        }

        this.game.ships.forEach(s => {
            s.shield.material.uniforms.energy.value += (s.shield.material.energy - s.shield.material.uniforms.energy.value) * Math.min(1, dt_s * 10)
        })

        if (this.myShip) {
            let shieldAlpha = this.viewMode === 1 ? 1 : 0
            const tp = new Vector3()
            if (this.viewMode === 1) tp.set(0, 5, 15).multiplyScalar(1 + this.myShip.userData.velocity.length() / 1000)
            this.cameraFollow.position.add(tp.clone().sub(this.cameraFollow.position).multiplyScalar(Math.min(1, dt_s * 10)))
            const shieldMaterial = this.myShip.shield.material as ShieldMaterial
            shieldMaterial.uniforms.opacity.value += (shieldAlpha - shieldMaterial.uniforms.opacity.value) * Math.min(1, dt_s * 10)
            const cfwp = new Vector3()
            const cfwq = new Quaternion()
            this.cameraFollow.getWorldQuaternion(cfwq)
            this.cameraFollow.getWorldPosition(cfwp)
            this.display.camera.position.copy(cfwp)
            this.display.camera.quaternion.copy(cfwq)
            //modV3(this.display.camera.position.addScalar(500).sub(this.myShip.position), 1000).subScalar(500).add(this.myShip.position)
            //this.display.camera.position.lerp(cfwp, Math.min(1, dt_s * 40))
            //this.display.camera.quaternion.slerp(cfwq, Math.min(1, dt_s * 10))
            //this.display.camera.lookAt(this.myShip.position)
            //this.cameraFollow.add(this.display.camera)
        }


        const cwp = new Vector3()
        this.display.camera.getWorldPosition(cwp);

        (this.lootInstances.lp.material as any).uniforms && (this.lootInstances.lp.material as any).uniforms.cameraPosition.value.copy(cwp)

        const cwq = new Quaternion()
        this.display.camera.getWorldQuaternion(cwq)

        const temp = new Object3D()
        temp.applyQuaternion(cwq)
        temp.updateMatrix();

        (this.lootInstances.planes as any).material.uniforms.meh.value.copy(temp.matrix)
        temp.rotateX(Math.PI)
        temp.updateMatrix();
        this.lootInstances.texts && (this.lootInstances.texts as any).material.uniforms.meh.value.copy(temp.matrix);


    }
    dealDamage(shipID: number, damage: number) {
        this.game.ships.forEach(ship => {
            if (ship.userData.id === shipID) {
                ship.sp -= damage
                if (ship.sp < 0) {
                    ship.hp = Math.max(0, ship.hp + ship.sp)
                    ship.sp = 0
                }
            }
        })
    }

    processMessage(m: any, ws: WebSocket) {
        if (!m) return
        switch (m.msg) {
            case "time":
                if (this.game.serverTime.local === 0)
                    this.game.serverTime = { local: Date.now(), server: m.time }
                return
            case "id":
                this.myID = m.id

                this.display.setState(state => ({ ...state, playerID: m.id }))
                if (m.id === -1) {
                    this.mode = "observer"
                } else {
                    this.mode = "player"
                }
                return
            case "+player": {
                this.game.players.push(m)
                this.display.setState(state => ({ ...state, players: [...state.players, { ...m }].sort((a, b) => { return a.kills < b.kills ? 1 : -1 }) }))
                return
            }
            case "-player":
                for (let i = 0; i < this.game.players.length; i++) {
                    if (this.game.players[i].id === m.id) {
                        this.game.players.splice(i, 1)
                        break
                    }
                }

                this.display.setState(state => ({ ...state, players: state.players.filter(p => p.id !== m.id) }))
                break
            case ".player":
                for (let i = 0; i < this.game.players.length; i++) {
                    if (this.game.players[i].id === m.id) {
                        Object.keys(m).forEach(n => {
                            this.game.players[i][n] = m[n]
                        })
                    }
                }
                for (let i = 0; i < this.game.bots.length; i++) {
                    if (this.game.bots[i].id === m.id) {
                        Object.keys(m).forEach(n => {
                            this.game.bots[i][n] = m[n]
                        })
                    }
                }
                this.display.setState(state => ({
                    ...state,
                    players: state.players.map(p => p.id !== m.id ? p : { ...p, ...m }).sort((a, b) => { return a.kills < b.kills ? 1 : -1 }),
                    bots: state.bots.map(p => p.id !== m.id ? p : { ...p, ...m }).sort((a, b) => { return a.kills < b.kills ? 1 : -1 })
                }))
                break
            case "+bot":
                this.game.bots.push(m)
                this.display.setState(state => ({ ...state, bots: [...state.bots, { ...m }].sort((a, b) => { return a.kills < b.kills ? 1 : -1 }) }))
                return
            case "-bot":
                for (let i = 0; i < this.game.bots.length; i++) {
                    if (this.game.bots[i].id === m.id) {
                        this.game.bots.splice(i, 1)
                        break
                    }
                }
                this.display.setState(state => ({ ...state, bots: state.bots.filter(p => p.id !== m.id) }))
                return
            case "+ship": return this.createShip(m)
            case "-ship": return this.removeShip(m.id)
            case ".ship":
                this.game.ships.forEach(ship => {
                    if (ship.userData.id === m.id) {
                        ship.userData.history.push(m)
                    }
                })
                break;
            case "projectile":
                this.game.ships.forEach(ship => {
                    if (ship.userData.id === m.id) {
                        this.fireProjectile(ship)
                    }
                })
                break;
            case "missile":
                this.game.ships.forEach(ship => {
                    if (ship.userData.id === m.id) {
                        this.game.ships.forEach(ship2 => {
                            if (ship2.userData.id === m.target) {
                                this.fireMissile(ship, ship2)
                            }
                        })
                    }
                })
                break;
            case "phit":
                this.dealDamage(m.id, 2)
                break;
            case "mhit":
                this.dealDamage(m.id, 40)
                break;
            case "dead":
                let ship = this.getShip(m.id)
                var victim = this.getPlayer(ship.userData.controller)
                if (!victim) {
                    victim = this.getBot(ship.userData.controller)
                }
                var killer = this.getPlayer(m.killer)
                if (!killer) {
                    killer = this.getBot(m.killer)
                }
                this.removeShip(m.id)
                if (m.killer === this.myID) {
                    const logMessage = <div>player destroyed: {victim ? victim.name : "someone"}</div>
                    this.display.messageHandle.current.setMessages(m => ([...m, logMessage]))
                } else if (victim && victim.id === this.myID) {
                    const logMessage = <div>owned by: {killer ? killer.name : "someone"}</div>
                    this.display.messageHandle.current.setMessages(m => ([...m, logMessage]))
                }
                break;
            case "+loot":
                (this.lootInstances.visibleAttribute.array as Float32Array)[m.id] = 1
                this.lootInstances.visibleAttribute.needsUpdate = true
                break;
            case "looted":

                const visibles32 = this.lootInstances.visibleAttribute.array as Float32Array
                visibles32[m.id] = 0
                this.lootInstances.visibleAttribute.needsUpdate = true

                if (m.player === this.myID) {
                    const type = this.lootInstances.lf.userData.types[m.id]
                    const sound = new Audio(listener)
                    sound.setBuffer(audioHelper.buffers["loot"])
                    sound.setPlaybackRate(1)
                    sound.setVolume(0.25)
                    sound.play()
                    if (this.myShip) {
                        if (type === 2) {
                            this.myShip.missiles = Math.min(8, this.myShip.missiles + 2)
                        } else if (type === 3) {
                            this.myShip.ammo = Math.min(200, this.myShip.ammo + 50)
                        } else if (type === 1) {
                            this.myShip.fuel = Math.min(100, this.myShip.fuel + 25)
                        } else if (type === 0) {
                            const material = this.myShip.shield.material as ShieldMaterial
                            this.myShip.sp = Math.min(100, this.myShip.sp + 50)
                            material.energy = this.myShip.sp / 100

                        }
                    }
                }
                break;
            default: return;
        }

    }

}