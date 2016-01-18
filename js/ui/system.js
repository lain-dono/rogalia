'use strict'

var dom = require('../dom.js')
var Panel = require('../panel.js')

var Users = require('./users.js')
var Help = require('./help.js')
var Settings = require('./settings.js')

module.exports = function System() {
    this.fps = new FpsStats();

    var fps = document.createElement("div");
    fps.id = "fps-stats";
    fps.appendChild(this.fps.domElement);

    this.ping = document.createElement("span");
    this.ping.textContent = "Ping: -";

    this.users = new Users();
    this.help = new Help();
    this.settings = new Settings();

    var users = document.createElement("button");
    users.textContent = T("Users");
    users.onclick = this.users.panel.toggle.bind(this.users.panel);

    var help = document.createElement("button");
    help.textContent = T("Help");
    help.onclick = this.help.panel.toggle.bind(this.help.panel);

    var settings = document.createElement("button");
    settings.textContent = T("Settings");
    settings.onclick = this.settings.panel.toggle.bind(this.settings.panel);

    var links = dom.button(T("Links"));
    links.onclick = function() {
        new Panel("links", "", [
            // game.button.forum(),
            game.button.blog(),
            game.button.vk(),
            game.button.twitter(),
            game.button.authors(),
        ]).show();
    };

    this.panel = new Panel(
        "system",
        "System",
        [
            fps,
            this.ping,
            dom.hr(),
            settings,
            // help,
            users,
            dom.hr(),
            game.button.wiki(),
            // game.button.bugtracker(),
            dom.hr(),
            links,
            game.button.donate(),
            dom.hr(),
            game.button.lobby(),
            game.button.logout(),
        ]
    );
}
