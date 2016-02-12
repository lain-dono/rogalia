import {bind, forEach} from 'fast.js'
import EventEmitter from 'eventemitter3'

import Character from './character.js'
import Entity from './entity.js'

var re_btou = new RegExp([
    '[\xC0-\xDF][\x80-\xBF]',
    '[\xE0-\xEF][\x80-\xBF]{2}',
    '[\xF0-\xF7][\x80-\xBF]{3}'
].join('|'), 'g')

var fromCharCode = String.fromCharCode
function cb_btou(cccc) {
    switch(cccc.length) {
    case 4:
        var cp = ((0x07 & cccc.charCodeAt(0)) << 18) |
                    ((0x3f & cccc.charCodeAt(1)) << 12) |
                    ((0x3f & cccc.charCodeAt(2)) <<  6) |
                    (0x3f & cccc.charCodeAt(3)),
        offset = cp - 0x10000
        return (fromCharCode((offset  >>> 10) + 0xD800) +
                fromCharCode((offset & 0x3FF) + 0xDC00))
    case 3:
        return fromCharCode(
            ((0x0f & cccc.charCodeAt(0)) << 12) |
                    ((0x3f & cccc.charCodeAt(1)) << 6) |
                    (0x3f & cccc.charCodeAt(2))
        )
    default:
        return fromCharCode(
            ((0x1f & cccc.charCodeAt(0)) << 6) |
                    (0x3f & cccc.charCodeAt(1))
        )
    }
}

function btou(b) {
    return b.replace(re_btou, cb_btou)
}

function decompress(data) {
    return btou(RawDeflate.inflate(new Uint8Array(data)))
}

export default function Network() {
    this.proto = 'ws://'
    this.host = 'rogalik.tatrix.org'
    this.port = 49000
    if (window.location.protocol == 'https:') {
        this.proto = 'wss://'
        this.port = 49443
    }

    var override = document.location.search.match(/server=([^&]+)/)
    if (override) {
        override = override[1].split(':')
        this.host = override[0] || this.host
        this.port = override[1] || this.port
    }

    this.addr = this.host + ':' + this.port

    this.data = null
    this.socket = null
    this.queue = []
    this.ping = 0
    this.sendStart = 0

    this.events = new EventEmitter()

    this.events.on('sync', (data)=> { game.redrawZZ() })
    //this.events.on('sendRaw', (cmd)=> { console.info('send', cmd) })
    this.events.on('error', (err)=> { console.error(err) })
    this.events.on('connect', ()=> {
        game.setStage('login')
        console.info('connect %s%s', this.proto, this.addr)
    })
    this.events.on('disconnect', ()=> {
        console.info('disconnect')

        window.onerror = null
        if (game.chat) {
            game.chat.addMessage({From: '[Rogalik]', Body: 'Disconnected'})
        }
        game.exit('Disconnected. Try again later.')
    })
}

Network.prototype.run = function() {
    this.socket = new WebSocket(this.proto + this.addr)
    this.socket.binaryType = 'arraybuffer'
    this.socket.onopen = ()=> {
        this.events.emit('connect')
    }

    var onDisconnect = ()=> {
        this.events.emit('disconnect')
    }

    // if (e.wasClean)
    this.socket.onclose = onDisconnect

    this.socket.onerror = (err)=> {
        this.events.emit('error', err)
        onDisconnect()
    }
    this.socket.onmessage = bind(this.onmessage, this)
}

Network.prototype.onmessage = function(message) {
    var decompressed = decompress(message.data)
    var data = JSON.parse(decompressed)
    this.events.emit('sync', data)

    this.data = data
    if(this.sendStart && data.Ok) {
        this.ping = Date.now() - this.sendStart
        if (game.controller.system && game.controller.system.panel.visible) {
            game.controller.system.ping.textContent = 'Ping: ' + game.ping + 'ms'
        }
        this.sendStart = 0
        game.ping = this.ping
    }

    //if (game.debug.network.length) {
        //console.info('Server data len: ', message.data.byteLength)
    //}
    //if (game.debug.network.data) {
        //console.info(data)
    //}

    if (data.Error) {
        game.controller.showError(data.Error)
        console.error(data.Error)
        return
    }

    game.stage.sync(data)

    if (game.stage.name == 'main') { // TODO also loading
        this.syncEntities(data.Entities, data.RemoveEntities)
        this.syncCharacters(data.Players, data.RemovePlayers)
        this.syncCharacters(data.Mobs, data.RemoveMobs)
        this.syncCharacters(data.NPCs, data.RemoveNPCs)

        game.pixiEntities.children.sort((a, b)=> a.entity.compare(b.entity) )
    }

    if (this.queue.length === 0) {
        return
    }

    if (data.Ok) {
        var callback = this.queue.shift()
        var result = callback(data)
        if (result instanceof Function) {
            this.queue.push(result)
        }
    }
}

Network.prototype.syncCharacters = function(add, remove) {
    add = add || []

    if (remove) {
        game.removeCharacterById(remove)
    }

    for (var id in add) {
        var from = add[id]
        var to = game.entities.get(id)
        if (!to) {
            to = new Character(id)
            to.init(from)
            game.addCharacter(to)
        } else {
            to.sync(from)
        }
    }


    // XXX game.controller.syncMinimap()

    if (window.ui) {
        game.player.updateEffects()
        window.ui.$broadcast('sync.RemotePlayers')
    }
}

Network.prototype.syncEntities = function(add, remove) {
    add = add || []
    if (remove) {
        for (var i = 0, l = remove.length; i < l; i++) {
            game.removeEntityById(remove)
        }
    }

    var gameentities = game.entities
    var gamecontainers = game.containers

    var containers = [] //to update
    for (var id in add) {
        var e = add[id]
        var entity = gameentities.get(id)
        if (!entity) {
            entity = new Entity(e.Type, id)
            game.addEntity(entity)
        }

        entity.sync(e)
        entity.initSprite()

        if (gamecontainers[entity.Id]) {
            containers.push(gamecontainers[entity.Id])
        }
    }

    forEach(containers, (container)=> {
        if (container.panel.visible) {
            container.update()
        } else {
            container.syncReq()
        }
    })
}

Network.prototype.disconnect = function() {
    if (this.socket) {
        console.error('disconnect')
        this.socket.onclose = null
        this.socket.close()
        this.socket = null
    }
}

Network.prototype.shutdown = function() {
    this.socket.onclose = null
    this.socket.close()
}

Network.prototype.send = function(command, args, callback) {
    args = args || {}
    args.Command = command

    // if (game.stage.name == 'main')
    //     args.Fps = game.controller.system.fps.currentFps()

    this.sendStart = Date.now()
    this.socket.send(JSON.stringify(args))

    if (callback) {
        this.queue.push(callback)
    }

    this.events.emit('send', args.Command, args, callback)
}

//for debug
Network.prototype.sendRaw = function(cmd) {
    this.socket.send(JSON.stringify(cmd))
    this.events.emit('sendRaw', cmd)
}
