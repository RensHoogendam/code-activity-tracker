<template>
  <div class="oauth-callback">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <h2>Completing Bitbucket Authentication...</h2>
      <p>Please wait while we finish setting up your connection.</p>
    </div>
    
    <div v-else-if="success" class="success">
      <div class="success-icon">✅</div>
      <h2>Authentication Successful!</h2>
      <p>You've been successfully authenticated with Bitbucket.</p>
      <button @click="redirectToApp" class="btn btn-primary">Continue to App</button>
    </div>
    
    <div v-else class="error">
      <div class="error-icon">❌</div>
      <h2>Authentication Failed</h2>
      <p>{{ errorMessage }}</p>
      <button @click="retryAuth" class="btn btn-secondary">Try Again</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import bitbucketService from '../services/bitbucketService'

const router = useRouter()
const loading = ref(true)
const success = ref(false)
const errorMessage = ref('')

onMounted(async () => {
  try {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const state = urlParams.get('state')
    const error = urlParams.get('error')
    
    if (error) {
      throw new Error(`OAuth error: ${error}`)
    }
    
    if (!code || !state) {
      throw new Error('Missing authorization code or state parameter')
    }
    
    // Exchange code for token
    console.log('🔐 Processing OAuth callback...')
    const authSuccess = await bitbucketService.handleOAuthCallback(code, state)
    
    if (authSuccess) {
      success.value = true
      console.log('✅ OAuth authentication completed successfully')
      
      // Test the connection
      const testResult = await bitbucketService.testAuthentication()
      if (!testResult.success) {
        throw new Error('Authentication test failed after OAuth completion')
      }
      
      // Auto-redirect after 2 seconds
      setTimeout(() => {
        redirectToApp()
      }, 2000)
    } else {
      throw new Error('Failed to exchange authorization code for token')
    }
  } catch (error) {
    console.error('OAuth callback error:', error)
    errorMessage.value = error instanceof Error ? error.message : 'Unknown authentication error'
    success.value = false
  } finally {
    loading.value = false
  }
})

function redirectToApp() {
  router.push('/')
}

function retryAuth() {
  bitbucketService.startOAuthFlow()
}
</script>

<style scoped>
.oauth-callback {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 2rem;
}

.loading, .success, .error {
  text-align: center;
  max-width: 400px;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.loading {
  background: #f8f9fa;
}

.success {
  background: #d4edda;
  border: 1px solid #c3e6cb;
}

.error {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
}

.spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 1rem;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.success-icon, .error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 1rem;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn:hover {
  opacity: 0.9;
}

h2 {
  margin: 0 0 1rem 0;
  color: #333;
}

p {
  margin: 0 0 1rem 0;
  color: #666;
}
</style>