'use strict'

var PIXI = require('pixi.js')

var cnf = require('../config.js')

function Stage() {
    PIXI.Container.call(this)
}

Stage.prototype = Object.create(PIXI.Container.prototype);
Stage.prototype.constructor = Stage;
module.exports = Stage;

//Stage.prototype.name   = ""
Stage.prototype.start  = function() {}
Stage.prototype.end    = function() {}
Stage.prototype.update = function() {}
Stage.prototype.draw   = function() {}
Stage.prototype.sync   = function(data) {}

Stage.makeEllipsisDrawer = function() {
    var ellipsis = 0
    var ellipsisMax = 5
    var period = 30
    var start
    return function() {
        if (start === undefined)
            start = Date.now() - (period - 100);
        var now = Date.now();
        if (now - start < period)
            return;
        start = now;

        if (++ellipsis > ellipsisMax)
            ellipsis = 0;
        game.ctx.clear();
        game.ctx.fillStyle = "#fff";
        game.forceDrawStrokedText(T("Connecting") + " " + "|".repeat(ellipsis),
                cnf.CELL_SIZE, cnf.CELL_SIZE);
    };
};

Stage.add = function(module, stage) {
    stage.prototype = Object.create(Stage.prototype);
    stage.prototype.constructor = stage;
    module.exports = window[stage.name] = stage
};
