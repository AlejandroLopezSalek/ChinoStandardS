// Simple validation utilities
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validateUsername(username) {
    return username && username.length >= 3 && username.length <= 20;
}

function validatePassword(password) {
    return password && password.length >= 6;
}

function sanitizeInput(input) {
    return input.trim().replace(/[<>]/g, '');
}

function validateForm(formData) {
    const errors = [];
    
    if (formData.username && !validateUsername(formData.username)) {
        errors.push('El usuario debe tener entre 3 y 20 caracteres');
    }
    
    if (formData.email && !validateEmail(formData.email)) {
        errors.push('Email inválido');
    }
    
    if (formData.password && !validatePassword(formData.password)) {
        errors.push('La contraseña debe tener al menos 6 caracteres');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}