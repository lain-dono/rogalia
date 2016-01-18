'use strict'

var Stage = require('./stage.js')

Stage.add(module, connectingStage);

function connectingStage() {
    /*jshint validthis:true */

    game.network.run();
}

connectingStage.prototype.draw = Stage.makeEllipsisDrawer();
