import { createApp } from 'vue'
import 'tdesign-vue-next/es/style/index.css'
import './assets/main.css'
import './assets/styles/global.css'

import App from '@/App.vue'
import router from './router'

const app = createApp(App)

app.use(router)

app.mount('#app')
