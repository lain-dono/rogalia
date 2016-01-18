'use strict'

var dom = require('../dom.js')
var Panel = require('../panel.js')

module.exports = Help

function Help() {
    var help = this;
    var addMessage = this.addMessage.bind(this);
    this.hooks = {
        "skills-button": function() {
            addMessage("${hr}В меню ${Skills} отображается текущий и максимальный уровень ваших навыков.");
            addMessage("Навыки влияют на качество добываемых ресурсов, качество создаваемых предметов и т.д.");
            addMessage("Помимо этого, навыки открывают соответсвующие им рецепты, а также разблокируют действия, например навык ${Lumberjacking} разблокирует способность рубить деревья.");
        },
        "inventory-button": function() {
            addMessage("${hr}Для перемещения предметов в инвентаре щелкните один раз ${lmb} для начала переноса, " +
                       "И еще один раз для того, чтобы перенести в нужный слот");
            addMessage("Быстро выкинуть предмет на землю: ${Ctrl} + ${lmb}");
        },
        'lift': function() {
            addMessage("${hr}Чтобы положить поднятый предмет нажмите ${Пробел} и выберите место");
        },
        "exp-gain": function(data) {
            if (data.value)
                addMessage("${hr}Вы только что получили опыт (+" + data.value + "xp)");
            addMessage("${hr}Получая опыт вы получаете эквивалентное количество ${LP} — очков обучения.");
            addMessage("На них вы можете покупать новые навыки (${Skills})");
            game.controller.highlight("skills", true);
        },
    };

    var subjectNames = {
        'exp-gain': 'Опыт',
        'lift': 'Перенос предметов',
        'inventory-button': 'Инвентарь',
        'skills-button': 'Навыки [Skills]',
    };
    this.subjects = Object.keys(this.hooks).map(function(name) {
        return {
            name: subjectNames[name],
            hook: this.hooks[name]
        };
    }.bind(this));

    this.steps = [
        {
            text: "Добро пожаловать.",
            duration: 1500,
        },
        {
            text: [
                "* Окна можно перетаскивать по всей странице",
                "* Этот туториал можно найти в меню System -> Help",
                "${hr}",
            ],
            duration: 1500,
        },
        {
            check: function() {
                return game.player.hasItems({stone: 1});
            },
            text: [
                "Найдите телепорт с табличкой \"в случайное место\" или мост на сушу.",
                "Затем найдите ${img:stone} лежащий на земле и поднимите его (${lmb})",
                "В округе камней может не оказаться. В таком случае ищите их дальше от точки телепортации",
            ]
        },
        {
            check: function() {
                return game.player.hasItems({branch: 1});
            },
            text: [
                "Отлично! Теперь идите к ближайшему дереву и сорвите с него ветку (${rmb} ${Get branch}).",
                "Если на дереве не оказалось веток, поищите на другом.",
            ],
        },
        {
            check: function() {
                return game.player.hasItems({bough: 1});
            },
            text: "Великолепно. Теперь сорвите с дерева сук (${rmb} ${Get bough})"
        },
        {
            check: function() {
                return game.controller.skills.panel.visible;
            },
            highlight: ["skills"],
            text: [
                "У вас уже должно быть достаточно ${LP} для того чтобы прокачать первый навык",
                "Откройте окно ${Skills}"
            ]
        },
        {
            check: function() {
                return game.player.Skills.Stoneworking.Value.Max > 0;
            },
            text: "Теперь прокачайте навык ${Stoneworking}."
        },
        {
            check: function() {
                return game.controller.craft.panel.visible;
            },
            highlight: ["craft"],
            text: [
                "Вы получили навык ${Stoneworking} и теперь можете создавать новые предметы",
                "Для того чтобы посмотреть на них, откройте окно ${Craft}."
            ]
        },
        {
            check: function() {
                return (game.controller.craft.selected && game.controller.craft.selected.type == "stone-axe");
            },
            text: [
                "Попробуем создать топор, без которого мы не сможем рубить деревья.",
                "Выберите рецепт топора:",
                "${lmb} ${Stoneworking} > ${Stone axe}",
                "(${recipe:Stone axe})"
            ]
        },
        {
            text: "Для создания топора нам нужны: ${recipe:Sharp stone}, ${Stick} и ${Twig}",
            duration: 1000,
        },
        {
            skip: function() {
                return game.player.hasItems({"sharp-stone": 1})
            },
            check: function() {
                return (game.controller.craft.selected && game.controller.craft.selected.type == "sharp-stone");
            },
            text: [
                "Для начала создадим острый камень.",
                "Откройте его рецепт:",
                "${lmb} ${Stoneworking} > ${Sharp stone}",
            ]
        },
        {
            skip: function() {
                return game.player.hasItems({"sharp-stone": 1}) || this.check()
            },
            check: function() {
                return game.player.hasItems({stone: 2});
            },
            text: [
                "Итак, для создания острого камня нам нужно два обычных камня.",
                "Найдите второй камень."
            ]
        },
        {
            check: function() {
                return game.player.hasItems({"sharp-stone": 1});
            },
            highlight: ["inventory"],
            text: "Теперь перенесите камни из инвентаря в соответсвующие слоты в интерфейсе крафта и нажмите кнопку ${Create}"
        },
        {
            check: function() {
                return (game.controller.craft.selected && game.controller.craft.selected.type == "stone-axe");
            },
            text: [
                "Хорошо. Теперь вернемся к рецепту топора.",
                "${lmb} ${Stoneworking} > ${Stone axe}",
                "${recipe:Stone axe}"
            ]
        },
        {
            check: function() {
                return game.player.hasItems({bough: 1, branch: 1});
            },
            text: [
                "Нужно найти: ${img:branch} и ${img:bough}.",
                "Их можно найти на деревьях (${rmb} ${Get branch}, ${Get bough})",
            ]
        },
        {
            check: function() {
                return game.player.hasItems({stick: 1, twig: 1});
            },
            highlight: ["inventory"],
            text : [
                "Дальше нам нужны прутик и палка.",
                "Откройте инвентарь и превратите сук в палку, а ветку в прутик (${rmb} ${Break off})"
            ]
        },
        {
            check: function() {
                return game.player.hasItems({axe: 1});
            },
            text: "Теперь у нас есть все, что нужно для создания топора. Перенесите ингредиенты и нажмите кнопку ${Create}"
        },
        {
            check: function() {
                return game.player.Skills.Lumberjacking.Value.Max > 0;
            },
            highlight: ["skills"],
            text: [
                "Отлично. У вас есть топор, но вы пока не можете рубить деревья, поскольку не имеете соответсвующего навыка.",
                "Откройте окно ${Skills} и выучите навык ${Lumberjacking}"
            ]
        },
        {
            check: function() {
                return game.controller.stats.panel.visible;
            },
            text: "Откройте окно персонажа (кнопка с лицом персонажа)"
        },
        {
            check: function() {
                return game.player.equippedWith("axe");
            },

            text: "И перенесите топор в слот правой руки (тип слота отображается во впслывающей подсказке)"
        },
        {
            check: function() {
                return (help.lastAction == "Chop");
            },
            text: "Теперь вы можете срубить свое первое дерево. Попробуйте сделать это. (${rmb} по дереву и  ${Chop})"
        },
        {
            text: "Самое время найти подходящее для жилища место и построить респаун.",
            duration: 1500,
        },
        {
            text: [
                "После смерти вы попадете к последнему респауну.",
                "Помимо этого через респаун можно попасть на рынок.",
            ],
            duration: 2000,
        },
        {
            highlight: ["craft"],
            text: "Чтобы построить респаун откройте окно крафта: ${Craft}",
            check: function() {
                return game.controller.craft.panel.visible;
            }
        },
        {
            text: [
                "Выбирите раздел ${Survival}, а в нем ${recipe:Respawn}",
                "А затем нажмите ${Create} и разместите постройку",
            ],
            check: function() {
                return (game.controller.craft.selected && game.controller.craft.selected.type == "respawn");
            }
        },
        {
            text: [
                "Осталось добыть нужные ингредиенты и построить респаун",
                "Добывать камни можно при помощи кирки ${recipe:pickaxe}",
                "(Которую как и топор нужно предварительно взять в руки)",
                "Найдите ${img:stone-block}",
                "И нажмите ${rmb} ${Chip}",
            ],
            check: function() {
                return (help.lastAction == "build-respawn");
            }
        },
        {
            text: [
                "Для защиты собсвенности стройте заборы, двери, стены.",
                "Ваши постройки можете уничтожать только вы.",
                "Ваши двери можете открывать только вы.",
            ],
            duration: 5000,
        },
        {
            text: [
                "Вы закончили туториал. Теперь вы сами по себе.",
                "Больше информации на вики: ${http://rogalik.tatrix.org/wiki}",
                "И на нашем форуме: ${http://rogalik.tatrix.org/forum}",
            ]
        },
    ];

    this.messages = document.createElement("ul");
    this.messages.className = "messages no-drag";

    var list = document.createElement("ol");
    list.className = "hidden";
    this.subjects.forEach(function(subject) {
        var a = document.createElement("a");
        a.hook = subject.hook;
        a.textContent = subject.name;

        var item = document.createElement("li");
        item.appendChild(a);
        list.appendChild(item);
    });

    var resetHelp = document.createElement("button");
    resetHelp.textContent = T("Reset help");
    resetHelp.onclick = function() {
        if (!confirm("This will reset tutorial, interface help and reload client. Continue?"))
            return;
        this.step = this.steps[0];
        this.runnedHooks = {};
        this.save();
        game.reload();
    }.bind(this);

    var disableHelp = document.createElement("button");
    disableHelp.textContent = T("Disable help");
    disableHelp.onclick = this.disableHelp.bind(this);

    var toggleTopics = document.createElement("button");
        toggleTopics.textContent = T("Topics");
    toggleTopics.onclick = function() {
        dom.toggle(list);
    };

    var options = document.createElement("button");
    options.textContent = "⚙";
    options.onclick = function() {
        dom.toggle(resetHelp);
        dom.toggle(disableHelp);
        dom.toggle(toggleTopics);
    };

    this.panel = new Panel(
        "help",
        "Help",
        [this.messages, list, options, resetHelp, disableHelp, toggleTopics],
        {
            click: function(e) {
                if (e.target.hook)
                    e.target.hook({});
            }
        }
    );
    this.load();
}

Help.prototype = {
    runnedHooks: {},
    lastAction: null,
    hooks: {},
    subjects: {},
    step: null,
    steps: [],
    disableHelp: function() {
        this.step = null;
        for (var i in this.hooks)
            this.runnedHooks[i] = true;
        this.save();
        dom.clear(this.messages);
    },
    load: function() {
        this.disableHelp();
        return;

        /* XXX
        var i = localStorage.getItem("help.step") || 0;
        i = this.steps.length;
        if (i >= 0 && i < this.steps.length)
            this.step = this.steps[i];
        for (var j = 0; j < i; j++) {
            var step = this.steps[j];
            this.addStepText(step);
            if ("check" in step)
                this.addMessage("${hr}");
        }

        var runned =  localStorage.getItem("help.runnedHooks");
        if (runned)
            this.runnedHooks = JSON.parse(runned);
        */
    },
    save: function() {
        localStorage.setItem("help.step", this.steps.indexOf(this.step));
        localStorage.setItem("help.runnedHooks", JSON.stringify(this.runnedHooks));
    },
    runHook: function(data) {
        var hook = this.hooks[data.type];
        if (!hook || this.runnedHooks[data.type])
            return;
        this.showHelp();
        hook(data);
        this.runnedHooks[data.type] = true;
    },
    next: function() {
        if ("check" in this.step)
            this.addMessage("${hr}")

        this.step = this.steps[this.steps.indexOf(this.step) + 1]

        if (!this.step)
            return;

        if ("skip" in this.step && this.step.skip()) {
            this.next();
        }
    },
    actionHook: function(action) {
        this.lastAction = action;
    },
    update: function() {
        var step = this.step;
        if (!step)
            return;
        switch(step.state || "") {
        case "check":
            if (!step.lastCheck || step.lastCheck + 500 < Date.now()) {
                if (step.check())
                    this.next();
                else
                    step.lastCheck = Date.now();
                break;
            }
            /* falls through */
        case "wait":
            break;
        default:
            step.highlight && step.highlight.forEach(function(what) {
                game.controller.highlight(what, true);
            }); // jshint ignore:line

            this.addStepText(step);
            this.showHelp();
            if (step.check) {
                step.state = "check";
            } else {
                setTimeout(function() {
                    if (step.nextState)
                        step.state = step.nextState;
                    else
                        this.next();
                }.bind(this), step.duration);
                step.state = "wait";
            }
        }
    },
    addStepText: function(step) {
        if (typeof step.text == 'string')
            step.text = [step.text];

        step.text.forEach(this.addMessage.bind(this));
    },
    addMessage: function(text) {
        var item = document.createElement("li");
        item.className = "message";
        item.appendChild(game.chat.format(text));
        this.messages.appendChild(item);
        this.messages.scrollTop = this.messages.scrollHeight;
    },
    showHelp: function() {
        this.panel.show();
    },
}
