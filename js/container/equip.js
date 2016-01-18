'use strict'

var Container = require('./container.js')

module.exports = ContainerEquip

function ContainerEquip() {
    Container.call(this, {Id: 0});
    this.hash = "";
}

ContainerEquip.prototype = Object.create(Container.prototype, {
    init: { value: function() {
        this._slots = game.player.Equip;
        this._slotsWidth = 1;
        this._slotsHeight = this._slots.length;
        this.name = TS("Equip");
    }},
    sync: { value: function() {
        this._slots = game.player.Equip;
    }},
});

ContainerEquip.constructor = ContainerEquip;
