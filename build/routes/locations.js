"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const locations_1 = require("../controllers/locations/locations");
const router = express_1.default.Router();
// Route for bulk inserting locations
router.post('/bulk-insert', locations_1.bulkInsertLocations);
router.post('/bulk-update-prompt', locations_1.bulkAddPromptToLocations);
exports.default = router;
