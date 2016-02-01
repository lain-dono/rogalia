var Character = require('../character.js')
require('../characters.js')
var Panel = require('../panel.js')
var dom = require('../dom.js')
var Stats = require('./stats.js')

var max = 100

export var byAttr = {
    strength: ['Carpentry', 'Metalworking', 'Leatherworking'],
    vitality: ['Stoneworking', 'Mining', 'Lumberjacking'],
    dexterity: ['Pottery', 'Tailoring', 'Swordsmanship'],
    intellect: ['Mechanics', 'Alchemy'],
    perception: ['Survival', 'Farming', 'Fishing'],
    wisdom: ['Herbalism', 'Cooking', 'Leadership'],
}

export var vv = {
    template: require('raw!./skills.html'),
    data() {
        return {
            selected: '',
            byAttr: {
                strength: ["Carpentry", "Metalworking", "Leatherworking"],
                vitality: ["Stoneworking", "Mining", "Lumberjacking"],
                dexterity: ["Pottery", "Tailoring", "Swordsmanship"],
                intellect: ["Mechanics", "Alchemy"],
                perception: ["Survival", "Farming", "Fishing"],
                wisdom: ["Herbalism", "Cooking", "Leadership"],
            },
            descriptions: {
                "Survival": "Survival gives you basic recipes like bonfire",
                "Stoneworking": "Stoneworking gives you recipes like sharp stone, stone axe, stone hammer, etc.",
                "Lumberjacking": "Lumberjacking gives you an ability to chop trees.",
            },
        }
    },
    methods: {
        learn() {
            if(this.selected === '' || this.learnDiff() <= 0) {
                game.error("No selected skill");
                return
            }
            game.network.send("learn-skill", { name: this.selected });
        },

        skillDataByName(name) {
            return game.player.Skills[name]
        },
        currentValue(name) {
            return this.skillDataByName(name).Value.Current
        },
        maxValue(name) {
            return this.skillDataByName(name).Value.Max
        },

        LP() {
            return game.player.LP
        },
        learnDiff() {
            return this.nextLvlOf().Cost - game.player.LP
        },

        isSelectedMax() {
            return !this.nextLvlOf()
        },
        nextLvlOf() {
            var skill = this.skillDataByName(this.selected)
            console.log(Character.skillLvls, skill)
            for (var i in Character.skillLvls) {
                var next = Character.skillLvls[i]
                if (next.Value > skill.Value.Max) {
                    return next
                }
            }
            return
        },

        title(attr, name) {
            if(this.isCapped(name)) {
                return T('Skill is capped')
            } else {
                return TT('This skill depends on {attr}', {attr: attr})
            }
        },

        isNormal(name) {
            return !this.isMax(name) && !this.isCapped
        },
        isCapped(name) {
            var skill = this.skillDataByName(name).Value
            return skill.Current == skill.Max && skill.Max != max
        },
        isMax(name) {
            var skill = this.skillDataByName(name).Value
            return skill.Value.Current == max
        },
        select(name) {
            this.select = name
            this.showDescription(name);
        },
    },
}

export default function Skills() {
    this.current = null;

    this.skills = document.createElement("div");
    this.skills.id = "skill-list";

    this.description = document.createElement("div");
    this.description.classList.add("description");
    this.description.textContent = T("Select skill to see it's description");

    this.learnButton = document.createElement("button");
    this.learnButton.textContent = T("Learn");
    this.learnButton.onclick = this.learn.bind(this);
    this.learnButton.disabled = true;

    this.panel = new Panel(
        "skills",
        "Skills",
        [
            this.skills,
            dom.hr(),
            this.description,
            dom.hr(),
            this.learnButton,
        ]
    );
    this.update();
    this.panel.hooks.show = this.update.bind(this);
    this.hash = "";
}

Skills.byAttr = {
    strength: ["Carpentry", "Metalworking", "Leatherworking"],
    vitality: ["Stoneworking", "Mining", "Lumberjacking"],
    dexterity: ["Pottery", "Tailoring", "Swordsmanship"],
    intellect: ["Mechanics", "Alchemy"],
    perception: ["Survival", "Farming", "Fishing"],
    wisdom: ["Herbalism", "Cooking", "Leadership"],
};

Skills.prototype = {
    update: function() {
        if (this.panel && !this.panel.visible)
            return;
        var hash = JSON.stringify(game.player.Skills) + game.player.LP;
        if (hash == this.hash)
            return;
        this.hash = hash;

        dom.clear(this.skills);

        var max = 100;
        var fn = (function(name) {
            var skill = game.player.Skills[name];
            console.log(skill)

            //createParam: function(label, param, digits, useColors, icon) {
            var item = Stats.prototype.createParam(
                name,
                skill.Value,
                2,
                false,
                "skills/" + name
            );
            if (skill.Value.Current == max) {
                item.getElementsByClassName("meter-title")[0].textContent = "max";
            }
            item.name = name;
            item.skill = skill;
            item.classList.add("skill");
            item.title = TT("This skill depends on {attr}", {attr: attr});
            dom.insert(dom.span("◾ ", "attr-" + attr), item);
            if (skill.Value.Current == skill.Value.Max && skill.Value.Max != max) {
                item.classList.add("capped");
                item.title = T("Skill is capped");
            }
            item.onclick = this.select.bind(this, item);
            this.skills.appendChild(item);

            if (this.current && this.current.name == name)
                this.select(item);
        }).bind(this)
        for (var attr in Skills.byAttr) {
            Skills.byAttr[attr].forEach(fn);
        }
    },
    select: function(item) {
        if (this.current) {
            this.current.classList.remove("selected");
        }
        item.classList.add("selected");
        this.current = item;
        this.showDescription(item);
    },
    nextLvlOf: function(skill) {
        for (var i in Character.skillLvls) {
            var next = Character.skillLvls[i];
            if (next.Value > skill.Value.Max)
                return next;
        }
        return null;
    },
    showDescription: function(item) {
        var skill = item.skill;
        var name = item.name;
        var text = T("Value") + ": " + Stats.formatParam(skill.Value) + "\n";

        if (this.descriptions[name])
            text += this.descriptions[name] + "\n\n";

        var next = this.nextLvlOf(skill);
        if (!next) {
            text += T("Skill has it's maximum level");
        } else {
            text += TT("Unlocks {lvl} lvl of the {skill} skill", {lvl: next.Name, skill: name});
            text += "\n\n";
            text += T("New maximum value") + ": " + next.Value + "\n";
            text += T("Cost") + ": " + next.Cost + "\n";
            text += TT("You have {amount} LP", {amount: game.player.LP});
            text += "\n";

            var diff = next.Cost - game.player.LP;
            if(diff > 0) {
                text += TT("You need {diff} additional LP to learn this skill", {diff: diff});
                this.learnButton.disabled = true;
            } else {
                this.learnButton.disabled = false;
            }
        }
        this.description.textContent = text;
    },
    descriptions: {
        "Survival": "Survival gives you basic recipes like bonfire",
        "Stoneworking": "Stoneworking gives you recipes like sharp stone, stone axe, stone hammer, etc.",
        "Lumberjacking": "Lumberjacking gives you an ability to chop trees.",
    },

    learn: function(e) {
        if (!this.current)
            game.error("No selected skill");
        game.network.send("learn-skill", {name: this.current.name });
    },
};
