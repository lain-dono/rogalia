'use strict'

require('./users.styl')

var tabs = require('./tabs.js')

module.exports = {
    template: require('raw!./users.html'),
    components: {
        'v-tabs': tabs.tabs,
        'v-tab': tabs.tab,
    },
    props: {
        online: Array,
        friends: Array,
        blacklist: Array,
    },
    data: function() {
        return {
            tab: 'online',
            ratingBase: sprintf('%s//%s/stats/', location.protocol, game.network.host),
        }
    },
    methods: {
        clickByName: function(event, name) {
            return game.chat.nameMenu(event, name);
        },
    },
}
