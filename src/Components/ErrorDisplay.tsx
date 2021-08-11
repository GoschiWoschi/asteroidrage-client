import { useEffect, useState } from "react"
import { Button } from "react-bootstrap"

export default function ErrorDisplay({ error }) {

    const [dismissed, setDismissed] = useState(true)

    useEffect(() => {
        if (error && dismissed) setDismissed(false)
    }, [error, setDismissed, dismissed])

    return (!dismissed && error) ? <div tabIndex={-1} style={{ position: "absolute", width: "100vw", height: "100vh", background: "rgba(0, 0, 0, 0.9)", top: "0px" }}>
        <div style={{ textAlign: "center", position: "absolute", top: "50%", width: "100%", transform: "translateY(-50%)", margin: "0" }}>
            <h2 className="text-white font-weight-normal">{error}</h2>
            <Button size="lg" onClick={e => { setDismissed(true) }}>dismiss</Button>
        </div>
    </div > : null
}
