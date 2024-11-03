import express from 'express';
import { createReply, deleteReply, getPaginatedReplies } from '../controllers/feed/reply';

const router = express.Router();

router.post('/', createReply);
router.delete('/:replyId', deleteReply);
router.get('/', getPaginatedReplies);

export default router;
