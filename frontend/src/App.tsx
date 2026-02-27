import { BrowserRouter, Routes, Route } from 'react-router-dom';
import JobListPage from './pages/JobListPage';
import JobDetailsPage from './pages/JobDetailsPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<JobListPage />} />
        <Route path="/job/:id" element={<JobDetailsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
