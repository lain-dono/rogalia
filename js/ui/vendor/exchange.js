var dom = require('../../dom.js')
var Panel = require('../../panel.js')
var Vendor = require('./vendor.js')

module.exports = Exchange

function Exchange() {
    game.network.send("get-exchange-info", {}, function callback(data) {
        var table = document.createElement("table");
        table.id = "exchange-rates-table";
        table.innerHTML = "<tr>" +
            "<th>" + T("Name") + "</th>" +
            "<th>" + T("Buy rate") + "</th>" +
            "<th>" + T("Sell rate") + "</th>" +
            "<th>" + T("Sell ingots") + "</th>" +
            "</tr>";
        Object.keys(data.Rates).forEach(function(assignation) {
            var rate = data.Rates[assignation];
            var name, rateBuy, rateSell, ingots
            {
                name = document.createElement("td");
                name.textContent = TS(assignation);
                name.title = T("Sold") + ": " + rate.Stats.Sold + "\n" +
                    T("Bought") + ": " + rate.Stats.Bought;
            }
            {
                var inputBuy = dom.input();
                var buttonBuy = dom.button(T("Buy"));
                buttonBuy.onclick = function() {
                    game.network.send(
                        "exchange", {Assignation: assignation, Amount: +inputBuy.value}
                    );
                };
                rateBuy = dom.make("td", [
                    Vendor.createPrice(rate.Buy),
                    inputBuy,
                    buttonBuy,
                ]);
            }
            {
                var inputSell = dom.input();
                var buttonSell = dom.button(T("Sell"));
                buttonSell.onclick = function() {
                    game.network.send(
                        "exchange", {Assignation: assignation, Amount: -inputSell.value}
                    );
                };
                rateSell = dom.make("td", [
                    Vendor.createPrice(rate.Sell),
                    inputSell,
                    buttonSell,
                ]);
            }
            {
                var inputIngots = document.createElement("input");
                var buttonIngots = document.createElement("button");
                buttonIngots.textContent = T("Sell");
                buttonIngots.onclick = function() {
                    game.network.send(
                        "exchange", {
                            Assignation: assignation,
                            Amount: +inputIngots.value,
                            Ingot: true,
                        }
                    );
                };
                ingots = document.createElement("td");
                ingots.appendChild(inputIngots);
                ingots.appendChild(buttonIngots);
            }

            var tr = document.createElement("tr");
            tr.appendChild(name);
            tr.appendChild(rateBuy);
            tr.appendChild(rateSell);
            tr.appendChild(ingots);
            table.appendChild(tr);
        });
        var panel = new Panel("exchange", "Exchange", [table]);
        panel.show();
        return null;
    });
}
