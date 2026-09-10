const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.jsx', 'utf8');

// The issue: hook called inside JSX ({useMemo(() => ...)} )
// This is invalid in React if there are conditional returns above it. Actually, hooks inside JSX `{}` are executed during render, so technically it is order-dependent based on JSX tree traversal, but React strictly forbids calling hooks conditionally, and moving it down into JSX causes it to be executed after `if (loading) return...` and `if (!user) return...`. This violates the Rules of Hooks!

// Let's move the useMemo call ABOVE the early returns.

// 1. Extract the content of the useMemo
const regexMemo = /\{useMemo\(\(\) => \([\s\S]*?<\/[tT]able>[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?\), \[terverifikasi, filterCuriga, nav\]\)\}/;
const match = code.match(regexMemo);

if (match) {
    console.log("Found useMemo block");
    
    // We will extract the inner JSX
    let innerJSX = match[0].replace(/^\{useMemo\(\(\) => \(/, '');
    innerJSX = innerJSX.replace(/\), \[terverifikasi, filterCuriga, nav\]\)\}$/, '');
    
    // Create the variable assignment before the first `return`
    const varDef = `  const tableSesiComponent = useMemo(() => (${innerJSX}), [terverifikasi, filterCuriga, nav]);\n\n`;
    
    // Replace the `{useMemo...}` with `{tableSesiComponent}`
    code = code.replace(match[0], '{tableSesiComponent}');
    
    // Insert `varDef` BEFORE `if (loading) return <Layout><p>Memuat...</p></Layout>;`
    const earlyReturnStr = `  if (loading) return <Layout><p>Memuat...</p></Layout>;`;
    code = code.replace(earlyReturnStr, varDef + earlyReturnStr);
    
    fs.writeFileSync('src/pages/AdminDashboard.jsx', code);
    console.log("Patched successfully");
} else {
    console.log("Could not match useMemo block");
}

