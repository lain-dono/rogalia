import Vue from 'vue'
import {Point} from '../render'

var CELL_SIZE = require('../config.js').CELL_SIZE

function sendPoint(point) {
    var title = ''
    if (point.title != point.name) {
        title =  ' ' + point.title
    }
    game.chat.send(sprintf("${marker:%d %d%s}", point.x, point.y, title))
}

var markerPoint = 'marker-point'

export default {
    template: require('raw!./minimap.html'),
    events: {
        'sync.RemotePlayers': 'sync',
        'mmap.addMarker': 'addMarker',
    },
    data() {
        return {
            maxSize: 512,
            min: 500,
            max: 2049,
            width: 500,
            src: sprintf('%s//%s/map', window.location.protocol, game.network.addr),
            points: {},
        }
    },
    computed: {
        scale() {
            return this.width / this.max
        },
    },
    watch: {
        'width': function(val, old) {
            var diff = (old - val) / 2
            var el = document.querySelector('#map .wrapper')
            el.scrollTop  -= diff
            el.scrollLeft -= diff
        },
        'points': function() {
            var data = {}
            for (var k in this.points) {
                if (!this.points.hasOwnProperty(k)) {
                    continue
                }
                var p = this.points[k]
                if (p.type === markerPoint) {
                    data[k] = p
                }
            }
            localStorage.setItem('minimap.markers', JSON.stringify(data))
        },
    },
    attached() {
        var data = localStorage.getItem('minimap.markers')
        if (data) {
            data = JSON.parse(data)
            for (var k in data) {
                Vue.set(this.points, k, data[k])
            }
        }
    },
    methods: {
        onMap(e) {
            var rect = e.target.getBoundingClientRect()
            var x = e.pageX - rect.left
            var y = e.pageY - rect.top
            var p = (new Point(x, y)).div(this.scale).round()

            if (game.controller.modifier.alt && game.player.IsAdmin) {
                game.network.send('teleport', p.mul(CELL_SIZE).json())
                return
            }

            var point = this.addMarker(p.x, p.y)
            if (game.controller.modifier.shift) {
                sendPoint(point)
            }
        },

        onPoint(event, point) {
            if (point.type !== markerPoint) {
                return
            }
            switch (event.button) {
            case game.controller.LMB:
                if (game.controller.modifier.shift) {
                    sendPoint(point)
                } else {
                    var title = prompt(T('Description') + ':')
                    if (title) {
                        point.title = title
                    }
                }
                break
            case game.controller.RMB:
                Vue.delete(this.points, point.name)
                break
            }
        },

        addMarker(x, y, title) {
            var name = x + ' ' + y
            if (name in this.points) {
                return this.points[name]
            }

            var point = {
                x: x, y: y,
                title: title || name,
                name: name,
                type: 'marker-point',
            }
            Vue.set(this.points, name, point)
            return point
        },

        addCharacters(characters) {
            for (var name in characters) {
                var ch = characters[name]
                if (!ch) {
                    continue
                }
                var p = this.points[name]
                if (!p) { // if not exist
                    p = { title: name, name: name, type: '', }
                }
                if (name == game.player.Name) {
                    p.id = 'player-point'
                    p.type = 'player-point'
                } else if (ch.Karma < 0) {
                    p.type = 'pk'
                    p.title += sprintf(' | %s: %s', T('Karma'), ch.Karma)
                } else {
                    console.warn('wtf?', name, ch, p)
                }
                p.x = ch.X / CELL_SIZE
                p.y = ch.Y / CELL_SIZE
                Vue.set(this.points, name, p)
            }
        },

        sync(data) {
            data = data || {}
            var pl = game.player
            data[pl.Name] = {X: pl.X, Y: pl.Y}

            for (var name in this.points) {
                if (name in data && data[name] === null) {
                    console.info('fail data["%s"] is null', name)
                    delete data[name]
                    Vue.delete(this.points, name)
                }
            }

            this.addCharacters(data)
        }
    },
}
