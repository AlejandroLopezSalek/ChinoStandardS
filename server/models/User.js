const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [20, 'Username cannot exceed 20 characters'],
    match: [/^\w+$/, 'Username can only contain letters, numbers, and underscores']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    // Password is only required if googleId is NOT present
    required: function () { return !this.googleId; },
    minlength: [6, 'Password must be at least 6 characters']
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
    enum: {
      values: ['AR', 'BO', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'SV', 'GQ', 'GT', 'HN', 'MX', 'NI', 'PA', 'PY', 'PE', 'PR', 'ES', 'UY', 'VE', 'US', 'OTHER'],
      message: '{VALUE} is not a valid country code'
    }
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows multiple documents to have no googleId
  },
  profile: {
    firstName: String,
    lastName: String,
    level: {
      type: String,
      enum: ['A1', 'A2', 'B1', 'B2', 'C1'],
      default: 'A1'
    },
    avatar: String,
    bio: String
  },
  preferences: {
    language: {
      type: String,
      default: 'es'
    },
    notifications: {
      type: Boolean,
      default: true
    },
    dailyGoal: {
      type: Number,
      default: 10
    }
  },
  stats: {
    totalFlashcards: {
      type: Number,
      default: 0
    },
    totalTexts: {
      type: Number,
      default: 0
    },
    streak: {
      type: Number,
      default: 0
    },
    lastViewedLesson: {
      id: String,
      title: String,
      url: String,
      timestamp: Date
    },
    activeStoryId: String,
    lastActivity: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  }
}, {
  timestamps: true
});

// ==========================================
// MIDDLEWARE Y MÉTODOS DE SEGURIDAD
// ==========================================

// Encriptar contraseña antes de guardar
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Comparar contraseñas
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Ocultar contraseña al enviar datos al frontend (JSON)
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// ==========================================
// MÉTODOS FALTANTES (AGREGADOS)
// ==========================================

// 1. Método de instancia: Actualizar Racha (Streak)
userSchema.methods.updateStreak = function () {
  const now = new Date();
  const lastActivity = this.stats.lastActivity ? new Date(this.stats.lastActivity) : null;

  // Si ya hubo actividad hoy, no hacemos nada
  if (lastActivity?.toDateString() === now.toDateString()) {
    return this.stats.streak;
  }

  // Si la última actividad fue ayer, sumamos 1
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (lastActivity?.toDateString() === yesterday.toDateString()) {
    this.stats.streak = (this.stats.streak || 0) + 1;
  } else {
    // Si pasó más tiempo (se rompió la racha) o es el primer día
    this.stats.streak = 1;
  }

  this.stats.lastActivity = now;
  return this.stats.streak;
};

// 2. Método de instancia: Obtener info de racha
userSchema.methods.getStreakInfo = function () {
  return {
    count: this.stats.streak || 0,
    lastActivity: this.stats.lastActivity
  };
};

// 3. Método Estático: Buscar usuario por Email o Username (CRUCIAL PARA LOGIN)
userSchema.statics.findByEmailOrUsername = async function (identifier) {
  return this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier.toLowerCase() }
    ]
  });
};

module.exports = mongoose.model('User', userSchema);