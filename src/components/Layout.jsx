import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/dashboard" className="nav-brand">
            SlotSwapper
          </Link>
          <div className="nav-links">
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/marketplace">Marketplace</Link>
            <Link to="/requests">Requests</Link>
            <div className="nav-user">
              <span>{user?.name}</span>
              <button onClick={handleLogout} className="logout-button">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;

