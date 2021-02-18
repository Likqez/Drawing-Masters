const addMessage = (text, id) => {
    const parent = document.querySelector('#events');
    const el = document.createElement('li');
    el.textContent = text;

    parent.appendChild(el);
    parent.scrollTop = parent.scrollHeight;
};

const addSystemMessage = (text, color) => {
    const parent = document.querySelector('#events');
    const child = document.createElement('li');
    const el = document.createElement('span')
    el.textContent = text;
    el.style.color = color;
    el.style.fontSize = "1.25rem";
    el.style.fontWeight = "bold";

    child.appendChild(el);
    parent.appendChild(child);
    parent.scrollTop = parent.scrollHeight;
};

const addPlayer = (name) => {
    const parent = document.querySelector('.Players');
    const sec = document.createElement('section');
    const img = document.createElement('img');
    const text = document.createElement('p');

    sec.className = "player disable-select";
    img.setAttribute('src', '../img/user.svg');
    img.setAttribute('alt', 'Player Avatar');
    text.innerText = name;

    sec.append(img, text);
    parent.appendChild(sec);
}

const removePlayer = (name) => {
    const parent = document.querySelector('.Players');
    parent.querySelectorAll("section.player > p").forEach(node => {
        if (node.textContent === name) {
            const parent = node.parentNode;
            parent.parentElement.removeChild(parent);
        }
    });
}

const onChatSubmitted = (sock) => (e) => {
    e.preventDefault();

    const input = document.querySelector('.chat-input');
    const text = input.value;
    input.value = '';

    if (text !== '' && text !== ' ')
        sock.emit('message', text)
};

const getBoard = (canvas) => {
    const ctx = canvas.getContext('2d')

    let coord = {x: 0, y: 0};
    let offset = {x: 0, y: 0};
    let paint = false;

    const reOffset = () => {
        const BB = canvas.getBoundingClientRect();
        offset.x = BB.left;
        offset.y = BB.top;
    };

    const getPosition = (event) => {
        coord.x = parseInt(event.clientX - offset.x);
        coord.y = parseInt(event.clientY - offset.y);
    };

    const startPainting = (event) => {
        if (event.button !== 0) return;
        paint = true;
        reOffset();
        getPosition(event);
        sketch(event);
    };

    const stopPainting = () => {
        paint = false;
    };

    const sketch = (event) => {
        if (!paint) return;
        ctx.beginPath();

        ctx.lineWidth = 10;

        // Sets the end of the lines drawn
        // to a round shape.
        ctx.lineCap = 'round';

        ctx.strokeStyle = 'black';

        // The cursor to start drawing
        // moves to this coordinate
        ctx.moveTo(coord.x, coord.y);

        // The position of the cursor
        // gets updated as we move the
        // mouse around.
        getPosition(event);

        // A line is traced from start
        // coordinate to this coordinate
        ctx.lineTo(coord.x, coord.y);

        // Draws the line.
        ctx.stroke();
    };

    return {startPainting, stopPainting, sketch, reOffset};
}

(() => {
    const canvas = document.querySelector('canvas');
    const {startPainting, stopPainting, sketch, reOffset} = getBoard(canvas);
    let playerMap = new Map;

    const sock = io();
    sock.on('message', addMessage);

    sock.on('fetchplayers', msg => {
        if (playerMap.size === 0) {
            playerMap = new Map(Object.entries(JSON.parse(msg)));
            for (let key of playerMap.keys()) {
                addPlayer(playerMap.get(key));
            }
        }

        console.log("New Playerlist fetched: " + msg);
    });

    sock.on('addplayer', (msg) => {
        const s = msg.split('::');
        playerMap.set(s[0], s[1]);
        addPlayer(s[1]);
        addSystemMessage(s[1] + " connected!", "lightgreen");

        console.log("New Player added: " + s[1]);
    });

    sock.on('removePlayer', (id) => {
        const name = playerMap.get(id);
        playerMap.delete(id);
        removePlayer(name);
        addSystemMessage(name + " disconnected!", "red");

        console.log("Player disconnected: " + s[1]);
    });

    //Request Player list
    sock.emit('requestplayers', '');

    sock.emit('tellname', window.prompt("Enter your name: "));

    canvas.addEventListener('mousedown', startPainting);
    canvas.addEventListener('mousemove', sketch);
    canvas.addEventListener('mouseout', stopPainting);
    canvas.addEventListener('mouseup', stopPainting);

    window.addEventListener('resize', reOffset);
    window.addEventListener('scroll', reOffset);

    document
        .querySelector('#chat-form')
        .addEventListener('submit', onChatSubmitted(sock));
})();