const express = require('express');
const app = express();

app.get('/health', (req, res) => {
    res.json({ ok: true });
});

app.listen(5000, () => {
    console.log('Server running on port 5000');
});