import express from "express";
import {
  bulkAddPromptToLocations,
  bulkInsertLocations,
  getAllLocations,
} from "../controllers/locations/locations";

const router = express.Router();

// Route for bulk inserting locations

//router.post('/create', createLocation )

router.get("/", getAllLocations);

router.post("/bulk-insert", bulkInsertLocations);

router.post("/bulk-update-prompt", bulkAddPromptToLocations);

export default router;
