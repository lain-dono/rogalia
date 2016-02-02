'use strict'

var Vendor = require('../vendor.js')
var getPreview = require('../../entity.js').getPreview
var dom = require('../../dom.js')

module.exports = Quest

function Quest(q) {
    for (var i in q) {
        this[i] = q[i];
    }
    this.data = game.quests[q.Id];
}

Quest.prototype = {
    getName: function() {
        return this.data.name[game.lang];
    },
    getLog: function() {
        return game.player.ActiveQuests[this.Id];
    },
    active: function() {
        return !!this.getLog();
    },
    ready: function() {
        var questLog = this.getLog();
        return questLog && questLog.State == "ready";
    },
    getStatusMarker: function() {
        if (this.ready())
            return "?";
        if (this.active())
            return "…";
        return "!";
    },
    makeList: function(items) {
        var list = document.createElement("div");
        for (var item in items) {
            var slot = document.createElement("div");
            slot.classList.add("slot");
            slot.appendChild(getPreview(item));
            slot.onclick = game.controller.craft.search.bind(game.controller.craft, item, true);

            var desc = document.createElement("div");
            var count = (items[item] instanceof Object) ? items[item].Count : items[item];
            desc.textContent = TS(item) + ": x" + count;

            var li = document.createElement("div");
            li.className = "quest-item";
            li.appendChild(slot);
            li.appendChild(desc);
            list.appendChild(li);
        }
        return list;
    },
    getDescContents: function(ready) {
        return [
            this.makeDesc(ready),
            dom.hr(),
            this.makeGoal(),
            dom.hr(),
            this.makeReward(),
        ];
    },
    makeDesc: function(ready) {
        var desc = document.createElement("div");
        var source = (ready) ? this.data.final : this.data.desc;
        desc.textContent = source[game.lang];
        return desc;
    },
    makeGoal: function() {
        var goal = document.createElement("div");

        var end = document.createElement("div");
        end.textContent = T("Quest ender") + ": " + T(this.End);
        goal.appendChild(end);
        goal.appendChild(dom.hr());

        if (this.Goal.HaveItems) {
            goal.appendChild(document.createTextNode(T("You need to have these items") + ":"));
            goal.appendChild(this.makeList(this.Goal.HaveItems));
        }
        if (this.Goal.BringItems) {
            goal.appendChild(document.createTextNode(T("You need to bring these items") + ":"));
            goal.appendChild(this.makeList(this.Goal.BringItems));
        }
        if (this.Goal.Cmd) {
            goal.appendChild(document.createTextNode(T("You need to") + ": " + TS(this.Goal.Cmd)));
        }

        if (this.data.tip) {
            var tip = this.data.tip[game.lang];
            goal.appendChild(document.createTextNode(tip));
        }
        if ("wiki" in this.data) {
            var links = this.data.wiki[game.lang] || [];
            links.forEach(function(name) {
                var link = document.createElement("a");
                link.className = "quest-wiki-link";
                link.target = "_blank";
                link.href = "/wiki/" + name;
                link.textContent = name;
                goal.appendChild(link);
            });
        }

        return goal;
    },
    makeReward: function() {
        var reward = document.createElement("div");
        reward.appendChild(document.createTextNode(T("Rewards") + ": "));
        if (this.Reward.Xp) {
            var xp = document.createElement("div");
            xp.textContent = "+" + this.Reward.Xp + "xp";
            reward.appendChild(xp);
        }
        if (this.Reward.Currency) {
            reward.appendChild(Vendor.createPrice(this.Reward.Currency));
        }
        if (this.Reward.Items) {
            reward.appendChild(this.makeList(this.Reward.Items));
        }

        return reward;
    },
    getContents: function() {
        var canStart = !this.active();
        var action = (canStart) ? "Accept" : "Finish";

        var button = document.createElement("button");
        button.textContent = T(action);

        var nearEndNpc = game.player.interactTarget.Type == this.End;
        var canEnd = this.ready() && nearEndNpc;

        if (canEnd || canStart) {
            var self = this;
            button.onclick = function() {
                game.network.send(
                    "quest",
                    {Id: game.player.interactTarget.Id, QuestId: self.Id},
                    function update(data) {
                        if (canEnd || !nearEndNpc)
                            game.panels.quest.close();
                        else
                            game.panels.quest.setContents(self.getContents());
                        return null;
                    });
            };
        } else {
            button.disabled = true;
        }

        return this.getDescContents(canEnd).concat(
            dom.hr(),
            button
        );
    },
};
