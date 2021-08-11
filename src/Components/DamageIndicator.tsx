import { useRef } from "react"

export default function DamageIndicator() {

    const ref = useRef<HTMLDivElement>()

    return <div ref={ref} style={{ position: "absolute", width: "100vw", height: "100vh", background: "radial-gradient(circle, rgba(255,0,0,0) 0%, rgba(255,0,0,1) 100%)", top: "0px", pointerEvents: "none" }}>
    </div>
}
