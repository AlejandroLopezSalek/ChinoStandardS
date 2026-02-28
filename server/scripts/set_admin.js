const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const { connectDB } = require('../config/database');

const setAdmin = async () => {
    const identifier = process.argv[2];

    if (!identifier) {
        console.error('Por favor proporciona un email o nombre de usuario.');
        console.log('Uso: npm run set-admin -- <email_o_usuario>');
        process.exit(1);
    }

    try {
        await connectDB();

        const user = await User.findOne({
            $or: [
                { email: identifier.toLowerCase() },
                { username: identifier.toLowerCase() }
            ]
        });

        if (!user) {
            console.error(`Usuario '${identifier}' no encontrado.`);
            process.exit(1);
        }

        if (user.role === 'admin') {
            console.log(` El usuario ${user.username} (${user.email}) ya es administrador.`);
            process.exit(0);
        }

        user.role = 'admin';
        await user.save();

        console.log(`Usuario ${user.username} (${user.email}) actualizado a ADMINISTRADOR exitosamente.`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
};

setAdmin();
