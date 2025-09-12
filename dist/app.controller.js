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
(0, dotenv_1.config)({ path: (0, node_path_1.resolve)('./src/config/.env.development') });
const modules_1 = require("./modules");
const error_response_1 = require("./utils/response/error.response");
const connection_db_1 = __importDefault(require("./Db/connection.db"));
const s3_config_1 = require("./utils/multer/s3.config");
const node_util_1 = require("node:util");
const node_stream_1 = require("node:stream");
const createWriteStreamPip = (0, node_util_1.promisify)(node_stream_1.pipeline);
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
    app.use('/auth', modules_1.authRouter);
    app.use('/user', modules_1.userRouter);
    app.use('/post', modules_1.postRouter);
    app.get('/upload/pre-signed/*path', async (req, res) => {
        const { downloadName, download = "false", expiresIn = 120 } = req.query;
        const { path } = req.params;
        console.log({ path });
        const Key = path.join('/');
        const url = await (0, s3_config_1.createGetPreSignedLink)({
            Key,
            downloadName: downloadName,
            download,
            expiresIn
        });
        console.log({ url });
        return res.json({ message: "Done", data: { url } });
    });
    app.get('/upload/*path', async (req, res) => {
        const { downloadName, download = "false" } = req.query;
        const { path } = req.params;
        const Key = path.join('/');
        const s3Response = await (0, s3_config_1.getFile)({ Key });
        console.log(s3Response.Body);
        if (!s3Response?.Body) {
            throw new error_response_1.BadRequestException("fail to fetch this asset");
        }
        res.setHeader("Content-type", `${s3Response.ContentType || "application/octet-stream"}`);
        if (download === "true") {
            res.setHeader("Content-Disposition", `attachment; filename="${downloadName || Key.split("/").pop()}"`);
        }
        return await createWriteStreamPip(s3Response.Body, res);
    });
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
    async function test() {
        try {
        }
        catch (error) {
            console.log(error);
        }
    }
    test();
};
exports.default = bootstrap;
