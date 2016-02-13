var Sprite = require('./render/sprite.js')

var Character = require('./character.js')

import {forEach, map} from 'fast.js'

Character.npcActions = require('./ui/vendor/npc-actions.js').npcActions
Character.openInteraction = require('./ui/vendor/interaction.js').openInteraction

Character.copy = function copy(to, from) {
    for (var prop in from) {
        if(from[prop] instanceof Object && !Array.isArray(from[prop])) {
            to[prop] = {}
            copy(to[prop], from[prop])
        } else {
            to[prop] = from[prop]
        }
    }
}

export var spriteDir = 'characters/'
export var animations = ['idle', 'run', 'dig', 'craft', 'attack', 'sit', 'ride']
export var clothes = ['feet', 'legs', 'body', 'head']

Character.spriteDir = spriteDir
Character.animations = animations
Character.clothes = clothes

Character.clothesIndex = function(name) { return clothes.indexOf(name) }

Character.skull = null

Character.nakedSprites = {}
Character.weaponSprites = {}
Character.effectSprites = {}

Character.flags = {
    Empire: null,
    Confederation: null,
}

Character.initSprites = function() {
    forEach(Character.animations, (animation)=> {
        var sprite = new Sprite(`${spriteDir}man/${animation}/naked.png`)
        Character.nakedSprites[animation] = sprite
    })

    forEach(['sword'], (weapon)=> {
        var sprite = new Sprite(`${spriteDir}man/weapon/${weapon}.png`)
        Character.weaponSprites[weapon] = sprite
    })

    // shared by all characters; stupid by fast?
    forEach([['stun', 64, 42]], (effect)=> {
        var name = effect[0]
        var width = effect[1]
        var height = effect[2]
        var sprite = new Sprite(`${spriteDir}effects/${name}.png`, width, height)
        Character.effectSprites[name] = sprite
    })

    Character.skull = new Sprite('skull.png')

    Character.flags.Empire = new Sprite('icons/flags/empire.png')
    Character.flags.Confederation = new Sprite('icons/flags/confederation.png')
    Character.flags.red = new Sprite('icons/flags/red.png')
    Character.flags.blue = new Sprite('icons/flags/blue.png')

    Character.pvpFlag = new Sprite('icons/pvp.png')
}

Character.sex = function(sex) {
    return ['male', 'female'][sex]
}

Character.partyLoadQueue = {}
