'use strict'

var Stage = require('./stage.js')

Stage.add(connectingStage);
window.connectingStage = connectingStage

function connectingStage() {
    /*jshint validthis:true */

    game.network.run();
    this.draw = Stage.makeEllipsisDrawer();
}
