'use strict'

var util = require('./util')
var Panel = require('./panel')

//TODO: use panel methods!
module.exports = function Menu() {
    this.container = null;
    this.visible = false;
    this.length = 0;
};

module.exports.prototype = {
    activate: function(index) {
        //TODO: use internal array;
        var item = document.getElementById("menu-item-" + index);
        if (item)
            item.click();
    },
    show: function(object, x, y, reuse, defaultAction) {
        if (game.player.acting)
            return false;
        if (!object)
            return false;
        var actions = object;

        if ("getActions" in object)
            actions = object.getActions();

        if (!actions)
            return false;

        if (reuse && this.container) {
            x = this.container.x;
            y = this.container.y;
        } else {
            x = (x || game.controller.mouse.x);
            y = (y || game.controller.mouse.y);
        }

        if (!Array.isArray(actions))
            actions = [actions];

        if (defaultAction)
            actions[0]["Use"] = object.defaultAction; // jshint ignore:line

        this.length = 0;
        var contents = actions.filter(function(actions) {
            return (Object.keys(actions).length > 0);
        }).map(function(actions) {
            return this.createMenu(actions, object);
        }.bind(this));

        this.container = new Panel("menu", "Menu", contents);
        this.container.hideTitle();
        this.container.show(x, y);

        this.visible = true;
        return true;
    },
    mouseover: function(e) {
        var menuItem = e.target;
        var item = menuItem.item;
        if (!item)
            return;
        game.controller.world.menuHovered = item;
    },
    hide: function() {
        if(!this.visible)
            return;
        this.container.hide();
        this.visible = false;
        game.controller.world.menuHovered = null;
    },
    createMenuItem: function(title, action, object, index) {
        if (title == "Destroy")
            index = 0;

        var item_a = document.createElement("a");
        item_a.textContent = index + ". " + TS(util.stringToSymbol(title));
        item_a.className = "action";
        var callback
        if (action instanceof Function) {
            callback = action.bind(object);
        } else {
            item_a.item = action.item;
            item_a.addEventListener("mousemove", this.mouseover);
            callback = action.callback.bind(action.item);
        }

        item_a.onclick = function() {
            this.hide();
            callback();
        }.bind(this);
        item_a.id = "menu-item-" + index;

        var item = document.createElement("li");
        item.appendChild(item_a);
        return item;
    },
    createMenu: function(actions, object) {
        var menu = document.createElement("ul");
        var sorted = Object.keys(actions).sort(function(a, b) {
            if (a == "Destroy")
                return +1;
            else
                return TS(a) > TS(b);
        });
        sorted.forEach(function(title) {
            //TODO: fixme controller.drawItemsMenu hack and remove trim
            var menuItem = this.createMenuItem(title.trim(), actions[title], object, ++this.length);
            menu.appendChild(menuItem);
        }.bind(this));
        return menu;
    }
};
