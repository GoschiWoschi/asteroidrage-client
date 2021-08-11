import { Widget } from "@xsolla/login-sdk"
import { useEffect } from "react"

let xl = new Widget({
    projectId: 'c8ff0956-b468-11eb-bc85-42010aa80004',
    preferredLocale: 'en_US',
    url: "https://login-widget.xsolla.com/latest"
})

export default function XsollaLogin({ visible, onClose }) {

    useEffect(() => {
        xl.mount("xsolla_login")
        xl.on(xl.events.Close, (e) => { onClose(e) })
        return () => {
            document.getElementById("xsolla_login")!.innerHTML = ""
        }
    }, [onClose])

    return <div>
        <div style={{ display: visible ? "block" : "none", position: "absolute", left: 0, top: 0, bottom: 0, right: 0, background: "rgba(0,0,0,0)" }} onClick={e => onClose(e)} />
        <div id="xsolla_login" style={{ position: "fixed", width: "420px", height: visible ? "650px" : 0, top: "4rem", left: "50vw", transform: "translateX(-50%)" }}></div>
    </div>

}