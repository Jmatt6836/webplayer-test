const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
    app.use('/auth/**', 
        createProxyMiddleware({ 
            // CHANGED (fix-redirect-uri): 127.0.0.1 instead of localhost. On
            // newer Node versions `localhost` can resolve to the IPv6 address
            // ::1, which makes the proxy fail on some machines (often Windows).
            target: 'http://127.0.0.1:8080'
        })
    );
};
