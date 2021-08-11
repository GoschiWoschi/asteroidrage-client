import { Object3D, PointLight } from "three";

export default class LightGroup extends Object3D {

    lightIndex = 0
    lights: PointLight[] = []

    constructor(public num: number, public colorHex: number, intensity: number, distance: number, decay: number) {
        super()
        for (let i = 0; i < num; i++) {
            const light = new PointLight(colorHex, intensity, distance, decay)
            light.castShadow = false
            this.add(light)
            this.lights.push(light)
        }
        this.position.set(100000, 0, 0)
    }

    getLight() {
        const light = this.lights[this.lightIndex++ % this.num]
        return light
    }

    returnLight(light) {
        this.add(light)
    }

}