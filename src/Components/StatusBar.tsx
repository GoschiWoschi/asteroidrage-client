import { Form, Navbar } from "react-bootstrap"

export default function StatusBar({ state, children = undefined }) {

    const { socketStatus, playerID } = state

    return <Navbar className="justify-content-between" fixed="top" variant="dark" style={{ userSelect: "none" }}>
        {children}
        <Form inline>
            <Navbar.Text>
                <pre className="text-light m-0">
                    socket: {socketStatus} | playerID: {playerID}
                </pre>
            </Navbar.Text>
        </Form>
    </Navbar>
}