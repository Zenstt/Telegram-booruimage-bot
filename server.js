// Create node express server with cors
const express = require('express');
const cors = require('cors');
const moment = require('moment');
const { Connect } = require('./modules/mongo/mongo');
const func = require('./functions');
const Booru = require('./booru_custom');

const PORT = 8007;

const app = express();

app.use(cors());


let fakeUser = {
    "id": null,
    "admin": false,
    "booru": "gelbooru",
    "extra": {
        "type": 3,
        "video": true
    },
    "img_asked": 0,
    "img_num": 10,
    "joinedDate": moment("2020-05-29T16:06:49.925Z").toDate(),
    "lastDate": moment("2020-06-05T10:58:11.577Z").toDate(),
    "username": "Discord Pluggin"
};

app.get('/', (req, res) => {
    res.send("Hello World!");
    res.end();
});
app.get('/checkBoorus', async (req, res) => {
    console.log('Booru.sites: ', Booru.sites);
    let obj_result = {};
    let text = "<div>";
    for (let b in Booru.sites) {
        let temp_fakeUser = JSON.parse(JSON.stringify(fakeUser));
        console.log('b: ', b);
        temp_fakeUser.booru = b;
        let images = await func.getAnimeUrl("", temp_fakeUser, 10, { inline: true, no_db: true }).catch(err => {
            console.log('err: ', err);
        });
        obj_result[b] = images && images.photo && images.photo.length ? true : false;
        text += `<div>${b}: ${images && images.photo && images.photo.length ? 'OK' : 'NO'}</div>`;
    }
    text += "</div>";
    res.send(text);
    res.end();
});

app.get('/image', async (req, res) => {
    console.log('req: ', req.query);
    let temp_fakeUser = JSON.parse(JSON.stringify(fakeUser));
    if (req.query.booru) {
        if (req.query.booru == 'yande.re') req.query.booru = 'yandere';
        temp_fakeUser.booru = req.query.booru;
    }
    console.log('temp_fakeUser: ', temp_fakeUser);
    let images = await func.getAnimeUrl(req.query.q, temp_fakeUser, 10, { inline: true, no_db: true }).catch(err => {
        console.log('err: ', err);
    });
    res.send(images || { photos: [], videos: [] });
    res.end();
});
Connect().then(() => {
    console.log("Connected to DB");
    app.listen(PORT, (err) => {
        if (err) {
            return console.log('Something bad happened', err);
        }
        console.log('Server is listening on port', PORT);
    });
});