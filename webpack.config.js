const path = require('path');
const Dotenv = require('dotenv-webpack');

module.exports = {
    entry: './script.js', // Your entry point
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js',
    },
    resolve: {
        extensions: ['.js', '.jsx'], // Add '.jsx' if you're using React
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                },
            },
        ],
    },
    plugins: [
        new Dotenv({
            path: './.env', // Path to your .env file
            safe: false, // Set to true if you have a `.env.example` file for validation
        }),
    ],
    mode: 'development', // Set to 'production' for production builds
    externals: {
        'firebase-app': 'firebase', // Tell Webpack to exclude Firebase from bundling
        'firebase-auth': 'firebase.auth',
        'firebase-firestore': 'firebase.firestore',
        'firebase-storage': 'firebase.storage',
    },
};
