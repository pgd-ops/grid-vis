import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import ProjectsPage from './pages/ProjectsPage';
import EditorPage from './pages/EditorPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ProjectsPage />} />
        <Route path="/editor/:id" element={<EditorPage />} />
      </Routes>
    </HashRouter>
  );
}
