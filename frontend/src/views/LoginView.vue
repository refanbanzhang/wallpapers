<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MessagePlugin } from 'tdesign-vue-next'

import { login } from '@/api/index'
import { setAuthToken } from '@/utils/auth'

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const form = reactive({
  username: '',
  password: '',
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
      <span class="badge">ADMIN ACCESS</span>
      <h1 class="page-title">登录管理后台</h1>
      <p class="page-description">登录后可上传图片、删除图片并维护分类信息。</p>

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
  border-radius: 14px;
  border: 1px solid rgba(128, 160, 206, 0.4);
  background: rgba(255, 255, 255, 0.72);
  padding: 0 12px;
  color: var(--text-primary);
  transition:
    border-color 0.22s ease,
    box-shadow 0.22s ease;
}

.field input:focus {
  border-color: rgba(124, 168, 236, 0.78);
  box-shadow: 0 0 0 4px rgba(125, 175, 245, 0.2);
  outline: none;
}

.actions {
  display: flex;
  justify-content: flex-end;
}

.login-btn {
  min-width: 120px;
  min-height: 42px;
  border: 0;
  border-radius: 999px;
  color: #fff;
  font-weight: 700;
  background: linear-gradient(135deg, #6da0ff, #4f88ff 55%, #4991ff);
  box-shadow: 0 10px 20px rgba(63, 117, 220, 0.28);
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    opacity 0.22s ease;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 14px 26px rgba(63, 117, 220, 0.34);
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
