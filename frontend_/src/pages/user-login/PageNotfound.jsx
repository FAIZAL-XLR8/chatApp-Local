// pages/PageNotFound.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const PageNotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="text-center bg-white rounded-2xl shadow-xl p-8 md:p-12 max-w-lg w-full">
        {/* Animated/Illustration */}
        <div className="mb-6">
          <div className="inline-block text-8xl animate-bounce">😕</div>
        </div>
        
        <h1 className="text-5xl font-bold text-gray-800 mb-3">Oops!</h1>
        <h2 className="text-2xl font-semibold text-gray-600 mb-4">404 - Page Not Found</h2>
        
        <p className="text-gray-500 mb-8">
          It seems you've ventured into uncharted territory. The page you're looking for might have been moved, deleted, or never existed.
        </p>
        
        <div className="space-y-4">
          <Link 
            to="/user-login" 
            className="block w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg shadow-md hover:from-blue-600 hover:to-blue-700 transition-all transform hover:-translate-y-0.5"
          >
            Return to Login
          </Link>
          
          <button 
            onClick={() => window.history.back()}
            className="block w-full py-3 px-6 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
          >
            Go Back
          </button>
        </div>
        
        
      </div>
    </div>
  );
};

export default PageNotFound;