var Stage = require('./stage.js')
var dom = require('../dom.js')
var cnf = require('../config.js')

import Vue from 'vue'

Vue.config.debug = true

Stage.add(module, createCharacterStage)

function createCharacterStage () {
    /*jshint validthis:true */
    var creator = this.creator = new Vue(createCharacterStage.app).$mount().$appendTo(document.body)
    creator.visible = true
    creator.login = game.login
    //panel.show(cnf.LOBBY_X + game.offset.x, cnf.LOBBY_Y + game.offset.y);
}

createCharacterStage.prototype.sync = function(data) {
    if (data.Warning) {
        game.alert(data.Warning);
    } else {
        game.setStage('loading', data);
    }
}
createCharacterStage.prototype.end = function() {
    this.creator.$destroy(true)
    this.creator = null
}

var allProfs = [
    {
        name: "Blacksmith",
        desc: "Куй железо, пока горячо! Кузнецы Рогалии создают инструменты, что так необходимы всем поселенцам: оружие, доспехи и множество прочих шедевров из металла!",
        skills: {
            "Metalworking": 10,
            "Mining": 5,
        }
    },
    {
        name: "Tailor",
        desc: "Самая романтичная профессия в Империи. Портные создают не только великолепную одежду и изделия из ткани, но и пишут восхитительной красоты картины.",
        skills: {
            "Tailoring": 10,
            "Leatherworking": 5,
        }
    },
    {
        name: "Alchemyst",
        desc: "Алхимики Рогалии — это люди, которых боятся и уважают все жители. Они способны управлять силой атомов, создавая гениальные изобретения, собирать сложные механизмы, а так же создавать магические свитки разрушительной мощи.",
        skills: {
            Alchemy: 10,
            Mechanics: 5,
        }
    },
    {
        name: "Farmer",
        desc: "Главные поставщики продовольствия. Они выращивают все, что можно вырастить в Новых Землях. Безкрайние поля, долгий и упорный труд — вот ваше ремесло.",
        skills: {
            Farming: 10,
            Fishing: 5,
        }
    },
    {
        name: "Carpenter",
        desc: "Люди, создающие великолепные конструкции из древесины, которые всегда пользуются спросом у людей.",
        skills: {
            Carpentry: 10,
            Lumberjacking: 5,
        }
    },
    {
        name: "Cook",
        desc: "Человек, знающий как выжить в дикой природе, найти себе ночлег и добыть еды. Ловкие и внимательные, в схватке с диким зверем выходят победителями.",
        skills: {
            Cooking: 10,
            Herbalism: 5,
        }
    },
    {
        name: "Hunter",
        skills: {
            Swordsmanship: 10,
            Survival: 5,
        }
    }
]


createCharacterStage.app = {
    template: require('raw!./create-character.html'),

    components: {
        'panel': require('../ui/panel.js').default,
    },

    data: function() {
        return {
            login: '',
            name: '',
            sex: 'male',
            professions: allProfs,
            current: 'Farmer',
        }
    },
    ready: function() {
        var el = this.$el.querySelector('.name')
        el.focus()
    },
    methods: {
        mainSkill: function(idx) {
            return Object.keys(this.professions[idx].skills)[0].toLowerCase()
        },
        create: function() {
            console.log('create character')

            if (!name.value) {
                game.alert(T('Please enter name'));
                return
            }

            var skills
            for (var i = 0, l = this.professions.length; i < l; i++) {
                var prof = this.professions[i]
                if(prof.name == this.current) {
                    // cleanup vue bindings
                    skills = JSON.parse(JSON.stringify(prof.skills))
                    break
                }
            }

            if (!skills) {
                console.error('wtf? empty skills')
                return
            }

            game.playerName = this.name
            game.network.send(
                'create-character', {
                    Name: this.name,
                    Skills: skills,
                    Sex: (this.sex == 'female') ? 1 : 0,
                }
            )
        },
        back: function() {
            console.log('back')
            game.setStage('lobby')
        },
    },
}
