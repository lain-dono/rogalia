import Stage from './stage.js'
import {Info} from '../ui/info.js'
import {syncCharacters, syncEntities, logon} from '../network-protocol.js'
import {Render} from '../render'
import {Snow, fillClaim, strokeClaim} from '../render'

Stage.add(module, mainStage)

function mainStage(data) {
    /*jshint validthis:true */

    require('../ui')

    Info.$mount().$appendTo(document.body)

    setTimeout(logon, 200)

    game.controller.initInterface()
    game.controller.chat.init(data.Chat)

    this.render = new Render(game.screen, game.camera)
}

mainStage.prototype.sync = function (data) {
    if (data.Warning) {
        game.controller.showWarning(data.Warning)
        return
    }
    if (data.Reconnect) {
        console.info('reconect')
        document.location.search = "?server=" + data.Reconnect
        return
    }

    if (data.Location) {
        game.map.sync(data.Location)
    }

    if (data.BG) {
        game.controller.updateBG(data.BG)
    }

    //game.controller.syncMinimap(data.RemotePlayers)
    window.ui.$broadcast('sync.RemotePlayers', data.RemotePlayers)

    game.controller.chat.sync(data.Chat || [])
    game.controller.skills.update()
    //game.controller.fight.update()
    game.controller.craft.update()
    game.controller.journal.update()
    if (data.Players && game.player.Id in data.Players) {
        game.controller.stats.sync()
    }
}

mainStage.prototype.update = function(currentTime) {
    this.render.update(currentTime, game.entities.array)
    currentTime = currentTime || Date.now()

    game.help.update()
    game.controller.update()
}

mainStage.prototype.draw = function() {
    this.render.draw(game.ctx)
}

mainStage.prototype.end = function() {}
