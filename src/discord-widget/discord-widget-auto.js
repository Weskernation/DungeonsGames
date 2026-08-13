// Online-widget automatisch aanmaken
const onlineWidget = document.createElement('div');
onlineWidget.id = 'online-widget';

onlineWidget.innerHTML = `
    <div id="online-header">
        🟢 Online: <span id="online-count">0</span>
    </div>

    <div id="online-list"></div>
`;

document.body.appendChild(onlineWidget);


// Socket.IO
const socket = io({
    transports: ['websocket']
});

const userData = document.body.dataset.user;


if (userData) {

    // =========================
    // Discord-gebruiker
    // =========================

    const user = JSON.parse(userData);


    socket.on('onlineUsers', (data) => {

        console.log("Ontvangen online data:", data);


        const count = document.getElementById('online-count');
        const list = document.getElementById('online-list');


        if (!count || !list) {
            return;
        }


        const users = data.users || [];
        const guestCount = data.guestCount || 0;


        // Totaal aantal online bezoekers
        count.textContent = users.length + guestCount;


        list.innerHTML = "";


        // Discord-gebruikers
        users.forEach(user => {

            const item = document.createElement('p');

            item.innerHTML =
                user.global_name +
                "<br>" +
                "<small>@" + user.username + "</small>";

            list.appendChild(item);

        });


        // Anonieme bezoekers
        if (guestCount > 0) {

            const item = document.createElement('p');

            item.textContent = `Anoniem (${guestCount})`;

            list.appendChild(item);

        }

    });


    socket.emit('registerUser', user);


} else {

    // =========================
    // Anonieme bezoeker
    // =========================

    socket.on('onlineUsers', (data) => {

        console.log("Ontvangen online data voor gast:", data);


        const count = document.getElementById('online-count');
        const list = document.getElementById('online-list');


        if (!count || !list) {
            return;
        }


        const users = data.users || [];
        const guestCount = data.guestCount || 0;


        // Totaal aantal online bezoekers
        count.textContent = users.length + guestCount;


        list.innerHTML = "";


        // Discord-gebruikers
        users.forEach(user => {

            const item = document.createElement('p');

            item.innerHTML =
                user.global_name +
                "<br>" +
                "<small>@" + user.username + "</small>";

            list.appendChild(item);

        });


        // Anonieme bezoekers
        if (guestCount > 0) {

            const item = document.createElement('p');

            item.textContent = `Anoniem (${guestCount})`;

            list.appendChild(item);

        }

    });


    socket.emit('registerGuest');

}


// Online-widget bediening
const onlineHeader = document.getElementById('online-header');

if (onlineWidget && onlineHeader) {

    onlineHeader.addEventListener('click', () => {

        onlineWidget.classList.toggle('open');

    });

}