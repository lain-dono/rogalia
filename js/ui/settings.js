'use strict'

require('style!raw!./settings.css')

var config = require('../config.js').config
var debug = require('../config.js').debug
var descriptions = require('../lang/ru/settings.js')

module.exports = {
    template: require('raw!./settings.html'),
    props: {
        ping: Number,
        // TODO move it to config, etc.
        siteUrl: {type: String, default: 'http://rogalia.ru'}
    },
    data: function() {
        return {
            settings: config,
            descriptions: descriptions,
        }
    },
    methods: {
        open: function(link) {
            if (link.charAt(0) == '$') {
                link = this.siteUrl + link.substring(1);
            }
            window.open(link, '_blank');
        },
        showHelp: function() {
            console.log('showHelp');
        },
        showUsers: function() {
            console.log('showUsers');
        },
        lobby: function() {
            console.log('lobby');
        },
        logout: function() {
            console.log('logout');
        },
    },
    attached: function() {
        document.getElementById('fps-stats').appendChild(this.$fps.domElement)
    },
    created: function() {
        this.$fps = new FpsStats()

        this.$watch('settings.ui.language', function() {
            localStorage.setItem('lang', (game.lang == 'ru') ? 'en' : 'ru')
            game.reload()
        })
        this.$watch('settings.sound.playMusic', function() {
            game.sound.toggleMusic()
        })
        this.$watch('settings.sound.jukebox', function() {
            game.jukebox.toggle()
        })
        //this.$watch('settings.map.world', function() {
            //dom.toggle(game.world)
        //})
        this.$watch('settings.ui.chatNotifications', function(attach) {
            game.chat.initNotifications()
        })
        this.$watch('settings.ui.chatAttached', function(attach) {
            if (attach) { game.chat.attach() }
            else        { game.chat.detach() }
        })
        this.$watch('settings.graphics.low', function() {
            game.map.reset()
        })
        this.$watch('settings.graphics.centerScreen', function() {
            game.world.classList.toggle('snap-left')
        })
        this.$watch('settings.graphics.fullscreen', function() {
            game.screen.update()
        })
        this.$watch('settings.character.pathfinding', function() {
            game.player.Settings.Pathfinding = !game.player.Settings.Pathfinding
            game.network.send("set-settings", {Settings: game.player.Settings});
        })
        this.$watch('settings.character.hideHelmet', function() {
            game.player.Style.HideHelmet = !game.player.Style.HideHelmet
            game.network.send("set-style", {Style: game.player.Style});
            game.player.reloadSprite()
        })
    },
}












/*
//Settings.descriptions = descriptions
function Settings() {
    Settings.instance = this;
    var tabs = this.makeSettingsTabs(game.config, "Config");
    if (game.player.IsAdmin) {
        Settings.load(game.debug)
        this.makeSettingsTabs(game.debug, "Debug").forEach(function(tab) {
            tabs.push(tab);
        });
    }
    this.panel = new Panel(
        "settings",
        "Settings",
        [dom.tabs(tabs)]
    );

    function setPlayerSettings() {
        game.network.send("set-settings", {Settings: game.player.Settings});
    }

    function setPlayerStyle() {
        game.network.send("set-style", {Style: game.player.Style});
    }

    this.triggers = {
        "settings.ui.language": function() {
            localStorage.setItem("lang", (game.lang == "ru") ? "en" : "ru");
            game.reload();
        },
        "settings.sound.playMusic": function() {
            game.sound.toggleMusic();
        },
        "settings.sound.jukebox": function() {
            game.jukebox.toggle();
        },
        "settings.map.world": function() {
            dom.toggle(game.world);
        },
        "settings.ui.chatNotifications": function(attach) {
            game.chat.initNotifications();
        },
        "settings.ui.chatAttached": function(attach) {
            if (attach)
                game.chat.attach();
            else
                game.chat.detach();
        },
        "settings.graphics.low": function() {
            game.map.reset();
        },
        "settings.graphics.centerScreen": function() {
            game.world.classList.toggle("snap-left");
        },
        "settings.graphics.fullscreen": function() {
            game.screen.update();
        },
        "settings.character.pathfinding": function() {
            game.player.Settings.Pathfinding = !game.player.Settings.Pathfinding;
            setPlayerSettings();
        },
        "settings.character.hideHelmet": function() {
            game.player.Style.HideHelmet = !game.player.Style.HideHelmet;
            setPlayerStyle();
            game.player.reloadSprite();
        },
    };
}


Settings.load = function(map) {
    Object.keys(map).forEach(function(name) {
        var group = map[name];
        Object.keys(group).forEach(function(prop) {
            if (group[prop] instanceof Function)
                return;
            var key = ["settings", name, prop].join(".");
            var saved = localStorage.getItem(key);
            if (saved !== null) {
                group[prop] = JSON.parse(saved);
            }
        })
    })
}

Settings.toggle = function(key) {
    var path = key.split(".");
    var section = path[1];
    var option = path[2];
    var value = !config[section][option];
    config[section][option] = value;

    var checkbox = document.getElementById(key);
    if (checkbox)
        checkbox.checked = value;

    if (Settings.instance && Settings.instance.triggers[key])
        Settings.instance.triggers[key](value);
};

//TODO: load config in separate function
Settings.prototype = {
    triggers: null,
    makeSettingsTabs: function(map, name) {
        var self = this;
        var tabs = [];
        Object.keys(map).forEach(function(name) {
            var group = map[name];
            var tab = {
                title: T(name),
                contents: [],
            };

            var optionDesc = dom.div("settings-option-desc");
            optionDesc.placeholder = T("Select option");
            optionDesc.textContent = optionDesc.placeholder;

            Object.keys(group).forEach(function(prop) {
                var key = ["settings", name, prop].join(".");
                var value = group[prop];

                if (value instanceof Function) {
                    if (game.player) // eval only when player is loaded
                        value = value();
                    else
                        value = false;
                }

                var desc = Settings.descriptions[name] &&
                    Settings.descriptions[name][prop] || [prop, ""];

                var title = desc[0];
                var tip = desc[1];

                var checkbox = dom.checkbox(title);
                checkbox.checked = value;
                checkbox.id = key;

                var label = checkbox.label;
                label.onmouseover = function() {
                    optionDesc.textContent = tip;
                };
                label.onmouseout = function() {
                    optionDesc.textContent = optionDesc.placeholder;
                };
                label.onchange = function() {
                    group[prop] = !group[prop];
                    localStorage.setItem(key, group[prop]);
                    self.triggers[key] && self.triggers[key](group[prop]); // jshint ignore:line
                };
                tab.contents.push(label);
            });
            tab.contents.push(optionDesc);
            tabs.push(tab);
        });
        return tabs;
    },
};
*/
