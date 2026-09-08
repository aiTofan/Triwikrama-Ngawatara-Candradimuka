const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.jsx', 'utf8');

code = code.replace(
  'import { db, collection, query, where, getDocs, doc, getDoc } from "../firebase";',
  'import { db } from "../firebase";\nimport { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";'
);

fs.writeFileSync('src/pages/AdminDashboard.jsx', code);
