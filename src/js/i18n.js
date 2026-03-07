// Lightweight i18n router
// Lightweight i18n router
document.addEventListener('DOMContentLoaded', () => {
    const lang = localStorage.getItem('language') || 'es';
    const currentPath = globalThis.window.location.pathname;

    // Extract base path to cleanly handle cross-language redirection
    let basePath = currentPath;
    if (currentPath.startsWith('/en/') || currentPath.startsWith('/tr/')) {
        basePath = currentPath.substring(3) || '/';
    }

    const migradatedPages = new Set([
        '/', '/Consejos/', '/Gramatica/', '/Admin-Contributions/', '/Community-Lessons/',
        '/Contribuidores/', '/Contribute/', '/Dashboard/', '/Glosario/', '/NivelA1/',
        '/NivelA2/', '/NivelB1/', '/NivelB2/', '/NivelC1/', '/Perfil/', '/Privacy/',
        '/Recursos/', '/login/', '/register/'
    ]);

    if ((lang === 'en' || lang === 'tr') && !currentPath.startsWith(`/${lang}/`)) {
        if (migradatedPages.has(basePath)) {
            globalThis.window.location.replace(`/${lang}${basePath === '/' ? '/' : basePath}`);
        }
    } else if (lang === 'es' && currentPath !== basePath) {
        globalThis.window.location.replace(basePath);
    }
});
