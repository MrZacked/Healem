import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Table, Badge } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { analyticsAPI } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';

const Analytics = () => {
  const { isDarkMode } = useTheme();
  const [dashboardData, setDashboardData] = useState(null);
  const [appointmentAnalytics, setAppointmentAnalytics] = useState(null);
  const [userAnalytics, setUserAnalytics] = useState(null);
  const [healthRecordAnalytics, setHealthRecordAnalytics] = useState(null);
  const [systemAnalytics, setSystemAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      const [dashboard, appointments, users, healthRecords, system] = await Promise.all([
        analyticsAPI.getDashboard(),
        analyticsAPI.getAppointmentAnalytics(selectedPeriod),
        analyticsAPI.getUserAnalytics(selectedPeriod),
        analyticsAPI.getHealthRecordAnalytics(selectedPeriod),
        analyticsAPI.getSystemAnalytics(selectedPeriod)
      ]);

      setDashboardData(dashboard.data.overview);
      setAppointmentAnalytics(appointments.data);
      setUserAnalytics(users.data);
      setHealthRecordAnalytics(healthRecords.data);
      setSystemAnalytics(system.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  const MetricCard = ({ title, value, subtitle, color = 'primary', trend }) => (
    <Card className="medical-card h-100">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h6 className="text-muted mb-2">{title}</h6>
            <h3 className={`text-${color} mb-1`}>{value}</h3>
            {subtitle && <p className="text-muted small mb-0">{subtitle}</p>}
          </div>
          {trend && (
            <div className={`text-${trend > 0 ? 'success' : trend < 0 ? 'danger' : 'muted'}`}>
              {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}%
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );

  const OverviewTab = () => (
    <Row>
      <Col lg={3} md={6} className="mb-4">
        <MetricCard
          title="Total Users"
          value={dashboardData?.users?.total || 0}
          subtitle={`${dashboardData?.users?.active || 0} active`}
          color="primary"
        />
      </Col>
      <Col lg={3} md={6} className="mb-4">
        <MetricCard
          title="Total Appointments"
          value={dashboardData?.appointments?.total || 0}
          subtitle={`${dashboardData?.appointments?.upcoming || 0} upcoming`}
          color="success"
        />
      </Col>
      <Col lg={3} md={6} className="mb-4">
        <MetricCard
          title="Health Records"
          value={dashboardData?.healthRecords?.total || 0}
          subtitle={`${dashboardData?.healthRecords?.recent || 0} this week`}
          color="info"
        />
      </Col>
      <Col lg={3} md={6} className="mb-4">
        <MetricCard
          title="Messages"
          value={dashboardData?.messages?.total || 0}
          subtitle={`${dashboardData?.messages?.unread || 0} unread`}
          color="warning"
        />
      </Col>

      <Col lg={6} className="mb-4">
        <Card className="medical-card">
          <Card.Header>
            <h5 className="mb-0">Users by Role</h5>
          </Card.Header>
          <Card.Body>
            {dashboardData?.users?.byRole && Object.entries(dashboardData.users.byRole).map(([role, count]) => (
              <div key={role} className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-capitalize">{role}s</span>
                <Badge bg="secondary">{count}</Badge>
              </div>
            ))}
          </Card.Body>
        </Card>
      </Col>

      <Col lg={6} className="mb-4">
        <Card className="medical-card">
          <Card.Header>
            <h5 className="mb-0">Appointments by Status</h5>
          </Card.Header>
          <Card.Body>
            {dashboardData?.appointments?.byStatus && Object.entries(dashboardData.appointments.byStatus).map(([status, count]) => (
              <div key={status} className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-capitalize">{status}</span>
                <Badge bg={getStatusColor(status)}>{count}</Badge>
              </div>
            ))}
          </Card.Body>
        </Card>
      </Col>

      <Col lg={6} className="mb-4">
        <Card className="medical-card">
          <Card.Header>
            <h5 className="mb-0">Health Records by Type</h5>
          </Card.Header>
          <Card.Body>
            {dashboardData?.healthRecords?.byType && Object.entries(dashboardData.healthRecords.byType).map(([type, count]) => (
              <div key={type} className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-capitalize">{type.replace('_', ' ')}</span>
                <Badge bg="info">{count}</Badge>
              </div>
            ))}
          </Card.Body>
        </Card>
      </Col>

      <Col lg={6} className="mb-4">
        <Card className="medical-card">
          <Card.Header>
            <h5 className="mb-0">System Health</h5>
          </Card.Header>
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span>Email Success Rate</span>
              <Badge bg={systemAnalytics?.systemHealth?.errorRate < 5 ? 'success' : 'warning'}>
                {(100 - (systemAnalytics?.systemHealth?.errorRate || 0)).toFixed(1)}%
              </Badge>
            </div>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span>Failed Notifications</span>
              <Badge bg="danger">{dashboardData?.notifications?.failed || 0}</Badge>
            </div>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span>Pending Notifications</span>
              <Badge bg="warning">{dashboardData?.notifications?.pending || 0}</Badge>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );

  const AppointmentsTab = () => (
    <Row>
      <Col lg={4} md={6} className="mb-4">
        <MetricCard
          title="Completion Rate"
          value={`${appointmentAnalytics?.completionRate || 0}%`}
          subtitle="Last 30 days"
          color="success"
        />
      </Col>
      <Col lg={4} md={6} className="mb-4">
        <MetricCard
          title="Total Appointments"
          value={appointmentAnalytics?.appointmentStats?.reduce((sum, stat) => sum + stat.count, 0) || 0}
          subtitle={`Last ${selectedPeriod} days`}
          color="primary"
        />
      </Col>
      <Col lg={4} md={6} className="mb-4">
        <MetricCard
          title="Popular Doctors"
          value={appointmentAnalytics?.popularDoctors?.length || 0}
          subtitle="With appointments"
          color="info"
        />
      </Col>

      <Col lg={6} className="mb-4">
        <Card className="medical-card">
          <Card.Header>
            <h5 className="mb-0">Most Popular Doctors</h5>
          </Card.Header>
          <Card.Body className="p-0">
            <Table responsive hover className="table-medical mb-0">
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Specialization</th>
                  <th>Appointments</th>
                </tr>
              </thead>
              <tbody>
                {appointmentAnalytics?.popularDoctors?.slice(0, 10).map((doctor, index) => (
                  <tr key={doctor._id}>
                    <td>{doctor.name}</td>
                    <td>{doctor.specialization || 'General'}</td>
                    <td>
                      <Badge bg="primary">{doctor.count}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      </Col>

      <Col lg={6} className="mb-4">
        <Card className="medical-card">
          <Card.Header>
            <h5 className="mb-0">Appointment Status Distribution</h5>
          </Card.Header>
          <Card.Body>
            {appointmentAnalytics?.appointmentStats?.map((stat) => (
              <div key={stat._id} className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-capitalize">{stat._id}</span>
                <Badge bg={getStatusColor(stat._id)}>{stat.count}</Badge>
              </div>
            ))}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );

  const UsersTab = () => (
    <Row>
      <Col lg={12} className="mb-4">
        <Card className="medical-card">
          <Card.Header>
            <h5 className="mb-0">User Activity by Role</h5>
          </Card.Header>
          <Card.Body className="p-0">
            <Table responsive hover className="table-medical mb-0">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Total Users</th>
                  <th>Active Users</th>
                  <th>Avg Appointments</th>
                  <th>Avg Messages</th>
                </tr>
              </thead>
              <tbody>
                {userAnalytics?.activityByRole?.map((roleData) => (
                  <tr key={roleData._id}>
                    <td className="text-capitalize">{roleData._id}</td>
                    <td>{roleData.totalUsers}</td>
                    <td>
                      <Badge bg="success">{roleData.activeUsers}</Badge>
                    </td>
                    <td>{roleData.avgAppointments?.toFixed(1) || 0}</td>
                    <td>{roleData.avgMessages?.toFixed(1) || 0}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );

  const HealthRecordsTab = () => (
    <Row>
      <Col lg={6} className="mb-4">
        <Card className="medical-card">
          <Card.Header>
            <h5 className="mb-0">Records by Type</h5>
          </Card.Header>
          <Card.Body>
            {healthRecordAnalytics?.recordsByType?.map((record) => (
              <div key={record._id} className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-capitalize">{record._id.replace('_', ' ')}</span>
                <Badge bg="info">{record.count}</Badge>
              </div>
            ))}
          </Card.Body>
        </Card>
      </Col>

      <Col lg={6} className="mb-4">
        <Card className="medical-card">
          <Card.Header>
            <h5 className="mb-0">Most Active Providers</h5>
          </Card.Header>
          <Card.Body className="p-0">
            <Table responsive hover className="table-medical mb-0">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Role</th>
                  <th>Records Created</th>
                </tr>
              </thead>
              <tbody>
                {healthRecordAnalytics?.activeProviders?.slice(0, 10).map((provider) => (
                  <tr key={provider._id}>
                    <td>{provider.name}</td>
                    <td className="text-capitalize">{provider.role}</td>
                    <td>
                      <Badge bg="primary">{provider.count}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );

  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      confirmed: 'info',
      completed: 'success',
      cancelled: 'danger',
      rescheduled: 'secondary'
    };
    return colors[status] || 'secondary';
  };

  const tabs = [
    { key: 'overview', label: 'Overview', component: OverviewTab },
    { key: 'appointments', label: 'Appointments', component: AppointmentsTab },
    { key: 'users', label: 'Users', component: UsersTab },
    { key: 'health-records', label: 'Health Records', component: HealthRecordsTab }
  ];

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <div className="spinner-medical mx-auto mb-3"></div>
          <p>Loading analytics data...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="mb-0">Analytics Dashboard</h2>
            <Form.Select 
              value={selectedPeriod} 
              onChange={(e) => setSelectedPeriod(e.target.value)}
              style={{ width: 'auto' }}
              className="form-control-medical"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </Form.Select>
          </div>

          <Card className="medical-card mb-4">
            <Card.Header className="border-bottom-0">
              <div className="d-flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <Button
                    key={tab.key}
                    variant={activeTab === tab.key ? 'primary' : 'outline-secondary'}
                    className="btn-medical"
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            </Card.Header>
            <Card.Body>
              {tabs.find(tab => tab.key === activeTab)?.component()}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Analytics;