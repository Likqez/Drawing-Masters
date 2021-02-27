function Drawing(fromX, toX, fromY, toY, color, size) {
    this.fromX = fromX;
    this.toX = toX;
    this.fromY = fromY;
    this.toY = toY;
    this.color = color;
    this.size = size;
}

let drawingSettings = {tool: "pen", size: 10, color: "black"}

const addMessage = (name, text) => {
    const parent = document.querySelector('#events');
    const child = document.createElement('li');
    const elname = document.createElement('span')
    const eltext = document.createElement('span')

    elname.textContent = name + ": ";
    elname.style.fontWeight = "bold";
    eltext.textContent = text;

    child.appendChild(elname);
    child.appendChild(eltext);
    parent.appendChild(child);
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

const getBoard = (canvas, sock) => {
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

        let sketch = new Drawing(0, 0, 0, 0, drawingSettings.color, drawingSettings.size,)

        ctx.lineWidth = drawingSettings.size;

        // Sets the end of the lines drawn
        // to a round shape.
        ctx.lineCap = 'round';

        //Choose the tool to draw
        if (drawingSettings.tool === "pen") {
            ctx.strokeStyle = drawingSettings.color;
        } else if (drawingSettings.tool === "eraser") {
            ctx.strokeStyle = 'white';
            sketch.color = 'white';
        }

        // The cursor to start drawing
        // moves to this coordinate
        ctx.moveTo(coord.x, coord.y);
        sketch.fromX = coord.x;
        sketch.fromY = coord.y;

        // The position of the cursor
        // gets updated as we move the
        // mouse around.
        getPosition(event);

        // A line is traced from start
        // coordinate to this coordinate
        ctx.lineTo(coord.x, coord.y);
        sketch.toX = coord.x;
        sketch.toY = coord.y;

        // Draws the line.
        ctx.stroke();

        sock.emit('sendSketch', JSON.stringify(sketch));
    };

    const drawSketch = (sketch) => {
        ctx.beginPath();

        ctx.lineWidth = sketch.size;
        ctx.lineCap = 'round';
        ctx.strokeStyle = sketch.color;

        ctx.moveTo(sketch.fromX, sketch.fromY);
        ctx.lineTo(sketch.toX, sketch.toY)

        ctx.stroke();
    }

    return {startPainting, stopPainting, sketch, reOffset, drawSketch};
}

(() => {
    const canvas = document.querySelector('canvas');
    const sock = io();
    const {startPainting, stopPainting, sketch, reOffset, drawSketch} = getBoard(canvas, sock);
    let playerMap = new Map;


    sock.on('message', msg => {
        const s = msg.split('::');
        const name = playerMap.get(s[0]);
        addMessage(name, s[1]);
    });

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

    sock.on('drawSketch', (msg) => {
        const sketch = JSON.parse(msg);
        drawSketch(sketch);
    })

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