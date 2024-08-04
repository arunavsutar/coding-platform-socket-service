
const express = require('express');
const { createServer, get } = require("http");
const { Server } = require("socket.io");
const Redis = require('ioredis');

const redisCache = new Redis();
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:5500",
        methods: ["GET", "POST"]
    }
});
io.on("connection", (socket) => {
    console.log("Connected to the CLient");
    socket.on('setUserId', (userId) => {
        console.log(`Setting ${userId} to the connection ID - ${socket.id}`);
        redisCache.set(userId, socket.id);
    });
    socket.on('getConnectionId', async (userId) => {

        const connId = await redisCache.get(userId);
        console.log(connId);
        socket.emit('connectionId', connId);
    });
});
app.post('/sendPayLoad', async (req, res) => {
    console.log(req.body);
    const { userId, payload } = req.body;
    if (!userId || !payload) {
        return res.status(400).send("Invalid Request.");
    }
    const socketId = await redisCache.get(userId);
    if (socketId) {
        io.to(socketId).emit('submissionPayloadResponse', payload);
        return res.send('Payload Sent Successfully');
    }
    else {

        return res.status(404).send("User not connected");
    }
});
httpServer.listen(5000, () => {
    console.log(`Server is Running on port ${5000} `);
})