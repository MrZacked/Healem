import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Table, Button, Form, 
  InputGroup, Badge, Modal, Spinner, Alert 
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usersAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

const Users = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [filters, setFilters] = useState({
    role: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  });
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalAction, setModalAction] = useState('');

  useEffect(() => {
    if (!user || !['admin', 'nurse'].includes(user.role)) {
      navigate('/dashboard');
      toast.error('Access denied. Admin privileges required.');
      return;
    }
    fetchUsers();
  }, [user, navigate, filters, pagination.current]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.current,
        limit: 15,
        ...filters
      };
      
      const response = await usersAPI.getAllUsers(params);
      setUsers(response.data.users);
      setPagination(response.data.pagination);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch users';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const clearFilters = () => {
    setFilters({ role: '', search: '' });
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleStatusUpdate = async (userId, isActive) => {
    try {
      setActionLoading(true);
      await usersAPI.updateUserStatus(userId, { isActive });
      toast.success(`User ${isActive ? 'activated' : 'deactivated'} successfully`);
      fetchUsers();
      setShowModal(false);
      setSelectedUser(null);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update user status';
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      setActionLoading(true);
      await usersAPI.deleteUser(userId);
      toast.success('User deleted successfully');
      fetchUsers();
      setShowModal(false);
      setSelectedUser(null);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete user';
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const openModal = (user, action) => {
    setSelectedUser(user);
    setModalAction(action);
    setShowModal(true);
  };

  const getRoleBadgeVariant = (role) => {
    const variants = {
      admin: 'danger',
      doctor: 'primary',
      nurse: 'success',
      patient: 'info'
    };
    return variants[role] || 'secondary';
  };

  const getStatusBadgeVariant = (isActive) => {
    return isActive ? 'success' : 'secondary';
  };

  if (!user || !['admin', 'nurse'].includes(user.role)) {
    return (
      <Container className="py-4">
        <Alert variant="danger">
          Access denied. Administrator privileges required.
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>User Management</h2>
          <p className="text-muted">
            Manage system users, roles, and account status
          </p>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col lg={8}>
          <Card>
            <Card.Body>
              <Row>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Filter by Role</Form.Label>
                    <Form.Select
                      name="role"
                      value={filters.role}
                      onChange={handleFilterChange}
                    >
                      <option value="">All Roles</option>
                      <option value="patient">Patients</option>
                      <option value="doctor">Doctors</option>
                      <option value="nurse">Nurses</option>
                      <option value="admin">Administrators</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Search Users</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type="text"
                        name="search"
                        value={filters.search}
                        onChange={handleFilterChange}
                        placeholder="Search by name, username, or email..."
                      />
                      <Button variant="outline-secondary" onClick={clearFilters}>
                        Clear
                      </Button>
                    </InputGroup>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
          <Card>
            <Card.Body>
              <h6>System Stats</h6>
              <div className="text-muted small">
                Total Users: {pagination.total}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card>
        <Card.Body>
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
              <div className="mt-2">Loading users...</div>
            </div>
          ) : users.length === 0 ? (
            <Alert variant="info" className="text-center">
              <h5>No users found</h5>
              <p>No users match your current search criteria.</p>
            </Alert>
          ) : (
            <>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Contact</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((userItem) => (
                    <tr key={userItem._id}>
                      <td>
                        <div>
                          <strong>
                            {userItem.profile?.firstName} {userItem.profile?.lastName}
                          </strong>
                        </div>
                        <div className="text-muted small">
                          @{userItem.username}
                        </div>
                      </td>
                      <td>
                        <div>{userItem.email}</div>
                        {userItem.profile?.phone && (
                          <div className="text-muted small">
                            {userItem.profile.phone}
                          </div>
                        )}
                      </td>
                      <td>
                        <Badge bg={getRoleBadgeVariant(userItem.role)}>
                          {userItem.role.charAt(0).toUpperCase() + userItem.role.slice(1)}
                        </Badge>
                        {userItem.role === 'doctor' && userItem.profile?.specialization && (
                          <div className="text-muted small mt-1">
                            {userItem.profile.specialization}
                          </div>
                        )}
                      </td>
                      <td>
                        <Badge bg={getStatusBadgeVariant(userItem.isActive)}>
                          {userItem.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td>
                        <div className="text-muted small">
                          {format(new Date(userItem.createdAt), 'MMM dd, yyyy')}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          {user.role === 'admin' && userItem._id !== user._id && (
                            <>
                              <Button
                                variant={userItem.isActive ? "outline-warning" : "outline-success"}
                                size="sm"
                                onClick={() => openModal(userItem, userItem.isActive ? 'deactivate' : 'activate')}
                                disabled={actionLoading}
                              >
                                {userItem.isActive ? 'Deactivate' : 'Activate'}
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => openModal(userItem, 'delete')}
                                disabled={actionLoading}
                              >
                                Delete
                              </Button>
                            </>
                          )}
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => navigate(`/profile/${userItem._id}`)}
                          >
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              {pagination.pages > 1 && (
                <div className="d-flex justify-content-center mt-3">
                  <div className="d-flex align-items-center">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      disabled={pagination.current === 1}
                      onClick={() => setPagination(prev => ({ 
                        ...prev, 
                        current: prev.current - 1 
                      }))}
                    >
                      Previous
                    </Button>
                    <span className="mx-3">
                      Page {pagination.current} of {pagination.pages}
                    </span>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      disabled={pagination.current === pagination.pages}
                      onClick={() => setPagination(prev => ({ 
                        ...prev, 
                        current: prev.current + 1 
                      }))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {modalAction === 'delete' ? 'Delete User' : 
             modalAction === 'activate' ? 'Activate User' : 'Deactivate User'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <>
              <p>
                Are you sure you want to {modalAction} this user?
              </p>
              <div className="bg-light p-3 rounded">
                <strong>
                  {selectedUser.profile?.firstName} {selectedUser.profile?.lastName}
                </strong><br />
                <span className="text-muted">
                  {selectedUser.email} (@{selectedUser.username})
                </span>
              </div>
              {modalAction === 'delete' && (
                <div className="mt-3">
                  <Alert variant="danger" className="small">
                    <strong>Warning:</strong> This action cannot be undone. 
                    All user data including appointments and messages will be permanently deleted.
                  </Alert>
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowModal(false)}
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button 
            variant={modalAction === 'delete' ? 'danger' : 'primary'}
            onClick={() => {
              if (modalAction === 'delete') {
                handleDeleteUser(selectedUser._id);
              } else {
                handleStatusUpdate(selectedUser._id, modalAction === 'activate');
              }
            }}
            disabled={actionLoading}
          >
            {actionLoading ? <Spinner animation="border" size="sm" /> : 
             modalAction === 'delete' ? 'Delete User' :
             modalAction === 'activate' ? 'Activate User' : 'Deactivate User'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Users;