require('dotenv').config();

const express = require('express');
const session = require('express-session');
// const { RedisStore } = require('connect-redis');
// const { Redis } = require('@upstash/redis');
const axios = require('axios');
const http = require('http');
const fs = require('fs');
const { Server } = require('socket.io');

const app = express();
const PORT = 3000;
const onlineUsers = new Map();
const onlineGuests = new Set();


// ==========================================
// OUDE SITUATIE - GEEN REDIS
// ==========================================

// Deze laten we voorlopig staan als backup.
// Niet actief.

// ==========================================
// NIEUWE SITUATIE - UPSTASH REDIS
// ==========================================

// const redis = new Redis({
//     url: process.env.UPSTASH_REDIS_REST_URL,
//     token: process.env.UPSTASH_REDIS_REST_TOKEN
// });

// const redisStore = new RedisStore({
//     client: redis
// });


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
// OUDE SESSION CONFIG - BACKUP
// ==========================================

// Sessies instellen
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false
    }
}));


// ==========================================
// NIEUWE SESSION CONFIG - UPSTASH REDIS
// ==========================================

// app.use(session({
//     store: redisStore,
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: false,
//     cookie: {
//         secure: true,
//         httpOnly: true,
//         sameSite: 'lax'
//     }
// }));


// Public assets laden zonder index.html automatisch te tonen
app.use(express.static(__dirname + '/src', {
    index: false
}));


// Startpagina
app.get('/', (req, res) => {

    console.log("STARTPAGINA bezocht");
    console.log("Session ID:", req.sessionID);
    console.log("Session user:", req.session.user);
    
console.log("canGuest:", req.session.canGuest);
console.log("guest:", req.session.guest);


    if (!req.session.user && !req.session.guest) {

        console.log("Geen gebruiker ingelogd");

        req.session.canGuest = true;

        const discordLoginUrl =
            `https://discord.com/oauth2/authorize` +
            `?client_id=${process.env.DISCORD_CLIENT_ID}` +
            `&redirect_uri=${encodeURIComponent(process.env.DISCORD_REDIRECT_URI)}` +
            `&response_type=code` +
            `&scope=identify`;


        return res.send(`
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
                        padding: 12px 30px;          /* Ruimte binnen het blok */
                        margin-bottom: 8px;      /* Ruimte onder het blok */
                        background-color: rgba(90, 55, 25, 0.95); /* Een lichte achtergrondkleur */
                        border-radius: 10px;      /* Mooie afgeronde hoeken */
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

                <p>
                    <a href="/guest">Naar de stempelkaart zonder inloggen</a>
                </p>
            </body>
            </html>
        `);

    }


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

});


// Toegang zonder Discord-login
app.get('/guest', (req, res) => {

    console.log("Gast probeert toegang te krijgen");
    console.log("Session ID:", req.sessionID);
    console.log("canGuest:", req.session.canGuest);
    console.log("guest:", req.session.guest);

    if (!req.session.canGuest) {

        console.log("Geen toestemming voor gasttoegang");

        return res.redirect('/');

    }

    console.log("Gast kiest voor toegang zonder login");

    req.session.guest = true;

    delete req.session.canGuest;

    res.redirect('/');

});


// Discord callback
app.get('/auth/discord/callback', async (req, res) => {

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
