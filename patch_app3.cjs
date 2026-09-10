const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// We don't necessarily have to remove the route, just the menu link as requested. 
// But keeping the codebase clean is good. Let's leave the route so existing links don't break immediately if someone has it bookmarked, but it's hidden from the UI.
// User only requested: "hilangkan dulu menu periksa keaslian sertifikat."
