import express from 'express';
import { bulkInsertCategories } from '../controllers/categories/categoryController'

const router = express.Router();

// Route for bulk inserting categories
router.post('/bulk-insert', bulkInsertCategories);

export default router;