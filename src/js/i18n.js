// Simple i18n client-side translator
const dic = {
    // Nav & Menu
    'Inicio': 'Home',
    'Consejos': 'Tips',
    'Gramática': 'Grammar',
    'Recursos': 'Resources',
    'Comunidad': 'Community',
    'Admin': 'Admin',
    'Ajustes': 'Settings',

    // Main Headers
    'Chino para Latinos': 'Chinese for English Speakers',
    'Registrarme': 'Register',
    'Iniciar Sesión': 'Sign In',
    '¿Quieres saber más sobre ChinoAmerica?': 'Want to know more about ChinoAmerica?',
    'Conoce el proyecto, roadmap y cómo puedes apoyar el desarrollo': 'Learn about the project, roadmap, and how you can support',
    'Ver Dashboard': 'View Dashboard',

    // Levels
    'Principiante': 'Beginner',
    'Elemental': 'Elementary',
    'Intermedio': 'Intermediate',
    'Intermedio Alto': 'Upper Int',
    'Avanzado': 'Advanced',
    'Acceder al Nivel': 'Access Level',
    'Explora y aprende con lecciones creadas por otros estudiantes': 'Explore and learn with lessons created by other students',
    'Ver Lecciones': 'View Lessons',

    // Word of the Day
    'Palabra del Día': 'Word of the Day',
    '¿Cómo se traduce?': 'How to translate?',
    'Ver glosario de palabras anteriores': 'View glossary of past words',
    'Verificar': 'Check',
    'Traducción': 'Translation',
    'Traducción al español...': 'English translation...',
    'Regístrate para participar en el desafío diario y ver tu progreso.': 'Register to participate in the daily challenge and see your progress.',
    'Registrarme gratis': 'Register for free',

    // Settings
    'Configuración': 'Configuration',
    'Perfil': 'Profile',
    'Ver tu racha y datos': 'View your streak and data',
    'Modo Oscuro': 'Dark Mode',
    'Cambiar apariencia': 'Change appearance',
    'Panda AI': 'Panda AI',
    'Asistente virtual': 'Virtual Assistant',
    'Notificaciones': 'Notifications',
    'Activar alertas': 'Enable alerts',
    'Restaurar valores': 'Restore values',
    'Idioma / Language': 'Language',

    // General
    'Páginas de Internet': 'Web Pages',
    'Diccionarios': 'Dictionaries',

    // Consejos / Horario
    'Horario de Estudio Intensivo': 'Intensive Study Schedule',
    'Mañana': 'Morning',
    'Tarde': 'Afternoon',
    'Canales de YouTube': 'YouTube Channels',
    'Blogs de aventura': 'Adventure Blogs',
    'Entretenimiento': 'Entertainment',
    'Noticieros': 'News',
    'Canales de Gramática Turca': 'Turkish Grammar Channels',
    'Canales de Gramática China': 'Chinese Grammar Channels',
    'Canales en Español': 'Channels in Spanish',
    'Cursos y Plataformas': 'Courses and Platforms',
    'Leer un texto en chino': 'Read a Chinese text',
    'İstanbul book PDF/sacar un texto de noticias': 'Textbook / news article',
    'Practicar vocabulario': 'Practice vocabulary',
    'Sozluk.gov.tr o pdfs de verbos o vocabularios': 'Online dictionary or vocabulary PDFs',
    'Podcast Türkçe o noticias': 'Chinese Podcast or news',
    'Luego tomar resumen': 'Then take notes/summary',
    'Gramática': 'Grammar',
    'Usar una web de gramática o texto o clases': 'Use a grammar website, textbook, or classes',
    'Práctica de escritura': 'Writing practice',
    'Tema diario, pedir a AI o buscar en internet': 'Daily topic, ask AI or search online',
    'Leer un texto avanzado': 'Read an advanced text',
    'Tratar de reconocer patrones': 'Try to recognize patterns',
    'Mirar video sin subtítulos': 'Watch video without subtitles',
    'Práctica de comprensión auditiva': 'Listening comprehension practice',
    'Práctica de refranes': 'Idiom Practice (Chengyu)',
    'Buscar en Sozluk.gov.tr o internet o AI': 'Search online or ask AI',
    'Gramática avanzada': 'Advanced grammar',
    'Yunus emre o cualquiera': 'Advanced textbook or platform',
    'Revisión general': 'General review',
    'Escritura + recitarlo (Tema diario)': 'Writing + reciting (Daily topic)'
};

document.addEventListener('DOMContentLoaded', () => {
    const lang = localStorage.getItem('language') || 'es';
    if (lang === 'en') {
        translateToEnglish();
    }
});

function translateToEnglish() {
    // Replace text nodes
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let n;
    while (n = walk.nextNode()) {
        const text = n.nodeValue.trim();
        if (text && dic[text]) {
            n.nodeValue = n.nodeValue.replace(text, dic[text]);
        }
    }
    // Handle input placeholders
    document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(el => {
        if (dic[el.placeholder]) {
            el.placeholder = dic[el.placeholder];
        } else if (el.placeholder === 'Traducción al español...') {
            el.placeholder = 'English translation...';
        } else if (el.placeholder === 'Escribe tu pregunta a Panda...') {
            el.placeholder = 'Type your question to Panda...';
        }
    });
}
