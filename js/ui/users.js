export default {
    template: require('raw!./users.html'),
    props: {
        online: Array,
        friends: Array,
        blacklist: Array,
    },
    data() {
        return {
            tab: 'online',
            ratingBase: sprintf('%s//%s/stats/', location.protocol, game.network.host),
        }
    },
    methods: {
        clickByName(event, name) {
            return game.chat.nameMenu(event, name);
        },
    },
}
