import React from "react"
import ReactDOM from "react-dom"
import App from "./App"
import "./index.scss"

/*
const urls = {
    restURL: "http://172.20.10.12:3000",
    wsURL: "ws://172.20.10.12:3000"
}
*/
const urls = {
    restURL: "https://asteroidrage.com",
    wsURL: "wss://asteroidrage.com"
}

ReactDOM.render(<App {...urls} />, document.getElementById("root"))