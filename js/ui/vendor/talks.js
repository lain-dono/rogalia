export function getTalks(type, name) {
    // TODO: remove fix after server update
    switch (name) {
    case '$Shot':
        type = 'shot'
        break
    case 'Shot':
    case 'Bruno':
    case 'Bertran':
    case 'Boris':
    case 'Diego':
    case 'Ahper':
    case 'Cosmas':
    case 'Scrooge':
        type = name.toLowerCase()
        break
    case '$Margo':
    case 'Margo':
    case '$Umi':
    case 'Umi':
        type = 'margo'
        break
    }

    var fraction = game.player.Citizenship.Faction.toLowerCase()
    return game.talks.get(type, fraction, game.player.sex())
}
/*
var info = this.getTalks()
var panel = new Panel(
    'interaction',
    this.Name,
    [
        dom.wrap('', info.talks.map(function(text) {
            return dom.tag('p', '', {text: text})
        })),
        dom.make('ul', Object.keys(info.actions).map((title)=> {
            return dom.tag('li', 'talk-link', {
                text: info.actions[title],
                onclick: function() {
                    panel.close()
                    Character.npcActions[title].call(this)
                }
            })
        })),
    ]
)
panel.entity = this
panel.show()
*/

export default {
    props: ['id', 'type', 'name'],
    computed: {
        talks() {
            return getTalks(this.type, this.name).talks
        },
        actions() {
            return getTalks(this.type, this.name).actions
        },
    },
    methods: {
        action(title) {
            var ch = game.characters.get(this.id)
            require('./npc-actions.js')[title].call(ch)
        }
    },
}
