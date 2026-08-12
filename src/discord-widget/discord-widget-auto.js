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
const socket = io();
const socket = io({
    transports: ['websocket']
});

const userData = document.body.dataset.user;

if (userData) {

    const user = JSON.parse(userData);

    socket.on('onlineUsers', (users) => {

        console.log("Ontvangen gebruikers:", users);
console.log("Aantal gebruikers:", users.length);
console.log("Counter element:", document.getElementById('online-count'));
console.log("List element:", document.getElementById('online-list'));

        const count = document.getElementById('online-count');
        const list = document.getElementById('online-list');

        if (!count || !list) {
            return;
        }

        count.textContent = users.length;

        list.innerHTML = "";

        users.forEach(user => {

            const item = document.createElement('p');

            item.innerHTML =
                user.global_name +
                "<br>" +
                "<small>@" + user.username + "</small>";

            list.appendChild(item);

        });

    });

    socket.emit('registerUser', user);
}


// Online-widget bediening
const onlineHeader = document.getElementById('online-header');

if (onlineWidget && onlineHeader) {

    onlineHeader.addEventListener('click', () => {

        onlineWidget.classList.toggle('open');

    });
