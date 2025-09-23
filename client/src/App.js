import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dricko from "./Dricko";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/dricko" element={<Dricko />} />
        <Route path="/" element={<Navigate to="/dricko" replace />} />
        <Route path="*" element={<Navigate to="/dricko" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
