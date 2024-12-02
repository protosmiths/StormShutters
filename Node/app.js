/*
*  This supplies a Node web server for the StormShutter app. It is optional to use this server.
*/
const fs = require('fs');
const https = require('https');
const express = require('express');
const app = express();
const path = require('path');

const serverOptions = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
};

// Create an HTTPS server with the express app
const server = https.createServer(serverOptions, app);

// Initialize a WebSocket Server instance
//const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, '../')));

// Middleware for parsing JSON bodies
app.use(express.json());

// Middleware for parsing URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

server.listen(443, () =>
{
    console.log('HTTPS server running on port 443');
});