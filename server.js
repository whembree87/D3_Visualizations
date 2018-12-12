const express = require('express');
const app = express();

app.use(express.static(__dirname + '/6.10.0/'));
app.listen(process.env.PORT || 8080);