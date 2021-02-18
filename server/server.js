const http = require('http');
const express = require('express')
const socketio = require('socket.io')
//const hotkeys = require('node-hotkeys');


const app = express()

app.use(express.static(`${__dirname}/../client`));

const server = http.createServer(app);
const io = socketio(server);

let playerMap = new Map();

io.on('connection', (sock) => {
    sock.emit('message', 'Welcome to Drawing Masters');

    sock.on('requestplayers', () => {
        io.emit('fetchplayers', JSON.stringify(Object.fromEntries(playerMap.entries())));
    });

    sock.on('tellname', name => {
        if (name !== '' && name !== ' ' && name !== null) {
            playerMap.set(sock.id, name);
            io.emit('addplayer', sock.id + '::' + name);
            console.log('New player told name: ' + sock.id + '::' + name);
        }
    });

    sock.on('disconnect', () => {
        playerMap.delete(sock.id);
        io.emit('removePlayer', sock.id)
    })

    sock.on('message', text => {
        if (text !== '' && text !== ' ')
            io.emit('message', sock.id + '::' + text);
    });
})


server.on('error', err => {
    console.log(err)
})

server.listen(8080, () => {
    console.log('Server is ready')
})