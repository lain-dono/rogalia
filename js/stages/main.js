'use strict'

var Stage = require('./stage.js')
var Entity = require('../entity.js')
var Character = require('../character.js')
var util = require('../util.js')
var cnf = require('../config.js')
var config = cnf.config
var debug = cnf.debug
var graphics = config.graphics


var CELL_SIZE = cnf.CELL_SIZE

import {Snow, fillClaim, strokeClaim} from '../render'

Stage.add(module, mainStage)

function mainStage(data) {
    /*jshint validthis:true */

    require('../ui')

    setTimeout(function() {
        game.network.send("logon");
    }, 200);
    game.controller.initInterface();

    game.controller.chat.init(data.Chat);

    this.snow = new Snow(game.screen.width, game.screen.height)

    this.startTime = 0;

    // game.ctx.scale(0.3, 0.3);
    // game.ctx.translate(1000, 1000);

    this.hueRotate = 0;

    this.end = function() {};

    /* experimental and debug features */
    this.adaptiveRadius = 300;
    this.frames = 0;
}

mainStage.prototype.sync = function (data) {
    if (data.Warning) {
        game.controller.showWarning(data.Warning);
        return;
    }
    if (data.Reconnect) {
        document.location.search = "?server=" + data.Reconnect;
        return;
    }
    Entity.sync(data.Entities || [], data.RemoveEntities || null);

    Character.sync(data.Players || [], data.RemovePlayers || null);
    Character.sync(data.Mobs || [], data.RemoveMobs || null);
    Character.sync(data.NPCs || [], data.RemoveNPCs || null);

    data.Location && game.map.sync(data.Location); // jshint ignore:line

    //game.controller.syncMinimap(data.RemotePlayers)
    window.ui.$broadcast('sync.RemotePlayers', data.RemotePlayers)

    game.controller.chat.sync(data.Chat || []);
    game.controller.skills.update();
    //game.controller.fight.update();
    game.controller.craft.update();
    game.controller.journal.update();
    if (data.Players && game.player.Id in data.Players) {
        game.controller.stats.sync();
    }
}

mainStage.prototype.update = function(currentTime) {
    currentTime = currentTime || Date.now();
    var ellapsedTime = currentTime - this.startTime;
    this.startTime = currentTime;

    var eps = game.epsilon = ellapsedTime / 1000;
    var entities = game.entities.array
    for (var i = 0, l = entities.length; i < l; i++) {
        entities[i].update(eps)
    }

    game.help.update();
    game.controller.update();

    if (graphics.snowflakes) {
        this.snow.update(game.screen.width, game.screen.height)
    }
}

function isVisible(t) {
    var p = t.getDrawPoint();
    var scr = game.screen;
    var cam = game.camera;

    return util.rectIntersects(
        p.x, p.y, t.sprite.width, t.sprite.height,
        cam.x, cam.y, scr.width, scr.height
    );
}

function drawObject(t) {
    if (isVisible(t))
        t.draw();
}

mainStage.prototype.draw = function() {
    var ctx = game.ctx
    ctx.clear()
    ctx.save()
    ctx.translate(-game.camera.x, -game.camera.y)

    this.drawGlobalEffects()

    ctx.save()
    var width = game.screen.width
    var height = game.screen.height
    game.map.draw(width, height, game.camera, game.entities.array)
    ctx.restore()

    ctx.save()
    // XXX
    ctx.translate(game.camera.x, game.camera.y)
    game.renderer.render(game.pixiStage)
    ctx.restore()

    var i, l, t

    //game.characters.forEach(drawAura)
    var characters = game.characters.array
    for (i = 0, l = characters.length; i < l; i++) {
        t = characters[i]
        if (isVisible(t)) {
            t.drawAura()
        }
    }


    //game.claims.forEach(drawClaim)
    var claims = game.claims.array
    for (i = 0, l = claims.length; i < l; i++) {
        var claim = claims[i]

        var no = claim.North*CELL_SIZE
        var we = claim.West*CELL_SIZE
        var so = claim.South*CELL_SIZE
        var ea = claim.East*CELL_SIZE

        var w = we+ea
        var h = no+so
        var x = claim.X - we
        var y = claim.Y - no

        if (config.ui.fillClaim) {
            fillClaim(ctx, w, h, x, y, game.player.Id == claim.Creator)
        }
        if (config.ui.strokeClaim) {
            strokeClaim(ctx, w, h, x, y, game.player.Id == claim.Creator)
        }
    }

    game.sortedEntities.traverse(drawObject)

    //this.drawOrder()
    //this.drawTopologic()
    //this.drawAdaptive()

    if (graphics.snowflakes) {
        if ('Vomit' in game.player.Effects) {
            this.snow.drawShit(ctx, game.camera)
        } else {
            this.snow.drawSnow(ctx, game.camera)
        }
    }

    if (debug.map.darkness) {
        game.map.drawDarkness()
    }

    //game.characters.forEach(drawUI)
    for (i = 0, l = characters.length; i < l; i++) {
        t = characters[i]
        if (isVisible(t)) {
            t.drawUI()
        }
    }

    game.controller.draw()
    // game.iso.fillRect(game.player.Location.X)
    // this.debug()
    ctx.restore()
}

mainStage.prototype.drawGlobalEffects = function() {
    if ("MushroomTrip" in game.player.Effects || "BadTrip" in game.player.Effects) {
        game.canvas.style.filter = "hue-rotate(" + (this.hueRotate % 360) +"deg)";
        game.canvas.style.webkitFilter = "hue-rotate(" + (this.hueRotate % 360) +"deg)";
        this.hueRotate += 20;
    } else {
        game.canvas.style.filter = "";
        game.canvas.style.webkitFilter = "";
    }
}

mainStage.prototype.drawAdaptive = function() {
    this.frames++;

    var started = Date.now();
    var pl = game.player;

    var list = this.getDrawableList().filter(function(e) {
        return pl.distanceTo(e) < this.adaptiveRadius;
    });

    this.topologicalSort(list).forEach(drawObject);

    var ellapsed = Date.now() - started;
    var diff = (ellapsed > 15) ? -cnf.CELL_SIZE : +cnf.CELL_SIZE;
    if (diff !== 0 && this.frames > 24) {
        this.frames = 0;
        this.adaptiveRadius += diff;
    }
}

mainStage.prototype.drawOrder = function() {
    var i = 0;
    game.sortedEntities.traverse(function(object)  {
        object.draw();
        var p = object.screen();
        game.ctx.fillStyle = "#fff";
        game.drawStrokedText(i++, p.x, p.y);
    });
}


mainStage.prototype.drawTopologic = function() {
    this.topologicalSort(this.getDrawableList()).forEach(drawObject);
}

mainStage.prototype.getDrawableList = function() {
    return game.entities.filter(function(e) {
        return e instanceof Character || e.inWorld();
    });
}

mainStage.prototype.topologicalSort = function(list) {
    //console.log('topologicalSort')
    list.forEach(function(e) {
        e.visited = false;
        e.behind = list.filter(function(t) {
            if (e.getZ() != t.getZ())
                return false;
            var aMaxX = e.X + e.Width/2;
            var aMaxY = e.Y + e.Height/2;
            var bMinX = t.X - t.Width/2;
            var bMinY = t.Y - t.Height/2;
            return (bMinX < aMaxX && bMinY < aMaxY);
        });
    });

    // var tree = new BinarySearchTree();
    var depth = 0;
    function visit(e) {
        if (e.visited)
            return;
        e.visited = true;
        e.behind.forEach(visit);
        e.depth = depth++;
        // tree.add(e);
    }

    list.forEach(function(e) {
        visit(e);
    });

    // list.forEach(tree.add.bind(tree));
    // return tree;

    return util.msort(list, function(a, b) {
        var z = a.getZ() - b.getZ();
        if (z !== 0)
            return z;

        return (a.depth >= b.depth) ? +1 : -1;
    });
}

mainStage.prototype.debug = function() {
    game.ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    game.ctx.fillRect(game.camera.x, game.camera.y, game.screen.width, game.screen.height);
}

