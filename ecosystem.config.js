module.exports = {
    apps: [{
        name: "turkamerica",
        script: "./server/server.js",
        instances: "max",
        exec_mode: "cluster",
        env: {
            NODE_ENV: "development",
        },
        env_production: {
            NODE_ENV: "production",
            GOOGLE_CLIENT_ID: "851628305222-0esr3799u256av6tnbvr7fqh19ut0unb.apps.googleusercontent.com"
        }
    }]
}
