const express = require('express');
const { join } = require('path');
const bodyParser = require('body-parser');
const cors = require('cors')

const dotenv = require("dotenv");

dotenv.config()

const app = express();

app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static(join(__dirname, 'dist')));
app.use(cors())


app.get('*', function (req, res) {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
});


module.exports = app;
