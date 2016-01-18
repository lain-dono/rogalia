'use strict'

var Stage = require('./stage.js')
var dom = require('../dom.js')
var Panel = require('../panel.js')
var cnf = require('../config.js')
var util = require('../util.js')

Stage.add(loginStage);
window.loginStage = loginStage

function loginStage() {
    /*jshint validthis:true */

    var signing = false;
    var registering = false;
    var autoLogin = false;
    var error = false;
    // var captcha = null;
    var invite = null;

    var login = game.loadLogin();
    var password = game.loadPassword();
    var email = "";

    function signin() {
        game.network.send(
            "login",
            {
                Login: login,
                Password: password,
                // Captcha: captcha,
            },
            enterLobby
        );
    }

    function signup() {
        game.network.send(
            "register",
            {
                Login: login,
                Password: password,
                Email: email,
                // Captcha: captcha,
                Referrer: document.referrer,
                UA: navigator.userAgent,
            },
            enterLobby
        );
    }

    function enterLobby(data) {
        game.setPassword(password);
        document.getElementById("version").textContent = data.Version;
        game.setStage("lobby", data);
    }


    if(login && password && !game.inVK()) {
        autoLogin = true;
        signin();
    }

    //     var captchaDiv = document.createElement("div");
    // "grecaptcha" in window && grecaptcha.render(captchaDiv, {
    //     "sitekey": "6LeWNP8SAAAAAAYxO-yCtxpHfwXtlOS2LDAXze-4",
    //     "callback": function(response) {
    //         captcha = response;
    //     }
    // });

    var loginInput = dom.input(T("Login"), login);
    var passwordInput = dom.input(T("Password"), "", "password");
    var signinButton = dom.button(T("Sign in"));

    var emailInput = dom.input(T("Email"));
    dom.hide(emailInput.label);

    var signupButton = dom.button(T("Sign up"));
    signupButton.onclick = function() {
        if (registering)
            return true;
        registering = true;

        dom.hide(signinButton);
        dom.show(emailInput.label);

        if (!loginInput.value)
            loginInput.focus();
        else if (!passwordInput.value)
            passwordInput.focus();
        else
            emailInput.focus();
        return false;
    };

    var en = dom.option("en");
    var ru = dom.option("ru");
    if (game.lang == "ru")
        ru.selected = true;

    var lang = dom.select([en, ru], "lang-selector");
    lang.onchange = function() {
        localStorage.setItem("lang", this.value);
        game.reload();
    };

    var form = dom.tag("form", "#login-form");
    form.onsubmit = function () {
        login = loginInput.value;
        if (!util.validateInput(loginInput, login !== "", "Please enter login"))
            return false;

        password = passwordInput.value;
        if (!util.validateInput(passwordInput, password !== "", "Please enter password"))
            return false;

        game.setLogin(login);

        if (registering) {
            email = emailInput.value;
            if (!util.validateInput(emailInput, email !== "", "Please enter email"))
                return false;
            signup();
        } else {
            signin();
        }
        return false;
    };
    dom.append(form, [
        loginInput.label,
        passwordInput.label,
        emailInput.label,
        dom.hr(),
        signinButton,
        signupButton,
        lang,
    ]);
    var panel = new Panel("login-panel", "", [form]);

    panel.hideCloseButton();
    panel.show(cnf.LOBBY_X + game.offset.x, cnf.LOBBY_Y + game.offset.y);

    if (login)
        passwordInput.focus();
    else
        loginInput.focus();


    if (game.inVK()) {
        panel.hide();
        this.draw = Stage.makeEllipsisDrawer();
        var el = document.createElement("script");
        el.type = "text/javascript";
        el.src = "//vk.com/js/api/xd_connection.js?2";
        document.body.appendChild(el);
        el.onload = function() {
            VK.init(function() {
                VK.callMethod("showInstallBox");
                VK.addCallback("onApplicationAdded", function() {
                    var match = document.location.search.match(/access_token=(\w+)/);
                    var token = match && match[1];
                    if (token) {
                        panel.hide();
                        game.network.send("oauth", {Token: token}, enterLobby);
                    } else {
                        panel.show();
                    }
                });
            }, function() {
                panel.show();
            }, '5.37');
        };
        el.onerror = function() {
            game.alert(T("Cannot connect to vk.com"));
            panel.show();
        };
    }

    this.sync = function (data) {
        if (data.Warning) {
            localStorage.removeItem("password");
            if (!autoLogin)
                game.alert(data.Warning);
            panel.show();
            autoLogin = false;
        }
    };

    this.end = function() {
        panel.close();
    };
}
