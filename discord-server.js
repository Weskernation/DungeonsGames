require('dotenv').config();

const express = require('express');
const session = require('express-session');

const { Redis } = require('@upstash/redis');

// ==========================================
// OUDE REDIS-CLIENT - BACKUP
// ==========================================

// const { RedisStore } = require('connect-redis');
// const { createClient } = require('redis');

const axios = require('axios');
const http = require('http');
const fs = require('fs');
const { Server } = require('socket.io');

const app = express();
app.set('trust proxy', 1);
const PORT = 3000;
const onlineUsers = new Map();
const onlineGuests = new Set();


// ==========================================
// OUDE TCP REDIS-STORE - BACKUP
// ==========================================

// const redis = createClient({
//     url: process.env.REDIS_URL
// });

// redis.on('error', err => {
//     console.error('Redis Client Error', err);
// });

// redis.connect();

// const redisStore = new RedisStore({
//     client: redis
// });


// ==========================================
// NIEUWE UPSTASH HTTP SESSION-STORE
// ==========================================

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN
});


class UpstashSessionStore extends session.Store {

    constructor() {
        super();

        this.prefix = 'sess:';
        this.defaultTtl = 86400;
    }

    getKey(sid) {
        return `${this.prefix}${sid}`;
    }

    getTtl(sess) {

        // Discord-gebruiker: 30 dagen
        if (sess?.user) {
            return 30 * 24 * 60 * 60;
        }

        // Gast of gebruiker die op de keuzepagina staat: 1 minuut
        if (sess?.guest || sess?.canGuest) {
            return 60;
        }

        // Bestaande fallback voor andere sessies
        if (sess?.cookie?.maxAge != null) {
            return Math.max(
                1,
                Math.floor(sess.cookie.maxAge / 1000)
            );
        }

        return this.defaultTtl;
    }

    get(sid, callback) {

        redis.get(this.getKey(sid))
            .then(data => {

                if (!data) {
                    return callback(null, null);
                }

                if (typeof data === 'string') {
                    return callback(null, JSON.parse(data));
                }

                return callback(null, data);

            })
            .catch(err => {

                console.error('Redis session GET fout:', err);

                callback(err);

            });

    }

    set(sid, sess, callback) {

        const ttl = this.getTtl(sess);

        redis.set(
            this.getKey(sid),
            JSON.stringify(sess),
            {
                ex: ttl
            }
        )
            .then(() => {

                callback(null);

            })
            .catch(err => {

                console.error('Redis session SET fout:', err);

                callback(err);

            });

    }

    destroy(sid, callback) {

        redis.del(this.getKey(sid))
            .then(() => {

                callback(null);

            })
            .catch(err => {

                console.error('Redis session DELETE fout:', err);

                callback(err);

            });

    }

    touch(sid, sess, callback) {

        const ttl = this.getTtl(sess);

        redis.expire(
            this.getKey(sid),
            ttl
        )
            .then(() => {

                callback(null);

            })
            .catch(err => {

                console.error('Redis session TOUCH fout:', err);

                callback(err);

            });

    }

}


const redisStore = new UpstashSessionStore();


// Zoekt de Naam bij de online gebruiker
function getOnlineUserList() {

    return Array.from(onlineUsers.values()).map(entry => {

        return {
            global_name: entry.user.global_name || entry.user.username,
            username: entry.user.username
        };

    });

}


// ==========================================
// OUDE SESSION CONFIG - BACKUP ZONDER REDIS
// ==========================================

// Sessies instellen
// app.use(session({
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: false,
//     cookie: {
//         secure: false
//     }
// }));


// ==========================================
// NIEUWE SESSION CONFIG - UPSTASH REDIS
// ==========================================

app.use(session({
    store: redisStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax'
    }
}));


// Public assets laden zonder index.html automatisch te tonen
app.use(express.static(__dirname + '/src', {
    index: false
}));



// Keuzepagina tijdelijk aan/uit
const KEUZE_PAGINA_ACTIEF = true;

// Functie om de stempelkaart te tonen
function toonStempelkaart(req, res) {

    let html = fs.readFileSync(
        __dirname + '/src/index.html',
        'utf8'
    );

    if (req.session.user) {

        console.log(
            "Gebruiker ingelogd:",
            req.session.user.username
        );

        const user = req.session.user;

        html = html.replace(
            'data-user=""',
            `data-user='${JSON.stringify({
                id: user.id,
                username: user.username,
                global_name: user.global_name || user.username
            })}'`
        );

    } else {

        console.log("Gast bezoekt de stempelkaart");

    }

    res.send(html);
}

// Startpagina
app.get('/', (req, res) => {

    res.set('Cache-Control', 'no-store');

    console.log("STARTPAGINA bezocht");
    console.log("Session ID:", req.sessionID);
    console.log("Session user:", req.session.user);

    // -----------------------------------------
    // TIJDELIJK KEUZEPAGINA UITSCHAKELEN
    // -----------------------------------------
    if (!KEUZE_PAGINA_ACTIEF) {
        return toonStempelkaart(req, res);
    }


    // -----------------------------------------
    // NORMALE KEUZEPAGINA
    // -----------------------------------------

    if (!req.session.user && !req.session.guest) {

        console.log("Geen gebruiker ingelogd");

        req.session.canGuest = true;

        const discordLoginUrl =
            `https://discord.com/oauth2/authorize` +
            `?client_id=${process.env.DISCORD_CLIENT_ID}` +
            `&redirect_uri=${encodeURIComponent(process.env.DISCORD_REDIRECT_URI)}` +
            `&response_type=code` +
            `&scope=identify`;

        console.log("Discord Login URL:", discordLoginUrl);

        return req.session.save((err) => {

            if (err) {

                console.error(
                    "Gast-sessie opslaan mislukt:",
                    err
                );

                return res
                    .status(500)
                    .send("Sessie opslaan mislukt.");

            }

            res.send(`
                <html>
                <head>
                    <link rel="stylesheet" href="style.css">
                    <style>
                        body {
                            font-family: Arial, sans-serif;

                            background-image: url("images/frequent-freewheelers_banner.webp");

                            background-repeat: no-repeat;
                            background-position: center center;
                            background-attachment: fixed;
                            background-size: 100% auto;
                            background-color: #1a1a1a;
                            overflow-x: hidden;
                            flex: auto;
                            flex-direction: column;
                            text-align: center;
                            text-shadow: rgba(90, 55, 25, 0.9);
                            color: rgba(255, 215, 0, 1);
                            margin-top: 2vh;
                            font-size: clamp(2vmin, 3vw, 4vmin);
                        }

                        a, a:link, a:visited {
                            display: inline-block;
                            padding: 12px 30px;
                            margin-bottom: 8px;
                            background-color: rgba(90, 55, 25, 0.95);
                            border-radius: 10px;
                            border: 3px solid rgba(255, 215, 0, 1);
                            color: rgba(255, 215, 0, 1);
                        }
                    </style>
                </head>
                <body>
                    <h1>Welkom</h1>

                    <p>Je kunt inloggen met Discord of doorgaan zonder in te loggen.</p>

                    <p>
                        <a href="${discordLoginUrl}">Login met Discord</a>
                    </p>

                    <form method="POST" action="/guest">
                        <button
                            type="submit"
                            style="
                                display: inline-block;
                                padding: 12px 30px;
                                margin-bottom: 8px;
                                background-color: rgba(90, 55, 25, 0.95);
                                border-radius: 10px;
                                border: 3px solid rgba(255, 215, 0, 1);
                                color: rgba(255, 215, 0, 1);
                                font-size: inherit;
                                font-family: inherit;
                                cursor: pointer;
                                text-decoration: underline;
                            "
                        >
                            Naar de stempelkaart zonder inloggen
                        </button>
                    </form>
                </body>
                </html>
            `);

        });

    }

    return toonStempelkaart(req, res);

});


// Toegang zonder Discord-login
// ==========================================
// OUDE GET /guest - BACKUP
// ==========================================

// app.get('/guest', (req, res) => {

//     res.set('Cache-Control', 'no-store');

//     console.log("Gast probeert toegang te krijgen");

//     if (!req.session.canGuest) {

//         console.log("Geen toestemming voor gasttoegang");

//         return res.redirect('/');

//     }

//     console.log("Gast kiest voor toegang zonder login");

//     req.session.guest = true;

//     delete req.session.canGuest;

//     req.session.save((err) => {

//         if (err) {

//             console.error(
//                 "Gast-sessie opslaan mislukt:",
//                 err
//             );

//             return res
//                 .status(500)
//                 .send("Sessie opslaan mislukt.");

//         }

//         res.redirect('/');

//     });

// });


// ==========================================
// NIEUWE GET /guest
// ==========================================

app.get('/guest', (req, res) => {

    console.log("Directe GET naar /guest");

    res.redirect('/');

});


// ==========================================
// NIEUWE POST /guest
// ==========================================

app.post('/guest', (req, res) => {

    res.set('Cache-Control', 'no-store');

    console.log("Gast probeert toegang te krijgen via POST");

    if (!req.session.canGuest) {

        console.log("Geen toestemming voor gasttoegang");

        return res.redirect('/');

    }

    console.log("Gast kiest voor toegang zonder login");

    req.session.guest = true;

    delete req.session.canGuest;

    req.session.save((err) => {

        if (err) {

            console.error(
                "Gast-sessie opslaan mislukt:",
                err
            );

            return res
                .status(500)
                .send("Sessie opslaan mislukt.");

        }

        res.redirect('/');

    });

});


// Discord callback
app.get('/auth/discord/callback', async (req, res) => {

    console.log("=== DISCORD CALLBACK BEREIKT ===");

    const code = req.query.code;

    if (!code) {
        return res.status(400).send('Geen code ontvangen.');
    }


    try {

        const tokenResponse = await axios.post(
            'https://discord.com/api/oauth2/token',

            new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID,
                client_secret: process.env.DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: process.env.DISCORD_REDIRECT_URI
            }),

            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );


        const accessToken = tokenResponse.data.access_token;


        const userResponse = await axios.get(
            'https://discord.com/api/users/@me',
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        );


        req.session.user = userResponse.data;

console.log("Sessie opgeslagen voor:", req.session.user);
console.log("Session ID:", req.sessionID);

        res.redirect('/');


    } catch (error) {

        console.error(
            error.response?.data || error.message
        );

        res.status(500).send(
            'Discord login mislukt.'
        );
    }

});


// Logout
app.get('/logout', (req, res) => {

    console.log("Logout uitgevoerd");

    req.session.destroy((err) => {

        if (err) {
            console.log("Destroy fout:", err);
            return res.send("Logout fout");
        }

        res.redirect('/');

    });

});


// Server starten
const server = http.createServer(app);

const io = new Server(server);


io.on('connection', (socket) => {

    let currentUserId = null;
    let isGuest = false;

    console.log('Nieuwe browser verbonden:', socket.id);


    socket.on('registerUser', (user) => {

        currentUserId = user.id;


        if (!onlineUsers.has(user.id)) {

            onlineUsers.set(user.id, {
                user: user,
                sockets: []
            });

        }


        onlineUsers.get(user.id).sockets.push(socket.id);


        console.log(
            'Online gebruiker:',
            user.global_name || user.username
        );


        console.log(
            'Unieke online gebruikers:',
            onlineUsers.size
        );


        io.emit('onlineUsers', {
            users: getOnlineUserList(),
            guestCount: onlineGuests.size
        });

    });


    socket.on('registerGuest', () => {

        isGuest = true;

        onlineGuests.add(socket.id);

        console.log(
            'Anonieme bezoeker online:',
            socket.id
        );

        console.log(
            'Aantal anonieme bezoekers:',
            onlineGuests.size
        );

        io.emit('onlineUsers', {
            users: getOnlineUserList(),
            guestCount: onlineGuests.size
        });

    });


    socket.on('disconnect', () => {

        if (isGuest) {

            onlineGuests.delete(socket.id);

            console.log(
                'Anonieme bezoeker verwijderd:',
                socket.id
            );

        }

        if (currentUserId) {

            const userEntry = onlineUsers.get(currentUserId);

            if (userEntry) {

                userEntry.sockets = userEntry.sockets.filter(
                    id => id !== socket.id
                );

                if (userEntry.sockets.length === 0) {

                    onlineUsers.delete(currentUserId);

                }

            }

        }

        console.log(
            'Browser verwijderd:',
            socket.id
        );

        console.log(
            'Unieke Discord-gebruikers:',
            onlineUsers.size
        );

        console.log(
            'Anonieme bezoekers:',
            onlineGuests.size
        );

        io.emit('onlineUsers', {
            users: getOnlineUserList(),
            guestCount: onlineGuests.size
        });

    });

});


server.listen(PORT, () => {

    console.log(
        `Server draait op http://localhost:${PORT}`
    );

});
