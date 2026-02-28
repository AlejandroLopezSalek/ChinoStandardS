const fs = require('fs');
const path = require('path');

const DATA_DIR = './src/data';

function clearLessons() {
    if (!fs.existsSync(DATA_DIR)) return;

    const files = fs.readdirSync(DATA_DIR);

    for (const file of files) {
        if (file.endsWith('_lessons.json')) {
            const level = file.split('_')[0].toUpperCase(); // A1, A2, etc.

            // Create a stub lesson template for each file
            const stub = {
                [`${level.toLowerCase()}-intro-chino`]: {
                    id: `${level.toLowerCase()}-intro-chino`,
                    title: `Introducción al Chino ${level}`,
                    level: level,
                    order: 1,
                    description: `Lección introductoria para el nivel ${level} de chino mandarín.`,
                    content: `<h2>Bienvenidos al nivel ${level}</h2><p>Aquí irá el contenido de chino mandarín para este nivel. Por favor usa el panel de administración (/Contribute.html) para agregar las nuevas lecciones.</p>`
                }
            };

            fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(stub, null, 2), 'utf8');
            console.log(`Cleared and stubbed: ${file}`);
        }
    }
}

clearLessons();
