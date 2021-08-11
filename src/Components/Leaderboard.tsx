import { Container, Table } from "react-bootstrap"

export default function Leaderboard({ state }) {

    const { players, bots } = state
    let allPlayers = players.concat(bots)
    allPlayers.sort((a, b) => {
        return a.kills < b.kills ? 1 : a.kills > b.kills ? -1 : a.deaths < b.deaths ? -1 : 1
    })

    return <div style={{ fontSize: "0.75em", position: "absolute", right: 0, top: 0, pointerEvents: "none", userSelect: "none" }}>
        <Container fluid className="p-3" style={{ minWidth: "0px" }}>
            <Table className="bg-transparent" size="sm" variant="dark" style={{ marginBottom: 0 }}>
                <thead>
                    <tr>
                        <th className="border-white">Player</th>
                        <th className="border-white" style={{ textAlign: "right" }}>Kills</th>
                        <th className="border-white" style={{ textAlign: "right" }}>Deaths</th>
                    </tr>
                </thead>
                <tbody>
                    {allPlayers.map((player, i) =>
                        <tr key={player.id}>
                            <td>{player.name}</td>
                            <td style={{ textAlign: "right" }}>{player.kills}</td>
                            <td style={{ textAlign: "right" }}>{player.deaths}</td>
                        </tr>
                    )}
                </tbody>
            </Table>
        </Container>
    </div>

}
