'use strict'

var Items = require('./lang/ru/items.js')
var Point = require('./point.js')
var Sprite = require('./sprite.js')
var Stats = require('./ui/stats.js')
var Panel = require('./panel.js')
// circular; see bottom of file
//var Character = require('./character.js')
//var Container = require('./container/container.js')
var dom = require('./dom.js')
var util = require('./util.js')
var cnf = require('./config.js')
var config = cnf.config
var CELL_SIZE = cnf.CELL_SIZE
var FONT_SIZE = cnf.FONT_SIZE

module.exports = Entity

function Entity(type, id) {
    var e = this;
    if (type) {
        e = Object.create(Entity.templates[type]);
    }
    e.Id = id || 0;
    e.Type = type || "";
    if (id)
        e.sprite = {};
    return e;
}

Entity.prototype = {
    Id: 0,
    Name: "",
    Width: 0,
    Height: 0,
    Radius: 0,
    Type: "",
    Group: "",
    Lvl: 1,
    Container: 0,
    Quality: 1,
    Disposition: 0,
    MoveType: Entity.MT_PORTABLE,
    Creator: 0,
    Owner: 0,
    Sprite: null,
    State: "",
    Variant: 0,
    Orientation: "",
    Recipe: null,
    Props: {},
    CanCollide: true,
    Actions: null,
    Durability: null,
    Dye: "",
    sprite: null,
    _canUse: false,
    _icon: null,
    _spriteVersion: "",
    x: 0,
    y: 0,
    get X() {
        return this.x;
    },
    get Y() {
        return this.y;
    },
    set X(x) {
        throw "not allowed";
    },
    set Y(y) {
        throw "not allowed";
    },
    get name() {
        var name = "";
        if (this.Type.contains("-corpse") || this.Type == "head")
            name = this.Name;
        else
            name = TS(this.Name);

        if (this.Props.Capacity) {
            name += ' [' +
                util.toFixed(this.Props.Capacity.Current) +
                '/' +
                util.toFixed(this.Props.Capacity.Max) +
                ']';
        }
        if (this.Props.Text) {
            var title = Entity.books[this.Props.Text];
            if (title)
                name += ": " + title;
            else
                return this.Props.Text;
        }

        if ("Damage" in this)
            name += "\n" + T("Damage") + ": " + this.damage();
        else if (this.Props.Energy)
            name += "\n" + T("Energy") + ": " + this.Props.Energy;

        if (!("Amount" in this))
            name += "\n" + T("Quality") + ": " + this.Quality;

        if (this.Comment)
            name += "\n" + this.Comment;
        return name;
    },
    set name(value) {
        //ignore
    },
    get title() {
        var title = this.Type;
        var suffix = "";
        switch (this.Group) {
        case "blank":
            title = this.Props.Type;
            break;
        case "liquid-container-liftable":
        case "tanning-tub":
            var cap = this.Props.Capacity;
            suffix = sprintf("[%d/%d]", cap.Current,  cap.Max);
            break;
        case "arena-flag-base":
            return TS(this.Name) + " | " + T("Score") + ":" + this.Score;
        default:
            if (this.Name)
                title = this.Name;
        }

        if (this.Type.contains("-corpse") || this.Type == "head")
            return T(title);

        return TS(title) + suffix;
    },
    get point() {
        return new Point(this.X, this.Y);
    },
    get round() {
        return this.Width === 0;
    },
    showInfo: function() {
        var elements = [];
        elements.push(Stats.prototype.createValue("Level", this.Lvl));
        elements.push(Stats.prototype.createValue("Quality", this.Quality));
        elements.push(Stats.prototype.createParam("Durability", this.Durability));

        if (this.Group == "food") {
            elements.push(dom.hr());
            var k = Math.sqrt(this.Quality);
            Character.vitamins.forEach(function(vitamin) {
                var value = this.Props[vitamin] * k;
                var elem = Stats.prototype.createValue(vitamin, value, 2);
                elem.classList.add(vitamin.toLowerCase());
                elements.push(elem);
            }.bind(this));
            elements.push(Stats.prototype.createValue("Energy", this.Props.Energy, 2));
        } else if ("Armor" in this) {
            var armor = this.Armor * (1 + this.Quality / 100);
            elements.push(Stats.prototype.createValue("Armor", armor));
        } else if ("Block" in this) {
            var block = this.Block;
            elements.push(Stats.prototype.createValue("Block", block));
        } else if ("Damage" in this) {
            elements.push(Stats.prototype.createValue("Damage", this.damage()));
        } else if (this.Props.Capacity) {
            elements.push(Stats.prototype.createParam("Capacity", this.Props.Capacity));
        }

        elements.push(dom.hr());
        elements.push(this.makeDescription());

        new Panel("item-info", TS(this.Name), elements).setEntity(this).show();
    },
    damage: function() {
        return util.toFixed(this.Damage * (Math.pow(this.Quality, 1.5) / 5000 + 1), 0);
    },
    makeDescription: function() {
        var text = Items[this.Type] || Items[this.Group] || T("No description yet");
        return dom.div("item-descr", {text: text});
    },
    leftTopX: function() {
        return (this.X - this.Width / 2) << 0;
    },
    leftTopY: function() {
        return (this.Y - this.Height / 2) << 0;
    },
    screen: function() {
        return this.point.toScreen();
    },
    getDrawDx: function() {
        return this.Sprite.Dx || this.sprite.width/2;
    },
    getDrawDy: function() {
        // switch (this.Type) {
        // case "bookshelf":
        //     return 80;
        // }

        if (this.Sprite.Dy)
            return this.Sprite.Dy;

        if (this.Disposition == "roof" && this.Location != Entity.LOCATION_BURDEN)
            return 136 - 8; // default wall sprite height - wall width / 2

        // fucking hate it
        var r = this.Radius;
        var k = 4;

        if (this.round) {
            if (r > 32)
                k = 8;
            else if (r < 16)
                k = 16;
        }
        r = this.sprite.width/k;

        return this.sprite.height - r;
    },
    getDrawPoint: function() {
        var p = new Point(this.X, this.Y).toScreen();
        p.x -= this.getDrawDx();
        p.y -= this.getDrawDy();
        return p.round();
    },
    compare: function(entity) {
        if (this == entity)
            return 0;
        var z = this.getZ() - entity.getZ();
        if (z !== 0)
            return z;

        // for topological sort test
        // return (this.depth >= entity.depth) ? +1 : -1;

        var a = this.X + this.Y;
        var b = entity.X + entity.Y;
        return (a >= b) ? +1 : -1;
    },
    getZ: function() {
        switch (this.Disposition) {
        case "roof":
            return 1;
        case "floor":
            return -1;
        }
        return 0;
    },
    spriteVersion: function() {
        return this._spriteVersion;
    },
    initSprite: function() {
        var path = (this.Sprite.Name) ? this.Sprite.Name : this.Type;

        if (this.Props.LiquidType) {
            path += "-" + this.Props.LiquidType;
        }

        switch (this.Type) {
        case "wooden-table":
        case "bookshelf":
        case "wooden-trough":
        case "steel-pike":
        case "stack-of-wood":
        case "stack-of-boards":
            if (!this.Props.Slots)
                break;
            if (this.Props.Slots.some(function(id){ return id !== 0 }))
                path += "-full";
        }

        if (this.Type != "blank") {
            if (this.State) {
                path += "-" + this.State;
            }

            if (this.Orientation) {
                path += "-" + this.Orientation;
            }

            if (this.Variant) {
                path += "-" + this.Variant;
            }
        } else {
            switch (this.Orientation) {
            case "h":
            case "v":
                path += "-" + this.Orientation;
            }
        }

        if (!path) {
            game.error("Entity %j has no sprite", this);
        }

        var spriteVersion = path + this.Dye;

        if (this.sprite && this.sprite.ready && spriteVersion == this._spriteVersion) {
            return;
        }

        this.sprite = new Sprite(
            path + ".png",
            this.Sprite.Width,
            this.Sprite.Height,
            this.Sprite.Speed
        );

        if (this.Dye) {
            var dye = this.Dye.split("#");
            var color = dye[1];
            var opacity = dye[2];
            this.sprite.onload = function() {
                this.image = ImageFilter.tint(this.image, color, opacity);
            };
        }

        this._spriteVersion = spriteVersion;
    },
    add: function() {
        game.controller.newCreatingCursor(this.Type);
    },
    is: function(type) {
        if (this.Type == type || this.Group == type) {
            return true;
        }
        var meta = Entity.metaGroups[type] || [];
        return meta.some(function(kind) {
            return this.is(kind);
        }.bind(this));
    },
    getActions: function() {
        var actions = [{}, {}, {}];
        /*jshint -W069 */
        if (game.player.IsAdmin) {
            actions[0]["$cmd"] = this.applyAdminCmd;
        }

        if (this.MoveType == Entity.MT_PORTABLE && this.inWorld())
            actions[0]["Pick up"] = this.pickUp;
        else if (this.MoveType == Entity.MT_LIFTABLE)
            actions[0]["Lift"] = this.lift;

        this.Actions.forEach(function(action) {
            actions[1][action] = this.actionApply(action);
        }.bind(this));

        if (this.Orientation !== "" && this.MoveType != Entity.MT_STATIC) {
            actions[2]["Rotate"] = function() {
                game.network.send("rotate", {id: this.Id});
            };
        }
        actions[2]["Destroy"] =  this.destroy;
        actions[2]["Info"] = this.showInfo;
        /*jshint +W069 */
        return actions;
    },
    alignedData: function(p) {
        var align = this.Sprite && this.Sprite.Align;
        if (align && align.X) {
            var w = this.Width || 2*this.Radius;
            var h = this.Height || 2*this.Radius;
            if (this.Group == "claim") {
                w = h = 20 * CELL_SIZE;
            }
            p.x -= w/2;
            p.y -= h/2;
            p.align(new Point(align));
            return {
                x: p.x,
                y: p.y,
                w: Math.max(w, align.X),
                h: Math.max(h, align.Y),
            };
        }
        return null;
    },
    defaultActionSuccess: function(data) {
    },
    defaultAction: function() {
        switch (this.Type) {
        case "instance-exit":
            if (!confirm(T("You will not be able to return to this intance. Are you sure?")))
                return;
            break;
        }
        game.network.send("entity-use", { id: this.Id }, this.defaultActionSuccess.bind(this));
    },
    destroy: function() {
        game.network.send("entity-destroy", {id: this.Id});
    },
    fix: function() {
        game.network.send("entity-fix", {id: this.Id});
    },
    pickUp: function() {
        game.network.send("entity-pick-up", {id: this.Id});
    },
    lift: function() {
        game.network.send("lift-start", {id: this.Id}, function() {
            game.help.runHook({type: "lift"});
        });
    },
    SetRespawn: function() {
        if (confirm(T("Are you sure?"))) {
            game.network.send("SetRespawn", {id: this.Id});
        }
    },
    actionApply: function(action) {
        var localAction = util.lcfirst(action);
        return function() {
            if (this[localAction]) {
                this[localAction]();
                return;
            }

            game.help.actionHook(action);
            game.network.send(action, {
                id: this.Id
            });
        };
    },
    inWorld: function() {
        return this.Location == Entity.LOCATION_ON_GROUND || this.Location == Entity.LOCATION_BURDEN;
    },
    inContainer: function() {
        return this.Container > 0;
    },
    findRootContainer: function() {
        var cnt = this.findContainer();
        for (var i = 0; i < 100; i++) {
            if (cnt !== null && cnt.inContainer())
                cnt = cnt.findContainer();
            else
                return cnt;
        }
        game.sendError("Recursive container: %d", this.Id);
        return null;
    },
    findContainer: function() {
        return Entity.get(this.Container);
    },
    update: function() {
    },
    //used by sign
    read: function() {
        var text = document.createElement("textarea");
        text.readonly = true;
        if (this.Props.Text[0] == "$") {
            util.ajax("books/ru/" + this.Props.Text.substr(1) + ".txt", function(data) {
                text.value = data;
            }.bind(this));
        } else {
            text.value = this.Props.Text;
        }
        new Panel("editable", this.Name, [text]).setEntity(this).show();
    },
    //used by sign
    edit: function() {
        var text = prompt("Edit message", this.Props.Text);
        if (text) {
            game.network.send("sign-edit", {Id: this.Id, Text: text});
        }
    },
    //used by container
    open: function(data) {
        if (game.player.canUse(this)) {
            Container.show(this);
            return null;
        }
        if (!data) {
            game.network.send("Open", {Id: this.Id}, this.open.bind(this));
            return null;
        }

        return this.open.bind(this);
    },
    disassemble: function() {
        game.network.send("disassemble", {Id: this.Id});
    },
    split: function() {
        var args = {Id: this.Id};
        if (this.Group == "currency") {
            var amount = prompt("How many?", 1);
            if (!amount)
                return;
            args.Amount = +amount;
            game.network.send("split", args);
        } else {
            game.network.send("Split", args);
        }
    },
    sync: function(data) {
        var p = new Point(this.X, this.Y);
        for(var prop in data) {
            switch (prop) {
            case "X":
                p.x = data.X;
                break;
            case "Y":
                p.y = data.Y;
                break;
            default:
                this[prop] = data[prop];
            }
        }
        this.setPoint(p);

        switch(this.Group) {
        case "jukebox":
            this.defaultActionSuccess = game.jukebox.open;
            /* falls through */
        case "portal":
        case "book":
        case "grave":
        case "sign":
            this.Actions.push("edit");
            this.Actions.push("read");
            break;
        case "processor":
        case "bonfire":
        case "furnace":
        case "oven":
            this._canUse = true;
            /* falls through */
        case "fishing-rod":
        case "table":
        case "bag":
        case "drying-frame":
        case "garbage":
        case "container":
            if (this.MoveType != Entity.MT_PORTABLE)
                this.defaultActionSuccess = this.open.bind(this);
            break;
        case "blank":
            this.defaultActionSuccess = function() {
                game.controller.craft.open(this, game.player.burden);
            }.bind(this);
            break;
        case "currency":
            if (this.Amount)
                this.Name = this.Amount + " " + this.Type;
            break;
        case "tanning-tub":
            this._canUse = true;
            break;
        case "claim":
            this.Actions = ["claimControlls"];
            break;
        case "spell-scroll":
            this.Actions.push("cast");
            break;
        case "mailbox":
            this.defaultActionSuccess = function(data) {
                game.controller.mail.open(this, data.Mail);
            }.bind(this);
            break;
        }

        if (this.Creator && this.MoveType != Entity.MT_STATIC)
            this.Actions.push("disassemble");

        if ("Amount" in this && this.Amount > 1)
            this.Actions.push("split");

        if (this.Group == "jukebox") {
            var time = (Date.now() - this.Started * 1000) / 1000;
            game.jukebox.play(this.Props.Text, time >> 0);
        }
    },
    autoHideable: function() {
        if (this.Height <= 8 || this.Width <= 8)
            return false;
        return this.Sprite.Unselectable && this.Disposition != "floor";
    },
    shouldBeAutoHidden: function() {
        return game.player.inBuilding &&
            this.autoHideable() &&
            (this.Y + this.X > game.player.Y + game.player.X);
    },
    almostBroken: function() {
        return this.Durability.Max > 0 && this.Durability.Current <= 0.1*this.Durability.Max;
    },
    drawable: function() {
        if (!this.inWorld())
            return false;
       if (game.player.inBuilding && this.Disposition == "roof")
            return false;
        return true;

    },
    draw: function() {
        if (!this.drawable())
            return;
        if (!this.sprite || !this.sprite.ready) {
            this.drawBox();
            return;
        }

        if (this.Group != "plow")
            this.sprite.animate();

        var p = this.getDrawPoint();

        if (this.Id && this.Id == game.player.Burden) {
            p.y -= game.player.sprite.height/2;
        }
        if (this.Disposition == "roof" && game.controller.hideStatic()) {
            return;
        }
        if ((this.MoveType == Entity.MT_STATIC || this.CanCollide) &&
            game.controller.hideStatic()) {
            this.drawBox(this.getDrawBoxColor());
        } else if (this.shouldBeAutoHidden())
        {
            this.drawBox(this.getDrawBoxColor());
        } else {
            if (this.Type == "blank") {
                game.ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
                if (this.round) {
                    game.iso.fillCircle(this.X, this.Y, this.Radius);
                } else {
                    game.iso.fillRect(this.leftTopX(), this.leftTopY(), this.Width, this.Height);
                }
            }
            this.sprite.draw(p);
        }

        if (this.Creator && this.almostBroken()) {
            this.drawBox("red");
        }

        if (game.debug.entity.box) {
            this.drawBox();
            this.drawCenter();
        }

        if(game.debug.entity.position) {
            var text = "(" + (this.X) + " " + (this.Y) + ")";
            text += " id:" + this.Id;
            game.ctx.fillStyle = "#fff";
            game.drawStrokedText(text, p.x, p.y);
        }
    },
    drawClaim: function() {
        var no = this.North*CELL_SIZE;
        var we = this.West*CELL_SIZE;
        var so = this.South*CELL_SIZE;
        var ea = this.East*CELL_SIZE;

        var w = we+ea;
        var h = no+so;
        var x = this.X - we;
        var y = this.Y - no;

        var color = (game.player.Id == this.Creator) ? "255,255,255" : "255,0,0";
        if (config.ui.fillClaim) {
            game.ctx.fillStyle = "rgba(" + color + ", 0.3)";
            game.iso.fillRect(x, y, w, h);
        }
        if (config.ui.strokeClaim) {
            game.ctx.lineWidth = 3;
            game.ctx.strokeStyle = "rgba(" + color + ", 0.7)";
            game.iso.strokeRect(x, y, w, h);
            game.ctx.lineWidth = 1;
        }
    },
    drawBox: function(color) {
        game.ctx.save();
        game.ctx.globalAlpha = 0.3;
        game.ctx.strokeStyle = "#fff";
        game.ctx.fillStyle = color || "#ccc";
        var p = this.screen();
        if (this.round) {
            game.iso.fillStrokedCircle(this.X, this.Y, this.Radius);
        } else {
            game.iso.fillStrokedRect(this.leftTopX(), this.leftTopY(), this.Width, this.Height);
        }
        game.ctx.restore();
    },
    getDrawBoxColor: function() {
        if (this.Group == "gate" || this.Type.indexOf("-arc") != -1) {
            return (this.CanCollide) ? "violet" : "magenta";
        }
        return ""; //default
    },
    drawCenter: function() {
        var p = this.screen();
        game.ctx.fillStyle = "magenta";
        game.ctx.fillRect(p.x, p.y, 3, 3);
    },
    setPoint: function(p) {
        if (this.Id && this.inWorld())
            game.sortedEntities.remove(this);

        this.x = p.x;
        this.y = p.y;

        if (this.Id && this.inWorld())
            game.sortedEntities.add(this);
    },
    drawHovered: function() {
        this.sprite.drawOutline(this.getDrawPoint());
        var p = this.screen();
        var x = p.x - game.ctx.measureText(this.title).width / 2;
        var y = p.y - (this.sprite.height - this.Radius) - FONT_SIZE;

        switch (this.Group) {
        case "sign":
        case "grave":
            if (!this.Props.Text)
                break;
            var text = this.Props.Text;
            var padding = 5;
            var measure = game.ctx.measureText(text);
            x = p.x - measure.width / 2;
            y -= FONT_SIZE;
            game.ctx.fillStyle = "#444";
            game.ctx.fillRect(
                x,
                y,
                measure.width + padding * 2,
                FONT_SIZE + padding * 2
            );
            game.ctx.fillStyle = "#fff";
            game.ctx.fillText(text, x + padding, y + padding + FONT_SIZE);
            return;
        }
        game.ctx.fillStyle = "#fff";
        var title = this.title;
        if (game.controller.modifier.shift)
            title += " | " + T("Quality") + ":" + this.Quality;
        game.drawStrokedText(title, x, y);
    },
    canIntersect: function(noignore) {
        switch (this.Group) {
        case "respawn":
            return true;
        }
        if (!this.inWorld())
            return false;
        if (this.Id == game.player.Burden)
            return false;
        if (!this.sprite.outline)
            return false;
        if (this.MoveType == Entity.MT_STATIC && game.controller.hideStatic())
            return false;


        if (game.player.inBuilding) {
            if (this.Disposition == "roof")
                return false;
            if (this.autoHideable() && this.Group != "gate")
                return false;
        }

        noignore = noignore || game.controller.modifier.ctrl;

        switch (this.Group) {
        case "gate":
        case "portal":
            if (config.graphics.autoHighlightDoors)
                return true;
        }

        return noignore || this.selectable();
    },
    selectable: function() {
        switch (this.Group) {
        case "entrance":
        case "exit":
            return true;
        }
        return (!this.Sprite.Unselectable && !this.Disposition);
    },
    //used for controller.hovered
    intersects: function(x, y, noignore) {
        if (!this.canIntersect(noignore))
            return false;
        if (!this.sprite.imageData)
            return false;

        var w = this.sprite.width;
        var h = this.sprite.height;
        var offset = new Point(
            w * this.sprite.frame,
            h * this.sprite.position
        );
        var p = new Point(x, y)
            .toScreen()
            .sub(this.getDrawPoint())
            .add(offset);

        if (!util.intersects(
            p.x, p.y,
            offset.x, offset.y, w, h
        )) {
            return false;
        }

        var pixel = this.sprite.imageData.data[p.y*4*this.sprite.imageData.width + p.x*4-1];
        return pixel > 64;
    },
    collides: function(x, y, radius) {
        if(!this.inWorld() || !this.CanCollide || this.Owner)
            return false;
        if (this.Width && this.Height) {
            //TODO: fixme
            return util.rectIntersects(
                this.leftTopX(),
                this.leftTopY(),
                this.Width,
                this.Height,
                x - radius,
                y - radius,
                radius,
                radius
            );
        }
        return util.distanceLessThan(this.X - x, this.Y - y, Math.max(this.Radius, radius));
    },
    distanceTo: function(e) {
        return Math.hypot(this.X - e.X, this.Y - e.Y);
    },
    drop: function() {
        var x = game.controller.world.x;
        var y = game.controller.world.y;
        var biom = game.map.biomAt(x, y);
        if (!biom) {
            game.sendErrorf("Biom (%d %d) not found", x, y);
            return;
        }

        var cmd = "entity-drop";
        var align = false;
        if ((biom.Name == "plowed-soil" || biom.Name == "soil") && this.is("seed")) {
            cmd = "plant";
            align = true;
        } else if ((biom.Name == "plowed-soil" || biom.Name == "shallow-water") && this.is("soil")) {
            cmd = "swamp";
            align = true;
        }
        if (align) {
            var p = new Point(x, y);
            var data = this.alignedData(p);
            if (data) {
                p.x = data.x + data.w/2;
                p.y = data.y + data.h/2;
            }

            x = p.x;
            y = p.y;
        }
        game.network.send(cmd, {
            Id: +this.Id,
            X: x,
            Y: y,
        });
    },
    dwim: function() {
        game.network.send("dwim", {id: this.Id});
    },
    use: function(e) {
        game.network.send("entity-use", {Id: e.Id, Equipment: this.Id});
        return true;
    },
    canUse: function(e) {
        return this._canUse;
    },
    belongsTo: function(character) {
        if (this.Owner == character.Id)
            return true;
        var id = this.Container;
        var bag = character.bag();
        if (!bag)
            return false;
        while (id > 0) {
            if (id == bag.Id)
                return true;
            var e = Entity.get(id);
            if (!e)
                return false;
            id = e.Container;
        }
        return false;
    },
    icon: function() {
        if (this._icon)
            return this._icon.cloneNode();
        if (!this.sprite)
            this.initSprite();
        return this.sprite.icon();
    },
    rotate: function(delta) {
        switch (this.Orientation) {
        case "v":
            this.Orientation = "h";
            break;
        case "h":
            this.Orientation = "v";
            break;
        case "n":
        case "w":
        case "s":
        case "e":
            if (delta < 0) {
                switch(this.Orientation) {
                case "n":
                    this.Orientation = "w";
                    break;
                case "w":
                    this.Orientation = "s";
                    break;
                case "s":
                    this.Orientation = "e";
                    break;
                case "e":
                    this.Orientation = "n";
                    break;
                default:
                    return;
                }
            } else {
                switch(this.Orientation) {
                case "n":
                    this.Orientation = "e";
                    break;
                case "e":
                    this.Orientation = "s";
                    break;
                case "s":
                    this.Orientation = "w";
                    break;
                case "w":
                    this.Orientation = "n";
                    break;
                default:
                    return;
                }
            }
            break;
        default:
            return
        }

        if (this.sprite)
            this.sprite.ready = false;

        var w = this.Width;
        this.Width = this.Height;
        this.Height = w;

        this.initSprite();
        game.controller.lastCreatingRotation++;
    },
    cast: function() {
        switch (this.Type) {
        case "scroll-of-town-portal":
        case "hunter-scroll":
            game.network.send("cast", {Id: this.Id});
            break;
        default:
            game.controller.creatingCursor(new Entity(this.Spell, this.Id), "cast");
        }
    },
    claimControlls: function() {
        if (this.Creator != game.player.Id)
            return;

        var id = this.Id;
        function makeButtons(action) {
            var div = document.createElement("div");
            div.className = "claim-actions";
            ["north", "west", "south", "east"].forEach(function(dir) {
                var button = document.createElement("button");
                button.className = "claim-action-" + dir;
                button.textContent = T(action + " " + dir);
                button.onclick = function() {
                    var cmd = action + util.ucfirst(dir);
                    game.network.send(cmd, {Id: id});
                };
                div.appendChild(button);
            });
            return div;
        }

        var enlarge = document.createElement("div");
        var shrink = document.createElement("div");
        var panel = new Panel("claim", "Claim", [makeButtons("Extend"), dom.hr(), makeButtons("Shrink")]);
        panel.temporary = true;
        panel.show();
    },
    applyAdminCmd: function() {
        var id = this.Id;
        var prepare = function(cmd) {
            return function() {
                game.chat.append("*" + cmd + " " + id);
            };
        };
        var send = function(cmd) {
            return function() {
                game.chat.send("*" + cmd + " " + id);
            };
        };
        var self = this;
        var bind = function(method) {
            return method.bind(self);
        };
        game.menu.show({
            "Fix": bind(self.fix),
            "Set quality": prepare("set-quality"),
            "Set creator": prepare("set-creator"),
            "Get creator": send("get-creator"),
            "Set comment": prepare("set-comment"),
            "Finish building": send("finish-building"),
            "Summon": send("summon"),
            "100q": function() {
                game.chat.send("*set-quality " + self.Id + " " + 100);
            },
            "Clone": function() {
                var args = {
                    Type: self.Type,
                    X: game.player.X,
                    Y: game.player.Y,
                };
                game.network.send("entity-add", args, function(data) {
                    for (var id in data.Entities) {
                        var entity = data.Entities[id];
                        if (entity.Type == self.Type && entity.Creator === 0) {
                            game.chat.send("*set-quality " + id + " " + self.Quality);
                            return;
                        }
                    }
                });
            },
            "$prompt": function() {
                var lastCmd = Entity.lastPromptCmd || "set-quality";
                var cmd = prompt("cmd?", lastCmd);
                Entity.lastPromptCmd = cmd;
                game.chat.append("*" + cmd + " " + id);
            },
        });
    },
    isContainer: function() {
        return "Slots" in this.Props;
    },
    onremove: function() {
        switch (this.Group) {
        case "jukebox":
            game.jukebox.stop();
            game.jukebox.panel.hide();
        }
    },
};


var Character = require('./character.js')
var Container = require('./container/container.js')
