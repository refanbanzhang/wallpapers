<template>
  <div class="page-container about-view">
    <section class="intro card">
      <span class="badge">ABOUT PROJECT</span>
      <h1 class="page-title">一个轻量但高效的壁纸工作台</h1>
      <p class="page-description">
        这个项目围绕“上传、整理、浏览、下载”构建，目标是让壁纸管理从零散文件夹变成可检索、可分类的体验。
      </p>
    </section>

    <section class="grid">
      <article class="card block">
        <h2 class="section-title">核心能力</h2>
        <ul>
          <li>多图上传，后端自动生成缩略图</li>
          <li>按关键词与分类快速筛选</li>
          <li>查看分辨率与元信息后再下载</li>
          <li>随时调整分类，持续整理图库</li>
        </ul>
      </article>

      <article class="card block">
        <h2 class="section-title">技术栈</h2>
        <ul>
          <li>Vue 3 + TypeScript</li>
          <li>Vue Router</li>
          <li>TDesign Vue Next</li>
          <li>Node.js + Express</li>
          <li>Sharp 缩略图处理</li>
        </ul>
      </article>

      <article class="card block">
        <h2 class="section-title">设计方向</h2>
        <ul>
          <li>统一视觉令牌，减少样式分裂</li>
          <li>强化信息层级，提升浏览效率</li>
          <li>保证触控区域与移动端可读性</li>
          <li>控制动效强度，照顾低动态偏好</li>
        </ul>
      </article>
    </section>
  </div>
</template>

<style scoped>
.about-view {
  display: grid;
  gap: 20px;
}

.intro {
  background:
    linear-gradient(155deg, rgba(255, 255, 255, 0.82), rgba(226, 242, 255, 0.54)),
    radial-gradient(circle at 95% 8%, rgba(122, 185, 255, 0.26), transparent 42%);
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.block {
  border: 1px solid rgba(255, 255, 255, 0.62);
}

.block ul {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 8px;
  color: var(--text-secondary);
  line-height: 1.7;
}

@media (max-width: 1000px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
