var Panel = require('./panel.js')
var Entity = require('./entity.js')
var Container = require('./container/container.js')
var dom = require('./dom.js')
var util = require('./util.js')
var cnf = require('./config.js')

module.exports = Info

function Info(message, character) {
    this.data = message.Data;
    this.character = character;
    this.text = null;
    this.type = message.Type;
    this.time = Date.now();
    this.x = 0;
    this.y = 0;
    this.duration = 2500;
    this.value = null;

    this.target = this.getTarget();

    if (!this.target) // target disappared (tp or death)
        return;

    this.targetType = "other";

    if (this.target == game.player)
        this.targetType = "self";
    else if (this.character == game.player)
        this.targetType = "target";

    if (game.help)
        game.help.runHook(this);

    switch(this.type) {
    case "lvl-up":
        this.character.playAnimation({
            up: {
                name: "lvl-up",
                width: 100,
                height: 220,
            },
            down: {
                name: "lvl-up",
                width: 100,
                height: 60,
            }
        });
        game.sound.playSound("lvl-up");
        break;
    case "attack":
        this.target.playAnimation({
            up: {
                name: "damage",
                width: 64,
                height: 63,
                dy: -this.target.sprite.height/2,
            },
        });
        if (this.target.IsNpc)
            game.sound.playSound("hit");
        else
            game.sound.playSound("punch");
        /* falls through */
    case "damage":
        this.value = this.data.Value;
        break;
    case "combo":
        this.text = this.data.Combo;
        this.x = 30;
        break;
    case "exp-gain":
        this.value = this.data;
        break;
    case "heal":
        this.value = this.data;
        if (this.value > this.character.Hp.Max/10) {
            this.character.playAnimation({
                up: {
                    name: "heal",
                    width: 96,
                    height: 128,
                    dy: -8
                },
                down: {
                    name: "heal",
                    width: 96,
                    height: 128,
                    dy: -8
                }
            });
            game.sound.playSound("heal");
        }
        break;
    case "craft-success":
    case "item-gain":
        if (this.character.isPlayer) {
            var ids = ("Ids" in this.data) ? this.data.Ids : [this.data.Id];
            game.controller.highlight("inventory", true);
            ids.forEach(function(id) {
                var entity = Entity.get(id);
                if (!entity) {
                    game.sendErrorf("(Info.js) Cannot find item %d", id);
                    return;
                }
                var cnt = entity.findContainer();
                // container is not available for current player
                if (!cnt) {
                    return;
                }
                var container = Container.get(cnt);
                // container was not oppened
                if (!container)
                    return;
                container.update();
                container.findSlot(entity).markAsUnseen();
            });
        }
        break;
    case ".invite":
        var name = this.data;
        var invite = dom.tag("p", "", {text: TT("{name} invites you to a party", {name: name})});
        var accept = dom.button(T("Accept"));
        accept.onclick = function() {
            game.chat.send("*accept-invite " + name);
            panel.close();
        };
        var deny = dom.button(T("Deny"));
        deny.onclick = function() {
            game.chat.send("*deny-invite " + name);
            panel.close();
        };

        var panel = new Panel("invite", "Invite", [invite, accept, deny]);
        panel.show();
        return;
    }
    this.value = util.toFixed(this.value, (this.value < 1) ? 2 : 0);

    var formatter = this.formatters[this.type];
    if (formatter)
        this.text = formatter.call(this);
    else if (message.Text)
        this.text = TT(message.Text);

    if (!this.text)
        return;


    if (game.chat)
        game.chat.addMessage(this.text);
    else
        console.warn(this.text, "Chat is null");

    if (!this.data) {
        var record = dom.div("info-message", {text: this.text});
        document.getElementById("messages").appendChild(record);
        setTimeout(function() {
            dom.remove(record);
        }, this.duration);
    }
}

Info.prototype = {
    update: function(k) {
        if (this.time + this.duration < Date.now()) {
            this.character.info.splice(this.character.info.indexOf(this), 1);
            return;
        }
        switch(this.type) {
        case "text":
            break;
        default:
            this.y -= 20 * k;
        }
    },
    draw: function() {
        if (!this.target) //on teleport/death can be empty
            return;

        var big = 20;
        var bigger = 30;
        var huge = 50;
        switch(this.type) {
        case "heal":
            this.drawValue(
                "+" + this.value + "hp",
                {
                    self: ["#0c0", big],
                    target: ["#0f0", big],
                    other: ["#0c0"],
                }
            );
            break;
        case "currency-gain":
            this.drawValue(
                "$" + this.data,
                {
                    self: ["#3c3", big],
                    other: ["#3c3"],
                }
            );
            break;
        case "exp-gain":
            this.drawValue(
                "+" + this.value + "xp",
                {
                    self: ["#ff0", big],
                    other: ["#ff0"],
                }
            );
            break;
        case "miss":
        case "block":
            this.drawValue(
                this.type,
                {
                    self: ["#c33", big],
                    target: ["#aac", bigger],
                    other: ["#ccc"],
                }
            );
            break;
        case "damage":
            this.drawValue(
                this.value,
                {
                    self: ["#c33"],
                    target: ["#aac"],
                    other: ["#e66"],
                }
            );
            break;
        case "attack":
            this.drawValue(
                this.value,
                {
                    self: ["#f33", big],
                    target: ["#aaf", bigger],
                    other: ["#ccc"],
                }
            );
            break;
        case "combo":
            this.drawValue(
                this.text,
                {
                    self: ["#f33", big],
                    target: ["#aaf", huge],
                    other: ["#ccc"],
                }
            );
            break;
        }
    },
    drawValue: function(text, config) {
        var target = this.target;

        config = config[this.targetType];

        var color = config[0] || "#f00";
        var size = config[1];

        game.ctx.fillStyle = color;

        var p = target.screen();
        p.y -= target.sprite.nameOffset + 2*cnf.FONT_SIZE;
        p.x += this.x - game.ctx.measureText(text).width / 2;

        if (size) {
            game.setFontSize(size);
            p.x += size;
        }


        game.drawStrokedText(text, p.x, p.y + this.y);

        if (size)
            game.setFontSize();
    },
    getTarget: function() {
        switch (this.type) {
        case "murder":
        case "miss":
        case "block":
            return game.characters.get(this.data);
        case "combo":
        case "attack":
            return game.characters.get(this.data.Target);
        }
        return this.character;
    },
    formatters: {
        "lvl-up": function() {
            switch (this.targetType) {
            case "self":
                return  T("Lvl up") + ": " + this.character.Lvl + "!";
            default:
                return TT("{name} got a new lvl", {name: this.character.Name});
            }
        },
        "cast": function() {
            switch (this.targetType) {
            case "self":
                return  TT("Casting {spell}", {spell: this.data});
            default:
                return  TT("{name} is casting {spell}", {
                    name: this.character.Name,
                    spell: this.data,
                });
            }
        },
        "exp-gain": function() {
            switch (this.targetType) {
            case "self":
                return TT("You've got {value} XP and LP", {value: this.value});
            default:
                return TT("{name} got {value} XP and LP", {
                    name: this.character.Name,
                    value: this.value,
                });
            }
        },
        "currency-gain": function() {
            switch (this.targetType) {
            case "self":
                return TT("You've got {value}", {value: this.data});
            default:
                return TT("{name} have got {value}", {
                    name: this.character.Name,
                    value: this.data,
                    sex: this.character.Sex,
                });
            }
        },
        "item-gain": function() {
            switch (this.targetType) {
            case "self":
                return TT("You've got {value}", {value: this.data.Name});
            default:
                return TT("{name} have got {value}", {
                    name: this.character.Name,
                    value: this.data.Name,
                    sex: this.character.Sex,
                });
            }
        },
        "craft-success": function() {
            switch (this.targetType) {
            case "self":
                return TT("You've crafted {item}", {item: this.data.Name});
            default:
                return TT("{name} have crafted {item}", {
                    name: this.character.Name,
                    item: this.data.Name,
                });
            }
        },
        "miss": function() {
            switch (this.targetType) {
            case "self":
                return TT("You evaded from {name}'s attack", {
                    name: this.character.Name,
                    sex: this.character.Sex,
                });
            case "target":
                return TT("{name} evaded from your attack", {
                    name: this.target.Name,
                    sex: this.target.Sex,
                });
            default:
                return TT(
                    "{who} evaded from {which}'s attack",
                    {who: this.target.Name, which: this.character.Name}
                );
            }
        },
        "block": function() {
            switch (this.targetType) {
            case "self":
                return TT("Blocked {name}'s attack", {name: this.character.Name});
            case "target":
                return TT("{name} blocked your attack", {name: this.target.Name});
            default:
                return TT(
                    "{who} blocked {which}'s attack",
                    {who: this.target.Name, which: this.character.Name}
                );
            }
        },
        "murder": function() {
            switch (this.targetType) {
            case "self":
                return TT("{name} killed you", {name: this.character.Name});
            case "target":
                return TT("You killed {name}", {name: this.target.Name});
            default:
                return TT(
                    "{who} killed {whom}",
                    {who: this.target.Name, whom: this.character.Name}
                );
            }
        },
        "damage": function () {
            switch (this.targetType) {
            case "self":
                return TT("You've got {value} damage from {source}", {
                    value: this.value,
                    source: this.data.Source,
                });
            default:
                return TT("{name} got {value} damage from {source}", {
                    name: this.character.Name,
                    value: this.value,
                    source: this.data.Source,
                });
            }
        },
        "attack": function() {
            switch (this.targetType) {
            case "self":
                return TT("{name} did {value} damage to you with {attack}", {
                    name: this.character.Name,
                    value: this.value,
                    attack: this.data.Attack,
                });
            case "target":
                return TT("You did {value} damage to {name} with {attack}", {
                    name: this.target.Name,
                    value: this.value,
                    attack: this.data.Attack,
                });
            default:
                return TT(
                    "{who} did {value} damage to {whom} with {attack}", {
                        who: this.character.Name,
                        value: this.value,
                        whom: this.target.Name,
                        attack: this.data.Attack,
                    }
                );
            }
        },
    }
};
