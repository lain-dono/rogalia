// for admin only
export function teleportXY(x, y) {
    game.network.send('teleport', {x: x, y: y})
}
export function teleportName(name) {
    game.network.send('teleport', {name: name})
}


export function logon() {
    game.network.send('logon')
}

export function sendError(msg) {
    // TODO stacktrace
    // see https://stackoverflow.com/questions/591857/how-can-i-get-a-javascript-stack-trace-when-i-throw-an-exception
    // like this
    // var stack = (new Error()).stack
    game.network.sendRaw({Commad: 'error', msg: msg})
}

// for character.js
export function milk(id) {
    game.network.send('milk', {Id: id})
}
export function mount(id) {
    game.network.send('mount', {Id: id})
}
export function dismount() {
    game.network.send('dismount')
}
export function catchAnimal(id) {
    game.network.send('catch-animal', {Id: id})
}
export function setDst(x, y) {
    game.network.send('set-dst', {x: x, y: y})
}
export function fishingMove(move) {
    game.network.send('fishing-move', {move: move})
}
export function follow(id, cb) {
    game.network.send('follow', {Id: id}, cb)
}
export function throwEntity(id, itemId) {
    game.network.send('throw', {Id: id, Item: itemId})
}
export function fuck(id) {
    game.network.send('fuck', {Id: id})
}

// for characters.js
export function setCitizenship(id, name) {
    game.network.send('set-citizenship', {Id: id, Name: name})
}
export function getClaim(id) {
    game.network.send('get-claim', {Id: id})
}
export function getVillageClaim(id, name) {
    game.network.send('get-village-claim', {Id: id, Name: name})
}
export function buyWater(id) {
    game.network.send('buy-water', {Id: id})
}
export function buySex(id) {
    game.network.send('buy-sex', {Id: id})
}
export function instanceList(cb) {
    game.network.send('instance-list', {}, cb)
}
export function instanceTurn(name) {
    game.network.send('instance', {Name: name})
}

// for entity.js
export function rotateEntity(id) {
    game.network.send('rotate', {id: id})
}
export function useEntity(id, cb) {
    game.network.send('entity-use', {id: id}, cb)
}
export function destroyEntity(id) {
    game.network.send('entity-destroy', {id: id})
}
export function fixEntity(id) {
    game.network.send('entity-fix', {id: id})
}
export function pickUpEntity(id) {
    game.network.send('entity-pick-up', {id: id})
}
export function castEntity(id) {
    game.network.send('cast', {Id: id})
}
//export function addEntity(id, cb) {
    //game.network.send('entity-add', {id: id})
//}
export function liftEntity(id, cb) {
    game.network.send('lift-start', {id: id}, cb)
}
export function editSign(id, text) {
    game.network.send('sign-edit', {Id: this.Id, Text: text})
}

/*
entity.js:323:                game.network.send('rotate', {id: this.Id})
entity.js:357:        game.network.send('entity-use', { id: this.Id }, (data)=> {
entity.js:362:        game.network.send('entity-destroy', {id: this.Id})
entity.js:365:        game.network.send('entity-fix', {id: this.Id})
entity.js:368:        game.network.send('entity-pick-up', {id: this.Id})

entity.js:371:        game.network.send('lift-start', {id: this.Id}, function() {
entity.js:377:            game.network.send('SetRespawn', {id: this.Id})
entity.js:389:            game.network.send(action, {
entity.js:436:            game.network.send('sign-edit', {Id: this.Id, Text: text})
entity.js:446:            game.network.send('Open', {Id: this.Id}, this.open.bind(this))
entity.js:453:        game.network.send('disassemble', {Id: this.Id})
entity.js:462:            game.network.send('split', args)
entity.js:464:            game.network.send('Split', args)
entity.js:793:        game.network.send(cmd, {
entity.js:800:        game.network.send('dwim', {id: this.Id})
entity.js:803:        game.network.send('entity-use', {Id: e.Id, Equipment: this.Id})
entity.js:870:            game.network.send('cast', {Id: this.Id})
entity.js:904:                game.network.send('entity-add', args, (data)=> {
*/


// for bank.js
export function bankDeposit(cost, cb) {
    game.network.send('deposit', {Cost: cost}, cb)
}
export function bankWithdraw(cost, cb) {
    game.network.send('withdraw', {Cost: cost}, cb)
}
export function bankPayClaim(cb) {
    game.network.send('pay-for-claim', {}, cb)
}
export function bankInfo(cb) {
    game.network.send('get-bank-info', {}, cb)
}
export function bankBuyVaultSlot(cb) {
    game.network.send('buy-bank-vault-slot', {}, cb)
}

// FIXME don't export
export function syncCharacters(add, remove) {
    game.network.syncCharacters(add, remove)
}
// FIXME don't export
//container/container.js:408:    // called on each Entity.sync()
export function syncEntities(add, remove) {
    game.network.syncEntities(add, remove)
}

