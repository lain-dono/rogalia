'use strict'

var dom = require('../../dom.js')
var Panel = require('../../panel.js')
var Quest = require('./quest.js')

module.exports = Journal

function Journal() {
    this.list = document.createElement("ol");
    this.list.id = "quest-list";
    this.view = document.createElement("div");
    this.view.id = "quest-desc";
    this.panel = new Panel("journal", "Journal", [
        this.list,
        dom.vr(),
        this.view,
    ]);
    this.update();
    this.panel.hooks.show = this.update.bind(this);
    this.hash = "";
    this.selected = null;
}

Journal.prototype = {
    update: function() {
        if (this.panel && !this.panel.visible)
            return;

        var hash = JSON.stringify(game.player.ActiveQuests);
        if (hash == this.hash)
            return;
        this.hash = hash;

        if (Object.keys(game.player.ActiveQuests).length === 0) {
            this.list.innerHTML = T("No quests") ;
            return;
        }
        dom.clear(this.list);

        Object.keys(game.player.ActiveQuests).forEach(function(id) {
            var quest = new Quest(game.player.ActiveQuests[id].Quest);
            var name = document.createElement("li");
            name.className = "quest";


            if (id == this.selected)
                name.classList.add("selected");

            name.textContent = quest.getName();
            name.onclick = function() {
                dom.removeClass(".quest", "selected");
                this.selected = id;
                name.classList.add("selected");
                dom.clear(this.view);

                var title = document.createElement("div");
                title.className = "quest-title";
                title.textContent = quest.getName();

                // switch (quest.Period) {
                // case "day":
                //     title.textContent += " (" + T("daily") + ")";
                // }

                var start = document.createElement("div");
                start.className = "quest-start";
                start.textContent = quest.Start + ":";

                this.view.appendChild(title);
                this.view.appendChild(dom.hr());
                this.view.appendChild(start);


                quest.getDescContents().forEach(this.view.appendChild.bind(this.view));
            }.bind(this);
            this.list.appendChild(name);
        }.bind(this));
    },
};
