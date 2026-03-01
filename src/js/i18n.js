// Lightweight i18n router
document.addEventListener('DOMContentLoaded', () => {
    const lang = localStorage.getItem('language') || 'es';
    const currentPath = window.location.pathname;

    // Auto-redirect to English ONLY for main routes if preferred language is English
    if (lang === 'en' && !currentPath.startsWith('/en/')) {
        const migradatedPages = [
            '/', '/Consejos/', '/Gramatica/', '/Admin-Contributions/', '/Community-Lessons/',
            '/Contribuidores/', '/Contribute/', '/Dashboard/', '/Glosario/', '/NivelA1/',
            '/NivelA2/', '/NivelB1/', '/NivelB2/', '/NivelC1/', '/Perfil/', '/Privacy/',
            '/Recursos/', '/login/', '/register/'
        ];
        if (migradatedPages.includes(currentPath)) {
            window.location.replace('/en' + (currentPath === '/' ? '/' : currentPath));
        }
    }
    // Auto-redirect to Spanish if they are on /en/ but prefer Spanish
    else if (lang === 'es' && currentPath.startsWith('/en/')) {
        const newPath = currentPath.substring(3);
        window.location.replace(newPath === '' ? '/' : newPath);
    }
});
