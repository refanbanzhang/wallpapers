<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MessagePlugin } from 'tdesign-vue-next'

import { login } from '@/api/index'
import { setAuthToken } from '@/utils/auth'

const router = useRouter()
const route = useRoute()

const loading = ref(false)
// TODO: 发布的时候记得删除
const form = reactive({
  username: '15014095291',
  password: '332881532',
})

const submitLogin = async () => {
  if (!form.username.trim() || !form.password) {
    MessagePlugin.error('请输入账号和密码')
    return
  }

  try {
    loading.value = true
    const result = await login(form.username.trim(), form.password)
    setAuthToken(result.token)

    const redirect =
      typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
        ? route.query.redirect
        : '/manage'
    MessagePlugin.success('登录成功')
    await router.replace(redirect)
  } catch (error) {
    const message = error instanceof Error ? error.message : '登录失败'
    MessagePlugin.error(message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page-container login-view">
    <section class="login-card card">
      <div class="page-copy">
        <span class="badge">ADMIN ACCESS</span>
        <h1 class="page-title">登录管理后台</h1>
        <p class="page-description">登录后可上传图片、删除图片并维护分类信息。</p>
      </div>

      <div class="form-grid">
        <label class="field">
          <span>账号</span>
          <input
            v-model="form.username"
            type="text"
            placeholder="请输入账号"
            autocomplete="username"
            @keyup.enter="submitLogin"
          />
        </label>

        <label class="field">
          <span>密码</span>
          <input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            autocomplete="current-password"
            @keyup.enter="submitLogin"
          />
        </label>
      </div>

      <div class="actions">
        <button
          type="button"
          class="login-btn"
          :disabled="loading"
          @click="submitLogin"
        >
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.login-view {
  min-height: calc(100vh - 180px);
  display: grid;
  place-items: center;
}

.login-card {
  width: min(100%, 460px);
  display: grid;
  gap: 16px;
  border: 1px solid var(--border-color);
  background: #ffffff;
}

.form-grid {
  display: grid;
  gap: 12px;
}

.field {
  display: grid;
  gap: 6px;
  color: var(--text-secondary);
  font-weight: 600;
}

.field input {
  min-height: 44px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong);
  background: #ffffff;
  padding: 0 12px;
  color: var(--text-primary);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.field input:focus {
  border-color: #8c8c8c;
  box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.08);
  outline: none;
}

.actions {
  display: flex;
  justify-content: flex-end;
}

.login-btn {
  min-width: 120px;
  min-height: 42px;
  border: 1px solid #222222;
  border-radius: 999px;
  color: #ffffff;
  font-weight: 700;
  background: #222222;
  transition:
    transform 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  background: #3a3a3a;
  box-shadow: 0 8px 16px rgba(17, 17, 17, 0.2);
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
