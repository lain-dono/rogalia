'use strict'

var config = require('../config.js').config
var debug = require('../config.js').debug
var descriptions = require('../lang/ru/settings.js')

module.exports = {
    template: require('raw!./settings.html'),
    props: {
        ping: Number,
        // TODO move it to config, etc.
        siteUrl: {type: String, default: 'http://rogalia.ru'}
    },
    data() {
        return {
            settings: config,
            descriptions: descriptions,
        }
    },
    methods: {
        open(link) {
            if (link.charAt(0) == '$') {
                link = this.siteUrl + link.substring(1);
            }
            window.open(link, '_blank');
        },
        showHelp() {
            console.log('showHelp');
        },
        showUsers() {
            console.log('showUsers');
            this.$root.panels.users = !this.$root.panels.users
        },
        lobby() {
            console.log('lobby');
        },
        logout() {
            console.log('logout');
        },
    },
    attached() {
        document.getElementById('fps-stats').appendChild(this.$fps.domElement)
    },
    created() {
        window.fps = this.$fps = new FpsStats()
    },
    watch: {
        'settings.ui.language': function() {
            localStorage.setItem('lang', (game.lang == 'ru') ? 'en' : 'ru')
            game.reload()
        },
        'settings.sound.playMusic': function() {
            game.sound.toggleMusic()
        },
        'settings.sound.jukebox': function() {
            game.jukebox.toggle()
        },
        //'settings.map.world': function() {
            //dom.toggle(game.world)
        //},
        'settings.ui.chatNotifications': function(attach) {
            game.chat.initNotifications()
        },
        'settings.ui.chatAttached': function(attach) {
            if (attach) { game.chat.attach() }
            else        { game.chat.detach() }
        },
        'settings.graphics.low': function() {
            game.map.reset()
        },
        'settings.graphics.centerScreen': function() {
            game.world.classList.toggle('snap-left')
        },
        'settings.graphics.fullscreen': function() {
            game.screen.update()
        },
        'settings.character.pathfinding': function() {
            game.player.Settings.Pathfinding = !game.player.Settings.Pathfinding
            game.network.send("set-settings", {Settings: game.player.Settings});
        },
        'settings.character.hideHelmet': function() {
            game.player.Style.HideHelmet = !game.player.Style.HideHelmet
            game.network.send("set-style", {Style: game.player.Style});
            game.player.reloadSprite()
        },
    },
}
