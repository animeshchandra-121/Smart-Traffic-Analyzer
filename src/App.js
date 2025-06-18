
import React, { useState } from 'react';
import HomePage from './components/HomePage';
import LoginPage from './components/LoginPage';
import SignUpPage from './components/SignUpPage';
import SelectJunctionPage from './components/SelectJunctionPage';
import DashboardPage from './components/DashboardPage';
import './styles/App.css';

const App = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedJunction, setSelectedJunction] = useState('');

  const navigate = (page, junction = '') => {
    setCurrentPage(page);
    if (junction) setSelectedJunction(junction);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage navigate={navigate} />;
      case 'login':
        return <LoginPage navigate={navigate} />;
      case 'signup':
        return <SignUpPage navigate={navigate} />;
      case 'select-junction':
        return <SelectJunctionPage navigate={navigate} />;
      case 'dashboard':
        return <DashboardPage navigate={navigate} junction={selectedJunction} />;
      default:
        return <HomePage navigate={navigate} />;
    }
  };

  return (
    <div className="app">
      {renderPage()}
    </div>
  );
};

export default App; 
