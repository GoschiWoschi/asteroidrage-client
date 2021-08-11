import { useEffect, useRef, useState } from "react"
import { Settings } from "../../Components/Settings"
import ClientGame from "../ClientGame"
import { ClientPacket, readServerPacket } from "./GameNetworkPacket"

export default function useGameNetwork(settings: Settings, restURL: string, wsURL: string, device: any) {

    const wsRef = useRef<WebSocket>()

    const [state, setState] = useState(() => ({
        socketStatus: -2,
        errorMsg: "",
        playerID: -1,
        myShip: null,
        players: [],
        bots: [],
        gameID: -1,
        game: new ClientGame(settings, send, device),
        wsRef
    }))

    useEffect(() => {

        fetch(`${restURL}/getgame`).then(res => res.json()).then(json => {
            setState(state => ({ ...state, gameID: json.id }))
        }, (reason: any) => {
            setState(state => ({ ...state, errorMsg: "unable to connect to lobby" }))
        })

    }, [setState, restURL])

    useEffect(() => {

        if (state.gameID === -1) return

        let ws = new WebSocket(`${wsURL}/game/${state.gameID}?transport=websocket`)
        ws.binaryType = "arraybuffer"
        ws.addEventListener("open", setStatus)
        ws.addEventListener("close", setStatus)
        ws.addEventListener("error", setStatus)
        ws.addEventListener("message", onmessage)

        function setStatus() {
            setState(state => ({
                ...state,
                socketStatus: ws.readyState,
                errorMsg: state.socketStatus === -2 && ws.readyState === 3 ? "unable to connect to game server" : ws.readyState === 3 ? "lost connection to game server" : state.errorMsg
            }))
        }

        function onmessage(e) {
            let m = readServerPacket(new DataView(e.data))
            state.game.processMessage(m, ws)
        }

        const interval = setInterval(() => {
            if (state.game.myShip) send(ClientPacket.UpdateShip(state.game.myShip, state.game.estimatedServerTime + 500))
        }, 100)

        wsRef.current = ws

        return () => {
            if (ws) {
                ws.close()
                ws.removeEventListener("open", setStatus)
                ws.removeEventListener("close", setStatus)
                ws.removeEventListener("error", setStatus)
                ws.removeEventListener("message", onmessage)
                clearInterval(interval)
                wsRef.current = undefined
            }
        }

    }, [state.gameID, setState, wsRef, state.game, wsURL])

    function play(name: string) {
        send(ClientPacket.Join(name))
    }
    function leave() {
        send(ClientPacket.Leave())
    }
    function send(msg: any) {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(msg)
        }
    }

    return { wsRef, play, leave, send, state, setState }

}