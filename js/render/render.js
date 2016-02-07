import {rectIntersects, msort} from '../util.js'
import {config, debug, CELL_SIZE} from '../config.js'
import {syncCharacters, syncEntities, logon} from '../network-protocol.js'
import {Snow} from './new-year.js'
import {fillClaim, strokeClaim} from './entity.js'

var graphics = config.graphics

export function Render(screen, camera) {
    this.screen = screen
    this.camera = camera
    this.snow = new Snow(screen.width, screen.height)
    this.startTime = 0
    this.hueRotate = 0
    /* experimental and debug features */
    this.adaptiveRadius = 300
    this.frames = 0
}

Render.prototype.update = function(currentTime, entities) {
    currentTime = currentTime || Date.now()
    var ellapsedTime = currentTime - this.startTime
    this.startTime = currentTime

    var eps = ellapsedTime / 1000
    for (var i = 0, l = entities.length; i < l; i++) {
        entities[i].update(eps)
    }

    if (graphics.snowflakes) {
        this.snow.update(this.screen.width, this.screen.height)
    }
}

function isVisible(t, scr, cam) {
    var p = t.getDrawPoint()
    return rectIntersects(
        p.x, p.y, t.sprite.width, t.sprite.height,
        cam.x, cam.y, scr.width, scr.height
    )
}

function isVisibleGame(t) {
    var p = t.getDrawPoint()
    var cam = game.camera
    var scr = game.screen
    return rectIntersects(
        p.x, p.y, t.sprite.width, t.sprite.height,
        cam.x, cam.y, scr.width, scr.height
    )
}

function drawObject(t) {
    if (isVisibleGame(t)) {
        t.draw()
    }
}

Render.prototype.draw = function(ctx) {
    this.drawGlobalEffects()

    ctx.clear()

    var cam = this.camera
    var scr = this.screen

    // XXX
    ctx.save()
    ctx.translate(-cam.x, -cam.y)

    ctx.save()
    game.map.draw(scr.width, scr.height, cam)
    //if (debug.map.grid) {
        //map.drawGrid()
    //}
    game.map.drawMinimap(game.entities.array)
    ctx.restore()

    //ctx.save()
    //ctx.translate(cam.x, cam.y)
    //game.renderer.render(game.pixiStage)
    //ctx.restore()

    var characters = game.characters.array

    for (var i = 0, l = characters.length; i < l; i++) {
        var t = characters[i]
        if (isVisibleGame(t)) {
            t.drawAura()
        }
    }

    var claims = game.claims.array
    var playerId = game.player.Id
    for (var i = 0, l = claims.length; i < l; i++) {
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
            fillClaim(ctx, w, h, x, y, playerId == claim.Creator)
        }
        if (config.ui.strokeClaim) {
            strokeClaim(ctx, w, h, x, y, playerId == claim.Creator)
        }
    }

    game.sortedEntities.traverse(drawObject)

    //this.drawOrder()
    //this.drawTopologic()
    //this.drawAdaptive()

    if (graphics.snowflakes) {
        if ('Vomit' in game.player.Effects) {
            this.snow.drawShit(ctx, cam)
        } else {
            this.snow.drawSnow(ctx, cam)
        }
    }

    //if (debug.map.darkness) {
        //map.drawDarkness()
    //}

    for (var i = 0, l = characters.length; i < l; i++) {
        var t = characters[i]
        if (isVisibleGame(t)) {
            t.drawUI()
        }
    }

    game.controller.draw()
    // game.iso.fillRect(game.player.Location.X)
    // this.debug(ctx, game.cam, scr)
    ctx.restore()
}

Render.prototype.drawGlobalEffects = function() {
    var cstyle = game.canvas.style
    var effects = game.player.Effects
    if ('MushroomTrip' in effects || 'BadTrip' in effects) {
        var rot = 'hue-rotate(' + (this.hueRotate % 360) + 'deg)'
        cstyle.filter = rot
        cstyle.webkitFilter = rot
        this.hueRotate += 20
    } else {
        cstyle.filter = ''
        cstyle.webkitFilter = ''
    }
}

//Render.prototype.drawAdaptive = function() {
    //this.frames++;

    //var started = Date.now();
    //var pl = game.player;

    //var list = this.getDrawableList().filter(function(e) {
        //return pl.distanceTo(e) < this.adaptiveRadius;
    //});

    //this.topologicalSort(list).forEach(drawObject);

    //var ellapsed = Date.now() - started;
    //var diff = (ellapsed > 15) ? -CELL_SIZE : +CELL_SIZE;
    //if (diff !== 0 && this.frames > 24) {
        //this.frames = 0;
        //this.adaptiveRadius += diff;
    //}
//}

//Render.prototype.drawOrder = function() {
    //var i = 0;
    //game.sortedEntities.traverse(function(object)  {
        //object.draw();
        //var p = object.screen();
        //game.ctx.fillStyle = "#fff";
        //game.drawStrokedText(i++, p.x, p.y);
    //});
//}


//Render.prototype.drawTopologic = function() {
    //this.topologicalSort(this.getDrawableList()).forEach(drawObject);
//}

//Render.prototype.getDrawableList = function() {
    //return game.entities.filter(function(e) {
        //return e instanceof Character || e.inWorld();
    //});
//}

//Render.prototype.topologicalSort = function(list) {
    ////console.log('topologicalSort')
    //list.forEach(function(e) {
        //e.visited = false;
        //e.behind = list.filter(function(t) {
            //if (e.getZ() != t.getZ())
                //return false;
            //var aMaxX = e.X + e.Width/2;
            //var aMaxY = e.Y + e.Height/2;
            //var bMinX = t.X - t.Width/2;
            //var bMinY = t.Y - t.Height/2;
            //return (bMinX < aMaxX && bMinY < aMaxY);
        //});
    //});

    //// var tree = new BinarySearchTree();
    //var depth = 0;
    //function visit(e) {
        //if (e.visited)
            //return;
        //e.visited = true;
        //e.behind.forEach(visit);
        //e.depth = depth++;
        //// tree.add(e);
    //}

    //list.forEach(function(e) {
        //visit(e);
    //});

    //// list.forEach(tree.add.bind(tree));
    //// return tree;

    //return msort(list, (a, b)=> {
        //var z = a.getZ() - b.getZ()
        //if (z !== 0) {
            //return z
        //}
        //return (a.depth >= b.depth) ? +1 : -1
    //})
//}

Render.prototype.debug = function(ctx, camera, screen) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.fillRect(camera.x, camera.y, screen.width, screen.height)
}

