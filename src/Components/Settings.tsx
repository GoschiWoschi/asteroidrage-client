import { Button, Form, InputGroup, Modal, Table, ToggleButton, ToggleButtonGroup } from "react-bootstrap";
import { useEffect, useRef, useState } from 'react';

export type ControlSettings = {
    movement: {
        up: string[]
        down: string[]
        left: string[]
        right: string[]
        forward: string[]
        back: string[]
    },
    weapons: {
        weapon1: string[]
        weapon2: string[]
    },
    camera: {
        viewToggle: string[]
    }
}

const Labels = {
    viewToggle: "toggle 1st/3rd person camera"
}

type ShaderType = "Lambert" | "Phong" | "Standard" | "Physical"

export type GraphicsSettings = {
    shaders: ShaderType
    resolution: "High" | "Medium" | "Low"
    lightsDisabled: boolean
}

export const controlPresets: { [name: string]: ControlSettings } = {
    "Standard": {
        movement: {
            up: ["KeyW"],
            down: ["KeyS"],
            left: ["KeyA"],
            right: ["KeyD"],
            forward: ["Space"],
            back: ["ShiftLeft", "Space"]
        },
        weapons: {
            weapon1: ["Mouse0"],
            weapon2: ["Mouse2"]
        },
        camera: {
            viewToggle: ["KeyC"]
        }
    },
    "Shooter": {
        movement: {
            up: ["Space"],
            down: ["ShiftLeft", "Space"],
            left: ["KeyA"],
            right: ["KeyD"],
            forward: ["KeyW"],
            back: ["KeyS"]
        },
        weapons: {
            weapon1: ["Mouse0"],
            weapon2: ["Mouse2"]
        },
        camera: {
            viewToggle: ["KeyC"]
        }
    }
}

export const graphicsPresets: { [name: string]: GraphicsSettings } = {
    "Low": {
        shaders: "Lambert",
        resolution: "Low",
        lightsDisabled: false
    },
    "Medium": {
        shaders: "Phong",
        resolution: "Medium",
        lightsDisabled: false
    },
    "High": {
        shaders: "Standard",
        resolution: "High",
        lightsDisabled: false
    },
    "Ultra": {
        shaders: "Physical",
        resolution: "High",
        lightsDisabled: false
    }
}

export type Settings = {
    controls: ControlSettings
    graphics: GraphicsSettings
    controlMode: "noob" | "pro"
}

export const defaultSettings: Settings = {
    controls: controlPresets["Standard"],
    graphics: graphicsPresets["High"],
    controlMode: "pro"
}

export default function SettingsComponent({ settings, setSettings }) {

    const [modal, setModal] = useState("")

    return <>

        <Button variant="dark" tabIndex={-1} onClick={e => {
            (e.target as HTMLButtonElement).blur()
            setModal("settings")
        }}>Settings</Button>

        <Modal size="lg" show={modal === "settings"} onHide={() => { setModal("") }} >
            <Modal.Header closeButton>
                <Modal.Title>Settings</Modal.Title>
            </Modal.Header>

            <Modal.Body>
                <Button onClick={() => setModal("controls")}>Controls</Button>&nbsp;
                <Button onClick={() => setModal("graphics")}>Graphics</Button>
            </Modal.Body>

            <Modal.Footer>
                <Button variant="secondary" onClick={() => setModal("")}>Close</Button>
            </Modal.Footer>
        </Modal>

        {modal === "controls" && <ControlsModal onSave={(controls, controlMode) => { setSettings(settings => ({ ...settings, controls, controlMode })) }} currentControls={settings.controls} currentControlMode={settings.controlMode} onHide={() => setModal("settings")} />}
        {modal === "graphics" && <GraphicsModal onSave={(graphics) => { setSettings(settings => ({ ...settings, graphics })) }} currentGraphics={settings.graphics} onHide={() => setModal("settings")} />}
    </>

}

function ControlsModal({ onSave, onHide, currentControls, currentControlMode }) {

    const [controlMode, setControlMode] = useState(currentControlMode);
    const [controls, setControls] = useState<ControlSettings>(currentControls)
    const [listenControl, setListenControl] = useState("")
    const presetSelect = useRef<HTMLSelectElement>()
    const [controlsPart, setControlsPart] = useState<"movement" | "weapons" | "camera">("movement")

    useEffect(() => {

        if (listenControl) {

            const pressedKeys = {}
            const currentKeys = {}

            const keydown = (e: KeyboardEvent) => {
                pressedKeys[e.code] = true
                currentKeys[e.code] = true
            }

            const keyup = (e: KeyboardEvent) => {
                delete currentKeys[e.code]
                if (Object.keys(currentKeys).length === 0) {
                    setControls(controls => ({ ...controls, [controlsPart]: { ...controls[controlsPart], [listenControl]: Object.keys(pressedKeys) } }))
                    setListenControl("")
                }
            }

            const mousedown = (e: MouseEvent) => {
                pressedKeys["Mouse" + e.button] = true
                currentKeys["Mouse" + e.button] = true
            }

            const mouseup = (e: MouseEvent) => {
                delete currentKeys["Mouse" + e.button]
                if (Object.keys(currentKeys).length === 0) {
                    setControls(controls => ({ ...controls, [controlsPart]: { ...controls[controlsPart], [listenControl]: Object.keys(pressedKeys) } }))
                    setListenControl("")
                }
            }

            window.addEventListener("keydown", keydown)
            window.addEventListener("keyup", keyup)
            window.addEventListener("mousedown", mousedown)
            window.addEventListener("mouseup", mouseup)

            return () => {
                window.removeEventListener("keydown", keydown)
                window.removeEventListener("keyup", keyup)
                window.removeEventListener("mousedown", mousedown)
                window.removeEventListener("mouseup", mouseup)
            }

        }

    }, [listenControl, setListenControl, controlsPart])

    const controlsChanged = () => {
        return JSON.stringify(currentControls) === JSON.stringify(controls) && currentControlMode === controlMode
    }

    const applyPreset = () => {
        presetSelect.current.value &&
            controlPresets[presetSelect.current.value] &&
            setControls(controlPresets[presetSelect.current.value])
    }

    return <Modal scrollable show size="lg" onHide={onHide} onContextMenu={e => { e.preventDefault() }}>

        <Modal.Header closeButton>
            <Modal.Title>Settings / Controls</Modal.Title>
        </Modal.Header>

        <Modal.Body>

            <h5>Control-Mode</h5>
            <ToggleButtonGroup type="radio" value={controlMode} name="controlmode" onChange={val => setControlMode(val)}>
                <ToggleButton value={"pro"} variant={controlMode.indexOf("pro") > -1 ? "primary" : "primary"}>Pro-Mode</ToggleButton>
                <ToggleButton value={"noob"} variant={controlMode.indexOf("noob") > -1 ? "primary" : "primary"}>Noob-Mode</ToggleButton>
            </ToggleButtonGroup>
            <Form.Text className="text-muted">
                <b>Noob-Mode:</b> engines will perform automatic adjustments to deliver an experience that feels more like atmospheric flight.<br />
                <b>Pro-Mode:</b> realistic zero-gravity controls. no automatic adjustments. harder to master but way more powerful and fun.
            </Form.Text>

            <hr />

            <h5>Key-Bindings: Movement</h5>
            <Table size="sm">
                <thead>
                    <tr>
                        <th>Command</th><th>Key(s)</th><th></th>
                    </tr>
                </thead>
                <tbody>
                    {Object.keys(controls.movement).map((k, i) => {
                        return <tr key={k}>
                            <th>{k}</th>
                            <td>{controls.movement[k].join(" + ")}</td>
                            <td style={{ textAlign: "right" }}><Button onClick={e => { (e.target as HTMLButtonElement).blur(); setControlsPart("movement"); setListenControl(k) }} size="sm">set</Button></td>
                        </tr>
                    })}
                </tbody>
            </Table>

            <h5>Key-Bindings: Weapons</h5>
            <Table size="sm">
                <thead>
                    <tr>
                        <th>Command</th><th>Key(s)</th><th></th>
                    </tr>
                </thead>
                <tbody>
                    {Object.keys(controls.weapons).map((k, i) => {
                        return <tr key={k}>
                            <th>{k}</th>
                            <td>{controls.weapons[k].join(" + ")}</td>
                            <td style={{ textAlign: "right" }}><Button onClick={e => { (e.target as HTMLButtonElement).blur(); setControlsPart("weapons"); setListenControl(k) }} size="sm">set</Button></td>
                        </tr>
                    })}
                </tbody>
            </Table>

            <h5>Key-Bindings: Camera</h5>
            <Table size="sm">
                <thead>
                    <tr>
                        <th>Command</th><th>Key(s)</th><th></th>
                    </tr>
                </thead>
                <tbody>
                    {Object.keys(controls.camera).map((k, i) => {
                        return <tr key={k}>
                            <th>{Labels[k] || k}</th>
                            <td>{controls.camera[k].join(" + ")}</td>
                            <td style={{ textAlign: "right" }}><Button onClick={e => { (e.target as HTMLButtonElement).blur(); setControlsPart("camera"); setListenControl(k) }} size="sm">set</Button></td>
                        </tr>
                    })}
                </tbody>
            </Table>

            <InputGroup>
                <InputGroup.Prepend>
                    <InputGroup.Text>Preset:</InputGroup.Text>
                </InputGroup.Prepend>
                <Form.Control as="select" defaultValue="" ref={presetSelect}>
                    <option value="" disabled>Select preset...</option>
                    <option>Standard</option>
                    <option>Shooter</option>
                </Form.Control>
                <InputGroup.Append>
                    <Button onClick={() => { applyPreset() }}>Apply</Button>
                </InputGroup.Append>
            </InputGroup>

        </Modal.Body>

        <Modal.Footer>
            {listenControl && <div className="position-absolute p-3 text-success" style={{ left: 0 }}>press key(s)...</div>}
            <Button variant="secondary" onClick={onHide}>Back</Button>
            <Button onClick={() => { onSave(controls, controlMode) }} variant="primary" disabled={controlsChanged()}>Save changes</Button>
        </Modal.Footer>
    </Modal>
}

function GraphicsModal({ onSave, onHide, currentGraphics }) {

    const [graphics, setGraphics] = useState<GraphicsSettings>(currentGraphics)

    const graphicsChanged = () => {
        return JSON.stringify(currentGraphics) === JSON.stringify(graphics)
    }
    /*
    const presetSelect = useRef<HTMLSelectElement>()
    const applyPreset = () => {
        presetSelect.current.value &&
            graphicsPresets[presetSelect.current.value] &&
            setGraphics(graphicsPresets[presetSelect.current.value])
    }
    */
    return <Modal scrollable show size="lg" onHide={onHide} onContextMenu={e => { e.preventDefault() }}>

        <Modal.Header closeButton>
            <Modal.Title>Settings / Controls</Modal.Title>
        </Modal.Header>

        <Modal.Body>

            <Form.Group>
                <Form.Label>Resolution</Form.Label>
                <Form.Control as="select" value={graphics.resolution} onChange={e => {

                    setGraphics(graphics => ({ ...graphics, resolution: e.target.value as any }))

                }}>
                    {[["Low", "Low"], ["Medium", "Medium"], ["High", "High"]].map(a =>
                        <option key={a[0]} value={a[0]}>{a[1]}</option>
                    )}
                </Form.Control>
            </Form.Group>

            <Form.Check
                checked={graphics.lightsDisabled}
                onChange={e => {
                    console.log(e.target.checked)
                    setGraphics(graphics => ({ ...graphics, lightsDisabled: e.target.checked }))
                }}
                value={1}
                type="checkbox"
                label="disable lights"
            />

            <hr />
            more settings coming soon...
            {
                /*
           
 
            <hr />
 
            <InputGroup>
                <InputGroup.Prepend>
                    <InputGroup.Text>Preset:</InputGroup.Text>
                </InputGroup.Prepend>
                <Form.Control as="select" defaultValue="" ref={presetSelect}>
                    <option value="" disabled>Select preset...</option>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Ultra</option>
                </Form.Control>
                <InputGroup.Append>
                    <Button onClick={() => { applyPreset() }}>Apply</Button>
                </InputGroup.Append>
            </InputGroup>
*/
            }

        </Modal.Body>

        <Modal.Footer>
            <Button variant="secondary" onClick={onHide}>Back</Button>
            <Button onClick={() => { onSave(graphics) }} variant="primary" disabled={graphicsChanged()}>Save changes</Button>
        </Modal.Footer>
    </Modal >
}