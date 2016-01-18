'use strict'

var util = require('../util.js')
var Character = require('../character.js')

module.exports = function Fight() {
    var target = null;

    var GCD = 500;
    var lastSend = Date.now();

    var actions = ["tsuki", "shomen", "irimi", "tenkan", "kaiten"];
    var buttons = actions.map(function(action) {
        var button = document.getElementById(action + "-button");
        button.onclick = function() {
            apply(action);
        };
        return button;
    });

    var hotbar = game.controller.actionHotbar;

    function apply(action) {
        var now = Date.now();
        if (now - lastSend < GCD) {
            game.controller.showWarning(T("Cooldown"));
            return;
        }
        lastSend = now;

        if (!game.controller.mouse.isValid())
            return;

        switch (action) {
        case "irimi":
        case "kaiten":
        case "tenkan":
            break;
        default:
            if (!(game.player.target instanceof Character)) {
                game.player.selectNextTarget();
            }
            if (!(game.player.target instanceof Character)) {
                game.controller.showWarning("You have no target");
                return;
            }
        }

        var args = {Name: util.ucfirst(action)};
        if (game.player.target)
            args.Id = game.player.target.Id;

        args.X = game.controller.world.x;
        args.Y = game.controller.world.y;

        game.network.send("waza", args);

        hotbar.classList.add("cooldown");
        setTimeout(function() {
            hotbar.classList.remove("cooldown");
        }, GCD);
    }

    this.update = function() {
        if (game.player.idle()) {
            //TODO: unlock panel
        }
    };

    this.hotkey = function(key) {
        var action = actions[key-1];
        apply(action);
    };
}
