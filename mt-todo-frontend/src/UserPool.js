import { CognitoUserPool } from 'amazon-cognito-identity-js'

const poolData = {
  UserPoolId: 'ap-northeast-2_DLm0SV1IW', // 👉 여기 본인 UserPool ID
  ClientId: 'g0j0qf03743cllk1g1uic4ct8',          // 👉 여기 본인 App Client ID
}

export default new CognitoUserPool(poolData)
