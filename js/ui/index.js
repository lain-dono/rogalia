import Vue from 'vue'
import {tabs, tab} from './tabs.js'

import Param from './param.js'

import util from '../util.js'
import Panel from './panel.js'

Vue.config.debug = true
Vue.filter('toFixed', function(val, digits) {
    return util.toFixed(val, digits | 0)
})


Vue.component('panel', Panel)
Vue.component('tabs', tabs)
Vue.component('tab', tab)
Vue.component('v-param', Param)

var upd = {
    online: {
        cmd: 'player-list',
        key: 'OnlinePlayers',
    },
    friends: {
        cmd: 'friend-list',
        key: 'Friends',
    },
    blacklist: {
        cmd: 'blacklist-list',
        key: 'Blacklist',
    },
}

console.log(Param)

window.ui = module.exports = new Vue({
    el: '#app',
    components: {
        'price': require('./price.js'),

        'settings': require('./settings.js'),
        'users': require('./users.js'),
        'actions': require('./actions.js'),
        'minimap': require('./minimap.js'),

        'skills': require('./skills.js').vv,
        //'wiki': require('./wiki.js').vv,
        //'system': require('./system.js').vv,
        'chat': require('./chat/chat.js').vv,
        'craft': require('./craft.js').vv,

    },
    data: {
        message: 'Hello Vue.js!',

        exp: {
            current: 354,
            max: 668,
        },

        buttons: [
            'skills',
            'stats',
            'inventory',
            'craft',
            'chat',
            'journal',
            'map',
            'wiki',
            'system',
        ],
        panels: {
            skills: true,
            stats: true,
            inventory: true,
            craft: true,
            chat: false,
            journal: true,
            map: true,
            wiki: true,
            system: true,

            users: false,
        },

        online: [],
        friends: [],
        blacklist: [],
    },

    envents: {
        'online.add': function(name) {
            if(name != game.player.Name) {
                this.online.push(name)
            }
        },
        'online.remove': function(name) {
            if(name != game.player.Name) {
                this.online.splice(this.online.indexOf(name), 1)
            }
        },
    },

    methods: {
        togglePanel(name) {
            console.log('toggle panel', name)
            this.panels[name] = !this.panels[name]

            var id = name + '-button'
            var panel
            switch (name) {
            case 'users':
            case 'wiki':
            case 'system':
            case 'map':
                return
            case 'inventory':
                game.controller.toggleBag()
                return
            case 'skills':
            case 'stats':
            case 'craft':
            case 'chat':
            case 'journal':
                panel = game.controller[name].panel || game.controller[name]
                break
            }

            if(!panel || !panel.toggle) {
                console.error('fail panel', panel, panel.toggle)
                return
            }
            if (!panel.visible) {
                game.help.runHook({type: id});
            }
            panel.toggle();
        },

        updateOnline() { this.updatePlayers('online') },
        updateFriends() { this.updatePlayers('friends') },
        updateBlacklist() { this.updatePlayers('blacklist') },

        updatePlayers(key) {
            var cmd = upd[key]
            var self = this
            game.network.send(cmd.cmd, {}, function(data) {
                var list = data[cmd.key]
                if (list instanceof Array) {
                    self[key] = list
                } else {
                    console.warn('fail update players lists', key, cmd, data)
                    self[key] = []
                }
            });
        },
    },
    attached() {
        this.updateOnline()
        this.updateFriends()
        this.updateBlacklist()
    },
})
