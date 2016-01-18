'use strict'

var Point = require('./point.js')
// FIXME circular dependencies
var Entity = require('./entity.js')
var Panel = require('./panel.js')
var EffectDesc = require('./effects.js')
var Sprite = require('./sprite.js')
var Exchange = require('./ui/exchange.js')
var Vendor = require('./ui/vendor.js')
var Info = require('./info.js')
var util = require('./util.js')
var dom = require('./dom.js')
var cnf = require('./config.js')
var config = cnf.config
var debug = cnf.debug

module.exports = Character

function Character(id, name) {
    this.Id = id;
    this.Name = name;
    this.x = 0;
    this.y = 0;

    this.Hp = null;
    this.Invisible = false;

    this.Title = "";
    //used to show animation of varius type, like damage deal or exp gain
    this.info = [];
    this.Messages = null;
    this.PrivateMessages = null;

    //Character in pvp cannot move and do other actions
    this.pvp = false;

    this.Dst = {
        X: 0,
        Y: 0,
    };
    this.dst = {
        x: 0,
        y: 0,
        time: null,
        radius: 0,
    };

    this.target = null;
    this.interactTarget = {};

    this.Dx =  0;
    this.Dy = 0;
    this.Radius = cnf.CELL_SIZE / 4;
    this.isMoving = false;
    this.Speed = {Current: 0};
    this.Equip = [];

    this.IsNpc = false;

    this.Burden = 0;
    this.burden = null;
    this.plow = null;

    this.Effects = {};
    this.Clothes = [];

    this.Settings = {
        Pathfinding: true,
    };

    this.ballon = null;
    this.shownEffects = {};
    this.isPlayer = false;

    this.Action = {};
    this.action = {
        progress: 0,
        last: 0,
    };

    this.speedFactor = 1; // biom's coef

    this.animation = {up: null, down: null};

    this.sprites = {};
    Character.animations.forEach(function(animation) {
        var s = new Sprite();
        s.name = animation;
        this.sprites[animation] = s;
    }.bind(this));
    this.sprite = this.sprites.idle;

    this._parts = "[]"; //defauls for npcs

}

Character.prototype = {
    get X() {
        return this.x;
    },
    get Y() {
        return this.y;
    },
    set X(x) {
        if (this.x == x)
            return;
        if (this.Dx === 0 || this.Settings.Pathfinding || Math.abs(this.x - x) > cnf.CELL_SIZE) {
            game.sortedEntities.remove(this);
            this.x = x;
            game.sortedEntities.add(this);
        }
    },
    set Y(y) {
        if (this.y == y)
            return;
        if (this.Dy === 0 || this.Settings.Pathfinding || Math.abs(this.y - y) > cnf.CELL_SIZE) {
            game.sortedEntities.remove(this);
            this.y = y;
            game.sortedEntities.add(this);
        }
    },
    getZ: function() {
        return 0;
    },
    leftTopX: Entity.prototype.leftTopX,
    leftTopY: Entity.prototype.leftTopY,
    compare: Entity.prototype.compare,
    setPoint: function(p) {
        if (this.Id && this.inWorld())
            game.sortedEntities.remove(this);

        this.x = p.x;
        this.y = p.y;

        if (this.Id && this.inWorld())
            game.sortedEntities.add(this);
    },
    screen: function() {
        var x, y
        if (this.mount) {
            x = this.mount.X;
            y = this.mount.Y;
        } else {
            x = this.X;
            y = this.Y;
        }
        return new Point(x, y).toScreen();
    },
    sync: function(data, init) {
        Character.copy(this, data);

        this.burden = (this.Burden) ? Entity.get(this.Burden) : null;
        this.plow = ("Plowing" in this.Effects) ? Entity.get(this.Effects.Plowing.Plow) : null;

        this.syncMessages(this.Messages);
        this.syncMessages(this.PrivateMessages);

        if ("Path" in data) {
            this.followPath();
        }

        if (this.Name == "Margo") {
            this.reloadSprite();
        } else if (!init && JSON.stringify(this.getParts()) != this._parts) {
            this.reloadSprite();
        }


        if (data.Dir !== undefined) {
            this.sprite.position = data.Dir;
        }

        if ("AvailableQuests" in data) {
            this.updateActiveQuest();
        }
        if ("Party" in data) {
            this.updateParty(data.Party);
        }
    },
    updateParty: function(members) {
        var party = game.controller.party;
        dom.clear(party);
        if (!members)
            return;

        members.forEach(function(name, i) {
            if (name == game.player.Name)
                return;
            var member = game.characters.get(name);
            var avatar
            if (member) {
                avatar = loader.loadImage("avatars/" + member.sex() + ".png");
            } else {
                avatar = dom.div(".character-avatar-not-available", {text: "?"});
                avatar.title = T("Out of sight");
                Character.partyLoadQueue[name] = true;
            }
            var cnt = dom.div(".character-avatar-container");
            cnt.appendChild(avatar);
            var prefix = (i === 0 && party[0] != game.player.Name) ? "★" : "";
            cnt.appendChild(dom.span(prefix + name, "party-member-name"));
            cnt.onmousedown = function(e) {
                return game.chat.nameMenu(e, name);
            };
            party.appendChild(cnt);
        });
    },
    syncMessages: function(messages) {
        while(messages && messages.length > 0) {
            var message = messages.shift();
            this.info.push(new Info(message, this));
        }
    },
    reloadSprite: function() {
        for (var i in this.sprites) {
            this.sprites[i].ready = false;
        }
        this.loadSprite();
    },
    init: function(data) {
        //TODO: refactor
        this.IsNpc = data.Type != "man";
        this.sync(data, true);
        this.loadSprite();
    },
    isSimpleSprite: function() { //for migration; get rid of this shit
        switch (this.Type) {
        case "cat":
        case "dog":
        case "horse":
        case "cow":
        case "small-spider":
        case "spider":
        case "wolf":
        case "wolf-fatty":
        case "wolf-hungry":
        case "wolf-undead":
        case "wolf-demonic":
        case "chicken":
        case "goose":
        case "rabbit":
        case "preved-medved":
        case "medved":
        case "sheep":
        case "omsk":
        case "omich":
        case "kitty-pahan":
        case "kitty-cutthroat":
        case "kitty-robber":
        case "kitty-junkie":
            return false;
        default:
            return this.IsNpc;
        }
    },
    initSprite: function() {
        this.sprite.speed = 14000;
        this.sprite.offset = this.Radius;
        this.sprite.angle = Math.PI/4;
        switch (this.Type) {
        case "cat":
            this.sprite.width = 90;
            this.sprite.height = 90;
            this.sprite.offset = 30;
            break;
        case "dog":
            this.sprite.width = 100;
            this.sprite.height = 100;
            this.sprite.offset = 35;
            break;
        case "kitty-pahan":
        case "kitty-cutthroat":
        case "kitty-robber":
        case "kitty-junkie":
            this.sprite.width = 110;
            this.sprite.height = 110;
            this.sprite.offset = 30;
            break;
        case "goose":
            this.sprite.width = 70;
            this.sprite.height = 70;
            this.sprite.speed = 7000;
            break;
        case "chicken":
        case "rabbit":
            this.sprite.width = 50;
            this.sprite.height = 50;
            this.sprite.speed = 7000;
            break;
        case "butterfly":
        case "zombie":
            this.sprite.width = 32;
            this.sprite.height = 32;
            this.sprite.angle = Math.PI/2;
            this.sprite.frames = {
                "idle": 1,
                "run": [0, 3],
            };
            break;
        case "ultra-zombie":
            this.sprite.width = 96;
            this.sprite.height = 96;
            this.sprite.angle = Math.PI/2;
            this.sprite.frames = {
                "idle": 1,
                "run": [0, 3],
            };
            break;
        case "jesus":
            this.sprite.width = 64;
            this.sprite.height = 96;
            this.sprite.frames = {
                "idle": 4,
                "run": 8,
            };
            break;
        case "diego":
        case "charles":
            this.sprite.width = 73;
            this.sprite.height = 88;
            this.sprite.angle = Math.PI*2;
            this.sprite.frames = {
                "idle": 1,
                "run": 0,
            };
            break;
        case "desu":
        case "suiseiseki":
            this.sprite.width = 68;
            this.sprite.height = 96;
            this.sprite.angle = Math.PI*2;
            this.sprite.frames = {
                "idle": 4,
                "run": 0,
            };
            break;
        case "abu":
            this.sprite.width = 128;
            this.sprite.height = 128;
            this.sprite.angle = Math.PI/2;
            this.sprite.frames = {
                "idle": 1,
                "run": 3,
            };
            break;
        case "senior-mocherator":
            this.sprite.width = 80;
            this.sprite.height = 80;
            this.sprite.angle = Math.PI/2;
            this.sprite.frames = {
                "idle": 1,
                "run": 3,
            };
            break;
        case "mocherator":
            this.sprite.width = 40;
            this.sprite.height = 40;
            this.sprite.angle = Math.PI/2;
            this.sprite.frames = {
                "idle": 1,
                "run": 3,
            };
            break;
        case "omsk":
            this.sprite.width = 170;
            this.sprite.height = 170;
            break;
        case "omsk":
            this.sprite.width = 170;
            this.sprite.height = 170;
            break;
        case "omich":
            this.sprite.width = 130;
            this.sprite.height = 130;
            break;
        case "ufo":
            this.sprite.width = 64;
            this.sprite.height = 64;
            this.sprite.angle = Math.PI*2;
            this.sprite.frames = {
                "idle": 3,
                "run": 0,
            };
            break;
        case "wyvern":
            this.sprite.width = 256;
            this.sprite.height = 256;
            this.sprite.frames = {
                "idle": 4,
                "run": 4,
            };
            this.sprite.speed = 20000;
            break;
        case "imp":
            this.sprite.width = 107;
            this.sprite.height = 68;
            this.sprite.frames = {
                "idle": 3,
                "run": 4,
            };
            this.sprite.speed = 20000;
            break;
        case "lesser-daemon":
            this.sprite.width = 160;
            this.sprite.height = 102;
            this.sprite.frames = {
                "idle": 3,
                "run": 4,
            };
            this.sprite.speed = 40000;
            break;
        case "higher-daemon":
            this.sprite.width = 214;
            this.sprite.height = 136;
            this.sprite.frames = {
                "idle": 3,
                "run": 4,
            };
            this.sprite.speed = 50000;
            break;
        case "daemon":
            this.sprite.width = 160;
            this.sprite.height = 102;
            this.sprite.frames = {
                "idle": 3,
                "run": 4,
            };
            this.sprite.speed = 50000;
            break;
        case "red-hair":
            this.sprite.width = 64;
            this.sprite.height = 96;
            this.sprite.frames = {
                "idle": 1,
                "run": 3,
            };
            break;
        case "snegurochka":
        case "ded-moroz":
            this.sprite.nameOffset = 100;
            break;
        case "vendor":
        case "cirno":
        case "moroz":
        case "boris":
        case "bertran":
        case "bruno":
        case "scrooge":
        case "ahper":
        case "cosmas":
            this.sprite.nameOffset = 70;
            break;
        case "small-spider":
            this.sprite.width = 64;
            this.sprite.height = 64;
            this.sprite.offset = 25;
            this.sprite.speed = 21000;
            break;
        case "spider":
            this.sprite.width = 128;
            this.sprite.height = 128;
            this.sprite.offset = 45;
            this.sprite.speed = 31000;
            break;
        case "horse":
        case "medved":
            this.sprite.width = 150;
            this.sprite.height = 150;
            this.sprite.offset = 43;
            break;
        case "preved-medved":
            this.sprite.width = 210;
            this.sprite.height = 210;
            this.sprite.offset = 44;
            this.sprite.nameOffset = 150;
            this.sprite.speed = 20000;
            break;
        case "cow":
        case "wolf":
        case "wolf-undead":
        case "wolf-demonic":
        case "sheep":
            this.sprite.width = 100;
            this.sprite.height = 100;
            this.sprite.offset = 45;
            break;
        case "wolf-fatty":
            this.sprite.width = 120;
            this.sprite.height = 120;
            break;
        case "wolf-hungry":
            this.sprite.width = 80;
            this.sprite.height = 80;
            break;
        case "tractor":
            this.sprite.width = 128;
            this.sprite.height = 108;
            break;
        default:
            this.sprite.nameOffset = 72;
            this.sprite.offset = 2*this.Radius;
            this.sprite.width = 96;
            this.sprite.height = 96;
            this.sprite.speed = 7000;
        }
        if (!this.sprite.nameOffset)
            this.sprite.nameOffset = this.sprite.height;
    },
    loadSprite: function() {
        var sprite = this.sprite;
        if (sprite.loading)
            return;

        this.initSprite();

        if (this.IsNpc) {
            this.loadNpcSprite();
            return;
        }

        sprite.loading = true;

        var animation = sprite.name;
        var dir = Character.spriteDir + this.Type + "/";
        var parts = this.getParts();
        this._parts = JSON.stringify(parts);
        parts.forEach(function(part) {
            var path = dir + animation + "/" + part.type + "/" + part.name + ".png";
            part.image = loader.loadImage(path);
        });
        if (sprite.name == "attack") {
            var weapon = Character.weaponSprites.sword;
            if (weapon)
                parts.push({image: weapon.image});
        }

        var name = this.Name;
        loader.ready(function() {
            var canvas = document.createElement("canvas");
            var ctx = canvas.getContext("2d");
            var naked = Character.nakedSprites[animation];
            canvas.width = naked.image.width;
            canvas.height = naked.image.height;
            ctx.drawImage(naked.image, 0, 0);
            parts.forEach(function(part, i) {
                var image = part.image;
                if (image && image.width > 0) {
                    if (part.color && part.opacity) {
                        var worker = new Worker("js/tint.js");
                        var tmpCanvas = util.imageToCanvas(image);
                        var tmpCtx = tmpCanvas.getContext("2d");
                        worker.onmessage = function(e) {
                            tmpCtx.putImageData(e.data, 0, 0);
                            ctx.drawImage(tmpCanvas, 0, 0);
                        };
                        worker.postMessage({
                            imageData: tmpCtx.getImageData(0, 0, image.width, image.height),
                            color: part.color,
                            opacity: part.opacity,
                        });

                        // very slow
                        // image = ImageFilter.tint(image, part.color, part.opacity);
                        // ctx.drawImage(image, 0, 0);
                    } else {
                        ctx.drawImage(image, 0, 0);
                    }
                }
            });

            sprite.image = canvas;
            sprite.makeOutline();
            sprite.ready = true;
            sprite.loading = false;

            if (name in Character.partyLoadQueue) {
                delete Character.partyLoadQueue.name;
                game.player.updateParty(game.player.Party);
            }
        });
    },
    loadNpcSprite: function() {
        var type = this.Type;
        switch (this.Name) {
        case "Margo":
            var name = (this.Owner == game.player.Id) ? "margo-" + util.rand(0, 1) : "margo";
            this.sprite.load(Character.spriteDir + name + ".png");
            return;
        case "Umi":
            type = "umi";
            break;
        case "Shot":
            type = "shot";
            break;
        default:
            if (!this.isSimpleSprite()) {
                this._loadNpcSprites();
                return;
            }
            if (this.Type == "vendor") {
                type = "vendor-" + ([].reduce.call(this.Name, function(hash, c) {
                    return hash + c.charCodeAt(0);
                }, 0) % 3 + 1);
                break;
            }
        }
        this.sprite.load(Character.spriteDir + type + ".png");
    },
    _loadNpcSprites: function() {
        this.sprite.load(Character.spriteDir + this.Type + "/" + this.sprite.name + ".png");
    },
    getActions: function() {
        var actions = {};
        switch (this.Type) {
        case "cow":
            actions = {
                "Milk": function() {
                    game.network.send("milk", {Id: this.Id});
                }
            };
            break;
        case "rabbit":
        case "chicken":
            actions = {
                "Catch": function() {
                    game.network.send("catch-animal", {Id: this.Id});
                }
            };
            break;
        default:
            if (this.Riding) {
                actions = {
                    "Mount": function() {
                        game.network.send("mount", {Id: this.Id});
                    },
                    "Dismount": function() {
                        game.network.send("dismount");
                    },
                };
            }
        }

        var common = {
            Select: game.player.setTarget.bind(game.player, this)
        };
        if (game.player.IsAdmin) {
            common.Kill = function() {
                game.chat.send("*kill " + this.Name);
            };
            common.ComeToMe = function() {
                game.chat.send("*come-to-me " + this.Name);
            };
            if (this.Type == "vendor") {
                common.RemoveVendor = function() {
                    game.chat.send("*remove-vendor " + this.Name);
                };
            }
        }
        if (this.isInteractive()) {
            common.Interact =  this.interact;
        }

        var list = [common, actions];
        if (this.IsNpc)
            return list;
        return list.concat(game.chat.makeNameActions(this.Name));
    },
    defaultAction: function(targetOnly) {
        if (this.isInteractive()) {
            this.interact();
        } else {
            // call actionButton on space
            if (!targetOnly && this.isPlayer && game.controller.actionButton.active())
                game.controller.actionButton.activate();
            else if (this != game.player) {
                var party = game.player.Party;
                if (!party || party.indexOf(this.Name) == -1)
                    game.player.setTarget(this);
            }
        }
    },
    drawAction: function() {
        if(this.Action.Duration) {
            var progress = Math.min(this.action.progress, 1);
            if (this.isPlayer) {
                var ap = game.controller.actionProgress.firstChild;
                ap.style.width = progress * 100 + "%";
            } else {
                var w = 64;
                var h = cnf.FONT_SIZE * 0.5;
                var p = this.screen();
                var x = p.x - w/2;
                var y = p.y - this.sprite.nameOffset + h + 1;
                h -= 2;

                if (!config.ui.simpleFonts) {
                    game.ctx.fillStyle = '#333';
                    game.ctx.fillRect(x-1, y-1, w+2, h+2);
                }
                game.ctx.fillStyle = '#99682e';
                game.ctx.fillRect(x, y, w, h);

                game.ctx.fillStyle = '#cf9d62';
                game.ctx.fillRect(x, y, progress * w, h);
            }
        }
    },
    see: function(character) {
        if (this == character)
            return true;
        var p = this.getDrawPoint();
        var len_x = character.X - this.X;
        var len_y = character.Y - this.Y;
        return util.distanceLessThan(len_x, len_y, Math.hypot(game.screen.width, game.screen.height));
    },
    setDst: function(x, y) {
        if (this.Speed.Current <= 0 || this.Disabled)
            return;
        var leftBorder, rightBorder, topBorder, bottomBorder;
        leftBorder = this.Radius;
        topBorder = this.Radius;
        rightBorder = game.map.full.width - this.Radius;
        bottomBorder = game.map.full.height - this.Radius;

        if (x < leftBorder) {
            x = leftBorder;
        } else if (x > rightBorder) {
            x = rightBorder;
        }

        if (y < topBorder) {
            y = topBorder;
        } else if (y > bottomBorder) {
            y = bottomBorder;
        }

        if (x == this.Dst.X && y == this.Dst.Y)
            return;

        game.network.send("set-dst", {x: x, y: y});
        game.controller.resetAction();
        this.dst.x = x;
        this.dst.y = y;
        this.dst.radius = 9;
        this.dst.time = Date.now();

        if (!this.Settings.Pathfinding)
            this._setDst(x, y);
    },
    _setDst: function(x, y) {
        var len_x = x - this.X;
        var len_y = y - this.Y;
        var len  = Math.hypot(len_x, len_y);

        this.Dst.X = x;
        this.Dst.Y = y;

        this.Dx = len_x / len;
        this.Dy = len_y / len;
    },
    getDrawPoint: function() {
        var p = this.screen();
        var dy = (this.mount) ? this.mount.sprite.offset : 0;
        return {
            p: p,
            x: Math.round(p.x - this.sprite.width / 2),
            y: Math.round(p.y - this.sprite.height + this.sprite.offset) - dy
        };
    },
    draw: function() {
        if (!game.player.see(this))
            return;
        if ("Sleeping" in this.Effects)
            return;

        this.drawDst();

        if (!this.sprite.ready)
            return;

        var p = this.getDrawPoint();
        var s = this.screen();
        var up = this.animation.up;
        var down = this.animation.down;
        if (down) {
            var downPoint = new Point(
                s.x - down.width/2,
                p.y + this.sprite.height + this.sprite.offset - down.height
            );
            down.draw(downPoint);
            down.animate();
            if (down.frame === 0) { //finished
                this.animation.down = null;
            }
        }

        // drawing character model
        if (this.Invisible)
            this.sprite.drawAlpha(p, 0.3);
        else
            this.sprite.draw(p);

        if (up) {
            var upPoint = new Point(
                s.x - up.width/2,
                p.y + this.sprite.height + this.sprite.offset - up.height
            );
            up.draw(upPoint);
            up.animate();
            if (up.frame === 0) { //finished
                this.animation.up = null;
            }
        }

        this.drawEffects();

        if (this != game.controller.world.hovered && this == game.player.target)
            this.drawHovered(true);
    },
    drawCorpsePointer: function() {
        if (!this.Corpse || (this.Corpse.X === 0 && this.Corpse.Y === 0))
            return;
        var p = new Point(this.Corpse);
        var X = this.X - p.x;
        var Y = this.Y - p.y;
        var L = Math.hypot(X, Y);

        var l = Math.min(game.screen.width, game.screen.height)/3;
        if (L > l) {
            p.x = this.X - X*l/L;
            p.y = this.Y - Y*l/L;
        }
        p.toScreen();

        var r = 14;
        game.ctx.fillStyle = "#000";
        game.ctx.beginPath();
        game.ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        game.ctx.fill();
        p.x -= Character.skull.width - r;
        p.y -= Character.skull.height - r;
        Character.skull.draw(p);
    },
    drawEffects: function() {
        var p = this.getDrawPoint();
        var sp = this.screen();

        for (var name in this.Effects) {
            name = name.toLowerCase();
            var sprite = Character.effectSprites[name];
            if (!sprite)
                continue;
            p.x = sp.x - sprite.width/2;
            sprite.draw(p);
            sprite.animate(); //TODO: should be animated per character basis;
        }
    },
    drawAura: function() {
        if (config.ui.showAttackRadius && this.sprite.name == "attack")
            this.drawAttackRadius();
    },
    drawUI: function() {
        if (!game.player.see(this))
            return;

        var marker = this.getQuestMarker();
        if (marker)
            this.drawQuestMarker(marker);

        if (game.debug.player.box || game.controller.hideStatic()) {
            this.drawBox();
        }

        //else drawn in controller
        if (this != game.controller.world.hovered && this != game.player.target) {
            this.drawName(undefined, !!marker);
        }

        this.info.forEach(function(info) {
            info.draw();
        });

        if(game.debug.player.position) {
            game.ctx.fillStyle = "#fff";
            var text = "(" + Math.floor(this.X) + " " + Math.floor(this.Y) + ")";
            var x = this.X - game.ctx.measureText(text).width / 2;
            game.drawStrokedText(text, x, this.Y);
        }

        this.drawCorpsePointer();
    },
    _qm: {
        x: 1, //quest marker current scale
        dx: 0.0033,
    },
    drawQuestMarker: function(marker) {
        this._qm.x += this._qm.dx;

        if (this._qm.x >= 1.1 || this._qm.x < 0.90) {
            this._qm.dx = -this._qm.dx;
        }
        // fix wrench
        if (this._qm.x == 1)
            this._qm.x += this._qm.dx;

        var width = marker.width * this._qm.x;
        var height = width * marker.height / marker.width;
        var p = this.screen();
        p.x -= width / 2;
        p.y -= this.sprite.nameOffset + height + cnf.FONT_SIZE;

        game.ctx.drawImage(marker, p.x, p.y, width, height);
    },
    getQuestMarker: function() {
        // has owner -> vendor -> no quests
        if (this.Owner)
            return null;
        // 1. yellow (?) -> has "ready" quest
        // 2. yellow (!) -> has "available" quest
        // 3. gray (?) -> has "active" quest

        var active = false;
        for (var name in game.player.ActiveQuests) {
            var questLog = game.player.ActiveQuests[name];
            var quest = questLog.Quest;
            if (quest.End != this.Name)
                continue;
            if (questLog.State == "ready")
                return game.questMarkers.ready;
            active = active || questLog.State == "active";
        }
        if (this.getAvailableQuests().length > 0)
            return game.questMarkers.available;
        if (active)
            return game.questMarkers.active;
        return null;
    },
    drawDst: function() {
        if (debug.player.path && this.Path) {
            var r = 2;
            game.ctx.fillStyle = "#f00";
            this.Path.forEach(function(p) {
                game.iso.fillRect(p.X-r, p.Y-r, 2*r, 2*r);
            });
        }
        if (this.dst.radius <= 0)
            return;
        var now = Date.now();
        if (this.dst.time + 33 > now) {
            game.ctx.strokeStyle = "#fff";
            game.ctx.beginPath();
            var p = new Point(this.dst.x, this.dst.y).toScreen();
            game.ctx.arc(p.x, p.y, this.dst.radius--, 0, Math.PI * 2);
            game.ctx.stroke();
            this.dst.time = now;
        }
    },
    drawBox: function() {
        var p = this.screen();
        game.ctx.strokeStyle = "cyan";
        game.iso.strokeRect(this.leftTopX(), this.leftTopY(), this.Width, this.Height);
        game.iso.strokeCircle(this.X, this.Y, this.Radius);

        // game.ctx.beginPath();
        // game.ctx.fillStyle = "black";
        // game.ctx.beginPath();
        // game.ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
        // game.ctx.fill();

        // game.ctx.fillStyle = "#fff";
        // game.ctx.beginPath();
        // game.ctx.arc(p.x, p.y, 2, 0, 2 * Math.PI);
        // game.ctx.fill();
    },
    getName: function() {
        var name = this.Name;
        if (this.Type == "vendor") {
            return (this.Owner) ? "$ " + name : T(name);
            // return TT("Vendor of {name}", {name: name});
        }
        if (this.IsNpc && name && this.Type != "vendor") {
            name = name.replace(/-\d+$/, "");
            if (name != this.Name)
                name = TS(name);
            else
                name = T(name);
        }

        if (this.Title)
            name = TT(this.Title, {name: name});

        if (this.Fame == 10000) {
            name = T("Lord") + " " + name;
        }
        return name;
    },
    drawName: function(drawHp, drawName) {
        var name = this.getName();

        if (game.controller.modifier.shift) {
            name += " | " + T("Lvl") + ": " + this.Lvl;
            name += " | " + ["♂", "♀"][this.Sex];
        }

        var p = this.screen();
        var y = p.y - this.sprite.nameOffset;
        var dy = cnf.FONT_SIZE * 0.5;

        if (this.isInteractive())
            drawHp = false;
        else
            drawHp = drawHp || ((!this.IsNpc || game.config.ui.npc) && game.config.ui.hp);

        drawName = drawName || ((!this.IsNpc || game.config.ui.npc) && game.config.ui.name);

        if (this.PvpExpires) {
            var pvpExpires = new Date(this.PvpExpires * 1000);
            var diff = pvpExpires - Date.now();
            // blink when less then 3 sec
            if (diff > 0 && (diff > 3e3 || diff % 1000 < 500)) {
                var pdy = Character.pvpFlag.height;
                if (drawHp)
                    pdy += dy;
                if (drawName)
                    pdy += dy;

                var pvpPoint = new Point(p.x, y);
                pvpPoint.x -= Character.pvpFlag.width/2;
                pvpPoint.y -= pdy*1.25;

                Character.pvpFlag.draw(pvpPoint);
            }
        }

        if (!drawHp && !drawName)
            return;

        var x = p.x - game.ctx.measureText(name).width / 2;

        if (drawHp) {
            var w = 64;
            var arena = ("Arena" in this.Effects) && ("Arena" in game.player.Effects);
            if (arena && this.Citizenship.Faction != game.player.Citizenship.Faction) {
                //full red rect
                game.ctx.fillStyle = '#000';
                var pad = 2;
                game.ctx.fillRect(p.x - w/2 - pad, y - pad, w + 2*pad, dy + 2*pad); //wtf
            }
            if (!config.ui.simpleFonts) {
                game.ctx.fillStyle = '#333';
                game.ctx.fillRect(p.x - w/2-1, y-1, w+2, dy+2); //wtf
            }

            //full red rect
            game.ctx.fillStyle = '#bd2323';
            game.ctx.fillRect(p.x - w/2, y, w, dy); //wtf

            //green hp
            game.ctx.fillStyle = '#3bac3b';
            game.ctx.fillRect(p.x - w/2, y, w * this.Hp.Current / this.Hp.Max, dy); //wtf

        } else {
            dy = 0;
        }
        if (drawName) {
            game.ctx.fillStyle = (this.Karma < 0 || this.Aggressive) ?
                "#f00" : ((this == game.player) ? "#ff0" : "#fff");
            game.drawStrokedText(name, x, y - dy / 2);
            if (this.Citizenship) {
                var flag = Character.flags[this.Citizenship.Faction];
                if (flag)
                    flag.draw({x: x - 20, y: y - dy/2  - 14});
            }
        }
    },
    idle: function() {
        return this.Dx === 0 && this.Dy === 0 && this.Action.Name === '';
    },
    animate: function() {
        var simpleSprite = this.isSimpleSprite();
        var animation = "idle";
        var self = (this.mount) ? this.mount : this;
        var position = self.sprite.position;

        if (self.sprite.angle == Math.PI/2 && position > 4) {
            position = (position / 2)<<0;
        }

        if (this.sprite.angle === 0) {
            position = 0; //omsk hack
        } else if (self.Dx || self.Dy) {
            animation = "run";
            var sector = self.sprite.angle;
            var sectors = 2*Math.PI / sector;
            var angle = Math.atan2(-self.Dy, self.Dx);
            var index = Math.round(angle / sector);
            index += sectors + 1;
            index %= sectors;
            var multiple = sector / this.sprite.angle;
            position = Math.floor(index) * multiple;
        } else if (!simpleSprite) {
            var sitting = this.Effects.Sitting;
            if (sitting) {
                animation = "sit";
                var seat = Entity.get(sitting.SeatId);
                if (seat) {
                    switch (seat.Orientation) {
                    case "w":
                        position = 1; break;
                    case "s":
                        position = 3; break;
                    case "e":
                        position = 5; break;
                    case "n":
                        position = 7; break;
                    }
                }
            } else {
                switch (this.Action.Name) {
                case "attack":
                case "dig":
                    animation = this.Action.Name;
                    break;
                case "defecate":
                case "":
                    animation = "idle";
                    break;
                default:
                    animation = (this.IsNpc) ? "attack" : "craft";
                }
            }
        }

        if (this.mount)
            animation = "sit";
        this.sprite = this.sprites[animation];
        this.sprite.position = position;

        if (!this.sprite.ready) {
            this.loadSprite();
            return;
        }

        var now = Date.now();
        var speed = (this.Speed && this.Speed.Current || 100);

        if (animation == "run")
            speed *= this.speedFactor;

        if(now - this.sprite.lastUpdate > (this.sprite.speed / speed)) {
            this.sprite.frame++;
            this.sprite.lastUpdate = now;
        }

        var start = 0, end = 0;
        if (simpleSprite) {
            var current = this.sprite.frames[animation];
            if (Array.isArray(current)) {
                start = current[0];
                end = current[1];
            } else {
                for (var i in this.sprite.frames) {
                    if (animation == i) {
                        end = start + this.sprite.frames[i];
                        break;
                    }
                    start += this.sprite.frames[i];
                }
            }
        } else {
            start = 0
            end = this.sprite.image.width / this.sprite.width;
        }

        if (this.sprite.frame < start || this.sprite.frame >= end) {
            this.sprite.frame = start;
            if (this.Type == "desu")
                this.sprite.lastUpdate = now + util.rand(5, 60) * 60;
        }
    },
    drawAttackRadius: function() {
        var p = new Point(this);
        var sector = (this.sprite.position - 1);
        var offset = new Point(cnf.CELL_SIZE, 0).rotate(2*Math.PI - sector * Math.PI/4);
        p.add(offset);
        game.ctx.fillStyle = (this.isPlayer) ? "rgba(255, 255, 255, 0.4)" : "rgba(255, 0, 0, 0.2)";
        game.iso.fillCircle(p.x, p.y, cnf.CELL_SIZE);
    },
    toggleActionSound: function() {
        if (this.action.name)
            game.sound.stopSound(this.action.name);

        this.action.name = this.Action.Name;

        if (!this.Action.Duration)
            return;

        if (this.action.name in game.sound.sounds)
            game.sound.playSound(this.action.name, 0);
    },
    update: function(k) {
        this.animate();
        if ("Plague" in this.Effects) {
            this.playAnimation({
                up: {
                    name: "plague",
                    width: 64,
                    height: 64,
                    dy: -16,
                    speed: 177,
                }
            });
        }
        if (this.Action) {
            this.updateActionAnimation();
            if (this.Action.Started != this.action.last) {
                this.action.progress = 0;
                this.action.last = this.Action.Started;
                this.toggleActionSound();
                if (this.isPlayer) {
                    dom.show(game.controller.actionProgress);
                    game.controller.actionButton.startProgress();
                }
            }
            if (this.Action.Duration) {
                this.action.progress += (1 / this.Action.Duration * 1000 * k);
            } else {
                if (this.isPlayer) {
                    dom.hide(game.controller.actionProgress);
                    game.controller.actionButton.stopProgress();
                }
                this.action.progress = 0;
            }
        }
        if (this.Mount) {
            if (!this.mount) {
                this.mount = Entity.get(this.Mount);
                if (this.mount)
                    this.mount.rider = this;
            }
            this.Y = this.mount.Y+1;
        } else {
            if (this.mount) {
                this.mount.rider = null;
                this.mount = null;
            }
            this.updatePosition(k);
        }

        if (this.isPlayer) {
            // clear target if one is disappeared
            if (this.target && !game.entities.has(this.target.Id))
                this.setTarget(null);

            this.updateBuilding();
            this.updateCamera();
            this.updateBar();
        }

        this.info.map(function(info) {
            info.update(k);
        });

        if (this.ballon) {
            this.ballon.update();
        }

    },
    updateBuilding: function() {
        var n = false, w = false, s = false,  e = false;
        var x = this.X;
        var y = this.Y;

        game.entities.forEach(function(b) {
            if (b.Group == "wall" || b.Group == "gate") {
                n = n || (b.Y < y && Math.abs(b.X - x) < b.Width);
                w = w || (b.X < x && Math.abs(b.Y - y) < b.Height);
                s = s || (b.Y > y && Math.abs(b.X - x) < b.Width);
                e = e || (b.X > x && Math.abs(b.Y - y) < b.Height);
            }
        });

        this.inBuilding = (n && w && s && e);
    },
    equipSlot: function(name) {
        return this.Equip[Character.equipSlots.indexOf(name)];
    },
    updateBar: function() {
        ["Hp", "Fullness", "Stamina"].map(function(name) {
            var strip = document.getElementById(util.lcfirst(name));
            var param = this[name];
            var value = Math.round(param.Current / param.Max * 100);
            strip.firstChild.style.width = Math.min(100, value) + '%';
            strip.title = name +
                ": " + util.toFixed(this[name].Current) +
                " / " + util.toFixed(this[name].Max);
            strip.lastChild.style.width = Math.max(0, value - 100) + '%';
        }.bind(this));

        if (!this.updateActionButton("right-hand") && !this.updateActionButton("left-hand"))
            game.controller.actionButton.reset();
    },
    updateActionButton: function(equipSlotName) {
        var action = "";
        if (this.burden) {
            action = "drop";
        } else {
            var tool = Entity.get(this.equipSlot(equipSlotName));
            if (tool) {
                action = tool.Group;
            }
        }

        var button = game.controller.actionButton;
        if (button.action == action)
            return true;

        var callback = null;

        switch (action) {
        case "drop":
            callback = this.liftStop.bind(this);
            break;
        case "shovel":
        case "pickaxe":
        case "tool":
        case "taming":
        case "dildo":
        case "snowball":
        case "shit":
        case "fishing-rod":
            callback = function() {
                var done = null;
                var cmd = "dig";
                switch (action) {
                case "dildo":
                case "snowball":
                case "shit":
                    game.controller.cursor.set(
                        tool,
                        game.controller.mouse.x,
                        game.controller.mouse.y
                    );
                    return;
                case "taming":
                    cmd = "tame";
                    break;
                case "tool":
                    cmd = "use-tool";
                    break;
                case "fishing-rod":
                    cmd = "fish";
                    done = this.fish.bind(this);
                    break;
                default:
                    var align = {X: cnf.CELL_SIZE, Y: cnf.CELL_SIZE};
                }
                var cursor = new Entity(tool.Type);
                cursor.initSprite();
                var icon = tool._icon || tool.icon();
                cursor.Width = cnf.CELL_SIZE;
                cursor.Height = cnf.CELL_SIZE;
                cursor.Sprite.Dx = 6;
                cursor.Sprite.Dy = 56;
                cursor.sprite.image = icon;
                cursor.sprite.width = icon.width;
                cursor.sprite.height = icon.height;
                game.controller.creatingCursor(cursor, cmd, done);
            }.bind(this);
            break;
        default:
            return false;
        }

        button.setAction(action, callback);
        return true;
    },
    fish: function fish(data) {
        var repeat = fish.bind(this);
        var panel = game.panels.fishing
        if (!panel) {
            var rating = document.createElement("div");
            rating.className = "rating";
            var buttons = document.createElement("div");
            buttons.id = "fishing-buttons";
            var actions = [">", ">>", ">>>", "<", "<<", "<<<"];
            actions.forEach(function(action, index) {
                var button = document.createElement("button");
                button.textContent = T(action);
                button.move = index;
                button.style.width = "100px";
                button.disabled = true;
                button.onclick = function() {
                    game.network.send("fishing-move", {move: this.move});
                    dom.forEach("#fishing-buttons > button", function() {
                        this.disabled = true;
                    });
                };
                buttons.appendChild(button);
            });
            var playerMeter = document.createElement("meter");
            playerMeter.max = 300;
            playerMeter.style.width = "100%";
            playerMeter.title = T("Player");

            var fishMeter = document.createElement("meter");
            fishMeter.max = 300;
            fishMeter.style.width = "100%";
            fishMeter.title = T("Fish");

            panel = new Panel("fishing", "Fishing", [rating, playerMeter, fishMeter, buttons]);
            panel.player = playerMeter;
            panel.fish = fishMeter;
            panel.rating = rating;
            panel.buttons = buttons;
        }
        if ("Rating" in data) {
            panel.player.value = +data.Player || 0;
            panel.fish.value = +data.Fish || 0;
            panel.rating.textContent = T(data.Rating);
        }
        if (data.Ok == "fishing-finished") {
            dom.forEach("#fishing-buttons > button", function() {
                this.disabled = true;
            });
            panel.hide();
            return null;
        }
        dom.forEach("#fishing-buttons > button", function() {
            this.disabled = false;
        });
        panel.show();
        return repeat;
    },
    updateEffect: function(name, effect) {
        var id = "effect-" + name;
        var efdiv = document.getElementById(id);
        var hash = JSON.stringify(effect);
        if (efdiv) {
            if (efdiv.hash == hash)
                return;

            dom.clear(efdiv);
            clearInterval(efdiv.interval);
        } else {
            efdiv = document.createElement("div");
            efdiv.id = id;
        }

        efdiv.hash = hash;

        var duration = effect.Duration / 1e6;
        if (duration > 0) {
            var progress = document.createElement("div");
            var last = new Date(duration - (Date.now() - effect.Added*1000));

            progress.className = "effect-progress";
            progress.style.width = "100%";
            efdiv.appendChild(progress);

            var tick = 66;
            efdiv.interval = setInterval(function() {
                last = new Date(last.getTime() - tick);
                var hours = last.getUTCHours();
                var mins = last.getUTCMinutes();
                var secs = last.getUTCSeconds();
                efdiv.title = sprintf("%s: %02d:%02d:%02d\n", T("Duration"), hours, mins, secs);
                progress.style.width = 100 / (duration / last) + "%";
                if (last <= 0) {
                    clearInterval(efdiv.interval);
                }
            }, tick);
        }

        var title = TS(name);
        var ename = dom.div("effect-name", {text: title});
        if (effect.Stacks > 1)
            ename.textContent += " x" + effect.Stacks;

        efdiv.className  = "effect " + EffectDesc.className(name);
        efdiv.name = name;
        efdiv.onclick = function() {
            var panel = new Panel("effect-description", title, [new EffectDesc(name)]);
            panel.show();
        };
        efdiv.appendChild(ename);

        var effects = document.getElementById("effects");
        effects.appendChild(efdiv);
        this.shownEffects[name] = efdiv;
    },
    removeEffect: function(name) {
        dom.remove(this.shownEffects[name]);
        delete this.shownEffects[name];
    },
    updateEffects: function() {
        var name
        for(name in this.shownEffects) {
            if (!this.Effects[name]) {
                this.removeEffect(name);
            }
        }

        for (name in this.Effects) {
            this.updateEffect(name, this.Effects[name]);
        }
    },
    updatePosition: function(k) {
        if (this.Dx === 0 && this.Dy === 0) {
            return;
        }
        k *= this.Speed.Current;
        var x = this.x;
        var y = this.y;
        var dx = this.Dx * k;
        var new_x = x + dx;

        var dy = this.Dy * k;
        var new_y = y + dy;

        var cell = game.map.getCell(new_x, new_y);
        if (cell) {
            if (cell.biom.Blocked) {
                this.stop();
                return;
            }
            this.speedFactor = cell.biom.Speed;
            dx *= this.speedFactor;
            dy *= this.speedFactor;
            new_x = x + dx;
            new_y = y + dy;
        }

        var dst = this.Dst;

        if (Math.abs(dst.X - x) < Math.abs(dx)) {
            new_x = dst.X;
        } else if (new_x < this.Radius) {
            new_x = this.Radius;
        } else if (new_x > game.map.full.width - this.Radius) {
            new_x = game.map.full.width - this.Radius;
        }

        if (Math.abs(dst.Y - y) < Math.abs(dy)) {
            new_y = dst.Y;
        } else if (new_y < this.Radius) {
            new_y = this.Radius;
        } else if (new_y > game.map.full.height - this.Radius) {
            new_y = game.map.full.height - this.Radius;
        }

        if (this.willCollide(new_x, new_y)) {
            this.stop();
            return;
        }

        game.sortedEntities.remove(this);
        this.x = new_x;
        this.y = new_y;
        game.sortedEntities.add(this);

        if (this.x == dst.X && this.y == dst.Y) {
            if (!this.followPath())
                this.stop();
        }

        if (this.rider) {
            this.rider.X = this.x;
            this.rider.Y = this.y+1;
            this.rider.updateBurden();
        }


        if (this.isPlayer) {
            game.controller.updateVisibility();
            game.controller.minimap.update();
        }

        this.updateBurden();
        this.updatePlow();

    },
    followPath: function() {
        if (this.Path && this.Path.length > 0) {
            var p = this.Path.pop();
            this._setDst(p.X, p.Y);
            return true;
        }
        return false;
    },
    updateBurden: function() {
        if (this.burden) {
            this.burden.setPoint(this);
        }
    },
    updatePlow: function() {
        if (!this.plow)
            return;
        var p = new Point(this);
        var sector = (this.sprite.position - 1);
        // y = 1 used to fix rendering order
        var offset = new Point(this.plow.Radius, 1).rotate(2*Math.PI - sector * Math.PI/4);
        p.add(offset);
        this.plow.setPoint(p);
        this.plow.sprite.position = this.sprite.position;

        if (this.Dx || this.Dy)
            this.plow.sprite.animate();
    },
    pickUp: function() {
        var self = this;
        var list = game.findItemsNear(this.X, this.Y).filter(function(e) {
            return e.MoveType == Entity.MT_PORTABLE;
        }).sort(function(a, b) {
            return a.distanceTo(self) - b.distanceTo(self);
        });
        if (list.length > 0)
            list[0].pickUp();
    },
    liftStart: function() {
        var self = this;
        var list = game.findItemsNear(this.X, this.Y).filter(function(e) {
            return e.MoveType == Entity.MT_LIFTABLE;
        }).sort(function(a, b) {
            return a.distanceTo(self) - b.distanceTo(self);
        });
        if (list.length > 0)
            list[0].lift();
    },
    liftStop: function() {
        if (this.burden)
            game.controller.creatingCursor(this.burden, "lift-stop");
    },

    updateCamera: function() {
        var camera = game.camera;
        var screen = game.screen;
        var p = this.screen();
        camera.x = (p.x - screen.width / 2) << 0;
        camera.y = (p.y - screen.height / 2) << 0;
    },
    willCollide: function(new_x, new_y) {
        return false; //TODO: fix StandUp problems
        /* XXX
        return game.entities.some(function(e) {
            return (e instanceof Entity && e.collides(new_x, new_y, this.Radius));
        }.bind(this));
        */
    },
    stop: function() {
        this.Dx = 0;
        this.Dy = 0;
    },
    isNear: function(entity) {
        if (entity.belongsTo(game.player))
            return true;
        if (entity.Width) {
            var padding = this.Radius*2;
            return util.rectIntersects(
                entity.leftTopX() - padding,
                entity.leftTopY() - padding,
                entity.Width + padding * 2,
                entity.Height + padding * 2,
                this.leftTopX(),
                this.leftTopY(),
                this.Width,
                this.Height
            );
        }
        var len_x = entity.X - this.X;
        var len_y = entity.Y - this.Y;
        var r = 2*this.Radius + Math.max(entity.Radius, Math.min(entity.Width, entity.Height) / 2) + 1;

        return util.distanceLessThan(len_x, len_y, r);
    },
    drawHovered: function(nameOnly) {
        if (this.Invisible)
            return;

        if (!nameOnly)
            this.sprite.drawOutline(this.getDrawPoint());

        if (this == game.player.target)
            game.setFontSize(20);

        this.drawName(true, true);

        if (this == game.player.target)
            game.setFontSize(0);
    },
    intersects: Entity.prototype.intersects,
    canIntersect: function() {
        return this.sprite.outline !== null && (config.ui.allowSelfSelection || this != game.player);
    },
    bag: function() {
        return Entity.get(this.Equip[0]);
    },
    hasItems: function(items) {
        var found = {};
        var bag = this.bag();
        if (!bag)
            return false;
        var equals = function(items, foundItems) {
            for(var item in items) {
                if (!foundItems || foundItems[item] < items[item])
                    return false;
            }
            return true;
        };

        for(var item in items)
            found[item] = 0;

        for(var i = 0, l = bag.Props.Slots.length; i < l; i++) {
            var eid = bag.Props.Slots[i];
            if (!eid)
                continue;
            var entity = Entity.get(eid);
            if (!entity) {
                game.sendErrorf("hasItems: cannot find %d", eid);
                continue;
            }
            if (items[entity.Group]) {
                found[entity.Group]++;
                if (equals(items, found))
                    return true;
            }
        }
        return false;
    },
    equippedWith: function(group) {
        return this.Equip.filter(function(eid) {
            return (eid !== 0);
        }).map(function(eid) {
            return Entity.get(eid);
        }).filter(function(item) {
            return (item.Group == group);
        }).length;
    },
    icon: function() {
        if (!this._icon)
            this._icon = this.sprite.icon();
        return this._icon;
    },
    getParts: function() {
        var parts = [];
        Character.clothes.forEach(function(type, i) {
            if (type == "head" && this.Style && this.Style.HideHelmet)
                return;
            var name = this.Clothes[i];
            if (name && name != "naked")
                parts.push({type: type, name: name});
        }.bind(this));

        if (this.Style && this.Style.Hair) {
            var hairStyle = this.Style.Hair.split("#");
            var hair = {
                type: "hair",
                name: hairStyle[0],
                color: hairStyle[1],
                opacity: hairStyle[2],
            };
            parts.unshift(hair);
        }
        return parts;
    },
    interact: function() {
        var self = this;
        game.player.interactTarget = this;
        game.network.send("follow", {Id: this.Id}, function interact() {
            // TODO: remove margo hack
            if (self.Type == "vendor" && self.Owner !== 0 && self.Name != "Margo") {
                game.controller.vendor.open(self);
                return;
            }

            var actions = ["Talk"];

            if (self.getQuests().length > 0)
                actions.push("Quest");

            actions = actions.concat(Object.keys(self.getTalks().actions));

            var panel = new Panel(
                "interraction",
                self.Name,
                actions.map(function(title) {
                    var cls = (title == "Quest") ? "quest-button" : "";
                    return dom.button(T(title), cls, function() {
                        panel.close();
                        Character.npcActions[title].call(self);
                    });
                })
            );
            panel.entity = self;
            panel.show();
        });
    },
    getTalks: function() {
        var type = this.Type;
        // TODO: remove fix after server update
        switch (this.Name) {
        case "Shot":
        case "Bruno":
        case "Bertran":
        case "Boris":
        case "Diego":
        case "Ahper":
        case "Cosmas":
        case "Scrooge":
            type = this.Name.toLowerCase();
            break;
        case "Margo":
        case "Umi":
            type = "margo";
            break;
        }
        var sex = game.player.sex();
        var faction = game.player.Citizenship.Faction.toLowerCase();
        return game.talks.get(type, faction, sex);
    },
    sex: function() {
        return Character.sex(this.Sex);
    },
    isInteractive: function() {
        switch (this.Name) {
        case "Shot":
        case "Margo":
        case "Umi":
        case "Bruno":
        case "Bertran":
        case "Boris":
        case "Charles":
        case "Diego":
        case "Ahper":
        case "Cosmas":
        case "Scrooge":
        case "Snegurochka":
        case "Ded Moroz":
            return true;
        default:
            return this.Type == "vendor";
        }
    },
    use: function(entity) {
        switch (entity.Group) {
        case "shit":
        case "snowball":
            game.network.send("throw", {Id: this.Id, Item: entity.Id});
            return true;
        case "dildo":
            game.network.send("fuck", {Id: this.Id});
            return true;
        }
        return false;
    },
    canUse: function(entity) {
        if (entity instanceof Character)
            return this.distanceTo(entity) < 2*cnf.CELL_SIZE;

        switch (entity.Group) {
        case "shit":
        case "dildo":
        case "snowball":
            return true;
        }

        switch (entity.Location) {
        case Entity.LOCATION_IN_CONTAINER:
            var cnt = entity.findRootContainer();
            return cnt && this.canUse(cnt);
        case Entity.LOCATION_EQUIPPED:
            return this.Id == entity.Owner;
        default:
            return this.isNear(entity);
        }
    },
    updateActionAnimation: function() {
        switch (this.Action.Name) {
        case "cast":
            this.playAnimation({
                down: {
                    name: "cast",
                    width: 100,
                    height: 60,
                }
            });
            break;
        }
    },
    // available anims: {up: {...}, down: {...}}
    playAnimation: function(anims) {
        for (var type in anims) {
            if (this.animation[type] === null)
                this.loadAnimation(type, anims[type]);
        }
    },
    loadAnimation: function(type, anim) {
        var sprt = new Sprite(
            "animations/" + anim.name + "-" + type + ".png",
            anim.width,
            anim.height,
            (anim.speed || 80)
        );
        if (anim.dy)
            sprt.dy = anim.dy;

        loader.ready(function() {
            this.animation[type] = sprt;
        }.bind(this));
    },
    distanceTo: function(e) {
        return Math.hypot(this.X - e.X, this.Y - e.Y);
    },
    selectNextTarget: function() {
        var self = this;
        var list = game.findCharsNear(this.X, this.Y, 5*cnf.CELL_SIZE).filter(function(c) {
            return c != self && c != self.target && c.IsNpc;
        }).sort(function(a, b) {
            return a.distanceTo(self) - b.distanceTo(self);
        });
        if (list.length > 0)
            this.setTarget(list[0]);
    },
    setTarget: function(target) {
        this.target = target;
        var cnt = game.controller.targetContainer;
        if (!target) {
            cnt.dataset.targetId = null;
            dom.hide(cnt);
            return;
        }

        if (cnt.dataset.targetId == target.Id)
            return;

        var name = document.createElement("div");
        name.id = "target-name";
        name.textContent = target.getName();

        cnt.dataset.targetId = target.Id;
        dom.clear(cnt);
        cnt.appendChild(target.sprite.icon());
        cnt.appendChild(name);
        dom.show(cnt);
    },
    getAvailableQuests: function() {
        return game.player.AvailableQuests[this.Name] || [];
    },
    getQuests: function() {
        var quests =  this.getAvailableQuests();
        for (var id in game.player.ActiveQuests) {
            var quest = game.player.ActiveQuests[id].Quest;
            if (quest.End == this.Name)
                quests.push(quest);
        }
        return quests;
    },
    updateActiveQuest: function() {
        var panel = game.panels.quest;
        if (!panel)
            return;
        panel.setContents(panel.quest.getContents());
    },
    onremove: function() {
    },
};
