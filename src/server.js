
const express = require('express');
const { createServer, get } = require("http");
const { Server } = require("socket.io");
const bodyParser = require('body-parser');
const Redis = require('ioredis');

const redisCache = new Redis({
    host: "127.0.0.1",
    port: 6379,
    maxRetriesPerRequest: null
});
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.text());
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",//http://localhost:5500
        methods: ["GET", "POST"]
    }
});
io.on("connection", async (socket) => {
    console.log("Connected to the CLient");
    socket.on('setUserId', async (userId) => {

        await redisCache.set(userId, socket.id);
        console.log(`Setting ${userId} to the connection ID - ${socket.id}`);
        const exists = await redisCache.exists(userId);
        console.log(`Key exists: ${exists}`);
        const val = await redisCache.get(userId);
        console.log(val);

    });
    socket.on('getConnectionId', async (userId) => {

        const connId = await redisCache.get(userId);
        console.log(connId);
        socket.emit('connectionId', connId);
    });
});
app.post('/sendPayLoad', async (req, res) => {
    console.log("\nThe request came after evaluation :-\n", req.body);
    const { userId, payload } = req.body;
    if (!userId || !payload) {
        return res.status(400).send("Invalid Request.");
    }
    const ttl = await redisCache.ttl(Number(userId));
    console.log(`TTL: ${ttl}`);
    redisCache.get(Number(userId), (err, socketId) => {
        console.log("The Socket ID - ", socketId); // Prints "value"
        if (socketId) {
            io.to(socketId).emit('submissionPayloadResponse', payload);
            return res.send('Payload Sent Successfully');
        }
        else if (err) {
            console.log(err);
            return res.status(404).send("User not connected");
        }
    });
});
httpServer.listen(5000, () => {
    console.log(`Server is Running on port ${5000} `);
})