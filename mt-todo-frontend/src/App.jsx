import { useEffect, useState } from 'react'
import { jwtDecode } from 'jwt-decode'
import Login from './Login'
import Signup from './Signup'
import { config } from './config'

const API_URL = config.API_URL

function App() {
  const [token, setToken] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [mode, setMode] = useState('login') // ✨ 추가
  const [todos, setTodos] = useState([])
  const [title, setTitle] = useState('')

  const handleLogin = (idToken) => {
    setToken(idToken)

    const decoded = jwtDecode(idToken)
    console.log('디코딩된 토큰:', decoded)

    setTenantId(decoded.email)
  }

  const fetchTodos = async () => {
    if (!token || !tenantId) return

    const res = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantId,
        'Content-Type': 'application/json'
      }
    })

    const data = await res.json()

    const mapped = data.map(item => ({
      ID: item.ID.Value,
      Title: item.Title.Value,
      Completed: item.Completed.Value
    }))

    setTodos(mapped)
  }

  useEffect(() => {
    if (token && tenantId) {
      fetchTodos()
    }
  }, [token, tenantId])

  const addTodo = async () => {
    if (!title.trim()) return

    await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title })
    })

    setTitle('')
    fetchTodos()
  }

  const deleteTodo = async (todo) => {
    await fetch(API_URL, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ID: todo.ID })
    })

    fetchTodos()
  }

  const toggleCompleted = async (todo) => {
    await fetch(API_URL, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ID: todo.ID,
        Completed: !todo.Completed
      })
    })

    fetchTodos()
  }

  const todosTodo = todos.filter(todo => !todo.Completed)
  const todosDone = todos.filter(todo => todo.Completed)

  if (!token) {
    if (mode === 'login') {
      return <Login onLogin={handleLogin} onSwitchToSignup={() => setMode('signup')} />
    } else {
      return <Signup onSwitchToLogin={() => setMode('login')} />
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Multi-Tenant ToDo App</h1>
      <button onClick={() => {
        setToken('')
        setTenantId('')
        setMode('login')
      }}>로그아웃</button>

      <div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="할 일을 입력하세요"
        />
        <button onClick={addTodo}>추가</button>
      </div>

      <h2>📋 해야 할 일</h2>
      <ul>
        {todosTodo.map(todo => (
          <li key={todo.ID}>
            <label>
              <input
                type="checkbox"
                checked={todo.Completed}
                onChange={() => toggleCompleted(todo)}
              />
              {todo.Title}
            </label>
            <button onClick={() => deleteTodo(todo)} style={{ marginLeft: 8 }}>❌</button>
          </li>
        ))}
      </ul>

      <h2>✅ 완료한 일</h2>
      <ul>
        {todosDone.map(todo => (
          <li key={todo.ID}>
            <label style={{ textDecoration: 'line-through' }}>
              <input
                type="checkbox"
                checked={todo.Completed}
                onChange={() => toggleCompleted(todo)}
              />
              {todo.Title}
            </label>
            <button onClick={() => deleteTodo(todo)} style={{ marginLeft: 8 }}>❌</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default App
