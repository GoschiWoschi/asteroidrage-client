var createLayout = require('layout-bmfont-text')
var createIndices = require('quad-indices')

var utils = require('./lib/utils')
const THREE = require("three")

module.exports = function createTextGeometry(opt) {

  const geometry = new THREE.BufferGeometry()
  var vertices = require('./lib/vertices')

  geometry.update = function (opt) {
    if (typeof opt === 'string') {
      opt = { text: opt }
    }

    // use constructor defaults
    opt = Object.assign({}, geometry._opt, opt)

    if (!opt.font) {
      throw new TypeError('must specify a { font } in options')
    }

    geometry.layout = createLayout(opt)

    // get vec2 texcoords
    var flipY = opt.flipY !== false

    // the desired BMFont data
    var font = opt.font

    // determine texture size from font file
    var texWidth = font.common.scaleW
    var texHeight = font.common.scaleH

    // get visible glyphs
    var glyphs = geometry.layout.glyphs.filter(function (glyph) {
      var bitmap = glyph.data
      return bitmap.width * bitmap.height > 0
    })

    // provide visible glyphs for convenience
    geometry.visibleGlyphs = glyphs

    // get common vertex data
    var positions = vertices.positions(glyphs)
    var uvs = vertices.uvs(glyphs, texWidth, texHeight, flipY)
    var indices = createIndices([], {
      clockwise: true,
      type: 'uint16',
      count: glyphs.length
    })

    // update vertex data
    geometry.setIndex(indices)
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 2))
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))

    // update multipage data
    if (!opt.multipage && 'page' in geometry.attributes) {
      // disable multipage rendering
      geometry.removeAttribute('page')
    } else if (opt.multipage) {
      // enable multipage rendering
      var pages = vertices.pages(glyphs)
      geometry.setAttribute('page', new THREE.BufferAttribute(pages, 1))
    }
  }

  geometry.computeBoundingSphere = function () {
    if (geometry.boundingSphere === null) {
      geometry.boundingSphere = new THREE.Sphere()
    }

    var positions = geometry.attributes.position.array
    var itemSize = geometry.attributes.position.itemSize
    if (!positions || !itemSize || positions.length < 2) {
      geometry.boundingSphere.radius = 0
      geometry.boundingSphere.center.set(0, 0, 0)
      return
    }
    utils.computeSphere(positions, geometry.boundingSphere)
    if (isNaN(geometry.boundingSphere.radius)) {
      console.error('THREE.BufferGeometry.computeBoundingSphere(): ' +
        'Computed radius is NaN. The ' +
        '"position" attribute is likely to have NaN values.')
    }
  }

  geometry.computeBoundingBox = function () {
    if (geometry.boundingBox === null) {
      geometry.boundingBox = new THREE.Box3()
    }

    var bbox = geometry.boundingBox
    var positions = geometry.attributes.position.array
    var itemSize = geometry.attributes.position.itemSize
    if (!positions || !itemSize || positions.length < 2) {
      bbox.makeEmpty()
      return
    }
    utils.computeBox(positions, bbox)
  }

  if (typeof opt === 'string') {
    opt = { text: opt }
  }
  geometry._opt = Object.assign({}, opt)

  if (opt) geometry.update(opt)

  return geometry
}