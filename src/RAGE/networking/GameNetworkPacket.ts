import Ship from "../gameobjects/Ship"

export const MessageTypes = {
    Time: 0,
    PlayerID: 1,
    NewPlayer: 2,
    RemovePlayer: 3,
    UpdatePlayer: 4,
    NewShip: 5,
    RemoveShip: 6,
    UpdateShip: 7,
    Projectile: 8,
    Missile: 9,
    PHit: 10,
    MHit: 11,
    NewLoot: 12,
    Looted: 13,
    Dead: 14,
    Join: 15,
    Respawn: 16,
    Leave: 17,
    NewBot: 18,
    RemoveBot: 19
}

export function readServerPacket(view: DataView) {
    const type = view.getUint8(0)
    var nLength = 0, tempString = ""
    switch (type) {
        case MessageTypes.PlayerID: return { msg: "id", id: view.getInt16(1) }
        case MessageTypes.Time: return { msg: "time", time: view.getFloat32(1) }
        case MessageTypes.NewPlayer:
            nLength = view.getUint8(9)
            tempString = ""
            for (let i = 0; i < nLength; i++) {
                tempString += String.fromCharCode(view.getUint16(10 + i * 2))
            }
            return {
                msg: "+player",
                id: view.getUint16(1),
                kills: view.getUint16(3),
                deaths: view.getUint16(5),
                assists: view.getUint16(7),
                name: tempString
            }
        case MessageTypes.RemovePlayer: return { msg: "-player", id: view.getUint16(1) }
        case MessageTypes.UpdatePlayer: return {
            msg: ".player",
            id: view.getUint16(1),
            kills: view.getUint16(3),
            deaths: view.getUint16(5),
            assists: view.getUint16(7)
        }
        case MessageTypes.NewBot:
            nLength = view.getUint8(11)
            tempString = ""
            for (let i = 0; i < nLength; i++) {
                tempString += String.fromCharCode(view.getUint16(12 + i * 2))
            }
            return {
                msg: "+bot",
                id: view.getUint16(1),
                controller: view.getUint16(3),
                kills: view.getUint16(5),
                deaths: view.getUint16(7),
                assists: view.getUint16(9),
                name: tempString
            }
        case MessageTypes.RemoveBot: return { msg: "-bot", id: view.getUint16(1) }
        case MessageTypes.NewShip: return {
            msg: "+ship",
            id: view.getUint16(1),
            controller: view.getUint16(3)
        }
        case MessageTypes.RemoveShip: return { msg: "-ship", id: view.getUint16(1) }
        case MessageTypes.UpdateShip:
            return {
                msg: ".ship",
                id: view.getUint16(1),
                position: [view.getFloat32(3), view.getFloat32(7), view.getFloat32(11)],
                rotation: [view.getFloat32(15), view.getFloat32(19), view.getFloat32(23)],
                time: view.getFloat32(27)
            }
        case MessageTypes.Projectile: return { msg: "projectile", id: view.getUint16(1) }
        case MessageTypes.PHit: return { msg: "phit", id: view.getUint16(1) }
        case MessageTypes.Dead: return { msg: "dead", id: view.getUint16(1), killer: view.getUint16(3) }
        case MessageTypes.Missile: return { msg: "missile", id: view.getUint16(1), target: view.getUint16(3) }
        case MessageTypes.MHit: return { msg: "mhit", id: view.getUint16(1) }
        case MessageTypes.NewLoot: return {
            msg: "+loot",
            id: view.getUint16(1),
            type: view.getUint8(3)
        }
        case MessageTypes.Looted: return { msg: "looted", id: view.getUint16(1), player: view.getUint16(3), type: view.getUint8(5) }
    }
}

export const ClientPacket = {
    Join: (name: string) => {
        const nLength = Math.min(name.length, 127)
        const view = new DataView(new ArrayBuffer(2 + nLength * 2))
        view.setUint8(0, MessageTypes.Join)
        view.setUint8(1, nLength)
        for (let i = 0; i < nLength; i++) {
            view.setUint16(i * 2 + 2, name.charCodeAt(i))
        }
        return view.buffer
    },
    Leave: () => {
        const view = new DataView(new ArrayBuffer(1))
        view.setUint8(0, MessageTypes.Leave)
        return view.buffer
    },
    UpdateShip: (ship: Ship, time: any = 0) => {
        const view = new DataView(new ArrayBuffer(33))
        view.setUint8(0, MessageTypes.UpdateShip)
        view.setFloat32(1, ship.position.x)
        view.setFloat32(5, ship.position.y)
        view.setFloat32(9, ship.position.z)
        view.setFloat32(13, ship.rotation.x)
        view.setFloat32(17, ship.rotation.y)
        view.setFloat32(21, ship.rotation.z)
        view.setFloat32(25, ship.sp)
        view.setFloat32(29, time)
        return view.buffer
    },
    Respawn: () => {
        const view = new DataView(new ArrayBuffer(1))
        view.setUint8(0, MessageTypes.Respawn)
        return view.buffer
    },
    ProjectileHit: (shipid: number) => {
        const view = new DataView(new ArrayBuffer(3))
        view.setUint8(0, MessageTypes.PHit)
        view.setUint16(1, shipid)
        return view.buffer
    },
    MissileHit: (shooterid: number, shipid: number) => {
        const view = new DataView(new ArrayBuffer(5))
        view.setUint8(0, MessageTypes.MHit)
        view.setUint16(1, shooterid)
        view.setUint16(3, shipid)
        return view.buffer
    },
    Looted: (id: number) => {
        const view = new DataView(new ArrayBuffer(3))
        view.setUint8(0, MessageTypes.Looted)
        view.setUint16(1, id)
        return view.buffer
    },
    Projectile: () => {
        const view = new DataView(new ArrayBuffer(1))
        view.setUint8(0, MessageTypes.Projectile)
        return view.buffer
    },
    Missile: (targetid: number) => {
        const view = new DataView(new ArrayBuffer(3))
        view.setUint8(0, MessageTypes.Missile)
        view.setUint16(1, targetid)
        return view.buffer
    }
}