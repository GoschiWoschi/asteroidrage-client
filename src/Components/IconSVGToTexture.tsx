import { memo } from "react";
import { useMemo } from "react";
import { useEffect } from "react"
import { GiCoins, GiGasPump, GiHealthNormal, GiHeavyBullets, GiMissileSwarm, GiShield } from "react-icons/gi"
import { LinearFilter, Texture } from "three";

const loadedTextures: Texture[] = []
export const Textures: {
    [name: string]: any
} = {}
export const Geometries = {}

function IconSVGToTexture() {

    const icons = useMemo(() => [{
        name: "ammo",
        icon: GiHeavyBullets
    }, {
        name: "missiles",
        icon: GiMissileSwarm
    }, {
        name: "fuel",
        icon: GiGasPump
    }, {
        name: "sp",
        icon: GiShield
    }, {
        name: "hp",
        icon: GiHealthNormal
    }, {
        name: "coins",
        icon: GiCoins
    }], [])

    useEffect(() => {

        let loadedIdx = 0
        var canvas = document.createElement("canvas");
        var ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

        function load() {
            var ico = icons[loadedIdx]
            if (!ico) return
            const cont = document.createElement("div")
            cont.innerHTML = `<svg stroke="currentColor" fill="white" stroke-width="0" viewBox="0 0 512 512" height="128px" width="128px" xmlns="http://www.w3.org/2000/svg"><path d="${icons[loadedIdx].icon({}).props.children[0].props.d}"/></svg>`
            var svgData = (new XMLSerializer()).serializeToString(cont.children[0]);
            var img = document.createElement("img");
            const src = "data:image/svg+xml;base64," + window.btoa(unescape(encodeURIComponent(svgData)))
            img.setAttribute("src", src);
            img.onload = function () {
                ctx.fillStyle = "#ffffff"
                ctx.drawImage(img, 0, 0);
                var texture = new Texture(img);
                texture.minFilter = texture.magFilter = LinearFilter
                texture.needsUpdate = true;
                loadedTextures.push(texture)
                Textures[ico.name] = texture
                loadedIdx++
                if (loadedTextures.length === icons.length) {
                    finished()
                } else load()
            }

        }

        function finished() {
            //do something nice
        }

        load()

    }, [icons])

    return null

}

const IconSVGToTextureMemo = memo(IconSVGToTexture)

export default IconSVGToTextureMemo