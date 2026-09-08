import fs from 'fs';
fs.readFile('.env', 'utf8', (err, data) => console.log(data));
