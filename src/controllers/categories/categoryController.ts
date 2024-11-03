import { Request, Response } from 'express';
import Category from '../../models/Category';
import { categories } from  '../categories' // Assume this is where your categories array is defined

export const bulkInsertCategories = async (req: Request, res: Response) => {
  try {
    // Convert popularityScore to popularityPercentage
    const categoriesWithPercentage = categories.map(category => ({
      ...category,
      popularityPercentage: category.popularityScore
    }));

    // Remove any existing categories
    await Category.deleteMany({});

    // Bulk insert the new categories
    const result = await Category.insertMany(categoriesWithPercentage);

    res.status(200).json({
      message: 'Categories bulk inserted successfully',
      count: result.length
    });
  } catch (error) {
    console.error('Error bulk inserting categories:', error);
    res.status(500).json({
      message: 'Error bulk inserting categories',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};