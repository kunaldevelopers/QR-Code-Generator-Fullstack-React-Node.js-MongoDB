import React from 'react';
import { HiHome, HiCode, HiClock, HiChartBar, HiDocument, HiX } from 'react-icons/hi';
import { useLocation, useNavigate } from 'react-router-dom';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const menuItems = [
    { icon: HiHome, label: 'Dashboard', path: '/dashboard' },
    { icon: HiCode, label: 'Generate QR', path: '/generate' },
    { icon: HiClock, label: 'History', path: '/history' },
    { icon: HiChartBar, label: 'Analytics', path: '/analytics' },
    { icon: HiDocument, label: 'Bulk Generate', path: '/bulk' },
  ];
  
  const handleNavigation = (path) => {
    navigate(path);
    onClose?.();
  };
  
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700 md:hidden">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">Q</span>
            </div>
            <span className="ml-2 text-xl font-semibold text-gray-900 dark:text-white">
              QR Generator
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <HiX size={24} />
          </button>
        </div>
        
        <nav className="mt-8 px-4">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`sidebar-item w-full ${isActive ? 'active' : ''}`}
                >
                  <Icon size={20} className="mr-3" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
};

export default Sidebar;