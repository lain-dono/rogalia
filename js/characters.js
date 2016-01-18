'use strict'

var Character = require('./character.js')
var Sprite = require('./sprite.js')
var Panel = require('./panel.js')
var Quest = require('./ui/quests/quest.js')
var Vendor = require('./ui/vendor.js')
var Exchange = require('./ui/exchange.js')
var Bank = require('./ui/bank.js')
var dom = require('./dom.js')

Character.equipSlots =  [
    "bag",
    "right-hand",
    "left-hand",
    "head",
    "neck",
    "body",
    "legs",
    "feet",
];

Character.attrs = ["Strength", "Vitality", "Dexterity", "Intellect", "Perception", "Wisdom"];
Character.vitamins = ["Protein", "Fat", "Carbohydrate", "Phosphorus", "Calcium", "Magnesium"];

Character.copy = function copy(to, from) {
    for(var prop in from) {
        if(from[prop] instanceof Object && !Array.isArray(from[prop])) {
            to[prop] = {};
            copy(to[prop], from[prop]);
        } else {
            to[prop] = from[prop];
        }
    }
};

Character.sync = function(data, remove) {
    remove && remove.forEach(game.removeCharacterById); // jshint ignore:line
    for (var id in data) {
        var from = data[id];
        var to = game.entities.get(id);
        if (!to) {
            to = new Character(id, from.Name);
            to.init(from);
            game.addCharacter(to);
        } else {
            to.sync(from);
        }
    }
    game.player.updateEffects();
    game.controller.syncMinimap();
};

Character.drawActions = function() {
    game.characters.forEach(function(c) {
        c.drawAction();
    });
};

Character.spriteDir = "characters/";

Character.animations = ["idle", "run", "dig", "craft", "attack", "sit"];
Character.clothes = ["feet", "legs", "body", "head"];

Character.clothesIndex = function(name) {
    return Character.clothes.indexOf(name);
};

Character.skull = null;

Character.nakedSprites = {};
Character.weaponSprites = {};
Character.effectSprites = {};

Character.flags = {
    Empire: null,
    Confederation: null,
};

Character.initSprites = function() {
    Character.animations.forEach(function(animation) {
        var path = Character.spriteDir + "/man/" + animation + "/naked.png";
        var sprite = new Sprite(path);
        Character.nakedSprites[animation] = sprite;
    });
    ["sword"].forEach(function(weapon) {
        var sprite = new Sprite(Character.spriteDir + "/man/weapon/" + weapon + ".png");
        Character.weaponSprites[weapon] = sprite;
    });
    // shared by all characters; stupid by fast?
    [["stun", 64, 42]].forEach(function(effect) {
        var name = effect[0];
        var width = effect[1];
        var height = effect[2];
        var sprite = new Sprite(Character.spriteDir + "/effects/" + name + ".png", width, height);
        Character.effectSprites[name] = sprite;
    });
    Character.skull = new Sprite("skull.png");

    Character.flags.Empire = new Sprite("icons/flags/empire.png");
    Character.flags.Confederation = new Sprite("icons/flags/confederation.png");
    Character.pvpFlag = new Sprite("icons/pvp.png");
};

Character.sex = function(sex) {
    return ["male", "female"][sex];
};

Character.partyLoadQueue = {};

Character.npcActions = {
    "Set citizenship": function() {
        var id = this.Id;
        var set = function(name) {
            return function() {
                game.network.send("set-citizenship", {Id: id, Name: name});
            };
        };
        var citizenships = {
            "I choose Empire": set("Empire"),
            "I choose Confederation": set("Confederation"),
            "I want to be free": set(""),
        };
        game.menu.show(citizenships);
    },
    "Get claim": function() {
        game.network.send("get-claim", {Id: this.Id});
    },
    "Get village claim": function() {
        var name = prompt("Name?", "");
        if (name)
            game.network.send("get-village-claim", {Id: this.Id, Name: name});
    },
    "Bank": function() {
        new Bank();
    },
    "Exchange": function() {
        new Exchange();
    },
    "Quest": function() {
        var quests = this.getQuests();
        //TODO: remove quest button from dialog, instead of this stupid warning
        if (quests.length === 0) {
            game.controller.showWarning(T("No more quests"));
            return;
        }
        var self = this;
        var talks = {};
        quests.forEach(function(q) {
            var quest = new Quest(q);
            var name = quest.getName() + " (" + quest.getStatusMarker() + ")";
            talks[name] = function() {
                var panel = new Panel("quest", "Quest", quest.getContents());
                panel.quest = quest;
                panel.entity = self;
                panel.show();
            };
        });
        game.menu.show(talks);
    },
    "Talk": function() {
        var self = this;
        var info = this.getTalks();
        var panel = new Panel(
            "interaction",
            this.Name,
            [
                dom.wrap("", info.talks.map(function(text) {
                    return dom.tag("p", "", {text: text});
                })),
                dom.make("ul", Object.keys(info.actions).map(function(title) {
                    return dom.tag("li", "talk-link", {
                        text: info.actions[title],
                        onclick: function() {
                            panel.close();
                            Character.npcActions[title].call(self);
                        }
                    });
                })),
            ]
        );
        panel.entity = this;
        panel.show();

    },
    "Trade": function() {
        game.controller.vendor.open(this);
    },
    "Auction": function() {
        game.controller.auction.open(this);
    },
    "Drink water": function() {
        game.network.send("buy-water", {Id: this.Id});
    },
    "Buy sex": function() {
        game.network.send("buy-sex", {Id: this.Id});
    },
    "Buy indulgence": function() {
        game.alert("Пока не реализовано :-(");
    },
    "Show instances": function() {
        var self = this;
        game.network.send("instance-list", {}, function(data) {
            if (!data.Instances) {
                game.alert(T("No available instances"));
                return;
            }

            var instances = dom.table(
                [T("Name"), T("Min"), T("Max"), T("Cost"), ""],
                data.Instances.map(function(instance) {
                    var enter = dom.button(T("Enter"));
                    enter.onclick = function() {
                        game.network.send("instance", {Name: instance.Name});
                    };
                    return [
                        TS(instance.Name),
                        instance.MinLvl,
                        instance.MaxLvl,
                        Vendor.createPrice(instance.Cost),
                        enter,
                    ];
                    /* XXX
                    return inst;
                    */
                })
            );
            new Panel("instances", "Instances", [instances]).show().setEntity(self);
        });
    },
};
