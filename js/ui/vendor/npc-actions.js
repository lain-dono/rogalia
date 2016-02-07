import Panel from '../../panel.js'
import Quest from '../quests/quest.js'
import Vendor from './vendor.js'
import Exchange from './exchange.js'
import Bank from './bank.js'
import Auction from './auction.js'
import dom from '../../dom.js'

import {map} from 'fast.js'

import {
    setCitizenship,
    getClaim, getVillageClaim,
    buyWater, buySex,
    instanceList, instanceTurn
} from '../../network-protocol.js'

import {getTalks} from './talks.js'

var auction = new Auction()

export var npcActions = {
    'Set citizenship': function() {
        game.menu.show({
            'I choose Empire':        ()=> { setCitizenship(this.Id, 'Empire') },
            'I choose Confederation': ()=> { setCitizenship(this.Id, 'Confederation') },
            'I want to be free':      ()=> { setCitizenship(this.Id, '') },
        })
    },
    'Get claim': function() {
        getClaim(this.Id)
    },
    'Get village claim': ()=> {
        var name = prompt('Name?', '')
        if (name) {
            getVillageClaim(this.Id, name)
        }
    },
    'Bank': ()=> {
        new Bank()
    },
    'Exchange': function() {
        new Exchange()
    },
    'Quest': function() {
        var quests = this.getQuests()
        //TODO: remove quest button from dialog, instead of this stupid warning
        if (quests.length === 0) {
            game.controller.showWarning(T('No more quests'))
            return
        }
        var talks = {}
        forEach(quests, (q)=> {
            var quest = new Quest(q)
            var name = quest.getName() + ' (' + quest.getStatusMarker() + ')'
            talks[name] = ()=> {
                var panel = new Panel('quest', 'Quest', quest.getContents())
                panel.quest = quest
                panel.entity = this
                panel.show()
            }
        })
        game.menu.show(talks)
    },
    'Talk': function() {
        var info = getTalks(this.Type, this.Name)
        var panel = new Panel(
            'interaction',
            this.Name,
            [
                dom.wrap('', map(info.talks, (text)=> {
                    return dom.tag('p', '', {text: text})
                })),
                dom.make('ul', map(Object.keys(info.actions), (title)=> {
                    return dom.tag('li', 'talk-link', {
                        text: info.actions[title],
                        onclick: function() {
                            panel.close()
                            npcActions[title].call(this)
                        }
                    })
                })),
            ]
        )
        panel.entity = this
        panel.show()
    },
    'Trade': function() {
        game.controller.vendor.open(this)
    },
    'Auction': function() {
        auction.open(this)
    },
    'Drink water': function() {
        buyWater(this.Id)
    },
    'Buy sex': function() {
        buySex(this.Id)
    },
    'Buy indulgence': function() {
        game.alert('Пока не реализовано :-(')
    },
    'Show instances': function() {
        instanceList((data)=> {
            if (!data.Instances) {
                game.alert(T('No available instances'))
                return
            }

            var instances = dom.table(
                [T('Name'), T('Min'), T('Max'), T('Cost'), ''],
                map(data.Instances, (instance)=> {
                    var enter = dom.button(T('Enter'))
                    enter.onclick = ()=> { instanceTurn(instance.Name) }
                    return [
                        TS(instance.Name),
                        instance.MinLvl,
                        instance.MaxLvl,
                        Vendor.createPrice(instance.Cost),
                        enter,
                    ]
                    /* XXX
                    return inst
                    */
                })
            )
            new Panel('instances', 'Instances', [instances]).show().setEntity(this)
        })
    },
}
