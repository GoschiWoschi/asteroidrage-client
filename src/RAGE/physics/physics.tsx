import { InstancedMesh, Matrix4, Object3D, Raycaster, Vector2, Vector3 } from "three"
import { keysApply, modV3 } from "../functions"
import AsteroidField, { asteroids } from "../gameobjects/AsteroidField"
import Ship from "../gameobjects/Ship"

export const BodyTypes = {
    STATIC: 0,
    DYNAMIC: 1,
    KINEMATIC: 2
}

export default function Physics() {

    const objects: any[] = []
    const typeObjects: {
        [type: number]: any[]
    } = {
        [BodyTypes.STATIC]: [],
        [BodyTypes.DYNAMIC]: [],
        [BodyTypes.KINEMATIC]: []
    }

    return {
        addObject: (obj: any, type: number) => {
            typeObjects[type].push(obj)
            objects.push(obj)
        },
        removeObject: (obj: any, type: number) => {
            let index = typeObjects[type].indexOf(obj)
            if (index !== -1) typeObjects[type].splice(index, 1)
            index = objects.indexOf(obj)
            if (index !== -1) objects.splice(index, 1)
        },
        applyShipControls: (myShip: Object3D, keys: any, buttons: any, mousepos: Vector2, dt_s: number, settings: any, throttleStick: any) => {

            if (myShip) {
                const acc = new Vector3()
                /*
                const torque = new Vector3()
                var moduleForce = new Vector3()
                var moduleTorque = new Vector3()
                var desiredAngVel = new Vector3(-mousepos.y * 2, -mousepos.x * 2, 0).multiplyScalar(1)
                var diffAngVel = myShip.userData.angVel.clone().sub(desiredAngVel)
                var diffAngVelLength = diffAngVel.length()*/

                myShip.rotateX(mousepos.y * dt_s * -2)
                myShip.rotateY(mousepos.x * dt_s * -2)

                if (false && throttleStick && throttleStick.active) {
                    acc.z = -1 + throttleStick.pos.length()
                    acc.x += throttleStick.pos.x
                    acc.y -= throttleStick.pos.y
                    acc.applyQuaternion(myShip.quaternion).multiplyScalar(50)
                } else if (settings.controlMode === "pro") {
                    if (keysApply(keys, buttons, settings.controls.movement.up)) acc.y += 1
                    if (keysApply(keys, buttons, settings.controls.movement.down)) acc.y -= 1
                    if (keysApply(keys, buttons, settings.controls.movement.right)) acc.x += 1
                    if (keysApply(keys, buttons, settings.controls.movement.left)) acc.x -= 1
                    if (keysApply(keys, buttons, settings.controls.movement.forward)) acc.z -= 1
                    if (keysApply(keys, buttons, settings.controls.movement.back)) acc.z += 1
                    acc.applyQuaternion(myShip.quaternion).multiplyScalar(50)
                } else {
                    const targetVel = new Vector3()
                    if (keysApply(keys, buttons, settings.controls.movement.up)) targetVel.y += 1
                    if (keysApply(keys, buttons, settings.controls.movement.down)) targetVel.y -= 1
                    if (keysApply(keys, buttons, settings.controls.movement.right)) targetVel.x += 1
                    if (keysApply(keys, buttons, settings.controls.movement.left)) targetVel.x -= 1
                    if (keysApply(keys, buttons, settings.controls.movement.forward)) targetVel.z -= 1
                    if (keysApply(keys, buttons, settings.controls.movement.back)) targetVel.z += 1
                    if (targetVel.length()) {
                        targetVel.normalize().multiplyScalar(100).applyQuaternion(myShip.quaternion)
                    }
                    acc.copy(targetVel).sub(myShip.userData.velocity)
                    if (acc.length() > 1) {
                        acc.multiplyScalar(25 / acc.length())
                        acc.normalize().multiplyScalar(50)
                    }
                    else acc.set(0, 0, 0)
                }


                const targetFuel = Math.min(acc.clone().multiplyScalar(dt_s).length() * 0.05, (myShip as Ship).fuel);
                (myShip as Ship).fuel -= targetFuel
                myShip.userData.velocity.add(acc.clone().multiplyScalar(targetFuel * 0.75));
            }

            (myShip as Ship).fuel = Math.min((myShip as Ship).fuel + dt_s * 0.1, 100)


        },
        updatePositions: (dt_s: number) => {
            typeObjects[BodyTypes.DYNAMIC].forEach(o => {
                if (o instanceof InstancedMesh) {
                    for (let i = 0; i < o.count; i++) {
                        const temp = new Object3D()
                        const matrix = new Matrix4()
                        o.getMatrixAt(i, matrix)
                        temp.applyMatrix4(matrix)
                        temp.position.add(o.userData.velocities[i].clone().multiplyScalar(dt_s))
                        o.userData.positions[i].copy(temp.position)
                        temp.updateMatrix()
                        o.setMatrixAt(i, temp.matrix)
                    }

                } else o.position.add(o.userData.velocity.clone().multiplyScalar(dt_s))
            })
            typeObjects[BodyTypes.KINEMATIC].forEach(o => {
                if (o instanceof InstancedMesh) {
                    for (let i = 0; i < o.count; i++) {
                        const temp = new Object3D()
                        const matrix = new Matrix4()
                        o.getMatrixAt(i, matrix)
                        temp.applyMatrix4(matrix)
                        temp.position.add(o.userData.velocities[i].clone().multiplyScalar(dt_s))
                        o.userData.positions[i].copy(temp.position)
                        temp.updateMatrix()
                        o.setMatrixAt(i, temp.matrix)
                    }

                } else o.position.add(o.userData.velocity.clone().multiplyScalar(dt_s))
            })
        },
        repeatingBoundaries: (myShip: Object3D, size: number, sizeh: number) => {
            modV3(myShip.position, size)
            let temp = new Object3D()
            objects.forEach(object => {
                if (object === myShip) return
                if (object instanceof InstancedMesh) {
                    for (let i = 0; i < object.userData.positions.length; i++) {
                        temp.position.copy(object.userData.positions[i])
                        temp.position.sub(myShip.position).addScalar(sizeh)
                        modV3(temp.position, size).subScalar(sizeh).add(myShip.position)
                        temp.scale.set(1, 1, 1).multiplyScalar(object.userData.radii[i])
                        temp.updateMatrix()
                        object.setMatrixAt(i, temp.matrix)
                    }
                    object.instanceMatrix.needsUpdate = true
                } else {
                    modV3(object.position.sub(myShip.position).addScalar(sizeh), size).subScalar(sizeh).add(myShip.position)
                }
            })
        },
        checkCollisions: (dt_s: number, size: number, sizeh: number) => {

            function checkCollision(o1: Object3D, o2: Object3D, p1: Vector3, p2: Vector3, v1: Vector3 | null, v2: Vector3 | null, r1: number, r2: number, collisions: any[], instanceId = -1) {
                const r = p2.clone().sub(p1).addScalar(sizeh)
                modV3(r, size).subScalar(sizeh)
                const rl = r.length()
                const dot = r.dot(r)
                const rr = (r1 + r2)
                const rr2 = rr * rr
                const dist = dot - rr2
                if (dist < 0) {
                    let ci = 0
                    for (ci = 0; ci < collisions.length; ci++) {
                        if (collisions[ci].dist > dist) break;
                    }
                    collisions.splice(ci, 0, { dist, r, rl, object: o2, instanceId, face: { normal: r.clone().normalize() } })
                }
            }

            function checkRC(bodies1: any[], bodies2: any[], reflect: boolean = false, stop: boolean = false) {

                bodies1.forEach(proj => {

                    const velStep = proj.userData.velocity.clone().multiplyScalar(dt_s)
                    const velStepLength = velStep.length()
                    const ints: any[] = []

                    bodies2.forEach(asteroid => {
                        if (asteroid === proj) return
                        if (asteroid instanceof InstancedMesh) {
                            const rc = new Raycaster(proj.position, velStep.clone().normalize(), 0, velStepLength + proj.userData.radius)
                            rc.intersectObject(asteroid, false, ints)
                        } else {
                            if (asteroid.position.distanceTo(proj.position) < velStepLength + asteroid.userData.radius + proj.userData.radius) {
                                const rc = new Raycaster(proj.position, velStep.clone().normalize(), 0, velStepLength + proj.userData.radius)
                                rc.params.Points = { threshold: 20 }
                                rc.layers.disableAll()
                                rc.layers.enable(0)
                                rc.intersectObject(asteroid, true, ints)
                            }
                        }

                    })
                    if (ints.length) {
                        if (reflect) {
                            if (!ints[0].object.userData.isArea) {
                                proj.userData.velocity.reflect(ints[0].face.normal).multiplyScalar(0.5)
                            }
                        }
                        if (stop) {
                            if (!ints[0].object.userData.isArea) {
                                proj.userData.velocity.multiplyScalar(0)
                            }
                        }
                        if (proj.onCollision) {
                            proj.onCollision(proj, ints[0])
                        }
                    }
                })
            }

            function check(bodies1: any[], bodies2: any[], reflect = false, stop = false) {
                bodies1.forEach(ok => {
                    const nextPosition = ok.position.clone()//.add(ok.userData.velocity.clone().multiplyScalar(dt_s))
                    const collisions: any[] = []
                    bodies2.forEach(os => {
                        if (os === ok) return
                        if (os instanceof InstancedMesh) {
                            os.userData.positions.forEach((p: Vector3, i: number) => {
                                checkCollision(ok, os, nextPosition, p, null, null, ok.userData.radius, os.userData.radii[i], collisions, i)

                            })
                        } else {
                            checkCollision(ok, os, nextPosition, os.position, null, null, ok.userData.radius, os.userData.radius, collisions)
                        }
                    })
                    if (collisions.length) {
                        if (reflect) {
                            if (!collisions[0].object.userData.isArea) {
                                if (collisions[0].object instanceof AsteroidField) {
                                    let wantedDistance = asteroids[collisions[0].instanceId].radius + ok.userData.radius
                                    let actualDistance = collisions[0].rl
                                    ok.position.sub(collisions[0].face.normal.clone().multiplyScalar(Math.max(0, wantedDistance - actualDistance)))
                                }
                                ok.userData.velocity.reflect(collisions[0].face.normal).multiplyScalar(0.5)
                            }
                        }
                        if (stop) {
                            if (!collisions[0].object.userData.isArea) {
                                ok.userData.velocity.multiplyScalar(0)
                            }
                        }
                        if (ok.onCollision) {
                            ok.onCollision(ok, collisions[0])
                        }
                    }
                })
            }
            checkRC(typeObjects[BodyTypes.KINEMATIC], typeObjects[BodyTypes.DYNAMIC], false, true)
            checkRC(typeObjects[BodyTypes.KINEMATIC], typeObjects[BodyTypes.STATIC], false, true)
            check(typeObjects[BodyTypes.DYNAMIC], typeObjects[BodyTypes.DYNAMIC], true)
            check(typeObjects[BodyTypes.DYNAMIC], typeObjects[BodyTypes.STATIC], true)
        }
    }
}