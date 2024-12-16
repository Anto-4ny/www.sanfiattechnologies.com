const awsServerlessExpress = require('aws-serverless-express');
const app = require('./server'); // Assuming your backend code is in app.js
const server = awsServerlessExpress.createServer(app);

exports.handler = (event, context) => {
    return awsServerlessExpress.proxy(server, event, context);
};
