'use strict'

var dom = require('../dom.js')
var Panel = require('../panel.js')
var Vendor = require('./vendor.js')
var util = require('../util.js')

module.exports = Mail

function Mail() {
    var self = this;
    this.tabs = [
        {
            title: T("Inbox"),
            update: function(title, contents) {
                if (self.mail) {
                    dom.setContents(contents, self.listView(self.mail));
                    self.mail = null;
                    return;
                }
                game.network.send("entity-use", {Id: self.mailbox.Id}, function(data) {
                    dom.setContents(contents, self.listView(data.Mail));
                });
            },
        },
        {
            title: T("Compose"),
            update: function(title, contents) {
                dom.setContents(contents, self.composeView());
            },
        }
    ];
}

Mail.prototype = {
    mailbox: null,
    mail: null,
    backContents: null,
    open: function(mailbox, mail) {
        this.mailbox = mailbox;
        this.mail = mail || [];
        if (!this.panel)
            this.panel = new Panel("mail", "Mail", [dom.tabs(this.tabs)]);
        this.panel.temporary = true;
        this.panel.entity = mailbox;
        this.panel.show();
    },
    listView: function(mail) {
        if (!mail)
            return T("No mail");

        var self = this;
        return dom.wrap("letters", mail.map(function(letter, id) {
            console.log(letter);
            var del = dom.button("x", "letter-delete");
            var row = dom.wrap("letter", [
                dom.wrap("letter-avatar slot", game.player.icon()),
                dom.div("letter-from", {text: letter.From}),
                dom.div("letter-subject", {text: letter.Subject}),
                (letter.Items.length > 0) ? dom.div("letter-has-attachment") : null,
                // dom.div("letter-sent", {// TODO: ext: util.date.human(letter.Created * 1000)})
                del,
            ]);
            del.onclick = function() {
                game.network.send("delete-letter", {Id: self.mailbox.Id, Letter: id}, function() {
                    dom.remove(row);
                });
            };
            row.onclick = function() {
                var content = self.tabs[0].tab.content;
                self.backContents = dom.detachContents(content);
                dom.append(content, self.letterView(letter));
            };
            return row;
        }));
    },
    letterView: function(letter) {
        var self = this;
        return [
            dom.button(T("Back"), "back-button", function() {
                if (self.backContents) {
                    dom.setContents(self.tabs[0].tab.content, self.backContents);
                    self.backContents = null;
                } else {
                    self.tabs[0].update();
                }
            }),
            dom.wrap("letter-from", [
                T("From") + ": ",
                letter.From,
            ]),
            dom.wrap("letter-subject", [
                T("Subject") + ": ",
                letter.Subject,
            ]),
            dom.hr(),
            dom.wrap("letter-body", [
                letter.Body,
            ])
        ];
    },
    composeView: function() {
        var to = dom.input(T("To:"));
        var postage = Vendor.createPrice(30);
        var subject = dom.input(T("Subject:"));
        var body = dom.tag("textarea", "mail-body");
        var send = dom.button(T("Send"));

        var slots = util.dotimes(4, function() {
            var slot = dom.slot();
            slot.canUse = function() {
                return true;
            };
            slot.use = function(entity) {
                slot.entity = entity;
                dom.setContents(slot, entity.icon());
                return true;
            };
            slot.cleanup = function() {
                slot.entity = null;
                dom.clear(slot);
            };
            slot.addEventListener("mousedown", slot.cleanup, true);
            return slot;
        });

        var self = this;
        send.onclick = function() {
            game.network.send("compose", {
                Id: self.mailbox.Id,
                To: to.value,
                Subject: subject.value,
                Body: body.value,
                Items: slots.filter(function(slot) {
                    return slot.entity !== null;
                }).map(function(slot) {
                    return slot.entity.Id;
                })
            }, function() {
                to.value = "";
                subject.value = "";
                body.value = "";
                slots.forEach(function(slot) {
                    slot.cleanup();
                });
            });
        };
        return [
            dom.wrap("mail-to", [
                to.label, to, postage
            ]),
            dom.wrap("mail-subject", [
                subject.label, subject
            ]),
            dom.hr(),
            body,
            dom.wrap("mail-send", slots.concat(send)),
        ];
    }
};
