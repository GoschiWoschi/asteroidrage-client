import React, { useEffect, useRef, useState, Suspense, useMemo } from "react";
import { BackSide, Color, Fog, HalfFloatType, Object3D, PointLight } from "three";
import { Button } from "react-bootstrap";
import { GoMute, GoUnmute } from "react-icons/go";
import { ResizeObserver } from "@juggle/resize-observer";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, SMAA, SelectiveBloom } from '@react-three/postprocessing'
import { Resizer, KernelSize } from 'postprocessing'
import Stats from 'three/examples/jsm/libs/stats.module'
import useGameNetwork from "./RAGE/networking/useGameNetwork";
import { listener } from "./RAGE/ClientGame";
import { getUserDevice } from "./RAGE/functions";
import { MobileControls, IconSVGToTexture, Messages, Settings, defaultSettings, StatusBar, ShipUI, Leaderboard, PortalForm, ErrorDisplay } from "./Components";
import { BOX_SIZE, BOX_SIZE2 } from "./config";

export default function App({ restURL, wsURL }) {

    const device = useMemo(() => getUserDevice(), [])
    const [soundEnabled, setSoundEnabled] = useState(true)
    const [settings, setSettings] = useState(defaultSettings)
    const { play, leave, state, setState } = useGameNetwork(settings, restURL, wsURL, device)
    const messageHandle = useRef<any>()

    useEffect(() => {
        listener.gain.gain.value = soundEnabled ? 1 : 0
        listener.setMasterVolume(soundEnabled ? 1 : 0)
    }, [soundEnabled])

    useEffect(() => {
        state.game.setSettings(settings)
    }, [settings, state.game])

    const extrastyles = { cursor: state.myShip ? "url('crosshair24.png') 12 12, crosshair" : "auto" }

    return <div style={{ height: "100%", position: "fixed", width: "100%" }}>

        <div style={{ ...extrastyles, height: "100%" }} onContextMenu={e => e.preventDefault()}>
            <Canvas flat linear shadows
                dpr={window.devicePixelRatio}
                gl={{ antialias: false, stencil: false, depth: true, alpha: false }}
                resize={{ polyfill: ResizeObserver }}
                camera={{ fov: 60, far: BOX_SIZE * 100, near: 0.1 }}
                onCreated={r3f => {
                    r3f.camera.layers.enableAll()
                    r3f.camera.position.set(BOX_SIZE2, BOX_SIZE2, BOX_SIZE2)
                }}>
                <GameLoop state={state} setState={setState} messageHandle={messageHandle} settings={settings} />
            </Canvas>
        </div>

        <div style={{ position: "fixed", top: 10, left: 10, userSelect: "none" }}>
            {state.playerID !== -1 && <span><Button variant="dark" tabIndex={-1} onClick={e => { leave() }}>Exit</Button>&nbsp;</span>}
            <Settings settings={settings} setSettings={setSettings} />&nbsp;
            <Button variant="dark" tabIndex={-1} onClick={e => {
                (e.target as HTMLButtonElement).blur()
                setSoundEnabled(se => !se)
            }}>{soundEnabled ? <GoUnmute style={{ pointerEvents: "none" }} /> : <GoMute style={{ pointerEvents: "none" }} />}</Button>
        </div>

        {false && <StatusBar state={state} />}
        {state.myShip && <ShipUI myShip={state.myShip} device={device} />}
        {state.myShip && (device.isMobile || device.isTablet) && <MobileControls state={state} />}
        {state.playerID !== -1 && (!device.isMobile && !device.isTablet) && <Leaderboard state={state} />}
        <PortalForm onSubmit={play} state={state} />
        <IconSVGToTexture />
        <Messages handle={messageHandle} />
        <ErrorDisplay error={state.errorMsg} />
    </div >
}

function GameLoop({ state, setState, messageHandle, settings }) {

    const shipPrefab = useRef<Object3D>()
    const bgColor = 0x102040
    const color = useRef<Color>()
    const fog = useRef<Fog>()
    const { scene, camera, gl, setDpr } = useThree(({ scene, camera, gl, setDpr }) => ({ scene, camera, gl, setDpr }))
    const stats = useRef<any>()
    useEffect(() => {
        state.game.setR3F({ gl, scene, camera, setState, messageHandle, shipPrefab: shipPrefab.current })
    }, [gl, scene, camera, setState, state.game, messageHandle, shipPrefab])

    useEffect(() => {
        stats.current = Stats()
        document.body.appendChild(stats.current.dom)
        stats.current.dom.style.top = "63px"
        stats.current.dom.style.left = "10px"
    }, [stats])

    useEffect(() => {
        const dpr_mult = settings.graphics.resolution === "High" ? 1 :
            settings.graphics.resolution === "Medium" ? 0.5 :
                settings.graphics.resolution === "Low" ? 0.25 : 1
        setDpr(window.devicePixelRatio * dpr_mult)
    }, [setDpr, settings])

    useFrame(() => {
        state.game.animate()
        stats.current.update()

    })

    return <>
        <fog ref={fog} attach="fog" args={[bgColor, 0, BOX_SIZE2]} />
        <color ref={color} attach="background" args={[bgColor]} />
        <Effects />
        <mesh scale={BOX_SIZE * 50}>
            <icosahedronBufferGeometry />
            <meshBasicMaterial side={BackSide} color={bgColor} dithering />
        </mesh>
    </>
}

function Effects() {

    const effectComposer = useRef<any>()
    const viewport = useThree(state => state.viewport)
    const size = useThree(state => state.size)

    useEffect(() => {
        if (effectComposer.current) {
            effectComposer.current.setSize(size.width, size.height)
        }
    }, [viewport.dpr, effectComposer, size])

    return <Suspense fallback={null}>
        <EffectComposer ref={effectComposer} frameBufferType={HalfFloatType}>
            <SelectiveBloom
                lights={[new PointLight()]} // ⚠️ required for some reason
                selectionLayer={10}
                intensity={5.0}
                width={Resizer.AUTO_SIZE}
                height={Resizer.AUTO_SIZE}
                kernelSize={KernelSize.LARGE}
                luminanceThreshold={0}
                luminanceSmoothing={0}
            />
            <SMAA />
        </EffectComposer>
    </Suspense>

}