import axios from 'axios'

// In production (Netlify), VITE_API_URL is the full backend URL (e.g. https://medi7-backend.onrender.com)
// In local dev, it falls back to '/api' which is proxied by Vite to localhost:8000
const rawUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '')
const baseURL = rawUrl
  ? (rawUrl.endsWith('/api') ? rawUrl : `${rawUrl}/api`)
  : '/api'

const api = axios.create({
  baseURL,
  timeout: 30000,
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('medi7_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('medi7_token')
      localStorage.removeItem('medi7_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
