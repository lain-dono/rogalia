import Stage from './stage.js'

Stage.add(module, connectingStage)

function connectingStage() {
    game.network.run()
}

connectingStage.prototype.draw = Stage.makeEllipsisDrawer()
