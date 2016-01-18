'use strict'

var Stage = require('./stage.js')
var Panel = require('../panel.js')
var util = require('../util.js')
var dom = require('../dom.js')
var cnf = require('../config.js')
var Character = require('../character.js')

Stage.add(module, lobbyStage)

function lobbyStage(data) {
    /*jshint validthis:true */

    util.ajax("build-warning.html", function(warn) {
        if (!warn) {
            return;
        }
        dom.show(document.getElementById("build-warning"));

        var panel = new Panel("build-warning-panel", "");
        panel.temporary = true;
        panel.contents.innerHTML = warn;
        panel.hooks.hide = function() {
            localStorage.setItem("build.warning.hidden", Date.now());
        };

        var title = document.getElementById("build-warning-title");
        var buildWarning = document.getElementById("build-warning");
        dom.replace(buildWarning, title);
        title.id = "build-warning";
        panel.setTitle(title.textContent);

        title.onclick = function() {
            panel.show();
        };

        var last = new Date(+localStorage.getItem("build.warning.hidden"));
        if (Date.now() - last < 24 * 60 * 60 * 1000) {
            panel.hide();
        } else {
            panel.show();
        }

    });

    var account = document.createElement("div");
    account.className = "lobby-account";
    account.textContent = game.login;

    var characters = (data && data.Characters) || lobbyStage.characters || [];
    var maxChars = 4;
    // we need to save it because we may return to this stage after
    // createCharacter stage (back button)
    lobbyStage.characters = characters;

    var avatars = document.createElement("div");

    function add(name, icon, callback) {
        var avatarContainer = document.createElement("div");
        avatarContainer.className = "avatar-container";

        var avatar = document.createElement("div");
        avatar.className = "avatar";
        avatar.appendChild(icon);

        var nameElem = document.createElement("div");
        nameElem.className = "avatar-name";
        nameElem.textContent = (name == "+") ? T("Create") : name;

        avatarContainer.appendChild(avatar);
        avatarContainer.appendChild(nameElem);
        avatarContainer.onclick = callback;

        avatars.appendChild(avatarContainer);
    }

    characters = characters.sort(function(a, b) {
        return a.Name > b.Name;
    });

    characters.forEach(function(info) {
        var icon = loader.loadImage("avatars/" + Character.sex(info.Sex) + ".png").cloneNode();
        add(info.Name, icon, function() {
            game.player.Name = info.Name;
            game.network.send("enter", {Name: info.Name, Version: game.version});
        });
    });

    var fn = function() { game.setStage("createCharacter"); }
    for (var i = maxChars - characters.length; i > 0; i--) {
        var create = loader.loadImage("avatars/new.png").cloneNode();
        create.className = "create";
        add(T("Create"), create, fn);
    }

    var contents = [
        account,
        dom.hr(),
        avatars,
    ];

    if (!game.inVK()) {
        var quit = document.createElement("button");
        quit.textContent = T("Quit");
        quit.onclick = function() {
            lobbyStage.characters = [];
            game.clearCredentials();
            game.setStage("login");
        };
        contents.push(dom.hr());
        contents.push(quit);
    }

    var panel = this.panel = new Panel("lobby", "", contents);
    panel.hideCloseButton();
    panel.show(cnf.LOBBY_X + game.offset.x, cnf.LOBBY_Y + game.offset.y);

    function fastenter(e) {
        if (e.keyCode != 13) // enter
            return;
        var avatars = document.getElementsByClassName("avatar");
        if (avatars.length > 0)
            avatars[0].click();
    }
    this.fastenter = fastenter

    window.addEventListener("keypress", fastenter);
}

lobbyStage.prototype.end = function() {
    window.removeEventListener("keypress", this.fastenter);
    this.panel.close();
}
lobbyStage.prototype.sync = function(data) {
    game.setStage("loading", data);
}
