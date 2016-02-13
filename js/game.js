//var core = require('pixi.js/src/core')
var core = PIXI

require('./polyfill.js')

require('./entities.js')
var Entity = require('./entity.js')

require('./stages/connecting.js')
require('./stages/create-character.js')
require('./stages/exit.js')
require('./stages/loading.js')
require('./stages/lobby.js')
require('./stages/login.js')
require('./stages/main.js')
var Stage = require('./stages/stage.js')

//var Settings = require('./ui/settings.js')
var Quests = require('./ui/quests/quests.js')

var Loader = require('./loader.js')
var cnf = require('./config.js')
var CELL_SIZE = cnf.CELL_SIZE
var config = cnf.config
var debug = cnf.debug

require('./lang/ru/settings.js')
require('./lang/dict.js')
var dict = require('./lang/ru/dict.js')
var Talks = require('./lang/talks.js')
var Sound = require('./sound.js')
import Menu from './menu.js'
var Character = require('./character.js')
require('./characters.js')
var Controller = require('./controller.js')
import HashTable from './hashtable.js'
var Alert = require('./alert.js')
var Panel = require('./panel.js')
var Container = require('./container/container.js')
var dom = require('./dom.js')
var util = require('./util.js')

import {Map, Point, toScreen, drawStrokedText} from './render'
import {forEach, indexOf} from 'fast.js'
import Network from './network.js'
import {sendError} from './network-protocol.js'


var screen = {
    width: 0,
    height: 0,
    cells_x: 0,
    cells_y: 0,
    update: function() {
        //if (config.graphics.fullscreen) {
            this.width = window.innerWidth
            this.height = window.innerHeight
        //} else {
            //this.width = (window.innerWidth > cnf.DEFAULT_CLIENT_WIDTH) ?
                //cnf.DEFAULT_CLIENT_WIDTH : window.innerWidth
            //this.height = (window.innerHeight > cnf.DEFAULT_CLIENT_HEIGHT) ?
                //cnf.DEFAULT_CLIENT_HEIGHT : window.innerHeight
        //}

        this.cells_x = this.width / CELL_SIZE
        this.cells_y = this.height / CELL_SIZE
        game.mapCanvas.width = this.width
        game.mapCanvas.height = this.height
        game.pixiCanvas.width = this.width
        game.pixiCanvas.height = this.height
        game.canvas.width = this.width
        game.canvas.height = this.height
        game.world.style.width = this.width + 'px'
        game.world.style.height = this.height + 'px'
        game.setFontSize()

        game.renderer.resize(this.width, this.height)
    },
}

export default function Game() {
    window.game = this

    this.world = document.getElementById('world')
    this.interface = document.getElementById('interface')

    this.canvas = document.getElementById('canvas')

    this.mapCanvas = document.createElement('canvas')
    this.mapCanvas.id = 'map-canvas-x'

    this.pixiCanvas = document.createElement('canvas')
    this.pixiCanvas.id = 'pixi'

    this.canvas.parentNode.insertBefore(this.mapCanvas, this.canvas)
    this.canvas.parentNode.insertBefore(this.pixiCanvas, this.canvas.nextSibling)

    if (true) {
        var width = 800;
        var height = 600;
        var options = {
            view: this.pixiCanvas,
            transparent: true,
            autoResize: false,
            antialias: false,
            preserveDrawingBuffer: false,
            resolution: 1,

            clearBeforeRender: true,
            roundPixels: true,
        }

        if (core.utils.isWebGLSupported()) {
            this.renderer = new core.WebGLRenderer(width, height, options);
        } else {
            this.renderer = new core.CanvasRenderer(width, height, options);
        }

        this.pixiStage = new core.Container()

        this.pixiEntities = new PIXI.Container()
        this.pixiStage.addChild(this.pixiEntities)
    }

    this.mapCtx = this.mapCanvas.getContext('2d')

    this.ctx = this.canvas.getContext('2d')
    //this.ctx = this.renderer.context

    this.ctx.clear = ()=> {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
    this.setFontSize = (size)=> {
        this.ctx.font = (size || cnf.FONT_SIZE) + 'px Dejavu Sans'
    }
    this.setFontSize()

    //Settings.load(config);

    this.screen = screen

    this.ping = 0;
    this.time = 0;
    this.timeElement = document.getElementById("time");

    this.version = JSON.parse(localStorage.getItem("Version"));

    this.debug = debug;
    this.config = config;

    this.talks = new Talks();
    this.sound = new Sound();

    this.offset = {
        get x() { return game.world.offsetLeft; },
        get y() { return game.world.offsetTop; },
    };

    this.loader = new Loader("assets/");
    window.loader = this.loader;

    this.menu = new Menu();

    this.login = null;
    this.player = null;
    this.playerName = "";

    this.map = new Map(this.mapCtx, this.player)

    this.controller = new Controller(this);
    this.network = new Network();

    this.entities = new HashTable();
    this.sortedEntities = new BinarySearchTree();
    //this.sortedEntities = new NoBTS();
    this.claims = new HashTable();
    this.characters = new HashTable();
    this.containers = {};
    this.vendors = {};

    this.quests = new Quests();
    this.questMarkers = {
        "available": loader.loadImage("icons/quests/available.png"),
        "active": loader.loadImage("icons/quests/active.png"),
        "ready": loader.loadImage("icons/quests/ready.png"),
    };

    this.panels = {};
    this.camera = new Point();


    this.alert = new Alert()

    this.sendError = sendError
    this.sendErrorf = function() {
        this.sendError(sprintf.apply(window, arguments))
    }

    this.inVK = ()=> (window.name.indexOf('fXD') === 0)

    var siteUrl = "http://rogalia.ru";
    function openLink(link) {
        if (link.charAt(0) == "$")
            link = siteUrl + link.substring(1);
        return function() {
            window.open(link, "_blank");
            return false;
        };
    }

    this.button = {
        donate: function() {
            var link = document.createElement("button");
            link.textContent = T("Donate");
            link.onclick = openLink("http://rogalia.ru/shop/donate");
            return link;
        },
        blog: function() {
            var link = document.createElement("button");
            link.textContent = T("Blog");
            link.onclick = openLink("http://tatrix.org");
            return link;
        },
        vk: function() {
            var vk = document.createElement("button");
            var vkLogo = document.createElement("img");
            vkLogo.src = "http://vk.com/favicon.ico";
            vk.appendChild(vkLogo);
            vk.appendChild(document.createTextNode(T("Group")));
            vk.onclick = openLink("http://vk.com/rogalia");
            return vk;
        },
        twitter: function() {
            var twitter = document.createElement("button");
            var twitterLogo = document.createElement("img");
            twitterLogo.src = "http://twitter.com/favicon.ico";
            twitter.appendChild(twitterLogo);
            twitter.appendChild(document.createTextNode(T("Twitter")));
            twitter.onclick = openLink("http://twitter.com/Tatrics");
            return twitter;
        },
        wiki: function() {
            var wiki = document.createElement("button");
            wiki.textContent = T("Wiki / FAQ");
            wiki.onclick = openLink("$/wiki/");
            return wiki;
        },
        forum: function() {
            var forum = document.createElement("button");
            forum.textContent = T("Forum");
            forum.onclick = openLink("$/forum/");
            return forum;
        },
        bugtracker: function() {
            var bugtracker = document.createElement("button");
            bugtracker.textContent = T("Bugs");
            // bugtracker.onclick = openLink("http://github.com/TatriX/rogalik/issues");
            bugtracker.onclick = openLink("https://docs.google.com/document/d/1d7_odTtimjbG9sgGHj_B7aZBmgGR_CBSS330D0qvw68/edit");
            return bugtracker;
        },
        lobby: function() {
            var lobby = document.createElement("button");
            lobby.textContent = T("Change character");
            lobby.onclick = function() {
                game.reload(); //TODO: we should not reload
            };
            return lobby;
        },
        logout: function() {
            var logout = document.createElement("button");
            logout.textContent = T("Logout");
            logout.onclick = game.logout;
            return logout;
        },
        authors: function() {
            var authors = document.createElement("button");
            authors.textContent = T("Authors");

            var links = [
                ["Code", "TatriX", "http://vk.com/tatrix"],
                ["Animation", "igorekv", "http://vk.com/igorekv"],
                ["Music", "Иван Кельт", "http://vk.com/icelt"],

            ].map(function(tuple) {
                var title = document.createElement("cite");
                title.textContent = tuple[0];

                var link = document.createElement("a");
                link.innerHTML = tuple[1];
                link.href = tuple[2];
                link.target = "_blank";

                var label = document.createElement("div");
                label.appendChild(title);
                label.appendChild(link);

                return label;
            });

            var p = new Panel("authors",  "authors", links);
            authors.onclick = function() {
                p.show();
            };
            return authors;
        },
    };

    this.error = function() {
        this.sendErrorf(arguments)
        this.exit()
        throw "Fatal error"
    }

    this.jukebox = new (function() { // jshint ignore:line
        this.iframe = dom.tag("iframe")
        this.panel = new Panel("jukebox", "Jukebox", [this.iframe])
        this.panel.temporary = true

        this.panel.hide()

        var videoRegexp = new RegExp(/^[A-Za-z0-9_-]{11}$/);
        var current = {
            video: "",
            time: 0,
        };

        this.play = (video, time)=> {
            if (!videoRegexp.test(video)) {
                this.stop()
                return
            }
            current.video = video
            current.time = time
            if (!config.sound.jukebox)
                return
            this.sound.stopMusic()

            var src = "http://www.youtube.com/embed/" + video + "?autoplay=1"
            if (time) {
                src += "&start=" + time
            }
            this.iframe.src = src
        }

        this.stop = ()=> {
            this.iframe.src = ''
        }

        this.toggle = ()=> {
            if (config.sound.jukebox) {
                this.play(current.video, current.time)
            } else {
                this.stop()
            }
        }

        this.open = ()=> {
            this.panel.show();
        }
    })()

    var maximize = document.getElementById('maximize')
    maximize.onclick = function() {
        maximize.classList.toggle('maximized')

        // alternative standard method
        var el = document.fullscreenElement ||
                 document.webkitFullscreenElement ||
                 document.mozFullScreenElement ||
                 document.msFullscreenElement
        var req = document.documentElement.requestFullscreen ||
                  document.documentElement.webkitRequestFullscreen ||
                  document.documentElement.mozRequestFullScreen ||
                  document.documentElement.msRequestFullscreen ||
                  function() {}
        var exit = document.exitFullscreen ||
                   document.webkitExitFullscreen ||
                   document.mozCancelFullScreen ||
                   document.msExitFullscreen ||
                   function() {}

        if (!el) {
            req.call(document.documentElement)
        } else {
            exit.call(document)
        }
    }

    this.stage = new Stage();
    this.setStage("connecting");

    window.onerror = (msg, url, line)=> {
        window.onerror = null;
        this.sendError([
            "Client error:",
            msg,
            "Url: " + url,
            "Line: " + line,
            "UA: " + navigator.userAgent,
        ].join("|"))
        this.exit(T("Client error. Refresh page or try again later."));
        return false
    }

    this.dbg = new PIXI.Graphics()

    render(this.renderer, this.controller, this, this.pixiEntities, this.dbg)
}

Game.prototype.initTime = function(time, tick) {
    this.setTime(time)
    setInterval(()=> {
        if (++time > 1440) {
            time = 0
        }
        this.setTime(time)
    }, tick)
}

Game.prototype.setTime = function(time) {
    if (!time) {
        return
    }
    this.time = time
    this.timeElement.textContent = util.formatTime(time)
}

Game.prototype.drawStrokedText = function(text, x, y, strokeStyle) {
    if (config.ui.simpleFonts) {
        this.ctx.fillText(text, x, y)
        return
    }
    drawStrokedText(this.ctx, text, x, y, strokeStyle);
}

Game.prototype.forceDrawStrokedText = function(text, x, y, strokeStyle) {
    drawStrokedText(this.ctx, text, x, y, strokeStyle)
}

Game.prototype.save = function() {
    // on exit stage all panels are hidden
    // so they have nulled coordinates
    // and thus we shouldn't save them
    if (this.stage.name == 'exit') {
        return
    }

    Panel.save()
    Container.save()
    if (this.controller.craft) {
        this.controller.craft.save()
    }
    if (this.chat) {
        this.chat.save()
    }
    if (this.help) {
        this.help.save()
    }
}


Game.prototype.addEventListeners = function() {
    window.addEventListener('resize', this.screen.update.bind(this.screen))
    window.addEventListener('beforeunload', ()=> { this.save() })
    window.addEventListener('focus', ()=> { this.focus = true })
    window.addEventListener('blur', ()=> { this.focus = false })
}

Game.prototype.update = function(currentTime) {
    this.stage.update(currentTime)
}

Game.prototype.draw = function() {
    this.stage.draw()
}

Game.prototype.setStage = function(name, params) {
    this.screen.update()
    document.body.classList.remove(this.stage.name + '-stage')
    this.stage.end()
    this.ctx.clear()
    this.stage = new window[name + 'Stage'](params)
    this.stage.name = name
    document.body.classList.add(name + '-stage')
}

Game.prototype.reload = function() {
    document.location.reload()
}

Game.prototype.loadLogin = function() {
    this.login = localStorage.getItem('login')
    return this.login
}
Game.prototype.setLogin = function(login) {
    localStorage.setItem('login', login)
    this.login = login
}
Game.prototype.clearLogin = function() {
    localStorage.removeItem('login')
}
Game.prototype.loadPassword = function() {
    return localStorage.getItem('password')
}
Game.prototype.setPassword = function(password) {
    localStorage.setItem('password', password)
}
Game.prototype.clearPassword = function() {
    localStorage.removeItem('password')
}
Game.prototype.clearCredentials = function() {
    this.clearLogin()
    this.clearPassword()
}
Game.prototype.logout = function() {
    this.clearCredentials()
    this.reload()
}

Game.prototype.addCharacter = function(character) {
    this.addEntity(character)

    this.characters.set(character.Name,  character)

    if (character.Name == this.playerName) {
        character.isPlayer = true
        this.player = character
        this.map.player = character
    }
}

Game.prototype.addEntity = function(entity) {
    this.entities.set(entity.Id, entity)
    if (entity.Group == 'claim') {
        this.claims.set(entity.Id, entity)
    }
}

Game.prototype.removeEntityById = function(id) {
    if (this.containers[id]) {
        this.containers[id].panel.hide()
        delete this.containers[id]
    }

    var entity = Entity.get(id)
    entity.onremove()
    this.sortedEntities.remove(entity)
    this.entities.remove(id)
    this.claims.remove(id)

    if (entity.sprite__) {
        this.pixiEntities.removeChild(entity.sprite__)
    }
    this.sortedEntities.remove(entity)
}

Game.prototype.removeCharacterById = function(id) {
    var c = this.entities.get(id)
    this.sortedEntities.remove(c)
    var name = c.Name
    this.entities.remove(id)
    this.characters.remove(name)
}

Game.prototype.findItemsNear = function(x, y, dist) {
    dist = dist || CELL_SIZE*2
    return this.entities.filter((e)=>
        'inWorld' in e && e.inWorld() &&
            util.distanceLessThan(e.X - x, e.Y - y, dist)
    )
}

Game.prototype.findCharsNear = function(x, y, dist) {
    dist = dist || CELL_SIZE*2
    return this.characters.filter((e)=>
        util.distanceLessThan(e.X - x, e.Y - y, dist)
    )
}

Game.prototype.exit = function(message) {
    this.save()
    this.setStage("exit", message)
}


function render(renderer, controller, game, entities, dbg) {
    var requestAnimationFrame = window.requestAnimationFrame

    var rt = new PIXI.RenderTexture(renderer, 512, 512, PIXI.SCALE_MODES.LINEAR, 1)

    var rtSprite = new PIXI.Sprite(rt)
    rtSprite.alpha = 0.5
    //rtSprite.blendMode = PIXI.BLEND_MODES.ADD
    //rtSprite.visible = false

    var text = new PIXI.Text('Text', {
        font: cnf.FONT_SIZE + 'px Dejavu Sans',
        fill: 0xffffff,
        stroke: 0x333333,
        strokeThickness : 2,
        align: 'center',
    })
    text.anchor.x = 0.5
    text.anchor.y = 0.5


    var feeder = new PIXI.Graphics()

    var stage = new PIXI.Container()
    stage.addChild(dbg)
    stage.addChild(feeder)
    stage.addChild(entities)
    stage.addChild(rtSprite)
    stage.addChild(text)

    var stageWrap = new PIXI.Container()
    stageWrap.addChild(stage)

    var k = Math.sqrt(2)

    var ctx = game.ctx

    function tick(currentTime) {
        requestAnimationFrame(tick)

        //controller.fpsStatsBegin()

        feeder.clear()

        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = 1
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        game.update(currentTime)
        game.draw()

        ctx.setTransform(1, 0, 0, 1, 0, 0)

        stage.position.x = -game.camera.x
        stage.position.y = -game.camera.y

        var hovered = controller.world.hovered
        if (hovered) {
            var sprite = hovered.sprite__
            if (sprite && sprite.width && sprite.height) {
                switch (hovered.Group) {
                case 'sign':
                case 'grave':
                    text.text = hovered.Props.Text || ''
                    text.visible = true
                    break
                case 'feeder':
                    // lime
                    feeder.beginFill(0x32CD32, 0.5)
                    var sc = hovered.screen()
                    feeder.drawEllipse(sc.x, sc.y,
                            hovered.FeedRadius*k, hovered.FeedRadius*k / 2)
                    feeder.endFill()
                    break
                default:
                    text.text = hovered.name.split('\n')[0]
                }

                text.position.x = sprite.position.x + sprite.width / 2
                text.position.y = sprite.position.y + sprite.height / 2
                rtSprite.visible = true
                rtSprite.position.x = sprite.position.x + 30
                rtSprite.position.y = sprite.position.y
                rt.render(sprite, null, true, false)
            }
        } else {
            //rtSprite.visible = false
            text.visible = false
        }

        var hideStatic = game.controller.hideStatic()
        //entities.visible = !hideStatic
        dbg.visible = hideStatic

        renderer.render(stageWrap)

        //controller.fpsStatsEnd()
    }
    tick()
}


var isoMatrix = new PIXI.Matrix()
var k = Math.sqrt(2)
Game.prototype.redrawZZ = function redrawZZ() {
    var entities = this.entities.array
    var dbg = this.dbg

    dbg.clear()

    dbg.lineStyle(1, 0xFFFFFF, 1)

    for (var i = 0, l = entities.length; i < l; i++) {
        var e = entities[i]

        if (!e.CanCollide && e.MoveType != Entity.MT_STATIC) {
            continue
        }

        var x = e.X
        var y = e.Y
        var w = e.Width
        var h = e.Height
        var r = e.Radius

        var fill = 0xFFFFFF

        if (!e.CanCollide) {
            fill = 0x20B2AA // lightseagreen
        }

        if (e.Group == 'gate' || e.Type.indexOf('-arc') !== -1) {
            if (e.CanCollide) {
                fill = 0xEE82EE // violet
            } else {
                fill = 0x00FF7F // springgreen
            }
        }

        dbg.beginFill(fill, 0.3)

        if (w) {
            var p = toScreen({x: roundBox(x, w), y: roundBox(y, h)})
            isoMatrix.identity()
            isoMatrix.rotate(Math.PI / 4)
            isoMatrix.scale(1, 0.5)
            isoMatrix.translate(p.x, p.y)

            var poly = [
                isoMatrix.apply({x: 0*k, y: 0*k}),
                isoMatrix.apply({x: 0*k, y: h*k}),
                isoMatrix.apply({x: w*k, y: h*k}),
                isoMatrix.apply({x: w*k, y: 0*k}),
            ]
            dbg.drawPolygon(poly)
        } else {
            var sc = e.screen()
            dbg.drawEllipse(sc.x, sc.y, r*k, r*k / 2)
        }
        dbg.endFill()
    }
}

function roundBox(val, by) {
    return (val - by / 2) | 0
}
