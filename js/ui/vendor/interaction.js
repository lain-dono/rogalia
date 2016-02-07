// TODO: remove margo hack
if (this.Type == 'vendor' && this.Owner != 0 && this.Name != 'Margo') {
    game.controller.vendor.open(this)
    return
}

var actions = ['Talk']

if (this.getQuests().length > 0) {
    actions.push('Quest')
}

actions = actions.concat(Object.keys(getTalks(this.Type, this.Name).actions))

var panel = new Panel(
    'interraction',
    this.Name,
    actions.map((title)=> {
        var cls = (title == 'Quest') ? 'quest-button' : ''
        return dom.button(T(title), cls, ()=> {
            panel.close()
            Character.npcActions[title].call(this)
        })
    })
)
panel.entity = this
panel.show()
