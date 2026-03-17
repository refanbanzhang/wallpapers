# Smartisan UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改业务逻辑的前提下，把前端全站视觉替换为 Smartisan 向极简白灰风格。

**Architecture:** 采用 token-first 改造。先重建全局设计令牌和基础控件样式，再逐页替换局部视觉规则，保持原有信息架构和交互流程。验证以前端构建通过和页面关键流程不回归为准。

**Tech Stack:** Vue 3 + TypeScript + TDesign Vue Next + Vite

---

### Task 1: 全局视觉令牌与基础样式

**Files:**
- Modify: `frontend/src/assets/styles/global.css`
- Modify: `frontend/src/assets/main.css`

- [x] Step 1: 替换全局颜色、圆角、边框、阴影 token 为白灰体系。
- [x] Step 2: 重写 `.page-container`、`.card`、标题与通用状态块样式。
- [x] Step 3: 覆盖 TDesign 按钮/输入/选择/弹窗基础视觉。
- [x] Step 4: 移除强装饰背景与展示型字体依赖。

### Task 2: 顶部导航重构（双层）

**Files:**
- Modify: `frontend/src/App.vue`

- [x] Step 1: 模板改为上层深色条 + 下层浅色主导航。
- [x] Step 2: 导航项、选中态、登录态按钮改为灰阶胶囊语言。
- [x] Step 3: 保持路由与认证逻辑不变，仅替换展示与权限入口显隐。

### Task 3: 页面级样式替换

**Files:**
- Modify: `frontend/src/views/HomeView.vue`
- Modify: `frontend/src/views/UploadView.vue`
- Modify: `frontend/src/views/LoginView.vue`
- Modify: `frontend/src/views/AboutView.vue`
- Modify: `frontend/src/components/ImageUpload.vue`

- [x] Step 1: 首页替换 Hero、分类、搜索、图库、弹窗样式。
- [x] Step 2: 管理页替换上传区、分类按钮、图库卡片、危险按钮样式。
- [x] Step 3: 登录页替换卡片、输入、主按钮样式。
- [x] Step 4: 关于页替换卡片与排版样式。

### Task 4: 验证与收尾

**Files:**
- Modify: `docs/superpowers/plans/2026-03-17-smartisan-ui-refresh-implementation.md`

- [x] Step 1: 运行 `npm --workspace frontend run build`。
- [x] Step 2: 若失败则修复并重跑，直到通过。
- [x] Step 3: 在计划文件中勾选完成项并记录验证结果。

### Verification Result

- `npm --workspace frontend run build`：PASS（Vite production build succeeded）
- `npm --workspace frontend run type-check`：PASS（`vue-tsc --build` succeeded）
