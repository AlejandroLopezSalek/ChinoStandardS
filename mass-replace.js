const fs = require('fs');
const path = require('path');

const DIRECTORIES = ['./src', './server'];
const EXTENSIONS = ['.js', '.html', '.njk', '.json', '.md'];

const REPLACEMENTS = [
    { regex: /TurkAmerica/g, replace: 'ChinoAmerica' },
    { regex: /Turkamericastandard/gi, replace: 'ChinoStandard' },
    { regex: /Turco/g, replace: 'Chino' },
    { regex: /turco/g, replace: 'chino' },
    { regex: /Turquía/g, replace: 'China' },
    { regex: /turquía/g, replace: 'china' },
    { regex: /Turkish/g, replace: 'Chinese' },
    { regex: /turkish/g, replace: 'chinese' },
    { regex: /Capi/g, replace: 'Panda' },
    // A few color replacements based on Tailwind classes from blue to red/orange
    { regex: /bg-blue-([\d]+)/g, replace: 'bg-red-$1' },
    { regex: /text-blue-([\d]+)/g, replace: 'text-red-$1' },
    { regex: /border-blue-([\d]+)/g, replace: 'border-red-$1' },
    { regex: /ring-blue-([\d]+)/g, replace: 'ring-red-$1' },
    { regex: /hover:bg-blue-([\d]+)/g, replace: 'hover:bg-red-$1' },
    { regex: /hover:text-blue-([\d]+)/g, replace: 'hover:text-red-$1' }
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
                console.log(`Updated: ${fullPath}`);
            }
        }
    }
}

DIRECTORIES.forEach(dir => processDirectory(dir));
console.log('Mass replacement complete!');
