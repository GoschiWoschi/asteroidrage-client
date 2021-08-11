import { useRef } from "react"
import { Button, Form } from "react-bootstrap"

export default function PortalForm({ onSubmit, state }) {

    const { playerID, socketStatus } = state
    const nameInput = useRef<HTMLInputElement>()

    return playerID === -1 ? <>
        <div className="screen-center bg-black-trans p-4 rounded" >
            <h1 className="text-center mb-3 font-weight-normal text-primary">Asteroid Rage</h1>
            <section>
                <form onSubmit={e => {
                    e.preventDefault()
                    onSubmit && onSubmit(nameInput.current.value)
                    //document.body.requestFullscreen()
                }}>
                    <Form.Group>
                        <Form.Control ref={nameInput} type="text" placeholder="enter name..." size="lg" className="text-center" />
                    </Form.Group>
                    <Form.Group>
                        <Button type="submit" variant="primary" size="lg" block disabled={socketStatus !== 1}>Play</Button>
                        <Button type="button" variant="secondary" size="lg" block disabled={socketStatus !== 1}>Sign in</Button>
                    </Form.Group>
                </form>
            </section>
        </div>
    </> : null
}

