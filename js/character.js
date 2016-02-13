var Sprite = require('./render/sprite.js')

// FIXME circular dependencies
var Entity = require('./entity.js')
var Panel = require('./panel.js')
var EffectDesc = require('./effects.js')

var Info = require('./info.js')
var util = require('./util.js')
var dom = require('./dom.js')
import {CELL_SIZE, FONT_SIZE, config, debug} from './config.js'
import {
    milk, mount, dismount,
    catchAnimal, setDst, fishingMove,
    follow, throwEntity, fuck
} from './network-protocol.js'

import {getTalks} from './ui/vendor/talks.js'
import {forEach, map} from 'fast.js'
import {imageToCanvas} from './render/'
import * as iso from './render/iso.js'

var CharacterData = require('./characterData.js')

import {Point} from './render'

module.exports = Character

window.Character = Character

function Character(id) {
    this.Id = id;
    this.name = '';
    this.x = 0;
    this.y = 0;

    this.Hp = null;
    this.Invisible = false;

    this.Title = '';
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
    this.Radius = CELL_SIZE / 4;
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
    forEach(Character.animations, (animation)=> {
        var s = new Sprite()
        s.name = animation
        this.sprites[animation] = s
    })
    this.sprite = this.sprites.idle;

    this._parts = '[]'; //defauls for npcs

}

Object.defineProperties(Character.prototype, {
    X: {
        get() { return this.x },
        set(x) {
            if (this.x == x) {
                return
            }
            if (this.Dx === 0 || this.Settings.Pathfinding || Math.abs(this.x - x) > CELL_SIZE) {
                game.sortedEntities.remove(this)
                this.x = x
                game.sortedEntities.add(this)
            }
        }
    },
    Y: {
        get() { return this.y },
        set(y) {
            if (this.y == y) {
                return
            }
            if (this.Dy === 0 || this.Settings.Pathfinding || Math.abs(this.y - y) > CELL_SIZE) {
                game.sortedEntities.remove(this)
                this.y = y
                game.sortedEntities.add(this)
            }
        }
    },

    Name: {
        get() { return this.name },
        set(name) { this.name = name },
    },
})

Character.prototype.getZ = function() { return 0; }

Character.prototype.leftTopX = Entity.prototype.leftTopX
Character.prototype.leftTopY = Entity.prototype.leftTopY
Character.prototype.compare = Entity.prototype.compare

Character.prototype.setPoint = function(p) {
    if (this.Id && this.inWorld()) {
        game.sortedEntities.remove(this);
    }

    this.x = p.x
    this.y = p.y

    if (this.Id && this.inWorld()) {
        game.sortedEntities.add(this)
    }
}
Character.prototype.screen = function() {
    var x, y
    if (this.mount) {
        x = this.mount.X
        y = this.mount.Y
    } else {
        x = this.X
        y = this.Y
    }
    return new Point(x, y).toScreen()
}
Character.prototype.sync = function(data, init) {
    Character.copy(this, data)

    this.burden = (this.Burden) ? Entity.get(this.Burden) : null
    this.plow = ('Plowing' in this.Effects) ? Entity.get(this.Effects.Plowing.Plow) : null

    this.syncMessages(this.Messages)
    this.syncMessages(this.PrivateMessages)

    if ('Path' in data) {
        this.followPath()
    }

    if (this.Name == 'Margo') {
        this.reloadSprite()
    } else if (!init && JSON.stringify(this.getParts()) != this._parts) {
        this.reloadSprite()
    }


    if (data.Dir !== undefined) {
        this.sprite.position = data.Dir
    }

    if ('AvailableQuests' in data) {
        this.updateActiveQuest()
    }
    if ('Party' in data) {
        this.updateParty(data.Party)
    }
}
Character.prototype.updateParty = function(members) {
    var party = game.controller.party
    dom.clear(party)
    if (!members) {
        return
    }

    members.forEach((name, i)=> {
        if (name == game.playerName) {
            return
        }
        var member = game.characters.get(name)
        var avatar
        if (member) {
            avatar = loader.loadImage(`avatars/${member.sex()}.png`)
        } else {
            avatar = dom.div('.character-avatar-not-available', {text: '?'})
            avatar.title = T('Out of sight')
            Character.partyLoadQueue[name] = true
        }

        var cnt = dom.div('.character-avatar-container')
        cnt.appendChild(avatar)
        var prefix = (i === 0 && party[0] != game.playerName) ? '★' : ''
        cnt.appendChild(dom.span(prefix + name, 'party-member-name'))
        cnt.onmousedown = (e)=> game.chat.nameMenu(e, name)
        party.appendChild(cnt)
    })
}
Character.prototype.syncMessages = function(messages) {
    while(messages && messages.length > 0) {
        var message = messages.shift();
        this.info.push(new Info(message, this));
    }
}
Character.prototype.reloadSprite = function() {
    for (var i in this.sprites) {
        this.sprites[i].ready = false;
    }
    this.loadSprite();
}
Character.prototype.init = function(data) {
    this.IsNpc = (data.Type != 'man')
    this.sync(data, true)
    this.loadSprite()
}
Character.prototype.isSimpleSprite = function() { //for migration; get rid of this shit
    switch (this.Type) {
    case 'cat':
    case 'dog':
    case 'horse':
    case 'cow':
    case 'small-spider':
    case 'spider':
    case 'wolf':
    case 'wolf-fatty':
    case 'wolf-hungry':
    case 'wolf-undead':
    case 'wolf-demonic':
    case 'chicken':
    case 'goose':
    case 'rabbit':
    case 'preved-medved':
    case 'medved':
    case 'sheep':
    case 'omsk':
    case 'omich':
    case 'kitty-pahan':
    case 'kitty-cutthroat':
    case 'kitty-robber':
    case 'kitty-junkie':
        return false
    default:
        return this.IsNpc
    }
}
function initCharacterSprite(sprite, type, radius) {
    sprite.speed = 14000
    sprite.offset = radius
    sprite.angle = Math.PI/4
    switch (type) {
    case 'cat':
        sprite.width = 90
        sprite.height = 90
        sprite.offset = 30
        break
    case 'dog':
        sprite.width = 100
        sprite.height = 100
        sprite.offset = 35
        break
    case 'kitty-pahan':
    case 'kitty-cutthroat':
    case 'kitty-robber':
    case 'kitty-junkie':
        sprite.width = 110
        sprite.height = 110
        sprite.offset = 30
        break
    case 'goose':
        sprite.width = 70
        sprite.height = 70
        sprite.speed = 7000
        break
    case 'chicken':
    case 'rabbit':
        sprite.width = 50
        sprite.height = 50
        sprite.speed = 7000
        break
    case 'butterfly':
    case 'zombie':
        sprite.width = 32
        sprite.height = 32
        sprite.angle = Math.PI/2
        sprite.frames = {
            'idle': 1,
            'run': [0, 3],
        }
        break
    case 'ultra-zombie':
        sprite.width = 96
        sprite.height = 96
        sprite.angle = Math.PI/2
        sprite.frames = {
            'idle': 1,
            'run': [0, 3],
        }
        break
    case 'jesus':
        sprite.width = 64
        sprite.height = 96
        sprite.frames = {
            'idle': 4,
            'run': 8,
        }
        break
    case 'diego':
    case 'charles':
        sprite.width = 73
        sprite.height = 88
        sprite.angle = Math.PI*2
        sprite.frames = {
            'idle': 1,
            'run': 0,
        }
        break
    case 'suiseiseki':
        sprite.width = 68
        sprite.height = 96
        sprite.angle = Math.PI*2
        sprite.frames = {
            'idle': 4,
            'run': 0,
        }
        break
    case 'abu':
        sprite.width = 128
        sprite.height = 128
        sprite.angle = Math.PI/2
        sprite.frames = {
            'idle': 1,
            'run': 3,
        }
        break
    case 'senior-mocherator':
        sprite.width = 80
        sprite.height = 80
        sprite.angle = Math.PI/2
        sprite.frames = {
            'idle': 1,
            'run': 3,
        }
        break
    case 'mocherator':
        sprite.width = 40
        sprite.height = 40
        sprite.angle = Math.PI/2
        sprite.frames = {
            'idle': 1,
            'run': 3,
        }
        break
    case 'omsk':
        sprite.width = 170
        sprite.height = 170
        break
    case 'omich':
        sprite.width = 130
        sprite.height = 130
        break
    case 'ufo':
        sprite.width = 64
        sprite.height = 64
        sprite.angle = Math.PI*2
        sprite.frames = {
            'idle': 3,
            'run': 0,
        }
        break
    case 'wyvern':
        sprite.width = 256
        sprite.height = 256
        sprite.frames = {
            'idle': 4,
            'run': 4,
        }
        sprite.speed = 20000
        break
    case 'imp':
        sprite.width = 107
        sprite.height = 68
        sprite.frames = {
            'idle': 3,
            'run': 4,
        }
        sprite.speed = 20000
        break
    case 'lesser-daemon':
        sprite.width = 160
        sprite.height = 102
        sprite.frames = {
            'idle': 3,
            'run': 4,
        }
        sprite.speed = 40000
        break
    case 'higher-daemon':
        sprite.width = 214
        sprite.height = 136
        sprite.frames = {
            'idle': 3,
            'run': 4,
        }
        sprite.speed = 50000
        break
    case 'daemon':
        sprite.width = 160
        sprite.height = 102
        sprite.frames = {
            'idle': 3,
            'run': 4,
        }
        sprite.speed = 50000
        break
    case 'red-hair':
        sprite.width = 64
        sprite.height = 96
        sprite.frames = {
            'idle': 1,
            'run': 3,
        }
        break
    case 'snegurochka':
    case 'ded-moroz':
        sprite.nameOffset = 100
        break
    case 'vendor':
    case 'cirno':
    case 'moroz':
    case 'boris':
    case 'bertran':
    case 'bruno':
    case 'scrooge':
    case 'ahper':
    case 'cosmas':
    case 'shot':
    case 'umi':
        sprite.nameOffset = 70
        break
    case 'small-spider':
        sprite.width = 64
        sprite.height = 64
        sprite.offset = 25
        sprite.speed = 21000
        break
    case 'spider':
        sprite.width = 128
        sprite.height = 128
        sprite.offset = 45
        sprite.speed = 31000
        break
    case 'horse':
    case 'medved':
        sprite.width = 150
        sprite.height = 150
        sprite.offset = 43
        break
    case 'preved-medved':
        sprite.width = 210
        sprite.height = 210
        sprite.offset = 44
        sprite.nameOffset = 150
        sprite.speed = 20000
        break
    case 'cow':
    case 'wolf':
    case 'wolf-undead':
    case 'wolf-demonic':
    case 'sheep':
        sprite.width = 100
        sprite.height = 100
        sprite.offset = 45
        break
    case 'wolf-fatty':
        sprite.width = 120
        sprite.height = 120
        break
    case 'wolf-hungry':
        sprite.width = 80
        sprite.height = 80
        break
    case 'tractor':
        sprite.width = 128
        sprite.height = 108
        break
    default:
        sprite.nameOffset = 72
        sprite.offset = 2*radius
        sprite.width = 96
        sprite.height = 96
        //sprite.speed = 7000
        sprite.speed = 14000
    }
    if (!sprite.nameOffset) {
        sprite.nameOffset = sprite.height
    }
}
Character.prototype.loadSprite = function() {
    var sprite = this.sprite
    if (sprite.loading) {
        return
    }

    initCharacterSprite(this.sprite, this.Type, this.Radius)

    if (this.IsNpc) {
        this.loadNpcSprite()
        return
    }

    sprite.loading = true

    var animation = sprite.name
    var dir = Character.spriteDir + this.Type + '/'
    var parts = this.getParts()
    this._parts = JSON.stringify(parts)

    forEach(parts, (part)=> {
        var path = `${dir}${animation}/${part.type}/${part.name}.png`
        part.image = loader.loadImage(path)
    })

    if (sprite.name == 'attack') {
        var weapon = Character.weaponSprites.sword;
        if (weapon)
            parts.push({image: weapon.image});
    }

    var name = this.Name;
    loader.ready(()=> {
        var canvas = document.createElement('canvas');
        var naked = Character.nakedSprites[animation];
        var ctx = imageToCanvas(naked.image, canvas)

        forEach(parts, (part, i)=> {
            var image = part.image;
            if (image && image.width > 0) {
                if (part.color && part.opacity) {
                    var worker = new Worker('js/tint.js');
                    var tmpCanvas = document.createElement('canvas');
                    var tmpCtx = imageToCanvas(image, tmpCanvas)
                    worker.onmessage = function(e) {
                        tmpCtx.putImageData(e.data, 0, 0)
                        ctx.drawImage(tmpCanvas, 0, 0)
                    }
                    worker.postMessage({
                        imageData: tmpCtx.getImageData(0, 0, image.width, image.height),
                        color: part.color,
                        opacity: part.opacity,
                    })

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
}
Character.prototype.loadNpcSprite = function() {
    var type = this.Type;

    // XXX this is hack
    switch (this.Name) {
    case 'Margo':
    case '$Margo':
        type = 'margo'
        break
    case '$Umi':
    case 'Umi':
        type = 'umi'
        break
    case '$Shot':
    case 'Shot':
        type = 'shot'
        break
    }

    switch (type) {
    case 'margo':
        var name = (this.Owner == game.player.Id) ? 'margo-' + util.rand(0, 1) : 'margo'
        this.sprite.load(Character.spriteDir + name + '.png')
        return
    default:
        if (!this.isSimpleSprite()) {
            this.sprite.load(Character.spriteDir + `${this.Type}/${this.sprite.name}.png`)
            return
        }
        if (type == 'vendor') {
            type = 'vendor-' + ([].reduce.call(this.Name,
                    (hash, c)=> hash + c.charCodeAt(0),
                0) % 3 + 1)
        }
    }
    this.sprite.load(Character.spriteDir + type + '.png');
}
Character.prototype.getActions = function() {
    var actions = {}
    switch (this.Type) {
    case 'cow':
        actions = {
            'Milk': function() {
                milk(this.id)
            }
        }
        break
    case 'rabbit':
    case 'chicken':
        actions = {
            'Catch': function() {
                catchAnimal(this.Id)
            }
        }
        break
    default:
        if (this.Riding) {
            actions = {
                'Mount': function() {
                    mount(this.Id)
                },
                'Dismount': function() {
                    dismount()
                },
            }
        }
    }

    var common = {
        Select: game.player.setTarget.bind(game.player, this)
    }

    if (game.player.IsAdmin) {
        common.Kill = function() {
            game.chat.send(`*kill ${this.Id}`)
        }
        common.ComeToMe = function() {
            game.chat.send(`*come-to-me ${this.Id}`)
        }
        if (this.Type == 'vendor') {
            common.RemoveVendor = function() {
                game.chat.send(`*remove-vendor ${this.Name}`)
            }
        }
    }

    if (this.isInteractive()) {
        common.Interact = this.interact
    }

    var list = [common, actions]
    if (this.IsNpc) {
        return list
    }
    return list.concat(game.chat.makeNameActions(this.Name))
}
Character.prototype.defaultAction = function(targetOnly) {
    if (this.isInteractive()) {
        this.interact();
    } else {
        // call action-Button on space
        //if (!targetOnly && this.isPlayer && game.controller.actionButton.active()) {
        if (!targetOnly && this.isPlayer && window.isActiveAciton()) {
            window.ui.$broadcast('actions.main')
        } else if (this != game.player) {
            var party = game.player.Party;
            if (party && party.indexOf(this.Name) == -1) {
                game.player.setTarget(this);
            }
        }
    }
}

Character.prototype.drawAction = function() {
    if(this.Action.Duration) {
        var progress = Math.min(this.action.progress, 1);
        if (this.isPlayer) {
            var ap = game.controller.actionProgress.firstChild;
            ap.style.width = progress * 100 + '%';
        }
        //else {
            var w = 64;
            var h = FONT_SIZE * 0.5;
            var p = this.screen();
            var x = p.x - w/2;
            var y = p.y - this.sprite.nameOffset + h + 1;
            h -= 2;

            var ctx = game.ctx

            if (!config.ui.simpleFonts) {
                ctx.fillStyle = '#333';
                ctx.fillRect(x-1, y-1, w+2, h+2);
            }
            ctx.fillStyle = '#99682e';
            ctx.fillRect(x, y, w, h);

            ctx.fillStyle = '#cf9d62';
            ctx.fillRect(x, y, progress * w, h);
        //}
    }
}
Character.prototype.see = function(character) {
    if (this == character) {
        return true
    }
    var p = this.getDrawPoint()
    var len_x = character.X - this.X
    var len_y = character.Y - this.Y
    return util.distanceLessThan(len_x, len_y, Math.hypot(game.screen.width, game.screen.height))
}
Character.prototype.setDst = function(x, y) {
    if (this.Speed.Current <= 0 || this.Disabled) {
        return
    }

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

    if (x == this.Dst.X && y == this.Dst.Y) {
        return
    }

    setDst(x, y)
    game.controller.resetAction();
    this.dst.x = x;
    this.dst.y = y;
    this.dst.radius = 9;
    this.dst.time = Date.now();

    if (!this.Settings.Pathfinding) {
        this._setDst(x, y)
    }
}
Character.prototype._setDst = function(x, y) {
    var len_x = x - this.X;
    var len_y = y - this.Y;
    var len  = Math.hypot(len_x, len_y);

    this.Dst.X = x;
    this.Dst.Y = y;

    this.Dx = len_x / len;
    this.Dy = len_y / len;
}
Character.prototype.getDrawPoint = function() {
    var p = this.screen();
    //var dy = (this.mount) ? this.mount.sprite.offset : 0;
    var dy = (this.mount) ? 1 : 0;
    return {
        p: p,
        x: Math.round(p.x - this.sprite.width / 2),
        y: Math.round(p.y - this.sprite.height + this.sprite.offset) - dy
    };
}
Character.prototype.draw = function() {
    if ('Sleeping' in this.Effects) {
        return
    }

    var p

    // this.drawDst();
    if (true) {
        if ((true || debug.player.path) && this.Path) {
            var r = 2;
            game.ctx.fillStyle = '#f00';
            forEach(this.Path, (p)=> {
                iso.fillRect(game.ctx, p.X-r, p.Y-r, 2*r, 2*r);
            })
        }
        if (this.dst.radius > 0) {
            var now = Date.now();
            if (this.dst.time + 33 > now) {
                game.ctx.strokeStyle = '#fff';
                game.ctx.beginPath();
                p = new Point(this.dst.x, this.dst.y).toScreen();
                game.ctx.arc(p.x, p.y, this.dst.radius--, 0, Math.PI * 2);
                game.ctx.stroke();
                this.dst.time = now;
            }
        }
    }

    if (!this.sprite.ready) {
        return
    }

    p = this.getDrawPoint();
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
    if (this.Invisible) {
        this.sprite.drawAlpha(p, 0.3);
    } else {
        this.sprite.draw(p);
    }

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

    //this.drawEffects();
    p = this.getDrawPoint();
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

    if (this != game.controller.world.hovered && this == game.player.target) {
        this.drawHovered(true);
    }
}
Character.prototype.drawUI = function() {
    var ctx = game.ctx

    var marker = this.getQuestMarker();
    if (marker) {
        var qm = this._qm
        qm.x += qm.dx;

        if (qm.x >= 1.1 || qm.x < 0.90) {
            qm.dx = -qm.dx;
        }
        // fix wrench
        if (qm.x == 1) {
            qm.x += qm.dx;
        }

        var width = marker.width * qm.x;
        var height = width * marker.height / marker.width;
        var scr = this.screen();
        scr.x -= width / 2;
        scr.y -= this.sprite.nameOffset + height + FONT_SIZE;

        ctx.drawImage(marker, scr.x, scr.y, width, height);
    }

    if (debug.player.box || game.controller.hideStatic()) {
        ctx.strokeStyle = 'cyan';
        iso.strokeRect(ctx, this.leftTopX(), this.leftTopY(), this.Width, this.Height);
        iso.strokeCircle(ctx, this.X, this.Y, this.Radius);

        // var scr = this.screen();
        // ctx.beginPath();
        // ctx.fillStyle = 'black';
        // ctx.beginPath();
        // ctx.arc(scr.x, scr.y, 5, 0, 2 * Math.PI);
        // ctx.fill();

        // ctx.fillStyle = '#fff';
        // ctx.beginPath();
        // ctx.arc(scr.x, scr.y, 2, 0, 2 * Math.PI);
        // ctx.fill();
    }

    //else drawn in controller
    if (this != game.controller.world.hovered && this != game.player.target) {
        this.drawName(undefined, !!marker);
    }

    forEach(this.info, (info)=> { info.draw() })

    if(debug.player.position) {
        ctx.fillStyle = '#fff';
        var text = `(${Math.floor(this.X)} ${Math.floor(this.Y)})`;
        var x = this.X - ctx.measureText(text).width / 2;
        game.drawStrokedText(text, x, this.Y);
    }

    //this.drawCorpsePointer();
    if (!this.Corpse || (this.Corpse.X === 0 && this.Corpse.Y === 0)) {
        return
    }
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
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    p.x -= Character.skull.width - r;
    p.y -= Character.skull.height - r;
    Character.skull.draw(p);
}

Character.prototype._qm = {
    x: 1, //quest marker current scale
    dx: 0.0033,
}

Character.prototype.getQuestMarker = function() {
    // has owner -> vendor -> no quests
    if (this.Owner) {
        return null
    }

    // 1. yellow (?) -> has 'ready' quest
    // 2. yellow (!) -> has 'available' quest
    // 3. gray (?) -> has 'active' quest

    var active = false;
    for (var name in game.player.ActiveQuests) {
        var questLog = game.player.ActiveQuests[name];
        var quest = questLog.Quest;
        if (quest.End != this.Type) {
            continue
        }
        if (questLog.State == 'ready') {
            return game.questMarkers.ready;
        }
        active = active || questLog.State == 'active';
    }
    if (this.getAvailableQuests().length > 0) {
        return game.questMarkers.available;
    }
    if (active) {
        return game.questMarkers.active;
    }
    return null;
}
Character.prototype.getName = function() {
    var name = this.Name
    if (this.Type == 'vendor') {
        return (this.Owner) ? name : T(name)
        // return TT('Vendor of {name}', {name: name})
    }
    if (this.IsNpc) {
        return TS(this.Name)
    }
    if (this.Title) {
        name = TT(this.Title, {name: name})
    }
    if (this.Fame == 10000) {
        name = `${T('Lord')} ${name}`
    }
    return name
}
Character.prototype.drawName = function(drawHp, drawName) {
    var name = this.getName();

    if (game.controller.modifier.shift) {
        name += ` | ${T('Lvl')}: ${this.Lvl} | ${['♂', '♀'][this.Sex]}`
    }

    var p = this.screen();
    var y = p.y - this.sprite.nameOffset;
    var dy = FONT_SIZE * 0.5;

    if (this.isInteractive()) {
        drawHp = false
    } else {
        drawHp = drawHp || ((!this.IsNpc || config.ui.npc) && config.ui.hp)
    }

    drawName = drawName || ((!this.IsNpc || config.ui.npc) && config.ui.name)

    if (this.PvpExpires) {
        var pvpExpires = new Date(this.PvpExpires * 1000);
        var diff = pvpExpires - Date.now();
        // blink when less then 3 sec
        if (diff > 0 && (diff > 3e3 || diff % 1000 < 500)) {
            var pdy = Character.pvpFlag.height;
            if (drawHp) {
                pdy += dy;
            }
            if (drawName) {
                pdy += dy;
            }

            var pvpPoint = new Point(p.x, y);
            pvpPoint.x -= Character.pvpFlag.width/2;
            pvpPoint.y -= pdy*1.25;

            Character.pvpFlag.draw(pvpPoint);
        }
    }

    if (!drawHp && !drawName)
        return;

    var ctx = game.ctx
    var x = p.x - ctx.measureText(name).width / 2;

    if (drawHp) {
        var w = 64;
        var arena = ('Arena' in this.Effects) && ('Arena' in game.player.Effects);
        if (arena && this.Citizenship.Faction != game.player.Citizenship.Faction) {
            //full red rect
            ctx.fillStyle = '#000';
            var pad = 2;
            ctx.fillRect(p.x - w/2 - pad, y - pad, w + 2*pad, dy + 2*pad); //wtf
        }
        if (!config.ui.simpleFonts) {
            ctx.fillStyle = '#333';
            ctx.fillRect(p.x - w/2-1, y-1, w+2, dy+2); //wtf
        }

        //full red rect
        ctx.fillStyle = '#bd2323';
        ctx.fillRect(p.x - w/2, y, w, dy); //wtf

        //green hp
        ctx.fillStyle = '#3bac3b';
        ctx.fillRect(p.x - w/2, y, w * this.Hp.Current / this.Hp.Max, dy); //wtf

    } else {
        dy = 0;
    }
    if (drawName) {
        ctx.fillStyle = (this.Karma < 0 || this.Aggressive) ?
            '#f00' : ((this == game.player) ? '#ff0' : '#fff');
        game.drawStrokedText(name, x, y - dy / 2);
        var flag = this.flag()
        if (flag) {
            flag.draw({x: x - 20, y: y - dy/2  - 14});
        }
    }
}
Character.prototype.flag = function() {
    if (this.Team)
        return Character.flags[this.Team];
    if (this.Citizenship)
        return Character.flags[this.Citizenship.Faction];
    return null;
}
Character.prototype.idle = function() {
    return this.Dx === 0 && this.Dy === 0 && this.Action.Name === '';
}
Character.prototype.animate = function() {
    var simpleSprite = this.isSimpleSprite();
    var animation = 'idle';
    var self = (this.mount) ? this.mount : this;
    var position = self.sprite.position;

    if (self.sprite.angle == Math.PI/2 && position > 4) {
        position = (position / 2)<<0;
    }

    if (this.sprite.angle === 0) {
        position = 0; //omsk hack
    } else if (self.Dx || self.Dy) {
        animation = 'run';
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
            animation = 'sit';
            var seat = Entity.get(sitting.SeatId);
            if (seat) {
                switch (seat.Orientation) {
                case 'w':
                    position = 1; break;
                case 's':
                    position = 3; break;
                case 'e':
                    position = 5; break;
                case 'n':
                    position = 7; break;
                }
            }
        } else {
            switch (this.Action.Name) {
            case 'attack':
            case 'dig':
                animation = this.Action.Name;
                break;
            case 'defecate':
            case '':
                animation = 'idle';
                break;
            default:
                animation = (this.IsNpc) ? 'attack' : 'craft';
            }
        }
    }

    if (this.mount) {
        animation = 'ride';
    }
    this.sprite = this.sprites[animation];
    this.sprite.position = position;

    if (!this.sprite.ready) {
        this.loadSprite();
        return;
    }

    var now = Date.now();
    var speed = (this.Speed && this.Speed.Current || 100);

    if (animation == 'run')
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
        if (this.Type == 'desu')
            this.sprite.lastUpdate = now + util.rand(5, 60) * 60;
    }
}
Character.prototype.toggleActionSound = function() {
    if (this.action.name)
        game.sound.stopSound(this.action.name);

    this.action.name = this.Action.Name;

    if (!this.Action.Duration)
        return;

    if (this.action.name in game.sound.sounds)
        game.sound.playSound(this.action.name, 0);
}
Character.prototype.update = function(k) {
    this.animate();
    if ('Plague' in this.Effects) {
        this.playAnimation({
            up: {
                name: 'plague',
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
                window.ui.$broadcast('actions.startProgress')
            }
        }
        if (this.Action.Duration) {
            this.action.progress += (1 / this.Action.Duration * 1000 * k);
        } else {
            if (this.isPlayer) {
                dom.hide(game.controller.actionProgress);
                window.ui.$broadcast('actions.stopProgress')
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
        if (this.target && !game.entities.has(this.target.Id)) {
            this.setTarget(null)
        }

        this.updateBuilding()
        this.updateCamera()
        this.updateBar()
    }

    this.info.map((info)=> { info.update(k) })

    if (this.ballon) {
        this.ballon.update()
    }
}

var abs = Math.abs
Character.prototype.updateBuilding = function() {
    var n = false, w = false, s = false,  e = false;
    var x = this.x
    var y = this.y

    game.entities.forEach((b)=> {
        if (b.Group == 'wall' || b.Group == 'gate') {
            n = n || (b.y < y && abs(b.x - x) < b.Width)
            w = w || (b.x < x && abs(b.y - y) < b.Height)
            s = s || (b.y > y && abs(b.x - x) < b.Width)
            e = e || (b.x > x && abs(b.y - y) < b.Height)
        }
    })

    this.inBuilding = (n && w && s && e)
}
Character.prototype.equipSlot = function(name) {
    return this.Equip[CharacterData.equipSlots.indexOf(name)];
}
Character.prototype.updateBar = function() {
    map(['Hp', 'Fullness', 'Stamina'], (name)=> {
        var strip = document.getElementById(util.lcfirst(name));
        var param = this[name];
        var value = Math.round(param.Current / param.Max * 100);
        strip.firstChild.style.width = Math.min(100, value) + '%';
        strip.title = name +
            ': ' + util.toFixed(this[name].Current) +
            ' / ' + util.toFixed(this[name].Max);
        strip.lastChild.style.width = Math.max(0, value - 100) + '%';
    });

    if (!this.updateActionButton('right-hand') && !this.updateActionButton('left-hand')) {
        window.ui.$broadcast('actions.reset')
    }
}
Character.prototype.updateActionButton = function(equipSlotName) {
    var action = '';
    if (this.burden) {
        action = 'drop';
    } else {
        var tool = Entity.get(this.equipSlot(equipSlotName));
        if (tool) {
            action = tool.Group;
        }
    }

    if (window.currentAction() == action) {
        return true
    }

    var callback = null;

    switch (action) {
    case 'drop':
        callback = this.liftStop.bind(this)
        break;
    case 'shovel':
    case 'pickaxe':
    case 'tool':
    case 'taming':
    case 'dildo':
    case 'snowball':
    case 'shit':
    case 'fishing-rod':
        callback = ()=> {
            var done = null;
            var cmd = 'dig';
            switch (action) {
            case 'dildo':
            case 'snowball':
            case 'shit':
                game.controller.cursor.set(
                    tool,
                    game.controller.mouse.x,
                    game.controller.mouse.y
                );
                return;
            case 'taming':
                cmd = 'tame';
                break;
            case 'tool':
                cmd = 'use-tool';
                break;
            case 'fishing-rod':
                cmd = 'fish';
                done = this.fish.bind(this);
                break;
            default:
                var align = {X: CELL_SIZE, Y: CELL_SIZE};
            }

            var cursor = new Entity(tool.Type);
            cursor.initSprite();
            var icon = tool._icon || tool.icon();
            cursor.Width = CELL_SIZE;
            cursor.Height = CELL_SIZE;
            cursor.Sprite.Dx = 6;
            cursor.Sprite.Dy = 56;
            cursor.sprite.image = icon;
            cursor.sprite.width = icon.width;
            cursor.sprite.height = icon.height;
            game.controller.creatingCursor(cursor, cmd, done);
        }
        break;
    default:
        return false;
    }

    window.ui.$broadcast('actions.setMainCallback', action, callback)

    return true;
}
Character.prototype.fish = function fish(data) {
    var panel = game.panels.fishing
    if (!panel) {
        var rating = document.createElement('div');
        rating.className = 'rating';
        var buttons = document.createElement('div');
        buttons.id = 'fishing-buttons';
        var actions = ['>', '>>', '>>>', '<', '<<', '<<<'];
        forEach(actions, (action, index)=> {
            var button = document.createElement('button');
            button.textContent = T(action);
            button.move = index;
            button.style.width = '100px';
            button.disabled = true;
            button.onclick = function() {
                fishingMove(this.move)
                dom.forEach('#fishing-buttons > button', ()=> {
                    this.disabled = true
                })
            };
            buttons.appendChild(button);
        });
        var playerMeter = document.createElement('meter');
        playerMeter.max = 300;
        playerMeter.style.width = '100%';
        playerMeter.title = T('Player');

        var fishMeter = document.createElement('meter');
        fishMeter.max = 300;
        fishMeter.style.width = '100%';
        fishMeter.title = T('Fish');

        panel = new Panel('fishing', 'Fishing', [rating, playerMeter, fishMeter, buttons]);
        panel.player = playerMeter;
        panel.fish = fishMeter;
        panel.rating = rating;
        panel.buttons = buttons;
    }
    if ('Rating' in data) {
        panel.player.value = +data.Player || 0;
        panel.fish.value = +data.Fish || 0;
        panel.rating.textContent = T(data.Rating);
    }
    if (data.Ok == 'fishing-finished') {
        dom.forEach('#fishing-buttons > button', ()=> {
            this.disabled = true;
        })
        panel.hide();
        return null;
    }
    dom.forEach('#fishing-buttons > button', ()=> {
        this.disabled = false
    })
    panel.show();
    return fish.bind(this)
}
Character.prototype.updateEffects = function() {
    window.ui.$broadcast('effects.update', this.Effects)
}
Character.prototype.updatePosition = function(k) {
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
        // XXX game.controller.minimap.update();
    }

    this.updateBurden();
    this.updatePlow();

}
Character.prototype.followPath = function() {
    if (this.Path && this.Path.length > 0) {
        var p = this.Path.pop();
        this._setDst(p.X, p.Y);
        return true;
    }
    return false;
}
Character.prototype.updateBurden = function() {
    if (this.burden) {
        this.burden.setPoint(this)
    }
}
Character.prototype.updatePlow = function() {
    if (!this.plow) {
        return
    }
    var p = new Point(this)
    var sector = (this.sprite.position - 1)
    // y = 1 used to fix rendering order
    var offset = new Point(this.plow.Radius, 1).rotate(2*Math.PI - sector * Math.PI/4)
    p.add(offset)
    this.plow.setPoint(p)
    this.plow.sprite.position = this.sprite.position

    var plowS = this.plow.sprite__
    if (this.Dx || this.Dy) {
        this.plow.sprite.animate()
        plowS.texture.frame.x = this.plow.sprite.frame * plowS.texture.frame.width
    }
    plowS.texture.frame.y = this.sprite.position * plowS.texture.frame.height
}
Character.prototype.pickUp = function() {
    var list = game.findItemsNear(this.X, this.Y)
        .filter((e)=> e.MoveType == Entity.MT_PORTABLE)
        .sort((a, b)=> a.distanceTo(this) - b.distanceTo(this))

    if (list.length > 0) {
        list[0].pickUp()
    }
}
Character.prototype.liftStart = function() {
    var list = game.findItemsNear(this.X, this.Y)
        .filter((e)=> e.MoveType == Entity.MT_LIFTABLE)
        .sort((a, b)=> a.distanceTo(this) - b.distanceTo(this))

    if (list.length > 0) {
        list[0].lift()
    }
}
Character.prototype.liftStop = function() {
    if (this.burden) {
        game.controller.creatingCursor(this.burden, 'lift-stop');
    }
}

Character.prototype.updateCamera = function() {
    var camera = game.camera;
    var screen = game.screen;
    var p = this.screen();
    camera.x = (p.x - screen.width / 2) << 0;
    camera.y = (p.y - screen.height / 2) << 0;
}
Character.prototype.willCollide = function(new_x, new_y) {
    return false; //TODO: fix StandUp problems
    /* XXX
    return game.entities.some(function(e) {
        return (e instanceof Entity && e.collides(new_x, new_y, this.Radius));
    }.bind(this));
    */
}
Character.prototype.stop = function() {
    this.Dx = 0;
    this.Dy = 0;
}
Character.prototype.isNear = function(entity) {
    if (entity.belongsTo(game.player)) {
        return true
    }
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
}
Character.prototype.drawHovered = function(nameOnly) {
    if (this.Invisible) {
        return
    }
    if (!nameOnly) {
        this.sprite.drawOutline(this.getDrawPoint());
    }
    if (this == game.player.target) {
        game.setFontSize(20);
        this.drawName(true, true);
        game.setFontSize(0);
    } else {
        this.drawName(true, true);
    }
}

Character.prototype.intersects = Entity.prototype.intersects

Character.prototype.canIntersect = function() {
    return this.sprite.outline !== null && (config.ui.allowSelfSelection || this != game.player);
}
Character.prototype.bag = function() {
    return Entity.get(this.Equip[0]);
}
Character.prototype.hasItems = function(items) {
    var found = {}
    var bag = this.bag()
    if (!bag) {
        return false
    }
    var equals = (items, foundItems)=> {
        for (var item in items) {
            if (!foundItems || foundItems[item] < items[item]) {
                return false
            }
        }
        return true
    }

    for(var item in items) {
        found[item] = 0
    }

    for(var i = 0, l = bag.Props.Slots.length; i < l; i++) {
        var eid = bag.Props.Slots[i]
        if (!eid) {
            continue
        }

        var entity = Entity.get(eid)
        if (!entity) {
            game.sendErrorf('hasItems: cannot find %d', eid);
            continue
        }

        if (items[entity.Group]) {
            found[entity.Group] += 1
            if (equals(items, found)) {
                return true
            }
        }
    }
    return false
}
Character.prototype.equippedWith = function(group) {
    return this.Equip
        .filter((eid)=> eid !== 0)
        .map((eid)=> Entity.get(eid))
        .filter((item)=> item.Group == group)
        .length
}
Character.prototype.icon = function() {
    if (!this._icon) {
        this._icon = this.sprite.icon()
    }
    return this._icon
}
Character.prototype.getParts = function() {
    var parts = [];
    forEach(Character.clothes, (type, i)=> {
        if (type == 'head' && this.Style && this.Style.HideHelmet) {
            return
        }
        var name = this.Clothes[i];
        if (name && name != 'naked') {
            parts.push({type: type, name: name})
        }
    })

    if (this.Style && this.Style.Hair) {
        var hairStyle = this.Style.Hair.split('#');
        var hair = {
            type: 'hair',
            name: hairStyle[0],
            color: hairStyle[1],
            opacity: hairStyle[2],
        };
        parts.unshift(hair);
    }
    return parts
}
Character.prototype.interact = function() {
    game.player.interactTarget = this
    follow(this.Id, ()=> {
        // TODO: remove margo hack
        if (this.Type == 'vendor' && this.Owner != 0 && this.Name != 'Margo') {
            game.controller.vendor.open(this)
            return
        }

        Character.openInteraction(this.Name, this)
    })
}

Character.prototype.sex = function() {
    return Character.sex(this.Sex);
}
Character.prototype.isInteractive = function() {
    return (this.Type.toLowerCase() in game.talks.npcs) || (this.Type == 'vendor');
}
Character.prototype.use = function(entity) {
    switch (entity.Group) {
    case 'shit':
    case 'snowball':
        throwEntity(this.Id, entity.Id)
        return true;
    case 'dildo':
        fuck(this.Id)
        return true;
    }
    return false;
}
Character.prototype.canUse = function(entity) {
    if (entity instanceof Character)
        return this.distanceTo(entity) < 2*CELL_SIZE;

    switch (entity.Group) {
    case 'shit':
    case 'dildo':
    case 'snowball':
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
}
Character.prototype.updateActionAnimation = function() {
    switch (this.Action.Name) {
    case 'cast':
        this.playAnimation({
            down: {
                name: 'cast',
                width: 100,
                height: 60,
            }
        });
        break;
    }
}
// available anims: {up: {...}, down: {...}}
Character.prototype.playAnimation = function(anims) {
    for (var type in anims) {
        if (this.animation[type] === null)
            this.loadAnimation(type, anims[type]);
    }
}
Character.prototype.loadAnimation = function(type, anim) {
    var sprt = new Sprite(
        `animations/${anim.name}-${type}.png`,
        anim.width,
        anim.height,
        (anim.speed || 80)
    );
    if (anim.dy)
        sprt.dy = anim.dy;

    loader.ready(()=> { this.animation[type] = sprt; });
}
Character.prototype.distanceTo = function(e) {
    return Math.hypot(this.X - e.X, this.Y - e.Y);
}
Character.prototype.selectNextTarget = function() {
    var list = game.findCharsNear(this.X, this.Y, 5*CELL_SIZE).filter((c)=> {
        if (c == this || c == this.target || (c.Team && c.Team == this.Team)) {
            return false
        }
        return party && party.indexOf && party.indexOf(c.Name) == -1
    }).sort((a, b)=> a.distanceTo(this) - b.distanceTo(this))

    if (list.length > 0) {
        this.setTarget(list[0]);
    }
}
Character.prototype.setTarget = function(target) {
    this.target = target;
    var cnt = game.controller.targetContainer;
    if (!target) {
        cnt.dataset.targetId = null;
        dom.hide(cnt);
        return;
    }

    if (cnt.dataset.targetId == target.Id)
        return;

    var name = document.createElement('div');
    name.id = 'target-name';
    name.textContent = target.getName();

    cnt.dataset.targetId = target.Id;
    dom.clear(cnt);
    cnt.appendChild(target.sprite.icon());
    cnt.appendChild(name);
    dom.show(cnt);
}
Character.prototype.getAvailableQuests = function() {
    return game.player.AvailableQuests[this.Type] || [];
}
Character.prototype.getQuests = function() {
    var quests =  this.getAvailableQuests();
    for (var id in game.player.ActiveQuests) {
        var quest = game.player.ActiveQuests[id].Quest;
        if (quest.End == this.Type)
            quests.push(quest);
    }
    return quests;
}
Character.prototype.updateActiveQuest = function() {
    var panel = game.panels.quest;
    if (!panel)
        return;
    panel.setContents(panel.quest.getContents());
}
Character.prototype.onremove = function() {
}
