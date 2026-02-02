<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1>🕐 Hours Tracker</h1>
        <p>Connect to Bitbucket to track your development hours</p>
      </div>
      
      <div class="login-content">
        <div class="feature-list">
          <div class="feature">
            <span class="feature-icon">📊</span>
            <span>Track pull requests and commits</span>
          </div>
          <div class="feature">
            <span class="feature-icon">📈</span>
            <span>Analyze your productivity</span>
          </div>
          <div class="feature">
            <span class="feature-icon">🔒</span>
            <span>Secure OAuth authentication</span>
          </div>
        </div>
        
        <div class="auth-section">
          <p class="auth-description">
            To get started, you'll need to authenticate with Bitbucket using OAuth.
            This will allow the app to securely access your repositories and pull requests.
          </p>
          
          <button @click="startAuthentication" class="auth-button" :disabled="loading">
            <span v-if="loading" class="spinner"></span>
            <span v-else>🔐</span>
            {{ loading ? 'Starting Authentication...' : 'Connect to Bitbucket' }}
          </button>
          
          <div class="auth-info">
            <details>
              <summary>What permissions does this app need?</summary>
              <ul>
                <li><strong>Repositories: Read</strong> - To access your repository information</li>
                <li><strong>Pull Requests: Read</strong> - To track your pull request activity</li>
                <li><strong>Account: Read</strong> - To identify your account</li>
              </ul>
            </details>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import bitbucketService from '../services/bitbucketService'

const loading = ref(false)

async function startAuthentication() {
  loading.value = true
  try {
    console.log('🔐 Starting Bitbucket OAuth flow...')
    bitbucketService.startOAuthFlow()
  } catch (error) {
    console.error('Error starting OAuth flow:', error)
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.login-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 100%;
  overflow: hidden;
}

.login-header {
  background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
  color: white;
  text-align: center;
  padding: 2rem;
}

.login-header h1 {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  font-weight: 600;
}

.login-header p {
  margin: 0;
  opacity: 0.9;
  font-size: 1.1rem;
}

.login-content {
  padding: 2rem;
}

.feature-list {
  margin-bottom: 2rem;
}

.feature {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  font-size: 1rem;
}

.feature-icon {
  font-size: 1.5rem;
  margin-right: 1rem;
  width: 2rem;
}

.auth-section {
  text-align: center;
}

.auth-description {
  color: #666;
  line-height: 1.6;
  margin-bottom: 2rem;
}

.auth-button {
  background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin: 0 auto;
  min-width: 200px;
}

.auth-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0, 102, 204, 0.3);
}

.auth-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.auth-info {
  margin-top: 2rem;
}

details {
  text-align: left;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
}

summary {
  cursor: pointer;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.5rem;
}

details ul {
  margin: 0.5rem 0 0 1rem;
  padding: 0;
}

details li {
  margin-bottom: 0.25rem;
  color: #666;
}
</style>