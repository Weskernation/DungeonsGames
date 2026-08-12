require('dotenv').config();

const express = require('express');
const session = require('express-session');
const axios = require('axios');
const http = require('http');
const fs = require('fs');
const { Server } = require('socket.io');

const app = express();
const PORT = 3000;
const onlineUsers = new Map();


// Zoekt de Naam bij de online gebruiker
function getOnlineUserList() {

    return Array.from(onlineUsers.values()).map(entry => {

        return {
            global_name: entry.user.global_name || entry.user.username,
            username: entry.user.username
        };

    });

}

// Sessies instellen
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false
    }
}));


// Public assets laden zonder index.html automatisch te tonen
app.use(express.static(__dirname + '/src', {
    index: false
}));


// Startpagina
app.get('/', (req, res) => {

    console.log("STARTPAGINA bezocht");


    if (!req.session.user) {

        console.log("Geen gebruiker ingelogd");


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
                        font-size: clamp(1.5vmin, 2vw, 3vmin);
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
                <h1>Login vereist</h1>
                <p>Je moet inloggen met Discord om deze website te bekijken.</p>
                <a href="${discordLoginUrl}">Login met Discord</a>
            </body>
            </html>
        `);

    }


    console.log(
        "Gebruiker ingelogd:",
        req.session.user.username
    );


    const user = req.session.user;

    let html = fs.readFileSync(
        __dirname + '/src/index.html',
        'utf8'
    );


    html = html.replace(
        'data-user=""',
        `data-user='${JSON.stringify({
            id: user.id,
            username: user.username,
            global_name: user.global_name || user.username
        })}'`
    );


    res.send(html);

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


        io.emit('onlineUsers', getOnlineUserList());

    });


    socket.on('disconnect', () => {


        if (!currentUserId) {
            return;
        }


        const userEntry = onlineUsers.get(currentUserId);


        if (userEntry) {


            userEntry.sockets = userEntry.sockets.filter(
                id => id !== socket.id
            );


            if (userEntry.sockets.length === 0) {

                onlineUsers.delete(currentUserId);

            }

        }


        console.log(
            'Browser verwijderd:',
            socket.id
        );


        console.log(
            'Unieke online gebruikers:',
            onlineUsers.size
        );


        io.emit('onlineUsers', getOnlineUserList());

    });

});


server.listen(PORT, () => {

    console.log(
        `Server draait op http://localhost:${PORT}`
    );

});
