import Vue from 'vue'
Vue.config.debug = true

require('./lang/ru/items.js')
var dict = require('./lang/ru/dict.js')
require('./lang/dict.js')

//TODO:FIXME: remove bool flag and use select{lang1, lang2, ...}
function defaultLang() {
    if (document.location.search.indexOf('en') != -1)
        return 'en'
    if (navigator.language.substring(0, 2) == 'en')
        return 'en'
    return 'ru'
}

var lang = localStorage.getItem('lang') || defaultLang()
dict.init(lang)


var Game = require('./game.js').default

//IE detector
if ('\v'=='v') {
    alert('Internet Explorer не поддерживается');
    document.location = 'http://rogalia.ru/wiki/index.php/%D0%97%D0%B0%D0%BF%D1%83%D1%81%D0%BA_%D0%BA%D0%BB%D0%B8%D0%B5%D0%BD%D1%82%D0%B0_%D0%B8%D0%B3%D1%80%D1%8B';
} else {
    var game = new Game();
    game.lang = lang
}
