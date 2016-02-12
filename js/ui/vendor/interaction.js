import Vue from 'vue'
import {map, forEach} from 'fast.js'

import {getTalks} from './talks.js'
import {npcActions} from './npc-actions.js'
import {
    setCitizenship,
    getClaim, getVillageClaim,
    buyWater, buySex,
    instanceList, instanceTurn,

    bankDeposit, bankWithdraw,
    bankPayClaim, bankInfo,
    bankBuyVaultSlot
} from '../../network-protocol.js'
import util from '../../util.js'

import Entity from '../../entity.js'
import Container from '../../container/container.js'

export function openInteraction(id, self) {
    app.id = id
    app.visible = true
    app.$char = self
    // reset
    app.type = 'talks'
    app.instances = []
}

export var app = new Vue({
    template: require('raw!./interaction.html'),
    components: {
        'panel': require('../panel.js').default,
        'price': require('./price.js').default,
    },
    filters: {
        date(unixtime) {
            if (unixtime > 0) {
                return util.date.human(new Date(unixtime * 1000))
            }
            return '-'
        },
    },
    data() {
        return {
            id: 0,
            visible: false,
            instances: [],

            type: 'talks',

            cost: 0,

            balance: 0,
            rent: 0,
            claim: {
                lastPaid: 0,
                paidTill: 0,
            },
            vault: [],
        }
    },
    methods: {
        action(title) {
            var ch = game.characters.get(this.id)
            if (!ch) {
                console.warn('wtf? not char', this.id)
                return
            }
            console.log('action', this.id, title)
            switch (title) {
            case 'Show instances':
                this.loadInstances()
                break
            case 'Drink water':
                buyWater(ch.Id)
                this.visible = false
                break
            case 'Buy sex':
                buySex(ch.Id)
                this.visible = false
                break
            case 'Bank':
                bankInfo(this.loadBank.bind(this))
                break
            default:
                npcActions[title].call(ch)
            }
        },
        instanceTurn(name) {
            instanceTurn(name)
        },
        loadInstances() {
            this.instances = []
            instanceList((data)=> {
                if (!data.Instances) {
                    game.alert(T('No available instances'))
                    return
                }
                this.instances = map(data.Instances, (inst)=>{
                    return {
                        name: inst.Name,
                        min: inst.MinLvl,
                        max: inst.MaxLvl,
                        cost: inst.Cost,
                    }
                })
                this.type = 'instances'
                console.info('loaded instances', data.Instances)
                //new Panel('instances', 'Instances', [instances]).show().setEntity(this)
            })
        },

        onVault(idx) {
            var bag = this.vault[idx]
            if (!bag.unlocked) {
                if (confirm(TT('Buy slot {cost} gold?', bag.cost))) {
                    bankBuyVaultSlot(this.loadBank.bind(this))
                }
            } else {
                var entity = Entity.get(bag.id)
                Container.show(entity)
            }
        },
        getBagIcon(idx) {
            return Entity.get(this.vault[idx].id).iconSrc()
        },

        deposit()      { bankDeposit(this.cost, this.loadBank.bind(this)) },
        withdraw()     { bankWithdraw(this.cost, this.loadBank.bind(this)) },
        payClaim()     {
            if (confirm(T('Confirm?'))) {
                bankPayClaim(this.loadBank.bind(this))
            }
        },

        loadBank(data) {
            console.info('load bank data', data)
            this.type = 'bank'
            if (!data.Bank) {
                return
            }
            this.balance = data.Bank.Balance
            this.rent = data.Bank.Claim.Cost
            this.claim.lastPaid = data.Bank.Claim.LastPaid
            this.claim.paidTill = data.Bank.Claim.PaidTill
            this.vault = map(data.Bank.Vault, (el, idx)=> {
                return {
                    id: el.Id,
                    unlocked: el.Unlocked,
                    cost: Math.pow(100, idx),
                }
            })
        },
    },
    computed: {
        isValid() { return this.id !== 0 },
        name() {
            switch (this.type) {
            case 'bank':      return 'Bank'
            case 'instances': return 'Instances'
            }

            if (!this.id) {
                return 'empty'
            }

            if (this.instances.length) {
                return 'Instances'
            }

            var ch = game.characters.get(this.id)
            return ch? ch.Name: 'fail char'
        },
        hasQuest() {
            var ch = game.characters.get(this.id)
            return ch.getQuests().length > 0
        },
        actions() {
            var ch = game.characters.get(this.id)
            if (!ch) {
                console.warn('wtf? not char', this.id)
                return []
            }

            return getTalks(ch.Type, ch.Name).actions
        },
        talks() {
            var ch = game.characters.get(this.id)
            if (!ch) {
                console.warn('wtf? not char')
                return []
            }
            var info = getTalks(ch.Type, ch.Name)
            return info? info.talks: []
        },
    },
}).$mount().$appendTo(document.body)

// TODO: remove margo hack
//if (this.Type == 'vendor' && this.Owner != 0 && this.Name != 'Margo') {
    //game.controller.vendor.open(this)
    //return
//}

