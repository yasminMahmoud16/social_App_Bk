"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = require("dotenv");
const node_path_1 = require("node:path");
(0, dotenv_1.config)({ path: (0, node_path_1.resolve)('./config/.env.development') });
const auth_controller_1 = __importDefault(require("./modules/auth/auth.controller"));
const user_controller_1 = __importDefault(require("./modules/user/user.controller"));
const error_response_1 = require("./utils/response/error.response");
const connection_db_1 = __importDefault(require("./Db/connection.db"));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60000,
    limit: 2000,
    message: { error: "Too many request please try again later " },
    statusCode: 429,
});
const bootstrap = async () => {
    const app = (0, express_1.default)();
    const port = process.env.PORT || 5000;
    app.use(express_1.default.json(), (0, cors_1.default)(), (0, helmet_1.default)(), limiter);
    app.get('/', (req, res) => {
        res.json({
            message: `welcome to ${process.env.APPLICATION_NAME} backend landing page ❤️🌸`
        });
    });
    app.use('/auth', auth_controller_1.default);
    app.use('/user', user_controller_1.default);
    app.use('{/*dummy}', (req, res) => {
        res.status(404).json({
            message: "In-valid page please check the URL ❌ "
        });
    });
    app.use(error_response_1.globalErrorHandling);
    await (0, connection_db_1.default)();
    app.listen(port, () => {
        console.log(`Server is running on port :::${port} 🚀`);
    });
};
exports.default = bootstrap;
