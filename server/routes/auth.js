const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('node:crypto');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const router = express.Router();

// Validations
const registerValidation = [
    body('username')
        .isLength({ min: 3, max: 20 })
        .withMessage('El nombre de usuario debe tener entre 3 y 20 caracteres')
        .matches(/^\w+$/) // Letters, numbers, underscores
        .withMessage('El nombre de usuario solo puede contener letras, números y guiones bajos'),
    body('email')
        .isEmail()
        .withMessage('Debe ser un email válido')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 6 })
        .withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('country')
        .notEmpty()
        .withMessage('El país es requerido')
        .isString()
        .withMessage('El país debe ser texto')
        .isLength({ min: 2, max: 5 })
        .withMessage('Código de país inválido')
];

const loginValidation = [
    body('identifier')
        .notEmpty()
        .withMessage('Usuario o email requerido'),
    body('password')
        .notEmpty()
        .withMessage('Contraseña requerida')
];

// ================================
// AUTHENTICATION ROUTES
// ================================

router.post('/register', registerValidation, async (req, res) => {
    try {
        console.log('📝 Registration attempt received.');

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('❌ Validation errors:', errors.array());
            return res.status(400).json({
                message: errors.array()[0].msg,
                errors: errors.array()
            });
        }

        const { username, email, password, country } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({
            $or: [
                { email: email.toLowerCase() },
                { username: username.toLowerCase() }
            ]
        });

        if (existingUser) {
            console.log('❌ User already exists (duplicate field).');
            if (existingUser.email === email.toLowerCase()) {
                return res.status(400).json({
                    message: 'El email ya está registrado'
                });
            } else {
                return res.status(400).json({
                    message: 'El nombre de usuario ya está en uso'
                });
            }
        }

        // Create new user
        const newUser = new User({
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password: password,
            country: country
        });

        await newUser.save();
        console.log(`✅ User registered successfully: ${newUser.username} (Country: ${newUser.country})`);

        // Generate JWT
        const token = jwt.sign(
            {
                userId: newUser._id.toString(),
                username: newUser.username,
                email: newUser.email,
                role: newUser.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            token,
            user: newUser.toJSON()
        });

    } catch (error) {
        console.error('❌ Error en registro:', error);

        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            const message = field === 'email' ? 'El email ya está registrado' : 'El nombre de usuario ya está en uso';
            return res.status(400).json({ message });
        }

        res.status(500).json({
            message: 'Error interno del servidor'
        });
    }
});

// POST /api/login - User login
router.post('/login', loginValidation, async (req, res) => {
    try {
        console.log('🔐 Login attempt received.');

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('❌ Validation errors:', errors.array());
            return res.status(400).json({
                message: errors.array()[0].msg,
                errors: errors.array()
            });
        }

        const { identifier, password } = req.body;

        // Find user by email or username
        const user = await User.findByEmailOrUsername(identifier);

        if (!user) {
            console.log('❌ User not found during login.');
            return res.status(401).json({
                message: 'Credenciales inválidas'
            });
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            console.log('❌ Invalid password for user:', user.username);
            return res.status(401).json({
                message: 'Credenciales inválidas'
            });
        }

        console.log('✅ Login successful:', user.username);

        // Update streak on login
        user.updateStreak();
        await user.save();

        // Generate JWT
        const token = jwt.sign(
            {
                userId: user._id.toString(),
                username: user.username,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login exitoso',
            token,
            user: user.toJSON(),
            streak: user.getStreakInfo()
        });

    } catch (error) {
        console.error('❌ Error en login:', error);
        res.status(500).json({
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

// Helper to process Google user data and reduce cognitive complexity
async function handleGoogleUser(payload) {
    const { sub: googleId, email, name, picture } = payload;

    // Check if user exists by googleId
    let user = await User.findOne({ googleId });
    if (user) return user;

    // Check if email exists (link account)
    user = await User.findOne({ email });
    if (user) {
        user.googleId = googleId; // Link account
        if (!user.profile.avatar) user.profile.avatar = picture;
        await user.save();
        return user;
    }

    // Create new user
    const randomPassword = crypto.randomBytes(16).toString('hex');
    const firstName = name ? name.split(' ')[0] : 'User';
    const lastName = name?.includes(' ') ? name.split(' ').slice(1).join(' ') : '';
    let sanitizedBase = email.split('@')[0].replaceAll(/\W/g, '');

    // Username max length is 20, random suffix is 4 digits
    if (sanitizedBase.length > 15) {
        sanitizedBase = sanitizedBase.substring(0, 15);
    }
    // Guarantee 4 digits suffix so length check (min: 3) is always passed
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);

    user = new User({
        username: sanitizedBase + randomSuffix, // Ensure unique username without invalid chars
        email,
        password: randomPassword, // Fallback password
        googleId,
        profile: {
            firstName: firstName,
            lastName: lastName,
            avatar: picture
        }
    });
    await user.save();
    return user;
}

// POST /api/auth/google - Google Login
router.post('/google', async (req, res) => {
    try {
        const { token } = req.body;

        // 1. Verify Google Token
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();

        // 2. Find or Create User
        const user = await handleGoogleUser(payload);

        // 3. Update Streak & Generate JWT
        user.updateStreak();
        await user.save();

        const tokenPayload = {
            userId: user._id.toString(),
            username: user.username,
            email: user.email,
            role: user.role
        };

        const jwtToken = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login con Google exitoso',
            token: jwtToken,
            user: user.toJSON(),
            streak: user.getStreakInfo()
        });

    } catch (error) {
        console.error('Error en Google login:', error);
        res.status(error.name === 'ValidationError' ? 400 : 401).json({
            message: error.name === 'ValidationError' ? 'Error al crear la cuenta con Google: ' + error.message : 'Token de Google inválido',
            error: process.env.NODE_ENV === 'production' ? undefined : error.message
        });
    }
});

// POST /api/auth/logout - User logout
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, {
            'stats.lastActivity': new Date()
        });

        res.json({
            message: 'Logout exitoso'
        });
    } catch (error) {
        console.error('Error en logout:', error);
        res.status(500).json({
            message: 'Error interno del servidor'
        });
    }
});

// GET /api/auth/verify - Verify token
router.get('/verify', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user || !user.isActive) {
            return res.status(404).json({
                message: 'Usuario no encontrado o inactivo'
            });
        }

        res.json({
            message: 'Token válido',
            user: user.toJSON(),
            streak: user.getStreakInfo()
        });
    } catch (error) {
        console.error('Error verificando token:', error);
        res.status(500).json({
            message: 'Error interno del servidor'
        });
    }
});

// ================================
// PROFILE ROUTES
// ================================

// GET /api/auth/profile - Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user || !user.isActive) {
            return res.status(404).json({
                message: 'Usuario no encontrado'
            });
        }

        res.json({
            user: user.toJSON(),
            streak: user.getStreakInfo()
        });
    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        res.status(500).json({
            message: 'Error interno del servidor'
        });
    }
});

// PUT /api/auth/profile - Update profile and preferences
router.put('/profile', authenticateToken, [
    body('profile.firstName').optional().isLength({ max: 50 }),
    body('profile.lastName').optional().isLength({ max: 50 }),
    body('profile.bio').optional().isLength({ max: 500 }),
    body('profile.level').optional().isIn(['A1', 'A2', 'B1', 'B2', 'C1']),
    body('preferences.darkMode').optional().isBoolean(),
    body('preferences.language').optional().isIn(['es', 'en', 'tr']),
    body('preferences.fontSize').optional().isIn(['small', 'medium', 'large']),
    body('preferences.notifications').optional().isBoolean(),
    body('preferences.sound').optional().isBoolean(),
    body('preferences.dailyGoal').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                message: errors.array()[0].msg
            });
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                message: 'Usuario no encontrado'
            });
        }

        // Update allowed fields
        if (req.body.profile) {
            user.profile = { ...user.profile.toObject(), ...req.body.profile };
        }

        if (req.body.preferences) {
            user.preferences = { ...user.preferences.toObject(), ...req.body.preferences };
        }

        await user.save();

        res.json({
            message: 'Perfil actualizado exitosamente',
            user: user.toJSON()
        });

    } catch (error) {
        console.error('Error actualizando perfil:', error);
        res.status(500).json({
            message: 'Error interno del servidor'
        });
    }
});

// ================================
// STREAK ROUTES
// ================================

// POST /api/auth/update-streak - Update user's streak
router.post('/update-streak', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                message: 'Usuario no encontrado'
            });
        }

        // Update streak
        const currentStreak = user.updateStreak();
        await user.save();

        res.json({
            message: 'Racha actualizada',
            streak: user.getStreakInfo(),
            currentStreak: currentStreak
        });
    } catch (error) {
        console.error('Error actualizando racha:', error);
        res.status(500).json({
            message: 'Error interno del servidor'
        });
    }
});

// GET /api/auth/streak - Get user's streak info
router.get('/streak', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                message: 'Usuario no encontrado'
            });
        }

        res.json({
            streak: user.getStreakInfo()
        });
    } catch (error) {
        console.error('Error obteniendo racha:', error);
        res.status(500).json({
            message: 'Error interno del servidor'
        });
    }
});


// ================================
// ADMIN ROUTES
// ================================

// GET /api/auth/admin/users - List all users (Admin only)
router.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await User.find({}, '-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        console.error('Error listing users:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// PUT /api/auth/admin/users/:id/role - Change user role (Admin only)
router.put('/admin/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { role } = req.body;
        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Rol inválido' });
        }

        const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json({ message: 'Rol actualizado', user });
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// DELETE /api/auth/admin/users/:id - Delete/Deactivate user (Admin only)
router.delete('/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.json({ message: 'Usuario eliminado permanentemente' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = router;
