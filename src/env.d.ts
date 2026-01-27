/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BITBUCKET_API_TOKEN: string
  readonly VITE_BITBUCKET_API_USERNAME: string
  readonly VITE_BITBUCKET_PR_AUTHOR_DISPLAY_NAME: string
  readonly VITE_BITBUCKET_COMMIT_AUTHOR_RAW: string
  readonly VITE_BITBUCKET_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}