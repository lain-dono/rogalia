export default {
    template: require('raw!./lobby.html'),
    components: {
        'panel': require('../panel.js').default,
    },
    data: function() {
        return {
            login: '',
            inVK: false,
            avatars: [
                { sex: 'new', name: '' },
                { sex: 'new', name: '' },
                { sex: 'new', name: '' },
                { sex: 'new', name: '' },
            ],
        }
    },
    methods: {
        addAvatar: function(sex, name) {
            var idx = 0
            for (; idx<4; idx++) {
                if (this.avatars[idx].sex == 'new') {
                    this.avatars[idx].sex = sex
                    this.avatars[idx].name = name
                    return
                }
            }
            console.warn('lobby: cannot find avatar slot')
        },
        onAvatarIdx: function(idx) {
            this.onAvatar(this.avatars[idx])
        },
        onAvatar: function(avatar) {
            if(avatar.sex == 'new') {
                game.setStage('createCharacter')
            } else {
                game.playerName = avatar.name
                game.network.send('enter', {
                    Name: avatar.name,
                    Version: game.version,
                })
            }
        },
        quit: function() {
            lobbyStage.characters = []
            game.clearCredentials()
            game.setStage('login')
        },
    },
}
