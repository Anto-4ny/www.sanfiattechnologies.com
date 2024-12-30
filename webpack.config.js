const path = require('path');
const Dotenv = require('dotenv-webpack');

module.exports = {
    entry: './script.js', // Adjusted entry point to the root file
    output: {
        path: path.resolve(__dirname, 'dist'), // Directory for bundled output
        filename: 'bundle.js', // Output bundle name
    },
    resolve: {
        extensions: ['.js'], // Only `.js` files are relevant here
    },
    module: {
        rules: [
            {
                test: /\.js$/, // Match `.js` files
                exclude: /node_modules/, // Exclude dependencies
                use: {
                    loader: 'babel-loader', // Transpile modern JS for compatibility
                },
            },
        ],
    },
    mode: 'production', // Use 'development' during development; switch to 'production' for production builds
    plugins: [
        new Dotenv({
            path: './.env', // Point to the .env file in the root
            safe: false, // Set to true if validation against `.env.example` is required
        }),
    ],
};
