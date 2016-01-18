'use strict'

var dom = require('../dom.js')
var Panel = require('../panel.js')

module.exports = function Users() {
    var lists = {};

    function renderList(content, list, empty) {
        dom.clear(content);
        if (list) {
            var ul = dom.tag("ul");
            list.sort().forEach(function(name) {
                var li = dom.tag("li", "", {text: name});
                li.onmousedown = function(e) {
                    return game.chat.nameMenu(e, name);
                };
                ul.appendChild(li);
            });
            var total = dom.div("", {text: T("Total") + ": " + list.length});
            content.appendChild(ul);
            content.appendChild(total);
        } else {
            content.textContent = T(empty);
        }

    }

    function render(content, data, selector, empty) {
        var list = {
            content: content,
            data: data[selector],
            empty: empty,
        };
        lists[selector] = list;
        renderList(list.content, list.data, list.empty);
    }

    function makeTabUpdate(cmd, selector, empty) {
        return function (title, content) {
            function update(data) {
                render(content, data, selector, empty);
            }
            game.network.send(cmd, {}, update);
            // when e.g. this.updateFriendsTab()  will be called from game.chat
            // we need to chain game.network.send callback
            // so return it
            return update;
        };
    }

    this.tabs = dom.tabs([
        {
            title: T("Online players"),
            update: makeTabUpdate("player-list", "OnlinePlayers", "")
        },
        {
            title: T("Friends"),
            update: makeTabUpdate("friend-list", "Friends", "No friends")
        },
        {
            title: T("Blacklist"),
            update: makeTabUpdate("blacklist-list", "Blacklist", "Blacklist is empty")
        }
    ]);

    this.panel = new Panel(
        "users",
        "Users",
        [this.tabs]
    );

    this.updateOnlinePlayersTab = this.tabs.tabs[0].update;
    this.updateFriendsTab = this.tabs.tabs[1].update;
    this.updateBlacklistTab = this.tabs.tabs[2].update;

    this.addPlayer = function(name) {
        if (name == game.player.Name)
            return;
        var list = lists.OnlinePlayers;
        if (list && list.data.indexOf(name) == -1) {
            list.data.push(name);
            renderList(list.content, list.data, list.empty);
        }
    };

    this.removePlayer = function(name) {
        if (name == game.player.Name)
            return;
        var list = lists.OnlinePlayers;
        if (list) {
            var data = list.data;
            data.splice(data.indexOf(name), 1);
            renderList(list.content, list.data, list.empty);
        }
    };
}
