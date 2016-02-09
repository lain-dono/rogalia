# Rogalik mmo client
http://rogalia.ru/play

## Контрибьюторам

**Этот раздел будет пополняться и изменяться**

### Используемые технологии

* Vue - реактивный фреймворк для ui ([api](http://vuejs.org/api/), [github](https://github.com/vuejs/vue), [awesome](https://github.com/vuejs/awesome-vue))
* PIXI - ускоренный 2D рендеринг ([api](http://pixijs.github.io/docs/), [github](https://github.com/pixijs/pixi.js/))
* fast.js - парочка оптимизированных функций взамен стандартным ([github](https://github.com/codemix/fast.js))


### Общая структура исходников


* `assets` - всяческие спрайты и иконки
* `js` - весь код клиента

```
. js - весь код клиента
├── container - TODO переместить в UI
├── i18n - новая папка для переводов
│   ├── en
│   └── ru
├── lang - legacy переводы
│   └── ru
├── lib
├── render - весь рендеринг карты (сейчас используется canvas, но позже будет через PIXI)
├── stages
├── tests
│   ├── bst
│   └── chat
└── ui - тут находится весь код UI
    ├── chat
    ├── craft
    ├── quests
    ├── stages
    └── vendor - код UI для торговцев
```
