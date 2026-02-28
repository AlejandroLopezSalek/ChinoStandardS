const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const { connectDB } = require('../config/database');

const listUsers = async () => {
    try {
        await connectDB();

        console.log('Fetching users...');
        const users = await User.find({}, 'username email role createdAt');

        if (users.length === 0) {
            console.log('No users found.');
        } else {
            console.log('\nList of Registered Users:');
            console.log('----------------------------------------------------------------');
            console.log(String('Username').padEnd(20) + String('Email').padEnd(35) + String('Role').padEnd(10));
            console.log('----------------------------------------------------------------');

            users.forEach(user => {
                console.log(
                    String(user.username).padEnd(20) +
                    String(user.email).padEnd(35) +
                    String(user.role).padEnd(10)
                );
            });
            console.log('----------------------------------------------------------------');
            console.log(`Total: ${users.length} users\n`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
};

listUsers();
