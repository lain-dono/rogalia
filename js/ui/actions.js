'use strict'

var util = require('../util.js')
var Character = require('../character.js')

var actions = ['tsuki', 'shomen', 'irimi', 'tenkan', 'kaiten']

var hotbar = game.controller.actionHotbar
var GCD = 500
var timeout

var lastSend = Date.now()

module.exports = {
    template: require('raw!./actions.html'),
    props: {
        exp: Object,
    },
    data() {
        return {
            cooldown: false,
            inProgress: false,
            action: '',
        }
    },
    events: {
        'hotkey': function(key) {
            var action = actions[key-1]
            this.onAction(action)
            console.log('hotkey[%d]:%s', key, action)
        },
        'actions.startProgress': function() {
            if (!this.inProgress && this.active()) {
                this.inProgress = true
                this.loadIcon(this.action + '-active')
            }
        },
        'actions.stopProgress': function() {
            if (this.inProgress && this.active()) {
                this.inProgress = false
                this.loadIcon(this.action)
            }
        },
        'actions.reset': 'reset',
        'actions.setMainCallback': 'setAction'
    },

    attached() {
        var icons = this.$el.querySelectorAll('img')
        Array.prototype.forEach.call(icons, (icon)=> {
            icon.parentNode.addEventListener('mouseover', ()=> {
                icon.src.replace('.png', '-hover.png')
            })
            icon.parentNode.addEventListener('mouseleave', ()=> {
                icon.src.replace('-hover', '')
            })
        })

        // FIXME
        window.isActiveAciton = ()=> { return this.active() }
        window.currentAction = ()=>  { return this.action }
    },

    handler: null,
    icon: null,

    methods: {
        active() { return this.$handler && this.$icon },
        activate() { this.$handler() },
        reset() {
            this.action = ''
            this.inProgress = false

            if (this.$handler) {
                this.$off('actions.main', this.$handler)
            }
            this.$handler = null

            var el = this.$el.querySelector('.main-action')
            if(this.$icon) {
                el.removeChild(this.$icon);
                this.$icon = null
            }
        },
        setAction(action, handler) {
            this.reset()

            this.action = action

            this.$handler = handler
            if (this.$handler) {
                this.$on('actions.main', this.$handler)
            }

            var el = this.$el.querySelector('.main-action')
            this.loadIcon(action)
        },
        loadIcon(action) {
            var el = this.$el.querySelector('.main-action')
            if(this.$icon) {
                el.removeChild(this.$icon)
            }
            this.$icon = loader.loadImage('icons/tools/' + action + '.png')
            el.appendChild(this.$icon)
        },

        onAction(action) {
            if(!action) {
                console.warn('fail action %s', action)
                return
            }

            this.$emit('actions.' + action)
            this.$root.$emit('actions.' + action)

            if (action == 'pick-up') {
                game.player.pickUp()
            }
            if (action == 'lift-up') {
                game.player.liftStart()
            }

            if (actions.indexOf(action) === -1) {
                return
            }

            var now = Date.now()
            if (now - lastSend < GCD) {
                game.controller.showWarning(T('Cooldown'))
                return
            }
            lastSend = now

            if (!game.controller.mouse.isValid()) {
                return
            }

            switch (action) {
            case 'irimi':
            case 'kaiten':
            case 'tenkan':
                break
            default:
                if (!(game.player.target instanceof Character)) {
                    game.player.selectNextTarget()
                }
                if (!(game.player.target instanceof Character)) {
                    game.controller.showWarning('You have no target')
                    return
                }
            }

            var args = { Name: util.ucfirst(action) }
            if (game.player.target) {
                args.Id = game.player.target.Id
            }

            args.X = game.controller.world.x
            args.Y = game.controller.world.y

            game.network.send('waza', args)

            this.cooldown = true

            if (timeout) {
                clearTimeout(timeout)
                timeout = undefined
            }

            timeout = setTimeout(()=> {
                this.cooldown = false
                timeout = undefined
            }, GCD)
        },
    },
}
