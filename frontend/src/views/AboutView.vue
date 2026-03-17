<template>
  <div class="page-container about-view">
    <section class="intro card">
      <span class="badge">ABOUT PROJECT</span>
      <h1 class="page-title">一个轻量但高效的壁纸工作台</h1>
      <p class="page-description">
        这个项目围绕“上传、整理、浏览、下载”构建，目标是让壁纸管理从零散文件夹变成可检索、可分类的体验。
      </p>
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
</style>
