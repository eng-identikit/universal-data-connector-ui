import axios from 'axios'

// Dynamic base URL from localStorage (can be overridden in Settings)
const getBaseUrl = () => localStorage.getItem('udc-api-url') || 'http://localhost:3000'

export const apiClient = axios.create({
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// Intercept requests to always use the current base URL
apiClient.interceptors.request.use((config) => {
  config.baseURL = getBaseUrl()
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    // Normalize error message
    const message =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      'Unknown error'
    return Promise.reject(new Error(message))
  },
)
