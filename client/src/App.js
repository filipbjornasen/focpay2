import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dricko from "./Dricko";
import Receipt from "./Receipt";
import Admin from "./Admin";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/dricko" element={<Dricko />} />
        <Route path="/receipt" element={<Receipt />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/" element={<Navigate to="/dricko" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
