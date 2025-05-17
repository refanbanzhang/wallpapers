# Wallpapers - 壁纸管理应用

这是一个基于Vue 3和Express的壁纸管理应用，支持图片上传、缩略图生成和图片管理功能。

## 功能特点

- 图片上传和预览
- 自动生成缩略图
- 图片管理（查看、下载、删除）
- 前后端分离架构

## 项目结构

- `src/` - 前端Vue应用源码
- `server/` - 后端Express API源码
- `uploads/` - 上传的图片存储目录
  - `origin/` - 原始图片
  - `thumbnails/` - 缩略图

## 环境要求

- Node.js >= 16
- npm >= 7

## 安装和运行

### 安装依赖

```bash
npm install
```

### 开发模式

#### 分别启动前端和后端

**启动前端**

```bash
npm run dev
```

**启动后端**

```bash
npm run server
```

#### 同时启动前端和后端（推荐）

```bash
npm run dev:full
```

### 生产构建

```bash
npm run build
```

## 项目配置

### 后端服务器

后端服务器运行在`http://localhost:3000`，提供以下API:

- `POST /api/upload` - 上传图片
- `GET /api/images` - 获取图片列表
- `DELETE /api/images/:id` - 删除图片

### 前端开发服务器

前端开发服务器运行在`http://localhost:5173`，并自动代理API请求到后端服务器。

## 技术栈

### 前端

- Vue 3
- TypeScript
- Vite
- Pinia
- Vue Router
- TDesign Vue Next

### 后端

- Express
- Multer (文件上传)
- CORS

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
