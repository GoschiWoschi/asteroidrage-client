import { useEffect, useRef } from "react";
import { Joystick } from "react-joystick-component";
import { IJoystickUpdateEvent } from "react-joystick-component/build/lib/Joystick";
import { Vector2 } from "three";

const disableBubbleStyle = {
    msUserSelect: "none",
    msTouchSelect: "none",
    WebkitUserSelect: "none",
    MozUserSelect: "none",
    userSelect: "none",
    WebkitTouchCallout: "none"
} as any

export default function MobileControls({ state }) {

    const ref = useRef<any>()
    const pos = useRef(new Vector2())

    const gas = useRef<any>({
        pos: new Vector2(),
        active: false
    })

    useEffect(() => {
        /*
        ref.current.onselectstart = function () {
            return false;
        };
        ref.current.unselectable = "on";
        */
    }, [ref])

    useEffect(() => {
        /*
        let active = true

        const animate = () => {
            if (!active) return
            state.game.mousepos.x += (pos.current.x - state.game.mousepos.x) / 10
            state.game.mousepos.y += (pos.current.y - state.game.mousepos.y) / 10

            state.game.throttleStick.active = gas.current.active
            state.game.throttleStick.pos.x += (gas.current.pos.x - state.game.throttleStick.pos.x) / 10
            state.game.throttleStick.pos.y += (gas.current.pos.y - state.game.throttleStick.pos.y) / 10

            setTimeout(animate, 1000 / 60);
        }
        animate()

        return () => { active = false }
        */
    }, [state.game])

    function onMove(e: IJoystickUpdateEvent) {
        pos.current.x = e.x / 50
        pos.current.y = -e.y / 50
    }

    function onStop(e: IJoystickUpdateEvent) {
        pos.current.x = 0
        pos.current.y = 0
    }

    function onStart2(e: IJoystickUpdateEvent) {
        gas.current.active = true
    }

    function onMove2(e: IJoystickUpdateEvent) {
        gas.current.pos.x = e.x / 50
        gas.current.pos.y = -e.y / 50
    }

    function onStop2(e: IJoystickUpdateEvent) {
        gas.current.active = false
        gas.current.pos.x = 0
        gas.current.pos.y = 0
    }

    return <div ref={ref}>
        <div style={{
            ...disableBubbleStyle,
            position: "absolute", left: "20px", bottom: "20px"
        }}>
            <Joystick move={onMove} stop={onStop} />
        </div>
        <div style={{
            ...disableBubbleStyle,
            position: "absolute", right: "20px", bottom: "20px"
        }}>
            <Joystick start={onStart2} move={onMove2} stop={onStop2} />
        </div>
    </div>

}