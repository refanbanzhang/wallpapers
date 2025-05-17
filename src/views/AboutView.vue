<template>
  <div class="about-container">
    <div class="about-content">
      <h1 class="about-title">关于壁纸应用</h1>
      <p class="about-description">
        这是一个简单的壁纸管理应用，提供了壁纸浏览和上传功能。
        在上传页面，您可以上传自己喜欢的图片，系统会自动生成对应的缩略图。
      </p>
      
      <h2 class="section-title">主要功能</h2>
      <ul class="feature-list">
        <li>浏览壁纸库</li>
        <li>上传自己的壁纸</li>
        <li>自动生成缩略图</li>
        <li>下载原图或缩略图</li>
      </ul>
      
      <h2 class="section-title">技术栈</h2>
      <ul class="tech-list">
        <li>Vue 3</li>
        <li>TypeScript</li>
        <li>Vue Router</li>
        <li>Canvas API (生成缩略图)</li>
        <li>TDesign UI 组件库</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.about-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.about-content {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.about-title {
  font-size: 24px;
  margin-bottom: 16px;
  color: #333;
}

.about-description {
  font-size: 16px;
  line-height: 1.6;
  color: #555;
  margin-bottom: 24px;
}

.section-title {
  font-size: 18px;
  margin: 24px 0 12px;
  color: #333;
}

.feature-list, .tech-list {
  padding-left: 20px;
}

.feature-list li, .tech-list li {
  margin-bottom: 8px;
  color: #555;
}
</style>
