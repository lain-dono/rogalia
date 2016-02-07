import Stage from './stage.js'
import {ajax} from '../util.js'
import Vue from 'vue'
import Lobby from '../ui/stages/lobby.js'

var Panel = require('../panel.js')
var dom = require('../dom.js')
var Character = require('../character.js')

var maxChars = 4

Stage.add(module, lobbyStage)

function lobbyStage(data) {
    /*jshint validthis:true */

    ajax('build-warning.html', function(warn) {
        if (!warn) {
            return
        }

        dom.show(document.getElementById('build-warning'))

        var panel = new Panel('build-warning-panel', '')
        panel.temporary = true
        panel.contents.innerHTML = warn
        panel.hooks.hide = function() {
            localStorage.setItem('build.warning.hidden', Date.now())
        }

        var title = document.getElementById('build-warning-title')
        var buildWarning = document.getElementById('build-warning')
        dom.replace(buildWarning, title)
        title.id = 'build-warning'
        panel.setTitle(title.textContent)

        title.onclick = function() { panel.show() }

        console.warn('have build warnings', title.textContent)

        var last = new Date(+localStorage.getItem('build.warning.hidden'))
        if (Date.now() - last < 24 * 60 * 60 * 1000) {
            panel.hide()
        } else {
            panel.show()
        }
    })

    var lobby = this.lobby = new Vue(Lobby).$mount().$appendTo(document.body)

    lobby.visible = true
    lobby.login = game.login
    lobby.inVK = game.inVK()

    // we need to save it because we may return to this stage after
    // createCharacter stage (back button)
    lobbyStage.characters = (data && data.Characters) || lobbyStage.characters || []

    lobbyStage.characters.forEach(function(info) {
        lobby.addAvatar(Character.sex(info.Sex), info.Name)
    })

    function fastenter(e) {
        if (e.keyCode == 13) { // enter
            lobby.onAvatarIdx(0)
        }
    }

    this.fastenter = fastenter
    window.addEventListener('keypress', fastenter);
}

lobbyStage.prototype.end = function() {
    window.removeEventListener('keypress', this.fastenter);
    this.lobby.$destroy(true)
    this.lobby = null
    console.log('lobby end')
}

lobbyStage.prototype.sync = function(data) {
    game.setStage('loading', data)
}
