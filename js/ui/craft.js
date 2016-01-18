'use strict'

var Entity = require('../entity.js')
var Panel = require('../panel.js')
var Container = require('../container/container.js')
var Stats = require('./stats.js')
var dom = require('../dom.js')
var util = require('../util.js')

module.exports = Craft

function Craft() {
    this.visibleGroups = {};
    this.buildButton = null;
    this.selected = null;
    this.slots = [];
    this.current = {};
    this.requirements = null;

    this.recipes = {};
    this.list = this.createList();

    this.searchInput = null;
    this.searchSlot = this.createSearchSlot();

    this.listWrapper = dom.wrap("#recipe-list-wrapper", [
        this.createSearchField(),
        dom.wrap("#recipe-filters", [this.searchSlot, this.createFilters()]),
        dom.hr(),
        this.list
    ]);

    this.titleElement = document.createElement("div");
    this.ingredientsList = document.createElement("ul");
    this.ingredientsList.className = "ingredients-list";

    this.recipeDetails = this.createRecipeDetails();

    this.history = [];

    this.panel = new Panel(
        "craft",
        "Craft",
        [this.listWrapper, dom.vr(), this.recipeDetails],
        {
            click: this.clickListener.bind(this),
        }
    );
    this.panel.hooks.hide = this.cleanUp.bind(this);
    this.panel.hooks.show = function() {
        this.searchInput.focus();
        this.update();
    }.bind(this);

    this.blank = {
        type: null,
        panel: new Panel("blank-panel", "Build"),
        entity: null,
        canUse: function(entity) {
            for (var group in this.entity.Props.Ingredients) {
                if (entity.is(group)) {
                    return true;
                }
            }
            return false;
        },
        use: function(entity) {
            if (this.canUse(entity)) {
                game.network.send("build-add", {blank: this.entity.Id, id: entity.Id});
                return true;
            }
            // do now allow using item
            return false;
        },
    };

    this.build = function(e) {
        game.controller.newCreatingCursor(this.blank.type, "build");
        this.panel.hide();
    }.bind(this);

    if (this.searchInput.value !== "")
        this.search(this.searchInput.value, true);
}

Craft.help = require('../lang/ru/craft.js')

Craft.prototype = {
    visibleGroups: null,
    recipe: function(type) {
        return Entity.recipes[type];
    },
    render: function(blank) {
        var ingredients = blank.Props.Ingredients;
        var type = blank.Props.Type;
        var recipe = this.recipe(type);
        // if it's an old item which no has no recipe
        if (!recipe)
            return;
        this.titleElement.textContent = TS(type);

        dom.clear(this.ingredientsList);
        var canBuild = true;
        for(var group in ingredients) {
            var has = ingredients[group];
            var required = recipe.Ingredients[group];
            var name = TS(group.replace("meta-", ""));
            var ingredient = Stats.prototype.createParam(name, {Current: has, Max: required});
            canBuild = canBuild && (has == required);
            this.ingredientsList.appendChild(ingredient);
        }
        this.buildButton.disabled = !canBuild;
    },
    update: function() {
        if (this.blank.entity)
            this.render(this.blank.entity);

        if (!this.panel.visible)
            return;

        //TODO: we ignore stats updates; fix this
        return;
        //TODO: this is ugly; refactor
        /* XXX
        var list = this.createList();
        var st = this.list.scrollTop;
        dom.replace(this.list, list);
        this.list = list;
        this.list.scrollTop = st;
        if (this.current.recipe) {
            this.renderRequirements(this.current.recipe);
        }
        */
    },
    open: function(blank, burden) {
        this.blank.entity = blank;
        this.blank.panel.entity = blank;

        var slotHelp = document.createElement("div");
        slotHelp.textContent = T("Drop ingredients here") + ":";

        this.slot = document.createElement("div");
        this.slot.classList.add("slot");
        this.slot.build = true;

        var auto = document.createElement("button");
        auto.className = "build-auto";
        auto.textContent = T("Auto");
        var self = this;
        var recipe = this.recipe(blank.Props.Type);
        auto.onclick = function() {
            var list = [];
            var items = [];
            this.auto(function(item) {
                items.push(item.entity);
            });
            var fn = function(item) { return item.is(group); }
            for (var group in blank.Props.Ingredients) {
                var has = blank.Props.Ingredients[group];
                var required = recipe.Ingredients[group];
                var ok = true;
                while (has < required && ok) {
                    var i = items.findIndex(fn);
                    if (i != -1) {
                        list.push(items[i].Id);
                        items.splice(i, 1);
                        has++;
                    } else {
                        ok = false;
                    }
                }
            }
            if (list.length > 0)
                game.network.send("build-add", {Blank: blank.Id, List: list});
        }.bind(this);

        var buildButton = document.createElement("button");
        buildButton.textContent = T("Build");
        buildButton.className = "build-button";
        buildButton.onclick = function(e) {
            game.network.send("build", {id: blank.Id}, function() {
                game.help.actionHook("build-"+blank.Props.Type);
            });
            this.blank.panel.hide();
        }.bind(this);
        this.buildButton = buildButton;

        this.blank.panel.setContents([
            this.titleElement,
            dom.hr(),
            slotHelp,
            this.slot,
            dom.hr(),
            this.ingredientsList,
            auto,
            buildButton,
        ]);

        this.render(blank);
        this.blank.panel.show();

        if (burden) {
            this.blank.use(burden);
        }
    },
    use: function(entity, to) {
        if (!entity.is(to.group))
            return false;

        var from = Container.getEntityContainer(entity);
        if (!from)
            return;

        if (this.slots.some(function(slot) {
            return slot.firstChild.id == entity.id;
        })) {
            return false;
        }
        var slot = from.findSlot(entity);

        slot.lock();
        var ingredient = entity.icon();
        ingredient.id = entity.Id;
        ingredient.unlock = slot.unlock.bind(slot);

        var index = this.slots.indexOf(to);
        this.slots[index].used = true;
        this.slots[index].unlock = slot.unlock.bind(slot);
        dom.clear(to);
        to.appendChild(ingredient);
        to.onmousedown = this.cancel.bind(this, from, to);
        return true;
    },
    cleanUp: function() {
        for(var i = 0, l = this.slots.length; i < l; i++) {
            var slot = this.slots[i];
            this.cancel(slot.item, slot);
        }
    },
    createList: function() {
        var list = document.createElement("ul");
        list.className = "recipe-list no-drag";
        var groups = {};
        var group
        for (group in game.player.Skills) {
            groups[group] = {};
        }
        Entity.getSortedRecipeTuples().forEach(function(tuple) {
            var type = tuple[0];
            var recipe = tuple[1];
            groups[recipe.Skill][type] = recipe;
        });

        var fn = function() {
            dom.toggle(this);
            visibleGroups[this.group] = !this.classList.contains("hidden");
        }

        for (group in groups) {
            var recipes = groups[group];
            var subtree = document.createElement("ul");
            subtree.className =  (this.visibleGroups[group]) ? "" : "hidden";
            subtree.group = group;

            for (var type in recipes) {
                var recipe = recipes[type];
                var item = document.createElement("li");
                item.className = "recipe";
                item.classList.add(["portable", "liftable", "static"][Entity.templates[type].MoveType]);
                item.recipe = recipe;
                item.title = TS(type);
                item.dataset.search = item.title.toLowerCase().replace(" ", "-");
                item.textContent = item.title;
                item.type = type;
                if (this.selected && this.selected.type == item.type) {
                    item.classList.add("selected");
                    this.selected = item;
                }

                if (!this.safeToCreate(recipe))
                    item.classList.add("unavailable");

                subtree.appendChild(item);
                this.recipes[type] = item;
            }

            if (subtree.children.length === 0)
                continue;

            var subtreeLi = document.createElement("li");
            var groupToggle = document.createElement("span");
            var visibleGroups = this.visibleGroups;
            groupToggle.className = "group-toggle";
            groupToggle.textContent = T(group);
            groupToggle.subtree = subtree;
            groupToggle.onclick = fn.bind(subtree);

            var icon = new Image();
            icon.src = "assets/icons/skills/" + group.toLowerCase() + ".png";

            subtreeLi.appendChild(icon);
            subtreeLi.appendChild(groupToggle);
            subtreeLi.appendChild(subtree);
            list.appendChild(subtreeLi);
        }

        if (list.children.length === 0)
            list.textContent = "You have no recipes";

        return list;
    },
    createSearchField: function() {
        var input = document.createElement("input");
        input.placeholder = T("search");
        input.addEventListener("keyup", this.searchHandler.bind(this));
        input.value = localStorage.getItem("craft.search") || "";

        this.searchInput = input;

        var clear = document.createElement("button");
        clear.className = "recipe-search-clear";
        clear.textContent = "❌";
        clear.title = T("Clear search");
        clear.onclick = function() {
            this.search("");
            input.value = "";
            input.focus();
        }.bind(this);

        var label = document.createElement("label");
        label.className = "recipe-search";
        label.appendChild(input);
        label.appendChild(clear);

        return label;
    },
    createSearchSlot: function() {
        var self = this;
        var slot = dom.slot();
        slot.title = T("Search by ingredient");
        slot.canUse = function() {
            return true;
        };
        slot.use = function(entity) {
            slot.entity = entity;
            dom.clear(slot);
            slot.appendChild(entity.icon());
            var searching = self.list.classList.contains("searching");
            self.list.classList.add("searching");
            for (var type in self.recipes) {
                var li = self.recipes[type];
                if (searching && !li.classList.contains("found"))
                    continue;

                li.classList.remove("found");
                var recipe = Entity.recipes[type];
                for (var ingredient in recipe.Ingredients) {
                    if (entity.is(ingredient)) {
                        li.classList.add("found");
                        li.parentNode.parentNode.classList.add("found");
                        continue;
                    }
                }
            }
            dom.forEach(".recipe-list > .found", function() {
                if (this.querySelector(".found") === null)
                    this.classList.remove("found");
            });
            return true;
        };
        slot.addEventListener("mousedown", function() {
            slot.entity = null;
            dom.clear(slot);
            self.search(self.searchInput.value);
        }, true);

        return slot;
    },
    createFilters: function() {
        var filters = document.createElement("div");
        var recipeList = this.list;
        ["portable", "liftable", "static", "unavailable"].forEach(function(name) {
            var label = document.createElement("label");
            var checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            var saved = localStorage.getItem("craft.filter." + name);
            checkbox.checked = (saved) ? JSON.parse(saved) : (name != "unavailable");
            if (!checkbox.checked)
                recipeList.classList.add("filter-" + name);

            checkbox.onchange = function(e) {
                var checked = !recipeList.classList.toggle("filter-"+name);
                localStorage.setItem("craft.filter." + name, checked);
            };
            label.appendChild(checkbox);
            label.title = T(name);
            filters.appendChild(label);
        });
        return filters;
    },
    searchHandler: function(e) {
        var input = e.target;
        return this.search(e.target.value);
    },
    makeSearch: function(slot) {
        return function() {
            // if there is an ingredint in this slot, skip search
            if (slot.firstChild && slot.firstChild.id)
                return;
            this.search(slot.group, true);
        }.bind(this);
    },
    search: function(pattern, selectMatching) {
        // we do not want to show on load
        if (game.stage.name == "main")
            this.panel.show();
        //TODO: fast solution; make another one
        var id = "#" + this.panel.name + " ";
        dom.removeClass(id + ".recipe-list .found", "found");
        if (!pattern) {
            this.list.classList.remove("searching");
            if (this.searchSlot.entity) {
                this.searchSlot.use(this.searchSlot.entity);
            }
            return;
        }
        this.list.classList.add("searching");

        pattern = pattern.toLowerCase().replace(" ", "-");
        try {
            var selector = id + ".recipe[type*='" + pattern + "']," +
                    id + ".recipe[data-search*='" + pattern + "']";
            dom.addClass(selector, "found");
        } catch(e) {
            return;
        }

        this.searchInput.value = (selectMatching) ? TS(pattern) : pattern;

        var matching = null;
        dom.forEach(id + ".recipe.found", function() {
            if (selectMatching && (this.type == pattern || this.dataset.search == pattern)) {
                selectMatching = false;
                matching = this;
            }
            this.parentNode.parentNode.classList.add("found");
        });

        if (this.searchSlot.entity) {
            this.searchSlot.use(this.searchSlot.entity);
        }

        if (matching) {
            this.openRecipe(matching, false);
        }
    },
    createRecipeDetails: function() {
        var recipeDetails = document.createElement("div");
        recipeDetails.id = "recipe-details";
        recipeDetails.textContent = T("Select recipe");
        return recipeDetails;
    },
    clickListener: function(e) {
        if (!e.target.recipe)
            return;

        if (game.controller.modifier.shift) {
            game.chat.linkRecipe(e.target.type);
            return;
        }
        if (game.player.IsAdmin && game.controller.modifier.ctrl) {
            game.controller.newCreatingCursor(e.target.type);
            return;
        }
        this.openRecipe(e.target, true);
    },
    openRecipe: function(target, clearHistory, noHistory) {
        var recipe = target.recipe;
        target.classList.add("selected");

        if (this.selected)
            this.selected.classList.remove("selected");

        if (clearHistory) {
            this.history = [];
        } else if (this.selected && !noHistory) {
            this.history.push(this.selected);
        }

        this.selected = target;

        this.cleanUp();
        this.current = {
            recipe: recipe,
            type: target.type,
            title: target.title
        };

        var template = Entity.templates[target.type];
        if (template.MoveType == Entity.MT_PORTABLE)
            this.renderRecipe();
        else
            this.renderBuildRecipe(target);
    },
    renderRecipe: function() {
        var self = this;
        dom.clear(this.recipeDetails);
        this.requirements = null;
        this.slots = [];

        var recipe = this.current.recipe;

        var title = document.createElement("span");
        title.className = "recipe-title";
        title.textContent = T(this.current.title);
        if (recipe.Output)
            title.textContent += " x" + recipe.Output;
        this.type = this.current.type;
        var ingredients = document.createElement("ul");
        var slots = [];

        var fn = function() {
            if (game.controller.cursor.isActive() || slot.firstChild.id)
                return;
            var panel = new Panel("craft-help", T("Help"), [this]);
            panel.show();
        }

        for(var group in recipe.Ingredients) {
            var groupTitle = TS(group);
            var required = T(recipe.Ingredients[group]);
            var ingredient = dom.make("li", [required, "x ", this.makeLink(groupTitle)]);
            ingredients.appendChild(ingredient);

            for(var j = 0; j < required; j++) {
                var slot = document.createElement("div");
                slot.className = "slot";
                if (group in Craft.help) {
                    var help = dom.span(Craft.help[group]);
                    slot.onclick = fn.bind(help);
                } else {
                    slot.onclick = self.makeSearch(slot);
                }
                var image = Entity.getPreview(group);

                image.title = groupTitle;
                slot.image = image;
                slot.item = null;
                slot.appendChild(image);
                slot.title = groupTitle;
                slot.group = group;
                slot.craft = true; //TODO: fix; required for controller (apply "use")
                slot.used = false;
                slots.push(slot);
                slot.check = function(cursor) {
                    return cursor.entity.is(this.group);
                };
            }
        }

        var slotsWrapper = document.createElement("div");
        slotsWrapper.id = "recipe-slots";
        for(var i = 0, l = slots.length; i < l; i++) {
            slotsWrapper.appendChild(slots[i]);
            this.slots.push(slots[i]);
        }

        var auto = document.createElement("button");
        auto.className = "recipe-auto";
        auto.textContent = T("Auto");
        auto.onclick = function() {
            this.auto();
        }.bind(this);

        var create = document.createElement("button");
        create.className = "recipe-create";
        create.textContent = T("Create");
        create.onclick = this.create.bind(this);

        var all = document.createElement("button");
        all.className = "recipe-craft-all";
        all.textContent = T("Craft all");
        all.onclick = this.craftAll.bind(this);

        var buttons = dom.wrap("#recipe-buttons", [all, auto, create]);

        var hr = function() {
            this.recipeDetails.appendChild(dom.hr());
        }.bind(this);

        this.recipeDetails.appendChild(this.makePreview(this.current.type));
        this.recipeDetails.appendChild(title);
        hr();
        this.renderRequirements(recipe);
        hr();
        this.recipeDetails.appendChild(document.createTextNode(T("Ingredients") + ":"));
        this.recipeDetails.appendChild(ingredients);
        this.recipeDetails.appendChild(slotsWrapper);
        hr();
        this.recipeDetails.appendChild(buttons);
        hr();
        this.recipeDetails.appendChild(Entity.templates[this.current.type].makeDescription());

        this.renderBackButton();
    },
    renderBuildRecipe: function(target) {
        var recipe = target.recipe;
        dom.clear(this.recipeDetails);

        var title = document.createElement("span");
        title.className = "recipe-title";
        title.textContent = target.title;

        this.blank.type = target.type;

        var ingredients = document.createElement("ul");
        var slots = [];
        for(var name in recipe.Ingredients) {
            var required = recipe.Ingredients[name];
            var groupTitle = TS(name.replace("meta-", ""));
            var ingredient = dom.make("li", [required, "x ", this.makeLink(groupTitle)]);
            ingredients.appendChild(ingredient);
        }
        var hr = function() {
            this.recipeDetails.appendChild(dom.hr());
        }.bind(this);
        var create = document.createElement("button");
        create.className = "recipe-create";
        create.textContent = T("Create");
        create.onclick = this.build.bind(this);

        this.recipeDetails.appendChild(this.makePreview(this.blank.type));
        this.recipeDetails.appendChild(title);
        hr();
        this.requirements = null; //force renderRequirements append new requirements
        this.renderRequirements(recipe);
        this.recipeDetails.appendChild(ingredients);
        hr();
        this.recipeDetails.appendChild(create);

        this.renderBackButton();
    },
    renderBackButton: function() {
        if (this.history.length === 0)
            return;

        var button = dom.button(T("Back"), "craft-history-back");
        button.onclick = function() {
            this.openRecipe(this.history.pop(), false, true);
        }.bind(this);

        dom.append(this.recipeDetails, [dom.hr(), button]);
    },
    auto: function(callback) {
        callback = callback || function(slot, container) {
            this.dwim(slot);
        }.bind(this);

        // prepare player's inventory
        // because we want to check it contents even if it's closed
        Container.bag();

        Container.forEach(function(container) {
            if (!container.visible && !container.entity.belongsTo(game.player))
                return;
            // force update
            container.update();
            container.forEach(function(slot) {
                if (slot.entity) {
                    callback(slot, container);
                }
            });
        });
    },
    craftAll: function() {
        this.auto();
        this.create(true);
    },
    create: function(craftAll) {
        var ingredients = [];
        for(var i = 0, l = this.slots.length; i < l; i++) {
            var ingredient = this.slots[i].firstChild;
            if (!ingredient.id)
                return false;
            ingredients.push(parseInt(ingredient.id));
        }
        var done = function (data) {
            this.cleanUp();
            this.renderRecipe();
            if (craftAll === true)
                setTimeout(this.craftAll.bind(this), 100);
        }.bind(this);

        game.network.send("craft", {type: this.type, ingredients: ingredients}, done);
        return true;
    },
    cancel:  function(from, to) {
        var index = this.slots.indexOf(to);
        var slot = this.slots[index];
        slot.used = false;
        slot.unlock && slot.unlock(); // jshint ignore:line
        dom.clear(to);
        to.appendChild(to.image);
    },
    safeToCreate: function(recipe) {
        if (!recipe.Lvl)
            return true;
        var skill = game.player.Skills[recipe.Skill];
        if (!skill)
            game.error("Skill %s not found", recipe.Skill);
        return skill.Value.Current >= recipe.Lvl;
    },
    renderRequirements: function(recipe) {
        var requirements = document.createElement("div");

        requirements.appendChild(document.createTextNode(T("Requirements") + ":"));
        var deps = document.createElement("ul");

        if (recipe.Skill) {
            var skill = document.createElement("li");
            var lvl = (recipe.Lvl > 0) ? recipe.Lvl : "";
            skill.textContent = sprintf("%s: %s %s", T("Skill"), util.lcfirst(T(recipe.Skill)), lvl);

            if (!this.safeToCreate(recipe)) {
                skill.className = "unavailable";
                if (recipe.IsBuilding)
                    skill.title = T("Cannot complete building");
                else
                    skill.title = T("High chance of failing");
            }
            deps.appendChild(skill);
        }

        var self = this;
        function makeLinks(s) {
            if (!s)
                return [];
            return s.split(",").map(self.makeLink.bind(self));
        }

        function appendLinks(links, to) {
            for (var i = 0, l = links.length; i < l; i++) {
                to.appendChild(links[i]);
                if (i + 1 < l)
                    to.appendChild(dom.text(","));
            }
        }

        if (recipe.Tool) {
            var tool = document.createElement("li");
            tool.appendChild(dom.text(T("Tool") + ":"));
            appendLinks(makeLinks(recipe.Tool), tool);
            tool.title = T("Must be equipped");
            deps.appendChild(tool);
        }

        if (recipe.Equipment) {
            var equipment = document.createElement("li");
            equipment.textContent = T("Equipment") + ":";
            appendLinks(makeLinks(recipe.Equipment), equipment);
            equipment.title = T("You must be near equipment");
            deps.appendChild(equipment);
        }

        if (recipe.Liquid) {
            var liquid = document.createElement("li");
            liquid.textContent = TS(recipe.Liquid.Type) + ": " + recipe.Liquid.Volume;
            deps.appendChild(liquid);
        }

        requirements.appendChild(deps);

        if (this.requirements)
            dom.replace(this.requirements, requirements);
        else
            this.recipeDetails.appendChild(requirements);

        this.requirements = requirements;
    },
    makeLink: function(item)  {
        var name = util.lcfirst(TS(item));
        var link = dom.link("", name);
        link.className = "item-link";
        link.onclick = this.search.bind(this, name);
        return link;
    },
    makePreview: function(type) {
        var previewWrapper = document.createElement("div");
        previewWrapper.className = "preview-wrapper";
        var preview = Entity.templates[type].icon();
        preview.id = "item-preview";
        previewWrapper.appendChild(preview);
        return previewWrapper;
    },
    dwim: function(slot) {
        var self = this;
        if (!this.panel.visible)
            return false;
        if (slot.locked)
            return false;
        if (!slot.entity) {
            console.log("dwimCraft: got empty slot");
            return false;
        }
        var entity = slot.entity;
        return this.slots.some(function(slot) {
            if (slot.used || !entity.is(slot.group))
                return false;
            self.use(entity, slot);
            return true;
        });
    },
    save: function() {
        localStorage.setItem("craft.search", this.searchInput.value);
    },
};
