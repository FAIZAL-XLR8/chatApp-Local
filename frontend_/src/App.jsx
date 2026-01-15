import React from 'react'
import {BrowserRouter as Router,Routes, Route} from 'react-router-dom'
import Login from "./pages/user-login/login"
const App = () => {
  return (
  <Router>
  <Routes>
        <Route path="/user-login" element={<Login />} />
    {/* <Route path="register" element={<Register />} /> */}
    </Routes>
  </Router>
  )
}

export default App
