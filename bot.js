"use strict";
process.env.NTBA_FIX_319 = 1;
process.env.NTBA_FIX_350 = 1;
const TelegramBot = require('node-telegram-bot-api');
const { token } = require('./modules/options/options');
const { Connect } = require('./modules/mongo/mongo');
const func = require('./functions');
const fs = require('fs');

// Init things
// func.checkEveryFileFolder();
// func.putWhCookie();

let saved_inline = {};
console.log("Connecting to mongo");
Connect().then(() => {
    console.log("Connected to mongo");

    console.log("Starting telegram Bot");
    const bot = new TelegramBot(token, { polling: true, filepath: false });
    console.log("Telegram bot Online");

    // Temp variable to store some temporal stuff (Like when the user needs to write something)
    let temp = {};

    // When user write a message
    bot.on('message', async (msg) => {
        let user = await func.checkUser(msg);
        let userid = msg.from.id;
        console.log("Getting a meessage from", userid, msg.text);
        if (temp[userid]) {
            if (temp[userid].img_num) {
                let num = parseInt(msg.text);
                if (user.admin || (num && num < 11 && num > 0)) {
                    func.changeUserValue(userid, 'img_num', num);
                    bot.sendMessage(userid, "Ok, I'll display " + num + ' images at same time', { reply_markup: { remove_keyboard: true } });
                    delete temp[userid];
                } else {
                    bot.sendMessage(userid, 'Please, pick a VALID number BETWEEN 1 and 10',
                        { reply_markup: { keyboard: [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['10']] } });
                }
            } else if (temp[userid].booru_change) {
                func.changeUserValue(userid, 'booru', msg.text);
                bot.sendMessage(userid, "Ok, I'll search on " + msg.text + ' from now', { reply_markup: { remove_keyboard: true } });
                delete temp[userid];
            } else {
                delete temp[userid];
            }
        } else {
            switch (msg.text) {
                case '/start':
                case '/options':
                case '/start _start_':
                    let text = func.getDefaultText(user);
                    bot.sendMessage(userid, text, {
                        reply_markup: func.createKeyboard('default', { user, inline: true })
                    });
                    break;
                case '/help':
                    bot.sendMessage(userid, func.helpText());
                    break;
                case '/repeat':
                    func.sendImage(bot, user, user.last_text || null);
                    break;
                case '/random':
                    func.sendImage(bot, user, null);
                    break;
                default:
                    func.sendImage(bot, user, msg.text);
                    break;
            }
        }
    });

    // When user press a button
    bot.on("callback_query", async function (msg) {
        let user = await func.checkUser(msg);
        let userid = msg.from.id;
        console.log('msg.data: ', msg.data);
        if (msg.data.includes('pic_')) {
            await func.userSwitch(msg.data.split('pic_')[1], user);
            bot.editMessageReplyMarkup(func.createKeyboard('default', { user, inline: true }), { message_id: msg.message.message_id, chat_id: msg.message.chat.id, }).catch(err => {
                console.log('err: ', err);
                let text = func.getDefaultText(user);
                bot.sendMessage(userid, text, {
                    reply_markup: func.createKeyboard('default', { user, inline: true })
                });
            });
        } else if (msg.data.includes('admin_')) {
            if (msg.data.includes('_pack')) {
                return func.packMeSome(bot, "", user, 50);
            }
        } else if (msg.data.includes('booru_')) {
            bot.sendMessage(userid,
                'Select a Booru website to search \n\n' +
                'Default: gelbooru\n' +
                'Current Searching: ' + user.booru + '\n' +
                "Some Boorus are only NSFW, they won't find anything unless you enable NSFW search",
                { reply_markup: func.createKeyboard('booru') }
            );
            if (!temp[userid]) temp[userid] = {};
            temp[userid].booru_change = true;

        } else if (msg.data == 'anime') {
            console.log("Going to get an anime");
            func.sendImage(bot, user, null);
        } else if (msg.data == 'stats') {
            let position = await func.getPosition(user);
            // let users = func.getUser();
            // console.log('users: ', users);
            // let position = '-';

            // let arr_check = [];
            // for (let id in users) arr_check.push(users[id]);
            // arr_check.sort((a, b) => b.img_asked - a.img_asked);
            // for (let i = 0; i < arr_check.length; i++) {
            //     if (arr_check[i].id == msg.from.id) {
            //         position = i + 1;
            //         break;
            //     }
            // }
            bot.sendMessage(msg.from.id,
                'You asked for ' + user.img_asked + ' images\n\n' +
                position + "º position asking images"
            );
        } else if (msg.data == 'clear') {
            // func.changeUserValue(userid, 'img_seen', []); // @TODO
            await func.clearImageSeen(userid);
            bot.sendMessage(msg.from.id, 'Images cleared');
        } else if (msg.data == 'img_num') {
            bot.sendMessage(msg.from.id, 'Select a number between 1 and 10',
                { reply_markup: func.createKeyboard('numbers') }
            );
            if (!temp[msg.from.id]) temp[msg.from.id] = {};

            temp[msg.from.id].img_num = true;
        } else {
            bot.sendMessage(msg.from.id, '?');
        }
    });

    bot.on('inline_query', async function (msg) {
        /** @todo Tengo que darle un repaso a esto... */
        /** @todo Tiene que haber alguna forma de esperar a que acabe de escribir... */
        console.log('msg: ', msg);
        let user = await func.checkUser(msg);
        let page = msg.offset || 1;
        func.getAnimeUrl(msg.query, user, 24, { inline: true, sorting: false, page: page }).then((image_to_send) => {
            console.log('image_to_send: ', image_to_send);
            let arr_final = image_to_send.photo.map(a => {
                return {
                    type: 'photo',
                    id: a.imgid,
                    photo_url: a.photo,
                    thumb_url: a.previewUrl,
                    title: a.imgid,
                    photo_width:500,
                    photo_height:500,
                };
            });
            console.log('arr_final: ', msg.query, arr_final);
            page = parseInt(page) + 1;
            bot.answerInlineQuery(msg.id, arr_final,
                {

                    is_personal: true,
                    cache_time: 10,
                    next_offset: page,
                    switch_pm_text: 'Open the bot!',
                    switch_pm_parameter: '_start_'
                }
            ).catch(er => {
                console.log('erIn: ', er);
            });
        }).catch(er => {
            console.log('er: ', er);
            bot.answerInlineQuery(msg.id, []);
        });
    });
});


// Interval to save the users and reset the cookie
// setInterval(function () {
//     console.log("Saving users");
//     fs.writeFile(options.routes.db_file, JSON.stringify(func.getUser()), function (err) {
//         if (err) {
//             console.log("Error ocurred saving the users", err);
//         } else {
//             console.log("User saved");
//         }
//     });
//     // func.putWhCookie().then(() => {
//     //     console.log("Cookie reset")
//     // }).catch(err => {
//     //     console.log("Error ocurred triying to reset the cookie", err)
//     // });
// }, 1000 * 60 * 10);

// All exit handler
// process.stdin.resume();
// process.on('SIGINT', exitHandler.bind(null, { exit: true }));
// process.on('exit', exitHandler.bind(null, { exit: true }));
// process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
// process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));
// process.on('uncaughtException', exitHandler.bind(null, { exit: true }));
// /**
//  * Function that execute right before closing the application
//  * @param {object} option - Object of different options to make on exit
//  * @param {object} exitCode - Not really important, but code of exit
//  */
// function exitHandler(exit_options, exitCode) {
//     console.log("Saving stuff before exit...");
//     if (!exit_options) exit_options = {};
//     console.log('exitCode: ', exitCode, exit_options);
//     setTimeout(function () {
//         fs.writeFileSync(options.routes.db_file, JSON.stringify(func.getUser()));
//         console.log("Users and pics saved");
//         if (exit_options.exit) {
//             process.exit();
//         }
//     }, 200);
// }