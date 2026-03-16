// ================================
// UNIVERSAL CAROUSEL SYSTEM
// Funciona en todas las páginas
// ================================

document.addEventListener('DOMContentLoaded', function () {
    console.log('🎠 Inicializando sistema de carousel universal...');
    initAllCarousels();

    // Reinicializar en resize
    let resizeTimer;
    globalThis.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            console.log('🔄 Re-inicializando carousels después de resize...');
            initAllCarousels();
        }, 250);
    });
});

function initAllCarousels() {
    // Solo en móvil
    if (globalThis.innerWidth > 768) {
        console.log('💻 Modo desktop detectado - carousels desactivados');
        return;
    }

    console.log('📱 Modo móvil detectado - activando carousels');

    // Buscar todos los containers de carousel
    // Buscar todos los containers de carousel
    const carouselContainers = document.querySelectorAll('.carousel-container, .levels-carousel-container, .contribution-carousel-container, .preferences-carousel-container, .editor-carousel-container');

    console.log(`✅ Encontrados ${carouselContainers.length} contenedores de carousel`);

    carouselContainers.forEach((container, index) => {
        console.log(`🎯 Inicializando carousel ${index + 1}/${carouselContainers.length}`);
        initCarousel(container);
    });

    // Ocultar hints después de 5 segundos
    setTimeout(() => {
        document.querySelectorAll('.swipe-hint').forEach(hint => {
            hint.style.transition = 'opacity 0.5s ease';
            hint.style.opacity = '0';
            setTimeout(() => {
                hint.style.display = 'none';
            }, 500);
        });
        console.log('👋 Hints de swipe ocultados');
    }, 5000);
}

function initCarousel(container) {
    const grid = container.querySelector('.levels-grid, .features-grid, .tech-grid, .screenshots-grid, .contribution-types-grid, .preferences-grid, .editor-grid');
    const indicators = container.querySelectorAll('.carousel-indicator');

    if (!grid) {
        console.warn('⚠️ No se encontró grid en el container:', container);
        return;
    }

    if (indicators.length === 0) {
        console.warn('⚠️ No se encontraron indicadores en el container:', container);
        return;
    }

    const gridType = grid.className.match(/(levels|features|tech|screenshots|contribution-types|preferences|editor)-grid/)[0];
    console.log(`   ✓ Grid tipo: ${gridType}`);
    console.log(`   ✓ Indicadores: ${indicators.length}`);

    // Actualizar indicadores en scroll
    grid.addEventListener('scroll', debounce(() => {
        updateIndicators(container);
    }, 100));

    // Click en indicadores
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            console.log(`👆 Click en indicador ${index + 1}`);
            scrollToCard(grid, index);
        });
    });

    // Touch swipe support removed to allow native CSS scroll snapping
    // Manual JS swipe was conflicting with scroll-snap behavior

    // Actualizar indicador inicial
    updateIndicators(container);
    console.log('   ✓ Carousel inicializado correctamente');
}



function getCurrentCardIndex(grid) {
    const cards = getVisibleCards(grid);

    if (!cards.length) {
        console.warn('⚠️ No se encontraron cards visibles');
        return 0;
    }

    const scrollLeft = grid.scrollLeft;
    const cardWidth = cards[0].offsetWidth + 15; // incluye el gap

    return Math.round(scrollLeft / cardWidth);
}

function getVisibleCards(grid) {
    // Obtener las cards según el tipo de grid
    if (grid.classList.contains('levels-grid')) {
        return grid.querySelectorAll('.level-card:not(.special)');
    } else if (grid.classList.contains('features-grid')) {
        return grid.querySelectorAll('.feature-card');
    } else if (grid.classList.contains('tech-grid')) {
        return grid.querySelectorAll('.tech-item');
    } else if (grid.classList.contains('contribution-types-grid')) {
        return grid.querySelectorAll('.type-card');
    } else if (grid.classList.contains('preferences-grid')) {
        return grid.querySelectorAll('.pref-item');
    } else if (grid.classList.contains('editor-grid')) {
        return grid.querySelectorAll('.toolbar-group');
    }
    return [];
}


function updateIndicators(container) {
    const grid = container.querySelector('.levels-grid, .features-grid, .tech-grid, .screenshots-grid, .contribution-types-grid, .preferences-grid, .editor-grid');
    const indicators = container.querySelectorAll('.carousel-indicator');
    const currentIndex = getCurrentCardIndex(grid);

    indicators.forEach((indicator, index) => {
        if (index === currentIndex) {
            indicator.classList.add('active');
        } else {
            indicator.classList.remove('active');
        }
    });
}

function scrollToCard(grid, index) {
    const cards = getVisibleCards(grid);

    if (!cards[index]) {
        console.warn(`⚠️ No se encontró la card en índice ${index}`);
        return;
    }

    const cardWidth = cards[0].offsetWidth + 15; // incluye el gap
    const scrollPosition = cardWidth * index;

    grid.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
    });

    console.log(`📍 Scrolleando a card ${index + 1}`);
}

// Debounce helper para optimizar performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Log de carga exitosa
console.log('✅ Sistema de carousel universal cargado correctamente');
console.log('📱 Compatible con: levels-grid, features-grid, tech-grid, screenshots-grid');
console.log('🎯 Auto-detecta y configura todos los carousels en la página');