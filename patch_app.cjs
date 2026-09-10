const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// Import Peluang
code = code.replace(/import Kemitraan from "@\/pages\/Kemitraan";/, 'import Kemitraan from "@/pages/Kemitraan";\nimport Peluang from "@/pages/Peluang";');

// Add Route
code = code.replace(/<Route path="\/kemitraan" element=\{<Kemitraan \/>\} \/>/, '<Route path="/kemitraan" element={<Kemitraan />} />\n        <Route path="/peluang" element={<Peluang />} />');

fs.writeFileSync('src/App.jsx', code);
console.log("Patched successfully");
