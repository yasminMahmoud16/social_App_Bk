"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudMulter = exports.fileValidation = exports.StorageEnum = void 0;
const multer_1 = __importDefault(require("multer"));
const node_os_1 = __importDefault(require("node:os"));
const error_response_1 = require("../response/error.response");
const uuid_1 = require("uuid");
var StorageEnum;
(function (StorageEnum) {
    StorageEnum["memory"] = "memory";
    StorageEnum["disk"] = "disk";
})(StorageEnum || (exports.StorageEnum = StorageEnum = {}));
exports.fileValidation = {
    image: ["image/png", "image/gif", "image/jpeg"]
};
const cloudMulter = ({ validation = [], storageApproach = StorageEnum.memory, maxSizeMB = 2 }) => {
    const storage = storageApproach === StorageEnum.memory ? multer_1.default.memoryStorage() : multer_1.default.diskStorage({
        destination: node_os_1.default.tmpdir(),
        filename: function (req, file, callBack) {
            callBack(null, `${(0, uuid_1.v4)()}_${file.originalname}`);
        }
    });
    function fileFilter(req, file, callBack) {
        if (!validation.includes(file.mimetype)) {
            return callBack(new error_response_1.BadRequestException("Validation Error", {
                validationError: [{
                        key: "file",
                        issue: [{
                                path: "file",
                                message: "In-valid file formate"
                            }]
                    }]
            }));
        }
        return callBack(null, true);
    }
    return (0, multer_1.default)({ fileFilter, limits: { fileSize: maxSizeMB * 1024 * 1024 }, storage });
};
exports.cloudMulter = cloudMulter;
