// src/config.js

export const config = {
    API_URL: import.meta.env.VITE_API_URL,
    AWS_REGION: import.meta.env.VITE_AWS_REGION,
    COGNITO_USER_POOL_ID: import.meta.env.VITE_COGNITO_USER_POOL_ID,
    COGNITO_CLIENT_ID: import.meta.env.VITE_COGNITO_CLIENT_ID,
    COGNITO_CLIENT_SECRET_KEY: import.meta.env.VITE_COGNITO_CLIENT_SECRET_KEY
  }
  