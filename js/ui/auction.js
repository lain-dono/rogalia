'use strict'

var dom = require('../dom.js')
var Panel = require('../panel.js')
var Vendor = require('./vendor.js')
var Entity = require('../entity.js')

module.exports = Auction

function Auction() {
    var self = this;
    this.tabs = [
        {
            title: T("Buy"),
            update: function(title, contents) {
                game.network.send("auction-buy-list", {Broker: self.broker.Id}, function(data) {
                    dom.setContents(contents, self.buyView(data.Lots));
                });
            }
        },
        {
            title: T("Sell"),
            update: function(title, contents) {
                game.network.send("auction-sell-list", {Broker: self.broker.Id}, function(data) {
                    dom.setContents(contents, self.sellView(data.Lots));
                });
            }
        }
    ];
}

Auction.prototype = {
    panel: null,
    tabs: null,
    broker: null,
    open: function(broker) {
        this.broker = broker;
        if (!this.panel) {
            this.panel = new Panel("auction", "Auction", [dom.tabs(this.tabs)]);
        }
        this.panel.show();
    },
    backContents: null,
    listView: function(lots, cmd, tabIndex, callback) {
        var self = this;
        return dom.wrap(".lot-list", Object.keys(lots).map(function(type) {
            var count = lots[type];
            var lot = dom.wrap(".lot", [
                dom.wrap("slot lot-icon", [Entity.templates[type].icon()]),
                dom.div("lot-type", {text: TS(type)}),
                dom.div("lot-count", {text: T("Quantity") + ": " + count}),
            ]);
            lot.count = count;
            lot.onclick = function() {
                game.network.send(cmd, {Broker: self.broker.Id, Type: type}, function(data) {
                    var content = self.tabs[tabIndex].tab.content;
                    self.backContents = dom.detachContents(content);
                    dom.append(content, callback(data.Lots, type));
                });
            };
            return lot;
        }).sort(function(a, b) {
            return b.count - a.count;
        }));
    },
    buyView: function(lots) {
        return this.listView(lots, "auction-buy-list-find", 0, this.buyFindView.bind(this));
    },
    sellView: function(lots) {
        return this.listView(lots, "auction-sell-list-find", 1, this.sellFindView.bind(this));
    },
    findView: function(lots, type, tabIndex, table) {
        var self = this;
        return [
            dom.button(T("Back"), "back-button", function() {
                if (self.backContents) {
                    dom.setContents(self.tabs[tabIndex].tab.content, self.backContents);
                    self.backContents = null;
                } else {
                    self.tabs[tabIndex].update();
                }
            }),
            dom.wrap("slot lot-icon", [Entity.templates[type].icon()]),
            dom.div("lot-type", {text: TS(type)}),
            dom.hr(),
            dom.wrap("lot-table", table),
        ];
    },
    buyFindView: function(lots, type) {
        var self = this;
        return this.findView(
            lots,
            type,
            0,
            dom.table(
                [T("Vendor"), T("Quality"), T("Cost"), undefined, ""],
                lots.sort(Vendor.sort.byQuality).map(function(lot) {
                    return [
                        lot.Vendor,
                        lot.Quality,
                        Vendor.createPrice(lot.Cost),
                        dom.button(T("Buy"), "lot-buy", function(e) {
                            if (confirm(T("Buy") + " "+ TS(type) + "?")) {
                                game.network.send(
                                    "buy",
                                    {Id: lot.Id, VendorName: lot.Vendor, Broker: self.broker.Id},
                                    function() {
                                        self.backContents = null;
                                        dom.remove(e.target.parentNode.parentNode);
                                    }
                                );
                            }
                        }),
                    ];
                })
            )
        );
    },
    sellFindView: function(lots, type) {
        var self = this;
        return this.findView(
            lots,
            type,
            1,
            dom.table(
                [T("Vendor"), T("Quantity"), T("Cost"), "", ""],
                lots.sort(Vendor.sort.byQuality).map(function(lot) {
                    var canBeSold = Vendor.canBeSold(type);
                    var slot = dom.slot();
                    slot.check = function(cursor) {
                        return cursor.entity.is(type);
                    };
                    slot.canUse = function() {
                        return true;
                    };
                    slot.use = function(entity) {
                        slot.entity = entity;
                        dom.setContents(slot, entity.icon());
                        button.disabled = false;
                        return true;
                    };
                    slot.cleanup = function() {
                        slot.entity = null;
                        button.disabled = (canBeSold.length === 0);
                        dom.clear(slot);
                    };
                    slot.addEventListener("mousedown", slot.cleanup, true);

                    var quantity = dom.span(lot.Quantity);
                    function cleanup(_, sold) {
                        self.backContents = null;
                        lot.Quantity -= sold;
                        if (lot.Quantity === 0)
                            dom.remove(slot.parentNode.parentNode);
                        else
                            quantity.textContent = lot.Quantity;

                        canBeSold = Vendor.canBeSold(type);
                        slot.cleanup();
                    }
                    var button = dom.button(T("Sell"), "lot-sell", function(e) {
                        if (slot.entity) {
                            game.network.send(
                                "sell",
                                {VendorName: lot.Vendor, Broker: self.broker.Id, Id: slot.entity.Id},
                                function() {
                                    cleanup(null, 1);
                                }
                            );
                            return;
                        }
                        Vendor.sellPrompt(
                            canBeSold,
                            {VendorName: lot.Vendor, Broker: self.broker.Id},
                            cleanup
                        );
                    });
                    button.disabled = (canBeSold.length === 0);
                    return [
                        lot.Vendor,
                        quantity,
                        Vendor.createPrice(lot.Cost),
                        slot,
                        button,
                    ];
                })
            )
        );
    },
};
