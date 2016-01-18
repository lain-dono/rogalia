'use strict';

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

var Settings = require('./ui/settings.js')
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
var Menu = require('./menu.js')
var Character = require('./character.js')
require('./characters.js')
var Controller = require('./controller.js')
var Network = require('./network.js')
var HashTable = require('./hashtable.js')
var Point = require('./point.js')
var Alert = require('./alert.js')
var Panel = require('./panel.js')
var Container = require('./container/container.js')
var dom = require('./dom.js')
var util = require('./util.js')


var Map = require('./ui/map.js')

module.exports = function Game() {
    window.game = this;

    this.world = document.getElementById("world");
    this.interface = document.getElementById("interface");
    this.canvas = document.getElementById("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.ctx.clear = function() {
        game.ctx.clearRect(0, 0, game.canvas.width, game.canvas.height);
    };
    this.setFontSize = function(size) {
        this.ctx.font = (size || cnf.FONT_SIZE) + "px Dejavu Sans";
    };
    this.setFontSize();

    Settings.load(config);

    this.screen = {
        width: 0,
        height: 0,
        cells_x: 0,
        cells_y: 0,
        update: function() {
            if (config.graphics.fullscreen) {
                this.width = window.innerWidth;
                this.height = window.innerHeight;
            } else {
                this.width = (window.innerWidth > cnf.DEFAULT_CLIENT_WIDTH) ?
                    cnf.DEFAULT_CLIENT_WIDTH : window.innerWidth;
                this.height = (window.innerHeight > cnf.DEFAULT_CLIENT_HEIGHT) ?
                    cnf.DEFAULT_CLIENT_HEIGHT : window.innerHeight;
            }

            this.cells_x = this.width / CELL_SIZE;
            this.cells_y = this.height / CELL_SIZE;
            game.canvas.width = this.width;
            game.canvas.height = this.height;
            game.world.style.width = this.width + "px";
            game.world.style.height = this.height + "px";
            game.setFontSize();
        },
    };

    this.ping = 0;
    this.time = 0;
    this.timeElement = document.getElementById("time");

    this.version = JSON.parse(localStorage.getItem("Version"));

    this.initTime = function(time, tick) {
        this.setTime(time);
        setInterval(function() {
            if (++time > 1440)
                time = 0;

            game.setTime(time);
        }, tick);
    };

    this.setTime = function(time) {
        if (!time)
            return;
        game.time = time;
        var hours = Math.floor(time / 60);
        var minutes = time % 60;
        if (minutes < 10)
            minutes = '0' + minutes;
        this.timeElement.textContent = hours + ":" + minutes;
    };

    this.debug = debug;
    this.config = config;

    //TODO:FIXME: remove bool flag and use select{lang1, lang2, ...}
    function defaultLang() {
        if (document.location.search.indexOf("en") != -1)
            return "en";
        if (navigator.language.substring(0, 2) == "en")
            return "en";
        return "ru";
    }
    this.lang = localStorage.getItem("lang") || defaultLang();
    dict.init();

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
    this.player = new Character(); // will be replaced in Character.sync()

    this.map = new Map();

    this.controller = new Controller(this);
    this.network = new Network();

    this.entities = new HashTable();
    this.sortedEntities = new BinarySearchTree();
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
    this.epsilon = 0;
    this.camera = new Point();

    this.drawStrokedText = function(text, x, y, strokeStyle) {
        if (game.config.ui.simpleFonts) {
            game.ctx.fillText(text, x, y);
            return;
        }
        this.forceDrawStrokedText(text, x, y, strokeStyle);
    };

    this.forceDrawStrokedText = function(text, x, y, strokeStyle) {
        var lineJoin = game.ctx.lineJoin;
        game.ctx.strokeStyle = strokeStyle || "#333";
        game.ctx.lineWidth = 3;
        game.ctx.lineJoin = 'round';
        game.ctx.strokeText(text, x, y);
        game.ctx.fillText(text, x, y);
        game.ctx.lineWidth = 1;
        game.ctx.lineJoin = lineJoin;
    };

    function draw(x, y, callback) {
        var p = new Point(x, y).toScreen();
        game.ctx.save();
        if (game.ctx.lineWidth < 2)
            game.ctx.lineWidth = 2;
        game.ctx.translate(p.x, p.y);
        game.ctx.scale(1, 0.5);
        game.ctx.rotate(Math.PI / 4);
        callback();
        game.ctx.restore();
    }
    var k = Math.sqrt(2);
    this.iso = Object.create({
        strokeRect: function(x, y, w, h) {
            draw(x, y, function() {
                game.ctx.strokeRect(0, 0, w * k, h * k);
            });
        },
        fillRect: function(x, y, w, h) {
            draw(x, y, function() {
                game.ctx.fillRect(0, 0, w * k, h * k);
            });
        },
        fillCircle: function(x, y, r) {
            draw(x, y, function() {
                game.ctx.beginPath();
                game.ctx.arc(0, 0, r * k, 0, Math.PI * 2);
                game.ctx.fill();
            });
        },
        strokeCircle: function(x, y, r) {
            draw(x, y, function() {
                game.ctx.beginPath();
                game.ctx.arc(0, 0, r * k, 0, Math.PI * 2);
                game.ctx.stroke();
            });
        },
        fillStrokedCircle: function(x, y, r) {
            this.fillCircle(x, y, r);
            this.strokeCircle(x, y, r);
        },
        fillStrokedRect: function(x, y, w, h) {
            this.fillRect(x, y, w, h);
            this.strokeRect(x, y, w, h);
        },
    })

    this.save = function() {
        // on exit stage all panels are hidden
        // so they have nulled coordinates
        // and thus we shouldn't save them
        if (game.stage.name == "exit")
            return;
        Panel.save();
        Container.save();
        game.controller.craft && game.controller.craft.save(); // jshint ignore:line
        game.chat && game.chat.save(); // jshint ignore:line
        if (game.help)
            game.help.save();
    };

    this.addEventListeners = function() {
        window.addEventListener("resize", game.screen.update.bind(game.screen));
        window.addEventListener("beforeunload", function(e) {
            game.save();
        });

        window.addEventListener('focus', function() {
            game.focus = true;
        });

        window.addEventListener('blur', function() {
            game.focus = false;
        });

    };

    this.update = function(currentTime) {
        this.stage.update(currentTime);
    };

    this.draw = function() {
        this.stage.draw();
    };

    this.setStage = function(name, params) {
        this.screen.update();
        document.body.classList.remove(this.stage.name + "-stage");
        this.stage.end();
        game.ctx.clear();
        this.stage = new window[name + "Stage"](params);
        this.stage.name = name;
        document.body.classList.add(name + "-stage");
    };

    this.reload = function() {
        document.location.reload();
    };

    this.loadLogin = function() {
        game.login = localStorage.getItem("login");
        return game.login;
    };

    this.setLogin = function(login) {
        localStorage.setItem("login", login);
        game.login = login;
    };

    this.clearLogin = function() {
        localStorage.removeItem("login");
    };

    this.loadPassword = function() {
        return localStorage.getItem("password");
    };

    this.setPassword = function(password) {
        localStorage.setItem("password", password);
    };

    this.clearPassword = function() {
        localStorage.removeItem("password");
    };

    this.clearCredentials = function() {
        this.clearLogin();
        this.clearPassword();
    };

    this.logout = function() {
        this.clearCredentials();
        this.reload();
    }.bind(this);

    this.addCharacter = function(character) {
        this.addEntity(character);

        if (character.Type == "vendor")
            return;

        this.characters.set(character.Name,  character);
        if (character.Name == game.player.Name) {
            character.isPlayer = true;
            game.player = character;
        }
    };

    this.addEntity = function(entity) {
        this.entities.set(entity.Id, entity);
        if (entity.Group == "claim")
            this.claims.set(entity.Id, entity);
    };

    this.removeEntityById = function(id) {
        if (game.containers[id]) {
            game.containers[id].panel.hide();
            delete game.containers[id];
        }

        var entity = Entity.get(id);
        entity.onremove();
        game.sortedEntities.remove(entity);
        game.entities.remove(id);
        game.claims.remove(id);
    };

    this.removeCharacterById = function(id) {
        var c = game.entities.get(id);
        game.sortedEntities.remove(c);
        var name = c.Name;
        game.entities.remove(id);
        game.characters.remove(name);
    };

    this.findItemsNear = function(x, y, dist) {
        dist = dist || CELL_SIZE*2;
        return this.entities.filter(function(e) {
            return "inWorld" in e &&
                e.inWorld() &&
                util.distanceLessThan(e.X - x, e.Y - y, dist);
        });
    };

    this.findCharsNear = function(x, y, dist) {
        dist = dist || CELL_SIZE*2;
        return this.characters.filter(function(e) {
            return util.distanceLessThan(e.X - x, e.Y - y, dist);
        });
    };

    this.exit = function(message) {
        this.save();
        this.setStage("exit", message);
    };

    this.alert = new Alert();

    this.sendError = function(msg) {
        game.network.send("error", {msg: msg});
    };

    this.sendErrorf = function() {
        this.sendError(sprintf.apply(window, arguments));
    };

    this.inVK = function() {
        return (window.name.indexOf('fXD') === 0);
    };

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
        game.sendErrorf(arguments);
        game.exit();
        throw "Fatal error";
    };

    this.jukebox = new (function() { // jshint ignore:line
        this.iframe = dom.tag("iframe");
        this.panel = new Panel("jukebox", "Jukebox", [this.iframe]);
        this.panel.temporary = true;

        var videoRegexp = new RegExp(/^[A-Za-z0-9_-]{11}$/);
        var current = {
            video: "",
            time: 0,
        };

        this.play = function(video, time) {
            if (!videoRegexp.test(video)) {
                this.stop();
                return;
            }
            current.video = video;
            current.time = time;
            if (!config.sound.jukebox)
                return;
            game.sound.stopMusic();

            var src = "http://www.youtube.com/embed/" + video + "?autoplay=1";
            if (time)
                src += "&start=" + time;
            this.iframe.src = src;
        };

        this.stop = function() {
            this.iframe.src = "";
        };

        this.toggle = function() {
            if (config.sound.jukebox) {
                this.play(current.video, current.time);
            } else {
                this.stop();
            }
        };

        this.open = function() {
            this.panel.show();
        }.bind(this);
    })()

    var maximize = document.getElementById("maximize");
    maximize.onclick = function() {
        maximize.classList.toggle("maximized");
        util.toggleFullscreen();
    };

    this.stage = new Stage();
    this.setStage("connecting");

    window.onerror = function(msg, url, line) {
        window.onerror = null;
        game.sendError([
            "Client error:",
            msg,
            "Url: " + url,
            "Line: " + line,
            "UA: " + navigator.userAgent,
        ].join("|"));
        game.exit(T("Client error. Refresh page or try again later."));
        return false;
    };

    function tick(currentTime) {
        game.controller.fpsStatsBegin();

        game.update(currentTime);
        game.draw();

        game.controller.fpsStatsEnd();

        requestAnimationFrame(tick);
    }

    tick();
};
