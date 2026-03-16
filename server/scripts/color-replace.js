const fs = require('fs');
const path = require('path');

const DIRECTORIES = ['./src', './server'];
const EXTENSIONS = ['.js', '.html', '.njk', '.css'];

const REPLACEMENTS = [
    // Change cool/other colors to reds/oranges
    { regex: /indigo/g, replace: 'red' },
    { regex: /purple/g, replace: 'orange' },
    { regex: /blue/g, replace: 'red' },
    { regex: /emerald/g, replace: 'orange' },
    { regex: /cyan/g, replace: 'red' },
    { regex: /teal/g, replace: 'orange' },
    { regex: /sky/g, replace: 'orange' },
    { regex: /slate/g, replace: 'stone' }, // Warmer gray
    // Some components might have been missed by my previous precise regex because of other prefixes like `text-white bg-blue-500`
    // I already replaced `bg-blue-`, but maybe not all. Just mass replacing indigo->red, purple->orange, etc. works for tailwind.
];

function processDirectory(dir) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (stat.isFile() && EXTENSIONS.includes(path.extname(fullPath))) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let original = content;

            for (const r of REPLACEMENTS) {
                content = content.replace(r.regex, r.replace);
            }

            if (content !== original) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated colors in: ${fullPath}`);
            }
        }
    }
}

DIRECTORIES.forEach(dir => processDirectory(dir));
console.log('Mass color replacement complete!');
