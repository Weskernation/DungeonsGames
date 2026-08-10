
const socket = io();

const userData = document.body.dataset.user;

if (userData) {

    const user = JSON.parse(userData);

    socket.on('onlineUsers', (users) => {

        console.log("Ontvangen gebruikers:", users);

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


// Online-Widget
const onlineWidget = document.getElementById('online-widget');
const onlineHeader = document.getElementById('online-header');


if (onlineWidget && onlineHeader) {

    onlineHeader.addEventListener('click', () => {

        onlineWidget.classList.toggle('open');

    });

}