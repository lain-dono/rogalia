import core, {Texture, Sprite, Graphics, Container} from 'pixi.js/src/core/'

var Character = require('../character.js')
var cnf = require('../config.js')

var CELL_SIZE = cnf.CELL_SIZE
var debug = cnf.debug

var CHUNK_SIZE = 8*CELL_SIZE
var ISO_CHUNK_SIZE = CHUNK_SIZE + CELL_SIZE

var gridColor = '#999'

import {Point, toWorld, toScreen} from './point.js'

function parse(img, canvas, biomsIn) {
    canvas.width = img.width * 2
    canvas.height = img.height

    var data = []
    var i = 0
    var color = 0
    var bioms = biomsIn.map((biom)=> biom.Color)

    var ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)
    var pixels = ctx.getImageData(0, 0, img.width, img.height)
    for (var px = 0, l = pixels.data.length; px < l; px++) {
        var colorComponent = pixels.data[px]
        if (i < 3) {
            color |=  colorComponent << ((2 - i) * 8)
            i++
        } else {
            var id = bioms.indexOf(color)
            if (id == -1) {
                //game.error('Cannot find biom for px #%d=%s', px, color)
                console.error('Cannot find biom for px #%d=%s', px, color)
            }
            data.push(id)
            color = 0
            i = 0
        }
    }
    return data
}

export function Map(ctx, player) {
    this.player = player

    this.container = new Container()

    this.minimapSprite = new Sprite()
    this.minimapGraphics = new Graphics()

    this.minimapC = new Container()
    this.minimapC.x = 300
    this.minimapC.y = 30

    this.minimapC.skew.x = Math.PI / 4
    this.minimapC.skew.y = Math.PI / 4
    var scale = 4
    this.minimapC.scale.x = 1.0 * scale
    this.minimapC.scale.y = 0.5 * scale

    //scaleY(0.5) rotate(45deg) scale(1.5) translate(44px, 11px)
    this.minimapC.addChild(this.minimapSprite)
    this.minimapC.addChild(this.minimapGraphics)

    game.pixiStage.addChild(this.container)
    game.pixiStage.addChild(this.minimapC)

    this.data = []
    this.layers = null
    this.chunks = {}
    this.width = 0
    this.height = 0
    this.cells_x = 0
    this.cells_y = 0
    this.bioms = []

    this.full = {x:0,y:0}

    this.minimapContainer = document.getElementById('minimap-container')
    this.minimap = document.getElementById('minimap')
    this.minimapCanvas = document.getElementById('minimap-canvas')
    this.location = new Point()

    this.tiles = []

    this.sync = function(data) {
        var img = new Image()
        img.onload = sync.bind(this, img)
        img.src = 'data:image/png;base64,' + data
    }

    function sync(img) {
        /*jshint validthis:true */
        document.body.appendChild(img)

        this.minimapSprite.texture = Texture.fromImage(img.src)

        this.cells_x = img.width
        this.cells_y = img.height

        this.width = img.width * CELL_SIZE
        this.height = img.height * CELL_SIZE

        var data = parse(img, this.minimapCanvas, this.bioms)

        this.data = []
        var id
        for (var h = 0; h < this.cells_y; h++) {
            this.data.push([])
            for (var w = 0; w < this.cells_x; w++) {
                id = data[h * this.cells_x + w]
                this.data[h].push({
                    id: id, x: w, y: h,
                    biom: this.bioms[id],
                    corners: new Array(4),
                    transition: new Array(4),
                })
            }
        }

        var loc = this.player.Location
        this.location.set(loc.X, loc.Y)

        this.layers = this.makeLayers()
        this.reset()

        for(var y = 0; y < this.cells_y; y++) {
            for(var x = 0; x < this.cells_x; x++) {
                id = this.data[y][x].id
                for (var c = 0; c < 4; c++) {
                    var offset = 0
                    var cx = 1 - (c & 0x1)
                    var cy = 1 - ((c >> 1) & 0x1)
                    for (var i = 0; i < 4; i++) {
                        var dx = x + cx - (i & 0x1)
                        var dy = y + cy - ((i >> 1) & 0x1)
                        var other =
                                this.data[dy] &&
                                this.data[dy][dx] &&
                                this.data[dy][dx].id
                        if (other >= id) {
                            offset |= 1 << i
                        }
                        if (other !== id)
                            this.data[y][x].transition[4-c] = true
                    }
                    this.data[y][x].corners[c] = offset
                }
                this.layers[id].push(this.data[y][x])
            }
        }
        this.ready = true
    }

    this.reset = function() {
        //TODO: reuse valid chunks
        this.chunks = {}
    }

    this.drawGrid = function() {
        ctx.strokeStyle = gridColor
        var sw = this.player.Location.X
        var sh = this.player.Location.Y
        var sp, ep
        for(var w = sw; w <= sw + this.width; w += CELL_SIZE) {
            sp = toScreen(new Point(w, sh))
            ep = toScreen(new Point(w, sh + this.height))
            ctx.beginPath()
            ctx.moveTo(sp.x, sp.y)
            ctx.lineTo(ep.x, ep.y)
            ctx.stroke()
        }
        for(var h = sh; h <= sh + this.height; h += CELL_SIZE) {
            sp = toScreen(new Point(sw, h))
            ep = toScreen(new Point(sw + this.width, h))
            ctx.beginPath()
            ctx.moveTo(sp.x, sp.y)
            ctx.lineTo(ep.x, ep.y)
            ctx.stroke()
        }
    }

    this.drawTile = function(ctx, x, y, p) {
        var cell = this.data[y][x]
        var tile = this.tiles[cell.id]
        var variant = 0
        if (tile.width > 2*CELL_SIZE) {
            var lx = this.player.Location.X / CELL_SIZE
            var ly = this.player.Location.Y / CELL_SIZE
            variant = Math.floor(tile.width/(4*CELL_SIZE)*(1+Math.sin((lx+x)*(ly+y))))
        }
        var d = [
            [0, CELL_SIZE/2],
            [-CELL_SIZE, 0],
            [CELL_SIZE, 0],
            [0, -CELL_SIZE/2],
        ]

        var corners = cell.corners
        loop: for (var i = 0, l = corners.length; i < l; i++) {
            var offset = corners[i]

            if (x !== 0 && y !== 0 && !cell.transition[i]) {
                // breaks ARE required
                switch(offset) {
                case  3: if (i !== 2) continue loop; break
                case  5: if (i !== 1) continue loop; break
                case 10: if (i !== 2) continue loop; break
                case 12: if (i !== 1) continue loop; break

                case  7: if (i !== 3) continue loop; break
                case 11: if (i !== 2) continue loop; break
                // case 13: if (i !== 1) continue //TODO: fixme
                case 14: if (i !== 0) continue loop; break

                case 15: if (i !== 0) continue loop; break
                }
            }

            ctx.drawImage(tile,
                variant * 2*CELL_SIZE,
                offset * CELL_SIZE,
                CELL_SIZE * 2,
                CELL_SIZE,

                p.x + d[i][0],
                p.y + d[i][1],
                CELL_SIZE * 2,
                CELL_SIZE
            )
        }
    }

    this.draw = function(width, height, cam, entities) {
        // this.each(game.screen, function(w, h, p, x, y) {
        //     this.drawTile(ctx, w, h, p)
        // })
        // return
        var layers = this.makeLayers()

        var leftTop = toWorld(cam.clone())
                .div(CHUNK_SIZE)
                .floor()
        var rightTop = toWorld(cam.clone().add(new Point(width, 0)))
                .div(CHUNK_SIZE)
                .floor()
        var leftBottom = toWorld(cam.clone().add(new Point(0, height)))
                .div(CHUNK_SIZE)
                .ceil()
        var rightBottom = toWorld(cam.clone().add(new Point(width, height)))
                .div(CHUNK_SIZE)
                .ceil()

        var x, y, i, l, tile
        for (x = leftTop.x; x < rightBottom.x; x++) {
            for (y = rightTop.y; y < leftBottom.y; y++) {
                var c = new Point(x * CHUNK_SIZE, y * CHUNK_SIZE);
                var p = toScreen(c.clone())

                // if (p.x + CHUNK_SIZE < cam.x)
                //     continue;
                // if (p.y + CHUNK_SIZE < cam.y)
                //     continue;
                // if (p.x - CHUNK_SIZE > cam.x + width)
                //     continue;
                // if (p.y > cam.y + scr.height)
                //     continue;

                var key = x + '.' + y
                var chunk = this.chunks[key]
                if (!chunk) {
                    chunk = this.makeChunk(p, c)
                    this.chunks[key] = chunk
                }

                for (i = 0, l = chunk.layers.length; i < l; i++) {
                    tile = chunk.layers[i]
                    if (!layers[tile.layer]) {
                        game.sendErrorf(
                            'layers[tile.layer] is null; layers: %j; tile.layer: %j',
                            layers,
                            tile.layer
                        )
                        layers[tile.layer] = []
                    }
                    layers[tile.layer].push(tile)
                }
            }
        }

        for (i = 0, l = layers.length; i < l; i++) {
            var layer = layers[i]
            for (var j = 0, ll = layer.length; j < ll; j++) {
                tile = layer[j]
                ctx.drawImage(tile.canvas, tile.p.x, tile.p.y)
                // var p = tile.p.clone().add({x: CHUNK_SIZE, y: 0}).toWorld()
                // ctx.strokeStyle = '#000'
                // iso.strokeRect(ctx, p.x, p.y, CHUNK_SIZE, CHUNK_SIZE)
            }
        }

        if (debug.map.position && false) {
            var text = '(' + (x + cam.x) + ' ' + (y + cam.y) + ')'
            ctx.fillStyle = '#fff'

            game.drawStrokedText(text, x, y + cnf.FONT_SIZE)
        }

        if(debug.map.grid) {
            this.drawGrid()
        }

        this.drawMinimap(entities)
    }

    this.makeLayers = function() {
        return this.bioms.map(function() {
            return []
        })
    }

    this.makeChunk = function(point, center) {
        point.x -= CHUNK_SIZE
        var chunk = {layers:[]}

        var dx = center.x - this.location.x
        var dy = center.y - this.location.y

        var layers = this.layers
        for(var lvl = 0, count = layers.length; lvl < count; lvl++) {
            var layer = layers[lvl]

            var canvas = null
            var ctx = null

            for(var i = 0, l = layer.length; i < l; i++) {
                var tile = layer[i]

                var x = tile.x*CELL_SIZE - dx
                var y = tile.y*CELL_SIZE - dy
                if (x < 0 || x > CHUNK_SIZE || y < 0 || y > CHUNK_SIZE) {
                    continue
                }

                if (!canvas) {
                    canvas = document.createElement('canvas')
                    canvas.width = 2*ISO_CHUNK_SIZE
                    canvas.height = ISO_CHUNK_SIZE
                    ctx = canvas.getContext('2d')
                    ctx.translate(CHUNK_SIZE, 0)
                }

                var p = toScreen(new Point(x, y))
                p.x -= CELL_SIZE
                this.drawTile(ctx, tile.x, tile.y, p)
            }

            if (canvas) {
                chunk.layers.push({canvas: canvas, p: point, layer: lvl})
            }
        }

        return chunk
    }

    this.drawDarkness = function() {
        // console.time('darkness')
        //game.time.max = 1440 = 24h; 18-06 = darkness
        var opacity = 0
        var max = 0.95

        var time = game.time

        if (time < 6 * 60) {
            opacity = max - time / (6 * 60)
        } else if (time > 18 * 60) {
            opacity = max - (24 * 60 - time) / (6 * 60)
        } else {
            return
        }

        opacity = Math.max(0, Math.min(max, opacity))


        //TODO: use same argument names everywhere!
        var darkness = (debug.map.simpleDarkness) ? this.simpleDarkness : this.darkness
        this.each(game.screen, function(w, h, p, x, y) {
            if (debug.map.simpleDarkness) {
                if(w % 2 == 1 || h % 2 == 1) {
                    return
                }
                p.x -= CELL_SIZE
            }

            var dist = Math.pow(this.player.X - x, 2) + Math.pow(this.player.Y - y, 2)
            var r = Math.pow(CELL_SIZE * 10, 2)
            var tileOpacity = opacity * Math.min(1, dist / r)
            ctx.globalAlpha = tileOpacity
            ctx.drawImage(darkness, p.x, p.y)
        })
        ctx.globalAlpha = 1
        // console.timeEnd('darkness')
    }

    this.each = function(scr, draw) {
        var pl = this.player
        var m = this.location

        var sw = Math.max(0, ((pl.X - m.x) / CELL_SIZE << 0) - scr.cells_x) >> 0
        var ew = Math.min(this.cells_x, sw + scr.cells_x * 2) >> 0

        var sh = Math.max(0, ((pl.Y - m.y) / CELL_SIZE << 0) - scr.cells_y) >> 0
        var eh = Math.min(this.cells_y, sh + scr.cells_y * 2) >> 0

        for (var h = sh; h < eh; h++) {
            for (var w = sw; w < ew; w++) {
                var x = w * CELL_SIZE + m.x
                var y = h * CELL_SIZE + m.y
                var p = toScreen(new Point(x, y))
                p.x -= CELL_SIZE
                var t = p.clone().sub(p)
                if (t.x < -2*CELL_SIZE || t.y < -CELL_SIZE || t.x > scr.width || t.y > scr.height) {
                    continue
                }

                this.draw(w, h, p, x, y)
            }
        }
    }

    this._sort = function(bioms) {
        bioms.forEach(function(biom, i) {
            biom.id = i
        })
        function get(name) {
            var i = bioms.findIndex(function(biom) {
                return biom.Name == name
            })
            var biom = bioms[i]
            bioms.splice(i, 1)
            return biom
        }
        var list = [
            get('plowed-soil'),
            get('soil'),
            get('deep-water'),
            get('sand'),
            get('shallow-water'),
        ]
        bioms.forEach((biom)=> list.push(biom))
        return list
    }

    this.init = function(bioms, map) {
        this.full.width = map.Width
        this.full.height = map.Height
        this.bioms = this._sort(bioms)
        this.tiles = this.bioms.map(function(biom) {
            var path = 'map/' + biom.Name + '.png'
            var tile = loader.loadImage(path)
            tile.id = biom.id
            return tile
        })

        this.textures = this.bioms.map(function(biom) {
            var tile = Texture.fromImage('assets/map/' + biom.Name + '.png')
            tile.id = biom.id
            return tile
        })

        this.darknessT = Texture.fromImage('assets/map/darkness.png')
        this.simpleDarknessT = Texture.fromImage('assets/map/simple-darkness.png')

        this.darkness = loader.loadImage('map/darkness.png')
        this.simpleDarkness = loader.loadImage('map/simple-darkness.png')
    }

    this.getCell = function(x, y) {
        x -= this.location.x
        y -= this.location.y
        x = (x / CELL_SIZE) << 0
        y = (y / CELL_SIZE) << 0

        //if 


        if (!this.data[y]) {
            // game.sendErrorf('Map cell %d %d not found (y)', x, y)
            return null
        }
        //if (!this.data[y][x]) {
            // game.sendErrorf('Map cell %d %d not found (x)', x, y)
            //return null
        //}
        return this.data[y][x] || null
    }

    this.biomAt = function(x, y) {
        var cell = this.getCell(x, y)
        return (cell) ? this.bioms[cell.id] : null
    }

    var minimapObjectsCanvas = document.getElementById('minimap-objects-canvas')
    var mctx = minimapObjectsCanvas.getContext('2d')

    this.drawMinimap = function(entities) {
        minimapObjectsCanvas.width = this.minimapCanvas.width
        minimapObjectsCanvas.height = this.minimapCanvas.height
        // mctx.clearRect(0, 0, minimapObjectsCanvas.width, minimapObjectsCanvas.height)
        //
        var mmap = this.minimapGraphics
        mmap.clear()

        var player = this.player
        var locX = player.Location.X
        var locY = player.Location.Y
        var playerId = this.player.Id

        for (var i = 0, l = entities.length; i < l; i++) {
            var e = entities[i]

            var x = (e.x - locX) / CELL_SIZE
            var y = (e.y - locY) / CELL_SIZE
            var w = (e.Width || e.Radius) / CELL_SIZE
            var h = (e.Height || e.Radius) / CELL_SIZE

            if (e instanceof Character) {
                if (e === player) {
                    mctx.fillStyle = '#0f0'
                    mmap.beginFill(0x00FF00)
                    w = h = 5
                } else if (e.Karma < 0 || e.Aggressive) {
                    mctx.fillStyle = '#f00'
                    mmap.beginFill(0xFF0000)
                    w = h = ((e.Lvl >= 50) ? 6 : 4)
                } else {
                    mctx.fillStyle = 'pink'
                    mmap.beginFill(0xFFC0CB)
                    w = h = ((e.Lvl >= 50) ? 5 : 3)
                }
            } else if (!e.inWorld()) {
                continue
            } else if (e.Creator === playerId) {
                mctx.fillStyle = '#9f9'
                mmap.beginFill(0x99FF99)
            } else if (e.Creator){
                mctx.fillStyle = '#999'
                mmap.beginFill(0x999999)
            }

            mctx.fillRect(x, y, w, h)

            mmap.drawRect(x, y, w, h)
            mmap.endFill()
        }
    }
}
