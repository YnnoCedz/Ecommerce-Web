import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import { ToastProvider } from './components/ToastProvider'
import { WishlistProvider } from './wishlist/WishlistContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <WishlistProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </WishlistProvider>
    </AuthProvider>
  </React.StrictMode>,
)
