# GroupGo — Frontend API Documentation

## Base URL
```
http://localhost:8000
```
> When deployed, replace with the production URL.

---

## Auth Flow Overview

```
1. User clicks "Sign in with Google" button
         ↓
2. Frontend redirects to GET /auth/google
         ↓
3. Backend redirects to Google OAuth page
         ↓
4. User approves → Google redirects to Supabase callback
         ↓
5. Supabase redirects to your frontend at /auth/callback
         ↓
6. Frontend calls POST /auth/verify with the access token
         ↓
7. Backend returns user info → store in state, redirect to app
```

---

## Endpoints

### 1. Google Login
**The login button should redirect to this URL.**

```
GET http://localhost:8000/auth/google
```

**How to wire up the button:**
```javascript
// Just redirect the browser to this URL
const handleLogin = () => {
  window.location.href = "http://localhost:8000/auth/google";
};

// Button
<button onClick={handleLogin}>Sign in with Google</button>
```

No request body needed. No headers needed. Just a redirect.

---

### 2. Handle Callback (after Google redirects back)

After the user approves Google login, they land on `/auth/callback` on your frontend. You need a page/route at this path that reads the session from Supabase and verifies it with the backend.

**Install Supabase JS client:**
```bash
npm install @supabase/supabase-js
```

**Initialize Supabase (do this once, e.g. in `supabase.js`):**
```javascript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://xxxx.supabase.co',   // get from backend dev
  'your-anon-key'                // get from backend dev
)
```

**Your `/auth/callback` page:**
```javascript
import { useEffect } from 'react'
import { supabase } from './supabase'
import { useNavigate } from 'react-router-dom'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      // Supabase automatically picks up the token from the URL
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        console.error('Login failed', error)
        navigate('/login')
        return
      }

      // Verify with our backend and get user info
      const res = await fetch('http://localhost:8000/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: session.access_token })
      })

      const user = await res.json()

      // Save user to your app state / localStorage
      localStorage.setItem('user', JSON.stringify(user))
      localStorage.setItem('access_token', session.access_token)

      // Redirect to the app
      navigate('/dashboard')
    }

    handleCallback()
  }, [])

  return <div>Logging you in...</div>
}
```

---

### 3. Verify Token
**Call this after getting the Supabase session to confirm login server-side.**

```
POST http://localhost:8000/auth/verify
Content-Type: application/json
```

**Request body:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5..."
}
```

**Response:**
```json
{
  "id": "uuid-of-user",
  "email": "user@gmail.com",
  "name": "Ojaswi Kumar",
  "avatar": "https://lh3.googleusercontent.com/..."
}
```

---

### 4. Logout

```
POST http://localhost:8000/auth/logout
Content-Type: application/json
```

**Request body:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5..."
}
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

**Also clear local storage on the frontend:**
```javascript
const handleLogout = async () => {
  const token = localStorage.getItem('access_token')

  await fetch('http://localhost:8000/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: token })
  })

  localStorage.removeItem('user')
  localStorage.removeItem('access_token')
  navigate('/login')
}
```

---

## Full Login Page Example

```jsx
// LoginPage.jsx
export default function LoginPage() {
  const handleLogin = () => {
    window.location.href = "http://localhost:8000/auth/google"
  }

  return (
    <div>
      <h1>Welcome to GroupGo</h1>
      <p>Plan group trips together</p>
      <button onClick={handleLogin}>
        Sign in with Google
      </button>
    </div>
  )
}
```

```jsx
// App.jsx routes (using react-router-dom)
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LoginPage from './LoginPage'
import AuthCallback from './AuthCallback'
import Dashboard from './Dashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}
```

---

## What to Ask the Backend Dev For

- `SUPABASE_URL` — the Supabase project URL (starts with `https://xxxx.supabase.co`)
- `SUPABASE_ANON_KEY` — the public anon key (safe to use in frontend)
- Production API base URL when deployed

---

## Summary

| What | How |
|---|---|
| Login button | Redirect to `GET /auth/google` |
| After Google redirects back | Read session via Supabase JS, call `POST /auth/verify` |
| Store user | `localStorage` or React context/state |
| Logout | Call `POST /auth/logout`, clear localStorage |
| Callback route | Must exist at `/auth/callback` in your React router |
