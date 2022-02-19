"use strict";
const request = require('request');
const moment = require('moment');
const fs = require('fs');
const Booru = require('./booru_custom');
const { Find, UpdateOne, Aggregate, Count, InsertOne, InsertMany, DeleteMany } = require('./modules/mongo/mongo');
const archiver = require('archiver');


// console.log(Booru.sites);
/**
 * Sites:
 * e621         nsfw: true
 * e926         nsfw: false
 * hypohub      nsfw: true
 * danbooru     nsfw: true
 * konac        nsfw: true
 * konan        nsfw: false
 * yandere      nsfw: true
 * gelbooru     nsfw: true
 * rule34       nsfw: true
 * safebooru    nsfw: false
 * tbib         nsfw: false
 * xbooru       nsfw: true
 * lolibooru    nsfw: true
 * paheal       nsfw: true
 * derpibooru   nsfw: true
 * realbooru    nsfw: true
 */

const DEFAULT_BOORU = "safebooru";

//Retrieving a random image with matching tags



// Where users will be stored
// let users = {};

/**
 * This function will do a GET to an URL to try to get the image, if it fails, it will do it again (Max 3 tries)
 * @param {string} uri - Url to download
 * @param {string} filename Route+filename to store
 * @param {int} [i] - Num of retry (Default: 0)
 */
function download(uri, filename, i) {
    i = i || 0;
    return new Promise((resolve, reject) => {
        let r = request(uri);
        r.pause();
        r.on('response', function (resp) {
            if (resp.statusCode === 200) {
                r.pipe(fs.createWriteStream(filename)) //pipe to where you want it to go
                    .on('close', resolve);
                r.resume();
            } else {
                if (resp.statusCode === 503) {
                    if (i > 3) {
                        reject('Too many retries');
                    } else {
                        setTimeout(() => {
                            console.log("Doing it again", uri);
                            download(uri, filename, ++i).then(resolve).catch(reject);
                        }, 800 * i);
                    }
                } else {
                    console.log('Cannot get image...: ', resp.statusCode, uri);
                    reject(resp.statusCode);
                }
            }
        });
    });
}


function getImageBuffer(uri) {
    return request.get(uri);
}

/**
 * This function will return the user if an ID is provider, otherwise will return all users
 * @param {string} id - Telegram Id of user (msg.from.id)
 */
function getUser(id, project = {}) {
    return Find('users', { id: id }, project, {}, true);
}

function updateUser(id, set = {}) {
    return UpdateOne('users', { id: id }, { $set: set });
}

/**
 * This function will check if a user is already on the database to store all information of it, otherwise just update it.
 * @param {import('node-telegram-bot-api').Message} msg - Telegram message object
 */
async function checkUser(msg) {
    // let test = JSON.parse(fs.readFileSync('../users_db.json'));
    // console.log('test: ', test);
    let user = await getUser(msg.from.id);
    if (!user) {
        console.log("New user!");
        await UpdateOne('users', { id: msg.from.id }, {
            $set: {
                id: msg.from.id,
                username: msg.from.username,
                first_name: msg.from.first_name,
                last_name: msg.from.last_name,
                joinedDate: moment().toDate(),
                lastDate: moment().toDate(),
                admin: false,
                booru: DEFAULT_BOORU,
                extra: {
                    type: 1,
                    video: true
                },
                img_num: 1,
                img_asked: 0,
            }
        }, { upsert: true });
        return getUser(msg.from.id);
    } else {
        user.lastDate = moment().toDate();
        user.first_name = msg.from.first_name;
        user.last_name = msg.from.last_name;
        user.username = msg.from.username;
        UpdateOne('users', { id: msg.from.id }, {
            $set: {
                lastDate: user.lastDate,
                first_name: user.first_name,
                last_name: user.last_name,
                username: user.username
            }
        });
    }
    return user;
}

async function getPosition(user) {
    return (await Count('users', {
        img_asked: { $gt: user.img_asked }
    })) + 1;
}

/**
 * This function will switch the value of an extra value of an user
 * @param {string} type - Type of extra value to change (change, video)
 * @param {object} user - Telegram user
 */
async function userSwitch(type, user) {
    if (user) {
        if (type == 'change') {
            if (user.extra.type == 1) {
                user.extra.type = 2;
            } else if (user.extra.type == 2) {
                user.extra.type = 3;
            } else {
                user.extra.type = 1;
            }
        } else {
            if (type in user.extra) {
                user.extra[type] = !user.extra[type];
            } else {
                console.log("Tried to change", type, "but IDK what's that");
            }
        }
        await updateUser(user.id, { extra: user.extra });
    }
}

/**
 * This function will change the value of a parameter of a client
 * @param {number} msg - Telegram id user
 * @param {string} type - Type of value to change
 * @param {any} value - Value to change
 */
function changeUserValue(id, type, value) {
    return updateUser(id, { [type]: value }).catch(console.log);
}

/**
 * This function will obtain a certain number of URL of anime pictures
 * @param {string} [text] - Text to search (Default: '' for a random one)
 * @param {number} id - Telegram user id
 * @param {int} num - Num of pictures to obtain
 * @param {object} [extra_options] - Options to send to this function
 * @param {number} [extra_options.page] - Page to search (Otherwhise is random)
 * @param {boolean} [extra_options.inline] - If it's inline or directly asked
 */
async function getAnimeUrl(text, user, num, extra_options = {}) {
    text = text || '';
    text = text.replace(/ /g, '_').toLowerCase();

    let rating = '';
    let search_site = user.booru ? user.booru : DEFAULT_BOORU;
    let url_search = Booru.resolveSite(search_site);
    // let seen_list = user.img_seen[search_site] || [];


    if (user.extra.type == 1) {
        // search_site = 'gelbooru';
        rating = 'rating:safe';
    } else if (user.extra.type == 2) {
        // search_site = 'rule34';
        rating = '-rating:safe';
    } else if (user.extra.type == 3) {

    }
    let tags = [];
    if (rating) tags.push(rating);
    if (text) tags.push(text);
    // let tags = ragting+' '+text;
    let query = {
        // tags: tags,
        limit: (extra_options.page) ? num : 500,
        random: true,

    };
    if (extra_options.page) {
        query.page = extra_options.page;
    } else {
        query.random = true;
    }

    console.log('Searching', query, 'on', search_site, 'with', tags);
    const posts = await Booru.search(search_site, tags, query);
    console.log('posts recived: ', posts.length);
    if (!posts.length) {
        throw { err: 'NO_MORE_IMAGES_TAG' };
    }
    let arr_images = [];

    let normal_exit = false;
    for (let post of posts) {
        if (!post.file_url) continue;
        let imgid = search_site + '_' + post.id;

        let splitt = post.file_url.split('.');
        let type = splitt[splitt.length - 1];
        let image_type = 'photo';

        let url_final = post.file_url;

        if (type == 'gif' || type == 'webm' || type == 'mp4') {
            if (!user.extra.video) continue;

            image_type = 'video';
            if (type == 'webm') {
                splitt[splitt.length - 1] = 'mp4';
                url_final = splitt.join('.');
            }
        }


        let obj = {
            type: image_type,
            imgid: imgid,
            photo: url_final
        };

        if (extra_options.inline) {
            if (!post.previewUrl) {
                let image_data = post._data.image;
                if (image_data) {
                    let image_id = post._data.image.split('.')[0];
                    let folder = post._data.directory;
                    obj.previewUrl = ('https://' + url_search + '/thumbnails/' + folder + '/thumbnail_' + image_id + '.jpg');
                }
            } else {
                obj.previewUrl = post.previewUrl;
            }
        }
        arr_images.push(obj);

        if (arr_images.length >= num) {
            normal_exit = true;
            if (extra_options.inline) break;
            if (!extra_options.no_db) {
                let seen = await Find('image_asked', { imgid: { $in: arr_images.map(a => a.imgid) }, userid: user.id }, { imgid: 1 });
                if (seen.length == 0) break;
                seen = seen.map(a => a.imgid);
                arr_images = arr_images.filter(x => !seen.includes(x.imgid)); // jshint ignore:line
                if (arr_images.length >= num) break;
            }
        }
        normal_exit = false;
    }

    if (!extra_options.inline && !normal_exit && !extra_options.no_db) {
        let seen = await Find('image_asked', { imgid: { $in: arr_images.map(a => a.imgid) }, userid: user.id }, { imgid: 1 });
        seen = seen.map(a => a.imgid);
        arr_images = arr_images.filter(x => !seen.includes(x.imgid));
    }


    if (!arr_images.length) {
        throw { err: 'NO_MORE_IMAGES' };
    }

    let results = { photo: [], video: [] };
    if (extra_options.inline) {
        for (let index of arr_images) results.photo.push(index);
    } else {
        let already_sent = [];
        if (!extra_options.no_image_data && !extra_options.no_db) already_sent = await Find('image_data', { imgid: { $in: arr_images.map(a => a.imgid) } }, { tid: 1, imgid: 1 });
        for (let index of arr_images) {
            // if (!users[id].img_seen[search_site]) users[id].img_seen[search_site] = [];
            // users[id].img_seen[search_site].push(index.name);

            let send = already_sent.find(a => a.imgid == index.imgid);
            results[index.type].push({ type: index.type, media: send ? send.tid : index.photo, already: send ? true : false, imgid: index.imgid });

        }
    }

    return results;
}

/**
 * This function will return a keyboard to show on inline message
 * @param {string} type - Type of keyboard to create
 * @param {object} [param1] - Extra options
 * @param {object} [param1.user] - Telegram user object
 * @param {boolean} [param1.inline] - Inline or keyboard
 */

function createKeyboard(type, { user, inline } = {}) {
    let keyboard = [];
    if (type == 'default') {
        keyboard = [
            [
                {
                    text: 'Clear images sent',
                    callback_data: 'clear'
                },
                {
                    text: 'Stats',
                    callback_data: 'stats'
                }
            ],

            [
                {
                    text: (user.extra.type == 1) ? 'Getting SFW' : (user.extra.type == 2) ? 'Getting NSFW' : 'Getting SFW/NSFW',
                    callback_data: 'pic_change'
                },
                // {
                //     text: (user.extra.sketchy) ? 'Disable sketchy' : 'Enable sketchy',
                //     callback_data: 'pic_sketchy'
                // },
                // {
                //     text: (user.extra.hentai) ? 'Hide NSFW images' : 'Get NSFW images',
                //     callback_data: 'pic_hentai'
                // }
                {
                    text: (user.extra.video) ? 'Videos enabled' : 'Videos disabled',
                    callback_data: 'pic_video'
                },
            ],
            [
                {
                    text: 'Searching: ' + user.booru,
                    callback_data: 'booru_change'
                }
            ],
            [
                {
                    text: 'Num of pics displayed at same time',
                    callback_data: 'img_num'
                }
            ],
            [
                {
                    text: 'Get random image',
                    callback_data: 'anime'
                }
            ]
        ];
        // if (user.admin) {
        //     keyboard.push([
        //         { text: 'Pack me some', callback_data: 'admin_pack' }
        //     ]);
        // }
    } else if (type == "numbers") {
        keyboard = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['10']];
    } else if (type == "booru") {
        let temp = [];
        for (const i_b in Booru.sites) {
            const b = Booru.sites[i_b];
            temp.push(b.aliases[b.aliases.length - 1]);
            if (temp.length == 2) {
                keyboard.push(temp);
                temp = [];
            }
        }
        if (temp.length) keyboard.push(temp);
    } else {
        console.log("Not defined keyboard", type);
    }
    if (inline) {
        return { inline_keyboard: keyboard };
    } else {
        return { keyboard: keyboard };
    }
}

/**
 * This function will return a default text to send to user
 * @param {object} id - Telegram User object
 */
function getDefaultText(user) {
    let text = '';
    if (user) {
        text = `
Send me a text and I'll search that on the 'booru' page selected.

Try out calling me with @booruimage_bot {text} on others chat!
Filters enabled will affect showed images

You can select options on the buttons below, use command /options to go back to this menu

Type /help to know how to search

If you're not in mood to write, you can use the command /random 
(Or use the button below)

Currently you asked for ${user.img_asked || 0} images.
It's configured to see ${user.img_num || 0} images at same time
`;
    }
    return text;
}

function helpText() {
    let text = `
For search just send me a message.
Go to /options to change filters, page search, number of displayed pics, etc...

Change filters if you want or don't want NSFW images.

Keep in mind that some pages only have SFW or NSFW images,
in that case they won't show anything until you enable them.

Some tips:
Search works with 'tags', you can type 'red hair' for example.

Always better to search for full name or the japanese name instead.

Try writting the anime/game between ( ) next to it.

Avoid ambiguous text such as 'miku'.

Examples:
Tate no yuusha -> Tate no yuusha no nariagari
Moon -> Mizuki (pokemon)
Miku -> Hatsune miku
`;
    return text;
}


/**
 * Function that sends a number of url to the user
 * @param {object} bot - Telegram bot object
 * @param {object} user - Telegram user
 * @param {string} text - Text to search
 * @param {int} [num] - Num of pictures to get (Default is user img_num) 
 * @param {int} [retry] - Num of retries
 */
async function sendImage(bot, user, text, num, retry = 0) {
    num = num || user.img_num || 1;
    console.log("text, num", text, num);

    UpdateOne('users', { id: user.id }, { $set: { last_text: text || null } });

    if (retry >= 3) {
        if (bot) {
            bot.sendMessage(user.id, "Couldn't send files...");
        }
        return;
    }

    let image_to_send = await getAnimeUrl(text, user, num).catch((err) => {
        console.log(err);
        if (bot) {
            if (err.err == 'NO_MORE_IMAGES') {
                bot.sendMessage(user.id, 'No more images to show...');
            } else if (err.err == 'NO_MORE_IMAGES_TAG') {
                bot.sendMessage(user.id, 'No images found\nNeed \/help searching?');
            } else {
                bot.sendMessage(user.id, 'Error getting the photo...');
            }
        }
    });

    if (!image_to_send) return;

    let pics_to_send = image_to_send.photo;
    if (pics_to_send) {
        console.log('Image got: ', image_to_send.photo.length);
    }
    let gifts_to_send = image_to_send.video;
    if (gifts_to_send) {
        console.log('Video got: ', image_to_send.video.length);
    }

    if (gifts_to_send.length) {
        let total_resend = 0;
        // Don't wait for this...
        (async () => {
            let current = moment().toDate();
            for (let video of gifts_to_send) {
                try {
                    let sent = await bot.sendVideo(user.id, video.media);
                    InsertOne('image_asked', { imgid: video.imgid, userid: user.id, sent: current, text: text });
                    if (!video.already) {
                        video.tid = sent.video ? sent.video.file_id : sent.animation ? sent.animation.file_id : null;
                        if (video.tid) InsertOne('image_data', { imgid: video.imgid, tid: video.tid });
                    }

                } catch (err) {
                    console.log('Error in: ', video.imgid);
                    total_resend++;
                    console.log("Total_resuend:", total_resend);
                }
            }
            UpdateOne('users', { id: user.id }, { $inc: { img_asked: (num - total_resend) } });
            // users[id].img_asked += (num - total_resend);
            if (total_resend) {
                if (num == total_resend) { retry++; } else { retry = 1; }
                sendImage(bot, user, text, total_resend, retry);
            }
        })();
    }
    if (pics_to_send.length) {
        let sending = pics_to_send.length;
        let number_no_send = await trySendPictures(user.id, bot, pics_to_send, text);
        // users[id].img_asked += (num - number_no_send);
        console.log("Incrementing in", sending - number_no_send);
        UpdateOne('users', { id: user.id }, { $inc: { img_asked: (num - number_no_send) } });
        if (number_no_send) {
            if (num == number_no_send) { retry++; } else { retry = 1; }
            sendImage(bot, user, text, number_no_send, retry);
        }
    }
}

/**
 * 
 * @param {number} id 
 * @param {import('node-telegram-bot-api')} bot 
 * @param {*} pics_to_send 
 */
async function trySendPictures(id, bot, pics_to_send, text) {
    console.log('id: ', id);
    let number_to_try_again = 0;
    let bad_pics = [];
    let pic_temp = [];
    let error = true;

    let results = [];
    let all_promises = [];

    console.log("Entering while true", pics_to_send.length);
    while (true) {
        if (pics_to_send.length) {
            while (error) {
                error = false;
                console.log("Sending", pics_to_send.length);
                try {
                    if (pics_to_send.length == 1) {
                        let sent = await bot.sendPhoto(id, pics_to_send[0].media, {});
                        if (!pics_to_send[0].already) pics_to_send[0].tid = sent.photo[sent.photo.length - 1].file_id;
                        results.push(pics_to_send[0]);
                    } else {
                        while (pics_to_send.length) {
                            let send = [];
                            if (pics_to_send.length > 10) {
                                send = pics_to_send.slice(0, 10);
                            } else {
                                send = pics_to_send;
                            }
                            let sent = await bot.sendMediaGroup(id, send, {});
                            for (let i = 0; i < sent.length; i++) {
                                if (!send[i].already) send[i].tid = sent[i].photo[sent[i].photo.length - 1].file_id;
                                results.push(send[i]);
                            }
                            pics_to_send.splice(0, send.length);
                            if (pics_to_send.length > 0) {
                                console.log("Sending", pics_to_send.length, 'remaining');
                            }
                        }
                    }
                } catch (err) {
                    console.log("Error sending pictures...", err.message);
                    error = true;
                    // number_to_try_again++;
                    let removed = pics_to_send.pop();
                    pic_temp.push(removed);
                }

                if (!pics_to_send.length) break;
            }
            if (!pic_temp.length) {
                break;
            } else {
                let bp = pic_temp.pop();
                console.log("Found the bad pic:", bp);
                bad_pics.push(bp);
                let buff = getImageBuffer(bp.media).on('error', (err) => {
                    console.log("Error downloading image");
                });
                all_promises.push(
                    bot.sendPhoto(id, buff).then((sent) => {
                        if (!bp.already) bp.tid = sent.photo[sent.photo.length - 1].file_id;
                        results.push(bp);
                    }).catch((err) => {
                        console.log("Error sending image");
                        number_to_try_again++;
                    })
                );

                // number_to_try_again = bad_pics.length;
                // await bot.sendMessage(id, bp.media);
                console.log("Let's try to send previous pics", pic_temp.length);
                pics_to_send = pic_temp;
                pic_temp = [];
                error = true;
            }
        } else {
            break;
        }
    }
    // if (number_to_try_again) {
    //     for (let bp of bad_pics) {
    //         bot.sendMessage(msg.from.id, bp.media);
    //     }
    //     number_to_try_again = 0;
    // }
    await Promise.all(all_promises);

    if (results.length) {
        let current = moment().toDate();
        InsertMany('image_asked', results.map(a => { return { imgid: a.imgid, userid: id, sent: current, text }; }));
        results = results.filter(a => a.already ? false : true);
        if (results.length) {
            InsertMany('image_data', results.map(a => { return { imgid: a.imgid, tid: a.tid }; }));
        }
    }

    console.log("Done with retry:", number_to_try_again);
    return number_to_try_again;
}

function clearImageSeen(id) {
    return DeleteMany('image_asked', { userid: id });
}

/**
 * 
 * @param {import('node-telegram-bot-api')} bot 
 * @param {*} text 
 * @param {*} user 
 * @param {*} num 
 */
async function packMeSome(bot, text, user, num) {
    console.log("Packing some!");
    let result = await getAnimeUrl(text, user, num);
    let total = result.photo.concat(result.video);
    let promises = [];
    let names = [];
    let rn = moment().format('YYYY_MM_DD_HH_mm_ss');
    let main_path = __dirname + '/../zips/images_' + rn + '/';
    if (!fs.existsSync(main_path)) {
        fs.mkdirSync(main_path, { recursive: true });
    }
    console.log("Downloading all", total.length);
    for (let p of total) {
        let term = p.media.split('.');
        let png_jpg = term[term.length - 1];
        let name = p.imgid + '.' + png_jpg;
        let path = main_path + name;
        names.push({ path: path, name: name });
        promises.push(download(p.media, path));
        if (promises.length > 10) {
            await Promise.all(promises);
            promises = [];
        }
    }
    await Promise.all(promises);

    console.log("Creating zip");
    let out = __dirname + '/../zips/' + rn + '.zip';
    const stream = fs.createWriteStream(out);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.directory(main_path)
        .on('error', err => { console.log(err) })
        .pipe(stream);

    stream.on('close', () => {
        console.log("All done!");
        console.log("Sending", out)
        bot.sendDocument(user.id, out).catch(console.log).then(() => {
            fs.unlinkSync(out);
        });
        fs.rmdirSync(main_path, { recursive: true });
    });
    archive.finalize();
}

module.exports = {
    checkUser,
    getUser,
    createKeyboard,
    userSwitch,
    getAnimeUrl,
    sendImage,
    getDefaultText,
    changeUserValue,
    helpText,
    getImageBuffer,
    getPosition,
    clearImageSeen,
    packMeSome
};