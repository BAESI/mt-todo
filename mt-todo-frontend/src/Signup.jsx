import { useState } from 'react'
import { CognitoIdentityProviderClient, SignUpCommand, ConfirmSignUpCommand } from '@aws-sdk/client-cognito-identity-provider'
import { generateSecretHash } from './utils/secretHash'
import { config } from './config'

const CLIENT_ID = config.CLIENT_ID
const CLIENT_SECRET = config.COGNITO_CLIENT_SECRET_KEY
const REGION = config.AWS_REGION

const client = new CognitoIdentityProviderClient({
  region: REGION,
})

function Signup({ onSwitchToLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [stage, setStage] = useState('signup') // signup or confirm
  const [error, setError] = useState('')

  const handleSignup = async (e) => {
    e.preventDefault()

    try {
      const secretHash = generateSecretHash(username, CLIENT_ID, CLIENT_SECRET)

      const command = new SignUpCommand({
        ClientId: CLIENT_ID,
        Username: username,
        Password: password,
        SecretHash: secretHash,
        UserAttributes: [
          { Name: 'email', Value: username }
        ]
      })

      await client.send(command)
      console.log('회원가입 성공')
      setStage('confirm')
    } catch (err) {
      console.error('회원가입 실패', err)
      setError(err.message || JSON.stringify(err))
    }
  }

  const handleConfirm = async (e) => {
    e.preventDefault()

    try {
      const secretHash = generateSecretHash(username, CLIENT_ID, CLIENT_SECRET)

      const command = new ConfirmSignUpCommand({
        ClientId: CLIENT_ID,
        Username: username,
        ConfirmationCode: code,
        SecretHash: secretHash
      })

      await client.send(command)
      console.log('회원가입 인증 성공')
      onSwitchToLogin()

    } catch (err) {
      console.error('회원가입 인증 실패', err)
      setError(err.message || JSON.stringify(err))
    }
  }

  return (
    <div>
      {stage === 'signup' ? (
        <>
          <h2>회원가입</h2>
          <form onSubmit={handleSignup}>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Email" required />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
            <button type="submit">회원가입</button>
          </form>
        </>
      ) : (
        <>
          <h2>이메일 인증</h2>
          <form onSubmit={handleConfirm}>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="인증코드" required />
            <button type="submit">확인</button>
          </form>
        </>
      )}
      <button onClick={onSwitchToLogin} style={{ marginTop: 12 }}>
        로그인으로 돌아가기
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  )
}

export default Signup
