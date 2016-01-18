'use strict'

var cnf = require('../config.js')
var dom = require('../dom.js')
var Panel = require('../panel.js')
var Point = require('../point.js')

module.exports = function Minimap() {
    var self = this;
    var width = {
        default: 300,
        original: 0,
        current: 0,
    };
    function scale() {
        return width.current / width.original;
    }

    this.mapImage = new Image();
    this.mapImage.onload = function() {
        width.original = this.mapImage.width;
        width.current = width.default;
        this.mapImage.width = width.default;
    }.bind(this);

    this.mapImage.src = window.location.protocol + "//" + game.network.addr + "/map";

    this.points = {};
    this.characters = [];

    var wrapper = document.createElement("div");
    wrapper.className = "wrapper no-drag";
    wrapper.appendChild(this.mapImage);

    var lvl = 0;
    var zoom = document.createElement("button");
    zoom.textContent = T("Zoom");
    zoom.onclick = function() {
        switch (lvl++) {
        case 0:
            width.current *= 2;
            break;
        case 1:
            wrapper.classList.add("zoom");
            width.current = width.original;
            break;
        case 2:
            width.current = width.default;
            wrapper.classList.remove("zoom");
            lvl = 0;
            break;
        }
        this.rescale();
        this.mapImage.width = width.current;
    }.bind(this);

    function pointFromEvent(e) {
        var rect = e.target.getBoundingClientRect();
        return new Point(e.pageX - rect.left, e.pageY - rect.top).div(scale()).round();
    }

    this.mapImage.onclick = function(e) {
        var p
        if (game.controller.modifier.alt && game.player.IsAdmin) {
            p = pointFromEvent(e).mul(cnf.CELL_SIZE);
            game.network.send("teleport", p.json());
            return;
        }
        p = pointFromEvent(e)
        var point = this.addMarker(p.x, p.y);
        if (game.controller.modifier.shift)
            sendPoint(point)
    }.bind(this);

    this.panel = new Panel(
        "map",
        "Map",
        [wrapper, zoom]
    );

    this.sync = function(data) {
        data = data || {};
        this.characters = data;
        var pl = game.player;
        this.characters[pl.Name] = {X: pl.X, Y: pl.Y};
        for (var name in this.points) {
            if (name in data && data[name] === null) {
                delete this.characters[name];
                removePointByName(name);
            }
        }

        if (this.panel.visible)
            this.update();
    };

    function makePoint(title) {
        var point = dom.div("point");
        point.title = title;
        return point;
    }

    function addPoint(name, point) {
        self.points[name] = point;
        wrapper.appendChild(point);
    }

    function updatePoint(point, x, y) {
        point.x = x;
        point.y = y;
        point.style.left = scale() * x + "px";
        point.style.top = scale() * y + "px";
    }

    function removePointByName(name) {
        dom.remove(self.points[name]);
        delete self.points[name];
    }

    function sendPoint(point) {
        var title = (point.title == point.name) ? "" : " " + point.title;
        game.chat.send("${marker:" + point.x + " " + point.y + title +"}");
    }

    this.rescale = function() {
        for (var name in this.points) {
            var point = this.points[name];
            updatePoint(point, point.x, point.y);
        }
    };

    this.update = function() {
        if (!this.panel.visible)
            return;
        for (var name in this.characters) {
            var character = this.characters[name];
            if (!character)
                continue;
            var x = character.X / cnf.CELL_SIZE;
            var y = character.Y / cnf.CELL_SIZE;
            var point = this.points[name];
            if (!point) {
                point = makePoint(name);

                if (name == game.player.Name) {
                    point.id = "player-point";
                } else if (character.Karma < 0) {
                    point.classList.add("pk");
                    point.title += " | " + T("Karma") + ": " + character.Karma;
                }

                addPoint(name, point);
            }
            updatePoint(point, x, y);
        }
    };

    this.addMarker = function(x, y, title) {
        var name = x + " " + y;
        if (name in this.points)
            return this.points[name];
        var point = makePoint(title || name);
        point.classList.add("marker-point");
        point.name = name;
        addPoint(name, point);
        updatePoint(point, x, y);

        point.onmousedown = function(e) {
            switch (e.button) {
            case game.controller.LMB:
                if (game.controller.modifier.shift) {
                    sendPoint(point);
                } else {
                    var title = prompt(T("Description") + ":");
                    if (title)
                        point.title = title;
                }
                break;
            case game.controller.RMB:
                removePointByName(name);
                break;
            }
        }
        return point;
    };

    this.panel.hooks.show = this.update.bind(this);
}
