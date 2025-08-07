import axios from 'axios';
import { toast } from 'react-toastify';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshResponse = await api.post('/auth/refresh-token');
        const newToken = refreshResponse.data.token;
        localStorage.setItem('token', newToken);
        
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  verifyToken: () => api.post('/auth/verify-token'),
  refreshToken: () => api.post('/auth/refresh-token'),
  getProfile: () => api.get('/auth/me'),
};

export const usersAPI = {
  getAllUsers: (params) => api.get('/users', { params }),
  getDoctors: (params) => api.get('/users/doctors', { params }),
  getUser: (id) => api.get(`/users/${id}`),
  updateProfile: (id, profileData) => api.put(`/users/${id}/profile`, profileData),
  updateUserStatus: (id, status) => api.patch(`/users/${id}/status`, status),
  deleteUser: (id) => api.delete(`/users/${id}`),
};

export const appointmentsAPI = {
  createAppointment: (appointmentData) => api.post('/appointments', appointmentData),
  getAppointments: (params) => api.get('/appointments', { params }),
  getAppointment: (id) => api.get(`/appointments/${id}`),
  updateAppointment: (id, appointmentData) => api.put(`/appointments/${id}`, appointmentData),
  updateAppointmentStatus: (id, statusData) => api.patch(`/appointments/${id}/status`, statusData),
  deleteAppointment: (id) => api.delete(`/appointments/${id}`),
  getDoctorAvailability: (doctorId, date) => 
    api.get(`/appointments/doctor/${doctorId}/availability`, { params: { date } }),
};

export const messagesAPI = {
  sendMessage: (messageData) => api.post('/messages', messageData),
  getInbox: (params) => api.get('/messages/inbox', { params }),
  getSentMessages: (params) => api.get('/messages/sent', { params }),
  getConversation: (userId, params) => api.get(`/messages/conversation/${userId}`, { params }),
  getMessage: (id) => api.get(`/messages/${id}`),
  updateMessageStatus: (id, status) => api.patch(`/messages/${id}/status`, status),
  deleteMessage: (id) => api.delete(`/messages/${id}`),
  getUnreadCount: () => api.get('/messages/stats/unread-count'),
};

export const healthRecordsAPI = {
  getPatientRecords: (patientId, params) => api.get(`/health-records/patient/${patientId}`, { params }),
  getMyRecords: (params) => api.get('/health-records/my-records', { params }),
  getAllRecords: (params) => api.get('/health-records', { params }),
  getRecord: (recordId) => api.get(`/health-records/${recordId}`),
  createRecord: (recordData) => api.post('/health-records', recordData),
  updateRecord: (recordId, recordData) => api.put(`/health-records/${recordId}`, recordData),
  deleteRecord: (recordId) => api.delete(`/health-records/${recordId}`)
};

export const notificationsAPI = {
  getMyNotifications: (params) => api.get('/notifications/my-notifications', { params }),
  getAllNotifications: (params) => api.get('/notifications', { params }),
  sendNotification: (notificationData) => api.post('/notifications', notificationData),
  retryNotification: (notificationId) => api.post(`/notifications/${notificationId}/retry`)
};

export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getAppointmentAnalytics: (period) => api.get('/analytics/appointments', { params: { period } }),
  getUserAnalytics: (period) => api.get('/analytics/users', { params: { period } }),
  getHealthRecordAnalytics: (period) => api.get('/analytics/health-records', { params: { period } }),
  getSystemAnalytics: (period) => api.get('/analytics/system', { params: { period } })
};

export default api;