const express = require('express');
const app = express();

app.use(express.static(__dirname + '/Visualizations/'));

app.listen(process.env.PORT || 8080);