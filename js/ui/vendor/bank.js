var dom = require('../../dom.js')
var util = require('../../util.js')
var Panel = require('../../panel.js')
var Entity = require('../../entity.js')
var Container = require('../../container/container.js')
var Vendor = require('./vendor.js')

module.exports = Bank

Bank.vv = {

}

function Bank() {
    var balance = document.createElement("label");
    var price = Vendor.createPriceInput();

    var deposit = document.createElement("button");
    deposit.textContent = T("Deposit");
    deposit.onclick = function() {
        game.network.send("deposit", {"Cost": price.cost()}, callback);
    };

    var withdraw = document.createElement("button");
    withdraw.textContent = T("Withdraw");
    withdraw.onclick = function() {
        game.network.send("withdraw", {"Cost": price.cost()}, callback);
    };

    var claimRent = document.createElement("label");
    var claimPaidTill = document.createElement("label");
    // var claimLastPaid = document.createElement("label");
    var claimPay = document.createElement("button");
    claimPay.textContent = T("Pay");
    claimPay.onclick = function() {
        if (confirm(T("Confirm?"))) {
            game.network.send("pay-for-claim", {}, callback);
        }
    };

    var claim = document.createElement("div");
    claim.appendChild(document.createTextNode(T("Claim")));
    claim.appendChild(claimRent);
    claim.appendChild(claimPaidTill);
    // claim.appendChild(claimLastPaid);
    claim.appendChild(claimPay);

    var vault = document.createElement("div");

    var contents = [
        balance,
        dom.hr(),
        price,
        deposit,
        withdraw,
        dom.hr(),
        claim,
        dom.hr(),
        vault,
    ];
    var panel = new Panel("bank", "Bank", contents);
    panel.hide();

    game.network.send("get-bank-info", {}, callback);

    function date(unixtime) {
        var span = document.createElement("span");
        if (unixtime > 0)
            span.textContent = util.date.human(new Date(unixtime * 1000));
        else
            span.textContent = "-";
        return span;
    }

    function callback(data) {
        //TODO: add price.set()
        balance.innerHTML = T("Balance") + ": ";
        balance.appendChild(Vendor.createPrice(data.Bank.Balance));

        var claim = data.Bank.Claim;
        claimRent.innerHTML = T("Rent") + ": ";
        claimRent.appendChild(Vendor.createPrice(claim.Cost));


        claimPaidTill.innerHTML = T("Paid till") + ": ";
        claimPaidTill.appendChild(date(claim.PaidTill));

        // claimLastPaid.innerHTML = T("Last paid") + ": ";
        // claimLastPaid.appendChild(date(claim.LastPaid));

        dom.clear(vault);
        data.Bank.Vault.forEach(function(vaultSlot, i) {
            var slot = document.createElement("div");
            slot.className = "slot";
            if (vaultSlot.Unlocked) {
                var entity = Entity.get(vaultSlot.Id);
                slot.appendChild(entity.icon());
                slot.onclick = function() {
                    Container.show(entity);
                };
            } else {
                slot.classList.add("plus");
                slot.onclick = function() {
                    var cost = Math.pow(100, i);
                    if (confirm(TT("Buy slot {cost} gold?", {cost: cost}))) {
                        game.network.send("buy-bank-vault-slot", {}, callback);
                    }
                };
            }
            vault.appendChild(slot);

        });
        // //TODO: remove items on panel close?


        panel.show();
    }
}
