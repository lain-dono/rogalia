'use strict'

var cnf = require('../config.js')

function Stage() {}

module.exports = Stage

Stage.prototype = {
    name: "",
    start: function(){},
    end: function(){},
    update: function(){},
    draw: function(){},
    sync: function(data) {},

};

Stage.makeEllipsisDrawer = function() {
    var ellipsis = 0;
    var ellipsisMax = 5;
    var period = 300;
    var start = Date.now() - (period - 100) ;
    return function() {
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

Stage.add = function(stage) {
    stage.prototype = Object.create(Stage.prototype);
};
