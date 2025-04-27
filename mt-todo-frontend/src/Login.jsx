import { useState } from 'react'
import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider'
import { generateSecretHash } from './utils/secretHash'
import { config } from './config'

const CLIENT_ID = config.COGNITO_CLIENT_ID
const REGION = config.AWS_REGION
const CLIENT_SECRET = config.COGNITO_CLIENT_SECRET_KEY
const USER_POOL_ID = config.COGNITO_USER_POOL_ID

const client = new CognitoIdentityProviderClient({
  region: REGION,
})

function Login({ onLogin, onSwitchToSignup }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()

    try {
      const secretHash = generateSecretHash(username, CLIENT_ID, CLIENT_SECRET)

      const command = new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: CLIENT_ID,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password,
          SECRET_HASH: secretHash
        }
      })

      const response = await client.send(command)
      const idToken = response.AuthenticationResult.IdToken
      onLogin(idToken)

    } catch (err) {
      console.error('로그인 실패', err)
      setError(err.message || JSON.stringify(err))
    }
  }

  return (
    <div>
      <h2>로그인</h2>
      <form onSubmit={handleLogin}>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Email" required />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
        <button type="submit">로그인</button>
      </form>

      <button onClick={onSwitchToSignup} style={{ marginTop: 12 }}>
        회원가입
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  )
}

export default Login
