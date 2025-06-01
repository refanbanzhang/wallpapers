// 图片路由
import express from 'express';
import upload from '../middlewares/uploadMiddleware.js';
import { uploadImage, getAllImages, deleteImage, batchDeleteImages, updateImageCategory } from '../controllers/imageController.js';

const router = express.Router();

// 上传图片
router.post('/upload', upload.single('file'), uploadImage);

// 获取所有图片
router.get('/', getAllImages);

// 删除单张图片
router.delete('/:id', deleteImage);

// 批量删除图片
router.delete('/batch-delete', batchDeleteImages);

// 更新图片分类
router.put('/:id/category', updateImageCategory);

export default router;