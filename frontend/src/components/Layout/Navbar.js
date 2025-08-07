import React, { useState, useEffect } from 'react';
import { Navbar as BootstrapNavbar, Nav, Container, NavDropdown, Badge, Button } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { messagesAPI } from '../../services/api';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    try {
      const response = await messagesAPI.getUnreadCount();
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: 'danger',
      doctor: 'primary',
      nurse: 'success',
      patient: 'info'
    };
    return colors[role] || 'secondary';
  };

  return (
    <BootstrapNavbar bg="dark" variant="dark" expand="lg" sticky="top">
      <Container>
        <LinkContainer to="/">
          <BootstrapNavbar.Brand>
            <strong>Healem</strong>
          </BootstrapNavbar.Brand>
        </LinkContainer>

        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BootstrapNavbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {user && (
              <>
                <LinkContainer to="/dashboard">
                  <Nav.Link>Dashboard</Nav.Link>
                </LinkContainer>
                
                <LinkContainer to="/appointments">
                  <Nav.Link>Appointments</Nav.Link>
                </LinkContainer>
                
                {user.role === 'patient' && (
                  <LinkContainer to="/appointments/book">
                    <Nav.Link>Book Appointment</Nav.Link>
                  </LinkContainer>
                )}
                
                <LinkContainer to="/messages">
                  <Nav.Link>
                    Messages
                    {unreadCount > 0 && (
                      <Badge bg="danger" className="ms-1">
                        {unreadCount}
                      </Badge>
                    )}
                  </Nav.Link>
                </LinkContainer>

                <LinkContainer to="/health-records">
                  <Nav.Link>Health Records</Nav.Link>
                </LinkContainer>
                
                {['admin', 'nurse'].includes(user.role) && (
                  <NavDropdown title="Admin" id="admin-dropdown">
                    <LinkContainer to="/admin/users">
                      <NavDropdown.Item>Manage Users</NavDropdown.Item>
                    </LinkContainer>
                    <LinkContainer to="/admin/analytics">
                      <NavDropdown.Item>Analytics</NavDropdown.Item>
                    </LinkContainer>
                  </NavDropdown>
                )}
              </>
            )}
          </Nav>

          <Nav>
            <Button
              variant="outline-light"
              size="sm"
              onClick={toggleTheme}
              className="me-2"
              title={`Switch to ${isDarkMode ? 'light' : 'dark'} theme`}
            >
              {isDarkMode ? 'Light' : 'Dark'}
            </Button>
            
            {user ? (
              <NavDropdown 
                title={
                  <span>
                    {user.profile?.firstName} {user.profile?.lastName}
                    <Badge bg={getRoleColor(user.role)} className="ms-2">
                      {user.role}
                    </Badge>
                  </span>
                } 
                id="user-dropdown"
                align="end"
              >
                <LinkContainer to="/profile">
                  <NavDropdown.Item>Profile</NavDropdown.Item>
                </LinkContainer>
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={handleLogout}>
                  Logout
                </NavDropdown.Item>
              </NavDropdown>
            ) : (
              <>
                <LinkContainer to="/login">
                  <Nav.Link>Login</Nav.Link>
                </LinkContainer>
                <LinkContainer to="/register">
                  <Nav.Link>Register</Nav.Link>
                </LinkContainer>
              </>
            )}
          </Nav>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
};
export default Navbar;