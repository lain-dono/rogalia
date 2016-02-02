'use strict'

require("style!raw!./slot.css")

var Container = require('./container.js')
var dom = require('../dom.js')
var util = require('../util.js')

var vutil = require('vue').util

ContainerSlot.vv = {
    props: {
        title:  { type: String,  default: '' },
        icon:   { type: String,  default: '' },
        sub:    { type: String,  default: '' },
        viewed: { type: Boolean, default: false },
        locked: { type: Boolean, default: false },
    },
    data: function() {
        return {
            hasItem: false,
            almostBroken: false,
            quality: '',
            spriteVersion: '',
        }
    },
    methods: {
        set: function(entity) {
            if (this.$entity == entity && this.spriteVersion == entity.spriteVersion()) {
                this.update()
                return
            }

            this.clear()

            this.$entity = entity

            this.quality = entity.Quality
            this.hasItem = true
            this.spriteVersion = entity.spriteVersion()
            this.almostBroken = entity.almostBroken()

            var icon = this.$icon = entity.icon()
            icon.classList.add('item')
            icon.slot = this
            vutil.prepend(this.$el, icon)

            this.update()
        },

        clear: function() {
            this.$entity = null

            if (this.$icon) {
                vutil.remove(this.$icon)
            }

            this.sup = ''

            this.quality = ''
            this.spriteVersion = ''
            this.hasItem = false
            this.almostBroken = false

            this.viewed = false
            this.locked = false

            this.$emit('clear')
        },

        update: function() {
            this.updateProgress()

            var entity = this.$entity
            this.title = entity.name

            // updateCustom
            if (entity.Group == 'atom') {
                this.sub = entity.Type
            } else if ('Amount' in entity) {
                this.sub = entity.Amount
            } else if (entity.SpawnChance > 0) {
                this.sub = entity.SpawnChance
            }

            this.$emit('update')
        },

        // only internal usage
        updateProgress: function() {
            var entity = this.$entity
            var cnt = this.$container.$entity

            if ('Readiness' in entity && 'Fuel' in cnt) {
                var rd = entity.Readiness
                if (rd.Max !== 0) {
                    this.sub = util.toFixed(100*rd.Current / rd.Max) + '%'
                }
                return
            }

            //TODO: make generic `progress' @server-side

            if (!('HideAdded' in cnt)) {
                return
            }

            var added = new Date(cnt.HideAdded)
            var duration = cnt.HideDuration / 1e6
            var diff = Date.now() - added
            if (diff < duration) {
                this.sub = util.toFixed(100*diff / duration) + '%'
            }
        },
    },
}

module.exports = ContainerSlot

function ContainerSlot(container, index) {
    this.container = container;
    this.index = index;

    this.icon = null;
    this.entity = null;
    this.locked = false;
    this.spriteVersion = "";

    this.element = dom.slot();
    this.element.maxWidth = Container.SLOT_SIZE + "px";
    this.element.maxHeight = Container.SLOT_SIZE + "px";
    this.element.slot = this;

    this.sub = null;

    this.onclear = function() {};
}

ContainerSlot.prototype = {
    setTitle: function(title) {
        this.element.title = title;
    },
    markAsUnseen: function() {
        this.element.classList.add("new");
    },
    markAsSeen: function() {
        this.element.classList.remove("new");
    },
    lock: function() {
        this.locked = true;
        this.element.classList.add("locked");
    },
    unlock: function(entity) {
        this.locked = false;
        this.element.classList.remove("locked");
    },
    clear: function() {
        this.entity = null;
        this.sub = null;
        dom.clear(this.element);
        this.element.classList.remove("has-item");
        this.setTitle("");
        this.markAsSeen();
        this.unlock();
        this.onclear();
    },
    set: function(entity) {
        if (this.entity == entity && this.spriteVersion == entity.spriteVersion()) {
            this.update();
            return;
        }
        this.spriteVersion = entity.spriteVersion();
        this.clear();
        this.entity = entity;
        this.element.classList.add("has-item");

        var quality = document.createElement("sup");
        quality.className = "quality";
        quality.textContent = entity.Quality;
        if (entity.almostBroken())
            quality.classList.add("almost-broken");

        var icon = entity.icon();
        icon.classList.add("item");
        icon.slot = this;

        this.element.appendChild(icon);
        this.element.appendChild(quality);

        this.update();
    },
    setSub: function(text) {
        if (this.sub === null) {
            this.sub = document.createElement("sub");
            this.element.appendChild(this.sub);
        }
        this.sub.textContent = text;
    },
    update: function() {
        this.updateProgress();
        this.updateCustom();
        this.setTitle(this.entity.name);
    },
    updateProgress: function() {
        if ("Readiness" in this.entity && "Fuel" in this.container.entity) {
            var rd = this.entity.Readiness;
            if (rd.Max !== 0)
                this.setSub(util.toFixed(100*rd.Current / rd.Max) + "%");
            return;
        }
        //TODO: make generic `progress' @server-side
        var cnt = this.container.entity;
        if (!("HideAdded" in cnt))
            return;
        var added = new Date(cnt.HideAdded);
        var duration = cnt.HideDuration / 1e6;
        var diff = Date.now() - added;
        if (diff < duration) {
            this.setSub(util.toFixed(100*diff / duration) + "%");
        }
    },
    updateCustom: function() {
        if (this.entity.Group == "atom") {
            this.setSub(this.entity.Type);
        } else if ("Amount" in this.entity) {
            this.setSub(this.entity.Amount);
        } else if (this.entity.SpawnChance > 0) {
            this.setSub(this.entity.SpawnChance);
        }
    },
};
