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
exports.bulkInsertCategories = void 0;
const Category_1 = __importDefault(require("../../models/Category"));
const categories_1 = require("../categories"); // Assume this is where your categories array is defined
const bulkInsertCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Convert popularityScore to popularityPercentage
        const categoriesWithPercentage = categories_1.categories.map(category => (Object.assign(Object.assign({}, category), { popularityPercentage: category.popularityScore })));
        // Remove any existing categories
        yield Category_1.default.deleteMany({});
        // Bulk insert the new categories
        const result = yield Category_1.default.insertMany(categoriesWithPercentage);
        res.status(200).json({
            message: 'Categories bulk inserted successfully',
            count: result.length
        });
    }
    catch (error) {
        console.error('Error bulk inserting categories:', error);
        res.status(500).json({
            message: 'Error bulk inserting categories',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.bulkInsertCategories = bulkInsertCategories;
