var Panel = require('./panel.js')

//var Fight = require('./ui/fight.js')
import Skills from './ui/skills.js'
var Stats = require('./ui/stats.js')
var Craft = require('./ui/craft.js')
var Chat = require('./ui/chat/chat.js')
//var Minimap = require('./ui/minimap.js')
var Journal = require('./ui/quests/journal.js')
//var System = require('./ui/system.js')
//var Wiki = require('./ui/wiki.js')
import Auction from './ui/vendor/auction.js'
var Vendor = require('./ui/vendor/vendor.js')
var Mail = require('./ui/mail.js')

var Help = require('./ui/help.js')

var Container = require('./container/container.js')
var Entity = require('./entity.js')
var Character = require('./character.js')

var dom = require('./dom.js')
var cnf = require('./config.js')
var config = cnf.config
var CELL_SIZE = cnf.CELL_SIZE

import {Point, toWorld} from './render'
import * as iso from './render/iso.js'
import {showEntityInfo, hideEntityInfo} from './ui/info.js'

module.exports = function Controller(game) {
    var controller = this;
    this.ready = false;

    this.stats = null; // TODO: what is it?

    this.actionQueue = [];

    this.LMB = 0;
    this.MMB = 1;
    this.RMB = 2;
    this.callback = [null, null, null];

    this.mouse = {
        // relative to window
        x: 0,
        y: 0,
        // relative to world element
        world: {
            x: 0,
            y: 0,
        },
        // can safely use mouse coordinates in game.network.send()
        isValid: function() {
            return controller.targetInWorld() &&
                this.world.x > 0 && this.world.y > 0 &&
                this.world.x < game.screen.width && this.world.y < game.screen.height;
        }
    };

    this.world = {
        cursor: null,
        hovered: null, // entity under cursor
        menuHovered: null, //from X menu
        _p: new Point(),
        get point() {
            toWorld(this._p.set(
                controller.mouse.world.x + game.camera.x,
                controller.mouse.world.y + game.camera.y
            ))
            return this._p;
        },
        get x() {
            return this.point.x;
        },
        get y() {
            return this.point.y;
        },
    };

    this.modifier = {
        ctrl: false,
        shift: false,
        alt: false,
    };
    this.keys = {};
    this.currentTarget = null;
    this._hideStatic = false;

    this.lastCreatingType = "";
    this.lastCreatingCommand = "";
    this.lastCreatingRotation = 0;

    this.actionProgress = document.getElementById("action-progress");
    this.actionHotbar = document.getElementById("action-hotbar");
    this.controlsBar = document.getElementById("controls-bar");
    this.targetContainer = document.getElementById("target-container");
    this.party = document.getElementById("party");

    this.hovered = null; // dom element under cursor

    this.cursor = {
        element: document.getElementById("cursor"),
        entity: null,
        isActive: function() {
            return this.entity !== null;
        },
        clear: function() {
            this.entity = null;
            dom.clear(this.element);
        },
        set: function(entity, x, y, cleanup) {
            var icon = entity.icon();
            dom.clear(this.element);
            this.element.appendChild(icon);
            this.element.style.display = "block";
            this.element.style.left = x + "px";
            this.element.style.top = y + "px";
            this.element.style.marginLeft = -entity.getDrawDx() + "px";
            this.element.style.marginTop = -entity.getDrawDy() + "px";

            this.entity = entity;

            cleanup = cleanup || function(){};

            controller.callback[controller.RMB] = function(e) {
                cleanup();
                return true;
            };
            function callback(e) {
                var hovered = controller.hovered;
                if (hovered) {
                    if (controller.modifier.shift) {
                        game.chat.linkEntity(entity);
                        return true;
                    }
                    if (hovered.check && !hovered.check(controller.cursor))
                        return false;

                    if (hovered.canUse && hovered.canUse(entity)) {
                        return hovered.use(entity);
                    }

                    if (hovered.craft) {
                        cleanup = function(){};
                        return controller.craft.use(entity, hovered);
                    }

                    if (hovered.build)
                        return controller.craft.blank.use(entity);

                    if (hovered.vendor)
                        return hovered.use(entity, hovered);

                    if (hovered.slot) {
                        var slot = hovered.slot;
                        // dropped back to it's place
                        if (slot.entity == entity)
                            return true;

                        Container.move(entity, slot.container, slot.index);
                    }
                    return true;
                }

                hovered = controller.world.hovered;
                if (hovered && hovered.canUse) {
                    if (hovered.canUse(entity)) {
                        return hovered.use(entity);
                    }
                } else if (controller.mouse.isValid()) {
                    entity.drop();
                    return true;
                }
                return false;
            }
            controller.callback[controller.LMB] = function(e) {
                if (callback(e)) {
                    cleanup();
                    return true;
                }
                return false;
            };
        },
        update: function() {
            if (this.entity) {
                this.element.style.left = controller.mouse.x + "px";
                this.element.style.top = controller.mouse.y + "px";
            }
        },
        updateHovered: function() {
            dom.hide(this.element);
            var element = document.elementFromPoint(controller.mouse.x, controller.mouse.y);
            if (!element)
                return
            dom.show(this.element);

            var hovered = null;

            if (element.slot)
                hovered = element.slot.element; // slot.element not always == element
            else if (element.classList.contains("item-preview"))
                hovered = element.parentNode;
            else if (element.classList.contains("slot"))
                hovered = element;


            var oldHovered = controller.hovered;
            if (oldHovered != hovered) {
                if (oldHovered) {
                    oldHovered.classList.remove("hovered");
                    oldHovered.classList.remove("invalid");
                }
                if (hovered){
                    hovered.classList.add("hovered");
                    if (hovered.check && !hovered.check(controller.cursor))
                        hovered.classList.add("invalid");
                }
            }
            controller.hovered = hovered;
        },
    };

    // TODO: was controller.cursor getter; check usage and remove
    this.getCursor = function() {
        return this.world.cursor || this.cursor.firstChild;
    };

    this.highlight = function(name, enable) {
        if (!(name in this))
            return;

        var button = this[name].button ?
            this[name].button : this[name].panel.button; // XXX
        if (!button)
            return;

        if (enable)
            button.classList.add("alert");
        else
            button.classList.remove("alert");
    };

    this.makeHighlightCallback = function(buttonName, off) {
        return this.highlight.bind(this, buttonName, off);
    };

    this.update = function() {
        if (this.world.cursor || this.cursor.entity)
            document.body.classList.add("cursor-hidden");
        else
            document.body.classList.remove("cursor-hidden");

        if (this.world.hovered) {
            var e = Entity.get(this.world.hovered.Id)
            if (!e) { //item removed
                this.world.hovered = null
            } else if (e instanceof Entity && !e.inWorld()) {
                this.world.hovered = null
            }
        }

        if (!this.world.hovered && this.mouse.isValid()) {
            hideEntityInfo()
        }

        // XXX this.minimap.update();
    };

    this.toggleBag = function() {
        var cnt = Container.bag();
        controller.highlight("inventory", false);
        if (cnt) {
            cnt.panel.button = controller.inventory.panel.button;
            cnt.panel.toggle();
        } else {
            controller.showWarning(T("You have no bag"));
        }
    };

    this.initAvatar = function() {
        var cnt = document.getElementById("avatar-container");
        cnt.onmousedown = function(e) {
            e.stopPropagation();
            switch (e.button) {
            case game.controller.LMB:
                game.controller.stats.panel.toggle();
                break;
            case game.controller.RMB:
                var actions = {};
                if (game.player.Party) {
                    actions.leaveParty = function() {
                        game.chat.send("*part");
                    };
                }
                actions.suicide = function() {
                    game.chat.send("*suicide");
                };
                actions.unstuck = function() {
                    game.chat.send("*unstuck");
                };
                game.menu.show(actions);
                break;
            }
            return true;
        };

        var avatar = document.getElementById("avatar");
        avatar.src = "assets/avatars/" + game.player.sex() + ".png";
    };

    this.initHotkeys = function() {
        function toggle(panel) {
            return panel.toggle.bind(panel);
        }
        this.hotkeys = {
            R: {
                callback: function() {
                    if (this.lastCreatingType)
                        this.newCreatingCursor(this.lastCreatingType, this.lastCreatingCommand);
                }
            },
            Z: {
                allowedModifiers: ["shift"],
                callback: function() {
                    if (this.modifier.shift)
                        this._hideStatic = !this._hideStatic;
                }
            },
            B: {
                callback: this.toggleBag
            },
            I: {
                callback: this.toggleBag
            },
            C: {
                callback: toggle(game.panels.stats)
            },
            F: {
                callback: toggle(game.panels.craft)
            },
            S: {
                callback: toggle(game.panels.skills)
            },
            M: {
                //callback: toggle(game.panels.map)
                callback: function() {
                    window.ui.togglePanel('map')
                }
            },
            X: {
                button: "pick-up",
                callback: function() {
                    game.player.pickUp();
                },
            },
            "A": {
                "button": "lift",
                callback: function() {
                    game.player.liftStart();
                },
            },
            9: { //tab
                callback: function() {
                    game.player.selectNextTarget();
                }
            },
            13: { //enter
                callback: function() {
                    game.controller.chat.activate();
                }
            },
            27: { //esc
                callback: function() {
                    if (Panel.top) {
                        Panel.top.hide();
                    }
                    game.player.setTarget(null);
                }
            },
            32: { //space
                allowedModifiers: ["shift"],
                button: "action",
                callback: function(e) {
                    game.player.defaultAction();
                }
            },
            37: { // left
                callback: function() {
                    this.rotate(-1);
                }
            },
            39: { // right
                callback: function() {
                    this.rotate(+1);
                }
            }
        };
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(function(key) {
            this.hotkeys[String(key).charCodeAt(0)] = {
                callback: function() {
                    if (game.menu.visible)
                        game.menu.activate(key);
                    else if (key > 0 && key <= 5) {
                        //this.fight.hotkey(key)
                        window.ui.$broadcast('hotkey', key)
                    }
                }
            };
        }.bind(this));
    };

    this.fpsStatsBegin = function() {
        if (this.fpsStats)
            this.fpsStats.begin();
    };

    this.fpsStatsEnd =  function() {
        if (this.fpsStats)
            this.fpsStats.end();
    };

    this.initInterface = function() {
        game.map.minimapContainer.style.display = "block";
        game.timeElement.style.display = "block";

        function disableEvent(e) {
            e.preventDefault();
            return false;
        }

        window.addEventListener('mousedown', this.on.mousedown);
        window.addEventListener('mouseup', this.on.mouseup);
        window.addEventListener('mousemove', this.on.mousemove);
        window.addEventListener('keydown', this.on.keydown);
        window.addEventListener('keyup', this.on.keyup);
        window.addEventListener('wheel', this.on.wheel);

        window.addEventListener('contextmenu', disableEvent);
        window.addEventListener('dragstart', disableEvent);

        //this.fight = new Fight();
        this.skills = new Skills();
        this.stats = new Stats();
        this.craft = new Craft();
        this.chat = game.chat = new Chat();
        //this.minimap = new Minimap();
        this.journal = new Journal();
        //this.system = new System();
        //this.wiki = new Wiki();
        this.vendor = new Vendor();
        this.mail = new Mail();
        //this.fpsStats = this.system.fps;
        this.fpsStats = window.fps;
        this.inventory = {panel: {}};

        this.initAvatar();
        this.initHotkeys();
        //this.initHotbar();

        Container.load();

        game.help = new Help();
        this.ready = true;

        if (document.location.hash.indexOf("noui") != -1) {
            config.map.world = false;
            dom.hide(game.world);
        }

        if (!config.graphics.centerScreen) {
            game.world.classList.add("snap-left");
        }
    };

    this.terraCursor = function(tile) {
        this.world.cursor = {
            scale: 1,
            id: tile.id,
            setPoint: function(){}, //TODO: fixme
            alignedData: function() {return null;},
            rotate: function(delta) {
                if (delta < 0) {
                    this.scale++
                } else {
                    this.scale--
                }
            },
            draw: function() {
                var size = CELL_SIZE

                var p = game.controller.world.point.clone()
                p.x /= size
                p.y /= size
                p.floor()
                p.x *= size
                p.y *= size

                size *= this.scale

                var s = p.clone().toScreen()

                var ctx = game.ctx

                ctx.drawImage(tile,
                    0,
                    0,
                    CELL_SIZE * 2,
                    CELL_SIZE,

                    s.x - CELL_SIZE,
                    s.y,
                    CELL_SIZE * 2,
                    CELL_SIZE
                )

                ctx.strokeStyle = '#0ff'
                iso.strokeRect(ctx, p.x, p.y, size, size)
            }
        };
        this.callback[this.LMB] = function() {
            var p = game.controller.world.point.clone();
            p.x /= CELL_SIZE;
            p.y /= CELL_SIZE;
            p.floor();
            game.network.send("map-change-cell", {
                Id: parseInt(this.world.cursor.id),
                X: p.x,
                Y: p.y,
                Scale: this.world.cursor.scale,
            });
        };
    };

    this.newCreatingCursor = function(type, command, callback) {
        var entity = new Entity(type);
        entity.initSprite();
        return this.creatingCursor(entity, command, callback);
    };
    this.creatingCursor = function(entity, command, callback) {
        command = command || "entity-add";
        var lastType = entity.Type;
        this.world.cursor = entity;

        var rotate = 0;
        if (this.lastCreatingType == lastType)
            rotate = this.lastCreatingRotation;
        else
            this.lastCreatingRotation = 0;

        while (rotate-- > 0) {
            this.world.cursor.rotate();
            this.lastCreatingRotation--;
        }

        this.lastCreatingType = lastType;
        this.lastCreatingCommand = command;

        this.callback[this.LMB] = function() {
            if (!controller.mouse.isValid())
                return false;
            var p = entity.point;
            var data = entity.alignedData(p);
            if (data) {
                p.x = data.x + data.w/2;
                p.y = data.y + data.h/2;
            }
            var args = {
                type: entity.Type,
                x: p.x,
                y: p.y,
            };
            if (entity.Id)
                args.Id = entity.Id;
            if (entity.Orientation)
                args.Orientation = entity.Orientation;

            var pushToQueue = !!game.controller.modifier.shift;
            if (pushToQueue) {
                if (game.controller.actionQueue.length === 0 && !game.player.Action.Duration) {
                    game.network.send(command, args, game.controller.processActionQueue);
                } else {
                    game.controller.actionQueue.push({command: command, args: args});
                }
            } else {
                game.controller.actionQueue = [];
                game.network.send(command, args, callback);
                if (this.world.cursor instanceof Entity)
                    game.sortedEntities.remove(this.world.cursor);
            }

            this.clearCursors();
            return true;
        };
    };

    this.processActionQueue = function process(data) {
        var action = game.controller.actionQueue.shift();
        if (!action)
            return null;
        game.network.send(action.command, action.args);
        return process;
    };

    this.resetAction = function() {
        game.network.queue = [];
        this.clearActionQueue();
        this.hideUnnecessaryPanels();
    };

    this.clearActionQueue = function(data) {
        game.controller.actionQueue = [];
    };
    this.hideUnnecessaryPanels = function() {
        ["fishing"].forEach(function(name) {
            var panel = game.panels[name];
            panel && panel.hide(); // jshint ignore:line
        });
    };

    this.clearCursors = function() {
        // clicking on player launches action, so don't cancel it
        if (this.world.hovered != game.player)
            this.world.cursor = null;

        this.world.hovered = null;
        this.hovered = null;
        this.cursor.clear();
        hideEntityInfo()
    };

    this.targetInWorld = function(target) {
        target = target || this.currentTarget;
        return target == game.canvas || target == game.interface;
    };

    // this. is bound to controller
    this.on = {
        mousedown: function(e) {
            var x = e.pageX - game.offset.x + game.camera.x;
            var y = e.pageY - game.offset.y + game.camera.y;

            if (this.callback[e.button] !== null) { // if callback for button is set
                if(!this.callback[e.button].call(this, e)) //if callback didn't handled click
                    return false; //skip this click
                this.clearCursors();
            } else {
                switch(e.button) {
                case this.LMB:
                    if (this.targetInWorld(e.target)) {
                        if(this.world.hovered) {
                            if (this.modifier.shift && !this.modifier.ctrl) {
                                game.chat.linkEntity(this.world.hovered);
                                return false;
                            }
                            if (game.player.IsAdmin && game.debug.entity.logOnClick) {
                                console.log(this.world.hovered);
                            }
                            return this.world.hovered.defaultAction(true);
                        } else if (this.modifier.alt && game.player.IsAdmin) {
                            game.network.send("teleport", {X: this.world.x, Y: this.world.y});
                        } else if(!this.world.cursor) {
                            game.player.setDst(this.world.x, this.world.y);
                        }
                    }
                    // close context menu when click is not on the menu item
                    if (!e.target.classList.contains("action"))
                        game.menu.hide();
                    break;
                case this.MMB:
                    if (this.targetInWorld(e.target)) {
                        e.preventDefault();
                        game.player.setDst(this.world.x, this.world.y);
                        return false;
                    }
                    break;
                case this.RMB:
                    game.player.setTarget(null);
                    if (this.world.hovered == game.player) {
                        return this.world.hovered.defaultAction();
                    } else if (this.world.hovered && this.targetInWorld()) {
                        if (!game.menu.show(this.world.hovered)) {
                            game.menu.hide();
                        }
                    } else if(!e.target.classList.contains("item") && !e.target.classList.contains("slot")){
                        game.menu.hide();
                    }
                    break;
                }
            }

            for(var i = this.LMB; i <= this.RMB; i++) {
                this.callback[i] = null;
            }

            dom.removeClass(".hovered", "hovered");
            dom.removeClass(".invalid", "invalid");
            return false;
        },
        mouseup: function(e) {
            switch(e.button) {
            case 2:
                this.clearCursors();
                break;
            }
        },
        mousemove: function(e) {
            this.currentTarget = e.target;
            this.mouse.world.x = e.pageX - game.offset.x;
            this.mouse.world.y = e.pageY - game.offset.y;
            this.mouse.x = e.pageX;
            this.mouse.y = e.pageY;
            this.cursor.update();
            this.updateHovered();
        },
        wheel: function(e) {
            this.rotate(e.deltaY);
        },
        keydown: function(e) {
            //on double keydown kill xneur
            this.modifier.ctrl = e.ctrlKey;
            this.modifier.shift = e.shiftKey;
            this.modifier.alt = e.altKey;
            var c = String.fromCharCode(e.keyCode);

            if (e.ctrlKey) {
                switch (e.keyCode) {
                case 67:
                    return true; // ctrl+c
                default:
                    controller.updateHovered();
                }
            }

            var esc = e.keyCode == 27;
            if (!esc) {
                if(e.target.id == "new-message") {
                    return this.chat.keydown(e);
                }
                if (e.target.nodeName == "INPUT")
                    return true;
                if (e.target.nodeName == "TEXTAREA")
                    return true;
            }

            this.keys[c] = true;

            var hotkey = this.hotkeys[e.keyCode] || this.hotkeys[c];
            if (hotkey) {
                e.preventDefault();
                e.stopPropagation();

                for (var mod in this.modifier) {
                    if (!this.modifier[mod])
                        continue;
                    if (!hotkey.allowedModifiers || hotkey.allowedModifiers.indexOf(mod) == -1)
                        return false;
                }
                hotkey.callback.call(this, e);
            }
            return false;
        },
        keyup: function(e) {
            this.modifier.ctrl = e.ctrlKey;
            this.modifier.shift = e.shiftKey;
            this.modifier.alt = e.altKey;
            var c = String.fromCharCode(e.keyCode);
            this.keys[c] = false;
            return true;
        },
    };

    for (var eventName in this.on) {
        this.on[eventName] = this.on[eventName].bind(this);
    }

    this.rotate = function(delta) {
        var cursor = this.world.cursor;
        if (!cursor)
            return;
        cursor.rotate(delta);
    };

    this.updateHovered = function() {
        if (this.world.menuHovered)
            return;
        if (this.cursor.isActive()) {
            this.cursor.updateHovered();
        }
        var p = this.world.point;
        this.world.hovered = game.sortedEntities.findReverse(function(entity) {
            return entity.intersects(p.x, p.y);
        });
        if (this.world.hovered && this.mouse.isValid()) {
            if (!(this.world.hovered instanceof Character)) {
                showEntityInfo(this.world.hovered.Id)
            }
        }
    };

    this.drawAlign = function(entity, p) {
        var data = entity.alignedData(p);
        if (data) {
            game.ctx.strokeStyle = '#00ffff'
            iso.strokeRect(game.ctx, data.x, data.y, data.w, data.h);
        }
    };

    this.draw = function() {
        if (this.world.menuHovered) {
            this.world.menuHovered.drawHovered();
            return;
        }
        var cursor = this.world.cursor;
        var hovered = this.world.hovered;
        if (cursor) {
            if (cursor.Sprite) {
                if (this.modifier.shift && cursor.Sprite._align) {
                    cursor.Sprite.Align = cursor.Sprite._align;
                } else if (!cursor.Sprite.Align.X) {
                    cursor.Sprite = JSON.parse(JSON.stringify(cursor.Sprite));
                    cursor.Sprite._align = cursor.Sprite.Align;
                    cursor.Sprite.Align = {X: CELL_SIZE/2, Y: CELL_SIZE/2};
                }
            }

            cursor.setPoint(this.world.point);
            cursor.draw();
            this.drawAlign(cursor, this.world.point);
        } else if (hovered) {
            // If non-interface element (like menu) is over
            // and item is not outside of the visible area
            if (!this.hovered && this.mouse.isValid()) {
                hovered.drawHovered();
            }
        }
        var entity = this.cursor.entity;
        if (entity) {
            this.drawAlign(entity, this.world.point);
        }

        // Character.drawActions();
        game.characters.forEach((c)=> c.drawAction())

        if (this.modifier.ctrl && this.keys.X && !game.menu.visible) {
            this.drawItemsMenu();
        }
    };

    this.drawItemsMenu = function() {
        var items = game.findItemsNear(this.world.x, this.world.y);
        items.push.apply(items, game.findCharsNear(this.world.x, this.world.y));
        if (items.length === 0)
            return;

        var actions = {};
        items.forEach(function(item) {
            var name = item.Name || item.Type;
            while (name in actions) {
                name = name + " "; //TODO: (fixme)dirty hack for objects of the same type
            }
            actions[name] = {
                item: item,
                callback: function() {
                    game.menu.show(item, 0, 0, false, true);
                }
            };
        });
        game.menu.show(actions);
    };

    // TODO: refactor names
    this.showMessage = function(message, cls) {
        var warn = document.getElementById("warning");
        warn.textContent = TT(message);
        if(warn.timeout)
            clearTimeout(warn.timeout);
        warn.style.display = "inline-block";
        warn.className = cls || "";
        warn.timeout = setTimeout(function() {
            warn.style.display = "none";
            clearTimeout(warn.timeout);
            warn.timeout = null;
        }, 3000);

        if (game.chat)
            game.chat.addMessage(warn.textContent);
    };

    this.showError = function(message) {
        this.showMessage(message, "error");
    };

    this.showWarning = function(message) {
        this.showMessage(message, "warning");
    };

    this.showAnouncement = function(message) {
        var anouncement = document.getElementById("anouncement");
        anouncement.textContent = message;
        if(anouncement.timeout)
            clearTimeout(anouncement.timeout);
        anouncement.style.display = "inline-block";
        anouncement.timeout = setTimeout(function() {
            if (game.stage.name != "main")
                return;
            anouncement.style.display = "none";
            clearTimeout(anouncement.timeout);
            anouncement.timeout = null;
        }, 5000);
    };

    this.hideStatic = function() {
        if (this._hideStatic)
            return !this.keys.Z;
        else
            return this.keys.Z;
    };

    this.reset = function() {
        localStorage.clear();
        game.panels = {}; //dont save positions;
        game.reload();
    };

    this.updateVisibility = function() {
        for (var name in game.panels) {
            var panel = game.panels[name];
            panel.updateVisibility();
        }
    };

    var bg = {
        el: document.getElementById("bg-state"),
        panel: null,
        statFields: ["Kills", "Death", "Captures", "Releases", "Dmg done", "Dmg acpt"].map(T),
        makeStatRows: function(stats) {
            var rows = [];
            for (var name in stats) {
                var row = [name];
                for (var field in stats[name])
                    row.push(dom.text(stats[name][field]));
                rows.push(row);
            }
            return rows;
        },
    };

    this.updateBG = function(data) {
        if (!bg.panel) {
            bg.panel = new Panel("bg-stats", "Battleground", []);
            bg.el.onclick = bg.panel.toggle.bind(bg.panel);
        }
        if (data == "exit") {
            dom.hide(bg.el);
            bg.panel.hide();
            return;
        }

        dom.show(bg.el);
        var timer = null;

        if (data.Final) {
            var result = "draw";
            if (data.Red.Score > data.Blue.Score)
                result = "red team wins!";
            else if (data.Blue > data.Red)
                result = "blue team wins!";

            controller.showAnouncement(TT("Match ended: {result}", {result: result}));
        } else {
            timer = dom.div("remaining", {text: util.formatTime(data.Remaining)});
            setInterval(function() {
                timer.textContent = util.formatTime(--data.Remaining);
            }, 1000);
        }

        dom.setContents(bg.el, [
            dom.wrap("red-points", (data.Red.Points || []).join(" | ")),
            Character.flags.red.image.cloneNode(),
            dom.span(data.Red.Score, "red-team", T("Red team score")),
            " vs ",
            dom.span(data.Blue.Score, "blue-team", T("Blue team score")),
            Character.flags.blue.image.cloneNode(),
            dom.wrap("blue-points", (data.Blue.Points || []).join(" | ")),
            timer,
        ]);

        bg.panel.setContents([
            dom.wrap("red-team", [
                dom.table(
                    [[Character.flags.red.image.cloneNode(), T("Name")]].concat(bg.statFields),
                    bg.makeStatRows(data.Red.Stats)
                )
            ]),
            dom.wrap("blue-team", [
                dom.table(
                    [[Character.flags.blue.image.cloneNode(), T("Name")]].concat(bg.statFields),
                    bg.makeStatRows(data.Blue.Stats)
                )
            ])
        ]);
    };
};
