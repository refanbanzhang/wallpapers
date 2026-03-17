# Wallpapers

前后端分离的壁纸管理应用（Vue 3 + Express）。支持上传、缩略图生成、分类、搜索与下载。

## 仓库结构

- `frontend/`：Vue 3 + TypeScript + Vite
- `backend/`：Express API + Multer + Sharp
- `backend/upload/origin/`：原图
- `backend/upload/thumbnails/`：缩略图

## 环境要求

- Node.js >= 18
- npm >= 9

## 安装

在仓库根目录执行：

```bash
npm install
```

## 开发

在仓库根目录执行：

```bash
npm run start
```

默认端口：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3000`

## 构建

在仓库根目录执行：

```bash
npm run build
```

## 质量检查

```bash
npm run lint
npm run test
```

## 主要 API

- `GET /api/health`：健康检查
- `GET /api/images`：获取图片列表（支持 `search` 查询参数）
- `POST /api/images/upload`：上传图片（`multipart/form-data`, 字段名 `file`）
- `PUT /api/images/:id/category`：更新分类（可传空字符串清空分类）
- `DELETE /api/images/:id`：删除单张图片
- `DELETE /api/images/batch-delete`：批量删除

## 环境变量

- `PORT`：后端端口（默认 `3000`）
- `HOST`：后端 host（默认 `localhost`）
- `VITE_API_BASE_URL`：前端请求 API 的基础前缀（默认空，走同域/代理）
- `VITE_BACKEND_PROXY_TARGET`：Vite 开发代理目标（默认 `http://localhost:3000`）
