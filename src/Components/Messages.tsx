import { memo, useEffect, useState } from "react"

const Messages = memo((props: any) => {

    const maxMessages = 10

    const [messages, setMessages] = useState([])

    useEffect(() => {
        props.handle.current = { setMessages }
    }, [props.handle, setMessages])

    useEffect(() => {
        if (messages.length > maxMessages) {
            setMessages(messages => {
                while (messages.length > maxMessages) messages.shift()
                return [...messages]
            })
        }
    }, [messages, setMessages])

    return <div style={{ position: "absolute", width: "100vw", height: "100vh", top: 0, left: 0, pointerEvents: "none", color: "white", userSelect: "none" }}>
        <div style={{ bottom: "160px", position: "absolute", left: "1em" }}>
            {messages.map((m, i) =>
                <div key={i}>{m}</div>
            )}
        </div>
    </div>

})

export default Messages