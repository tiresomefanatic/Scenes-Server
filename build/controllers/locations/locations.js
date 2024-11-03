"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkAddPromptToLocations = exports.bulkInsertLocations = void 0;
const http_status_codes_1 = require("http-status-codes");
const Location_1 = __importDefault(require("../../models/Location"));
const mongoose_1 = __importDefault(require("mongoose"));
// Category IDs from the previous bulk insert
const categoryIds = [
    "66d4883f2434806067cef584", "66d4883f2434806067cef585", "66d4883f2434806067cef586",
    "66d4883f2434806067cef587", "66d4883f2434806067cef588", "66d4883f2434806067cef589",
    "66d4883f2434806067cef58a", "66d4883f2434806067cef58b", "66d4883f2434806067cef58c",
    "66d4883f2434806067cef58d", "66d4883f2434806067cef58e", "66d4883f2434806067cef58f",
    "66d4883f2434806067cef590", "66d4883f2434806067cef591", "66d4883f2434806067cef592",
    "66d4883f2434806067cef593", "66d4883f2434806067cef594", "66d4883f2434806067cef595",
    "66d4883f2434806067cef596", "66d4883f2434806067cef597", "66d4883f2434806067cef598",
    "66d4883f2434806067cef599", "66d4883f2434806067cef59a", "66d4883f2434806067cef59b",
    "66d4883f2434806067cef59c", "66d4883f2434806067cef59d", "66d4883f2434806067cef59e",
    "66d4883f2434806067cef59f", "66d4883f2434806067cef5a0", "66d4883f2434806067cef5a1",
    "66d4883f2434806067cef5a2", "66d4883f2434806067cef5a3", "66d4883f2434806067cef5a4",
    "66d4883f2434806067cef5a5", "66d4883f2434806067cef5a6", "66d4883f2434806067cef5a7",
    "66d4883f2434806067cef5a8", "66d4883f2434806067cef5a9", "66d4883f2434806067cef5aa",
    "66d4883f2434806067cef5ab", "66d4883f2434806067cef5ac", "66d4883f2434806067cef5ad",
    "66d4883f2434806067cef5ae", "66d4883f2434806067cef5af", "66d4883f2434806067cef5b0",
    "66d4883f2434806067cef5b1", "66d4883f2434806067cef5b2", "66d4883f2434806067cef5b3",
    "66d4883f2434806067cef5b4", "66d4883f2434806067cef5b5", "66d4883f2434806067cef5b6",
    "66d4883f2434806067cef5b7", "66d4883f2434806067cef5b8", "66d4883f2434806067cef5b9",
    "66d4883f2434806067cef5ba", "66d4883f2434806067cef5bb", "66d4883f2434806067cef5bc",
    "66d4883f2434806067cef5bd", "66d4883f2434806067cef5be", "66d4883f2434806067cef5bf",
    "66d4883f2434806067cef5c0", "66d4883f2434806067cef5c1", "66d4883f2434806067cef5c2"
];
const locationNames = [
    "Central Park", "Times Square", "Eiffel Tower", "Louvre Museum", "Colosseum",
    "Great Wall of China", "Taj Mahal", "Machu Picchu", "Christ the Redeemer", "Petra",
    "Grand Canyon", "Yellowstone National Park", "Niagara Falls", "Stonehenge", "Angkor Wat",
    "Mount Fuji", "Sydney Opera House", "Burj Khalifa", "Golden Gate Bridge", "Red Square"
];
const getRandomCategories = () => {
    const numCategories = Math.floor(Math.random() * 5) + 1; // 1 to 5 categories per location
    const shuffled = [...categoryIds].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, numCategories).map(id => new mongoose_1.default.Types.ObjectId(id));
};
const createSampleLocation = (name) => ({
    name,
    categories: getRandomCategories(),
});
const bulkInsertLocations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const sampleLocations = locationNames.map(createSampleLocation);
        const result = yield Location_1.default.insertMany(sampleLocations);
        res.status(http_status_codes_1.StatusCodes.CREATED).json({
            message: 'Locations bulk inserted successfully',
            count: result.length
        });
    }
    catch (error) {
        console.error('Error bulk inserting locations:', error);
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: 'Error bulk inserting locations',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.bulkInsertLocations = bulkInsertLocations;
// Bulk update function
function bulkAddPromptToLocations() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield Location_1.default.updateMany({}, // This empty object means update all documents
            { $set: { prompt: "Test prompt at" } }, { multi: true });
            console.log(`Updated ${result.modifiedCount} locations with test prompt`);
        }
        catch (error) {
            console.error("Error updating locations with test prompt:", error);
            throw error;
        }
    });
}
exports.bulkAddPromptToLocations = bulkAddPromptToLocations;
