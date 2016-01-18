'use strict'

var Stage = require('./stage.js')
var Snow = require('../new-year.js')
var Entity = require('../entity.js')
var Character = require('../character.js')
var util = require('../util.js')
var cnf = require('../config.js')
var config = cnf.config
var debug = cnf.debug


Stage.add(mainStage)
window.mainStage = mainStage

function mainStage(data) {
    /*jshint validthis:true */

    setTimeout(function() {
        game.network.send("logon");
    }, 200);
    game.controller.initInterface();

    game.controller.chat.init(data.Chat);

    this.sync = function (data) {
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

        game.controller.syncMinimap(data.RemotePlayers);
        game.controller.chat.sync(data.Chat || []);
        game.controller.skills.update();
        game.controller.fight.update();
        game.controller.craft.update();
        game.controller.journal.update();
        if (data.Players && game.player.Id in data.Players) {
            game.controller.stats.sync();
        }
    };

    var snow = new Snow();

    var startTime = 0;
    this.update = function(currentTime) {
        currentTime = currentTime || Date.now();
        var ellapsedTime = currentTime - startTime;
        startTime = currentTime;
        game.epsilon = ellapsedTime / 1000;

        game.entities.forEach(function(e) {
            e.update(game.epsilon);
        });
        game.help.update();
        game.controller.update();
        snow.update();
    };

    var scr = game.screen;
    var cam = game.camera;
    function isVisible(t) {
        var p = t.getDrawPoint();

        return util.rectIntersects(
            p.x, p.y, t.sprite.width, t.sprite.height,
            cam.x, cam.y, scr.width, scr.height
        );
    }

    function drawObject(t) {
        if (isVisible(t))
            t.draw();
    }
    function drawUI(t) {
        if (isVisible(t))
            t.drawUI();
    }
    function drawAura(t) {
        if (isVisible(t))
            t.drawAura();
    }
    function drawClaim(t) {
        t.drawClaim();
    }

    // game.ctx.scale(0.3, 0.3);
    // game.ctx.translate(1000, 1000);

    this.draw = function() {
        game.ctx.clear();
        game.ctx.save();
        game.ctx.translate(-game.camera.x, -game.camera.y);

        this.drawGlobalEffects();

        game.map.draw();
        game.characters.forEach(drawAura);
        game.claims.forEach(drawClaim);


        game.sortedEntities.traverse(drawObject);
        // this.drawOrder();
        // this.drawTopologic();
        // this.drawAdaptive();
        snow.draw();

        if (debug.map.darkness)
            game.map.drawDarkness();
        game.characters.forEach(drawUI);
        game.controller.draw();
        // game.iso.fillRect(game.player.Location.X)
        // this.debug();
        game.ctx.restore();
    };

    var hueRotate = 0;
    this.drawGlobalEffects = function() {
        if ("MushroomTrip" in game.player.Effects || "BadTrip" in game.player.Effects) {
            game.canvas.style.filter = "hue-rotate(" + (hueRotate % 360) +"deg)";
            game.canvas.style.webkitFilter = "hue-rotate(" + (hueRotate % 360) +"deg)";
            hueRotate += 20;
        } else {
            game.canvas.style.filter = "";
            game.canvas.style.webkitFilter = "";
        }
    };

    this.end = function() {};

    /* experimental and debug features */
    var adaptiveRadius = 300;
    var frames = 0;
    this.drawAdaptive = function() {
        frames++;

        var started = Date.now();
        var pl = game.player;

        var list = this.getDrawableList().filter(function(e) {
            return pl.distanceTo(e) < adaptiveRadius;
        });

        this.topologicalSort(list).forEach(drawObject);

        var ellapsed = Date.now() - started;
        var diff = (ellapsed > 15) ? -cnf.CELL_SIZE : +cnf.CELL_SIZE;
        if (diff !== 0 && frames > 24) {
            frames = 0;
            adaptiveRadius += diff;
        }
    };

    this.drawOrder = function() {
        var i = 0;
        game.sortedEntities.traverse(function(object)  {
            object.draw();
            var p = object.screen();
            game.ctx.fillStyle = "#fff";
            game.drawStrokedText(i++, p.x, p.y);

        });
    };

    this.drawTopologic = function() {
        this.topologicalSort(this.getDrawableList()).forEach(drawObject);
    };

    this.getDrawableList = function() {
        return game.entities.filter(function(e) {
            return e instanceof Character || e.inWorld();
        });
    };

    this.topologicalSort = function(list) {
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
    };

    this.debug = function() {
        game.ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        game.ctx.fillRect(game.camera.x, game.camera.y, game.screen.width, game.screen.height);
    };
}
