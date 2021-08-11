import { useMemo, createRef, useEffect } from "react"
import { ProgressBar } from "react-bootstrap"
import { GiGasPump, GiHealthNormal, GiHeavyBullets, GiRocket, GiShield } from "react-icons/gi"

export default function ShipUI({ myShip, device }) {

    const leftBars = useMemo(() => [
        { prop: "sp", max: 100, ref: createRef<HTMLDivElement>(), icon: GiShield },
        { prop: "hp", max: 50, ref: createRef<HTMLDivElement>(), icon: GiHealthNormal }
    ], [])

    const rightBars = useMemo(() => [
        { prop: "ammo", max: 200, ref: createRef<HTMLDivElement>(), icon: GiHeavyBullets },
        { prop: "missiles", max: 8, ref: createRef<HTMLDivElement>(), icon: GiRocket },
        { prop: "fuel", max: 100, ref: createRef<HTMLDivElement>(), float: 2, icon: GiGasPump },
    ], [])

    useEffect(() => {

        let mounted = true

        function update() {
            if (myShip) {
                leftBars.map(updateBar)
                rightBars.map(updateBar)
            }

            function updateBar(b, i) {
                if (b.ref.current) {
                    const pb = b.ref.current.children[0].children[0] as HTMLDivElement
                    const label = b.ref.current.children[1] as HTMLDivElement
                    pb.style.transformOrigin = "left"
                    pb.style.transform = `scaleX(${myShip[b.prop] / b.max})`
                    pb.style.transition = "transform  0.5s ease-out"
                    label.innerText = (myShip[b.prop] as number).toFixed(b.float || 0) + "/" + b.max
                }
            }

            if (mounted) setTimeout(update, 100);
        }

        update()

        return () => { mounted = false }

    }, [myShip, leftBars, rightBars])

    const extraStyle = (device.isMobile || device.isTablet) ? { top: 53 } : { bottom: 0 }

    return myShip ? <>
        <div style={{ ...extraStyle, width: 300, position: "absolute", left: 0, userSelect: "none", pointerEvents: "none" }}>
            {leftBars.map((b, i) => <Bar key={i} myShip={myShip} b={b} />)}
        </div>
        <div style={{ ...extraStyle, width: 300, position: "absolute", right: 0, userSelect: "none", pointerEvents: "none" }}>
            {rightBars.map((b, i) => <Bar key={i} myShip={myShip} b={b} />)}
        </div>
    </> : null
}

function Bar({ myShip, b }) {
    return <div style={{ width: "100%", display: "flex" }} >
        <b.icon className={`text-${b.prop}`} style={{ height: "1.5em", margin: "0.5em 0.25em 0.5em 0.25em", fontSize: "2em" }} />
        <div ref={b.ref} style={{ margin: "1em 1em 1em 0.0em", position: "relative", flexGrow: 1, borderRadius: "0.25em", overflow: "hidden", transform: "translateZ(0)" }}>
            <ProgressBar variant={b.prop} now={100} style={{ width: "100%", height: "3em", backgroundColor: "rgba(0,0,0,0.5)", fontSize: "1em" }} />
            <div className={`progress-label text-${b.prop}`}> {myShip[b.prop] + "/" + b.max}</div>
        </div>
    </div>
}
