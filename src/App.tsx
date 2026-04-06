/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  HashRouter as Router, 
  Routes, 
  Route, 
  Navigate
} from 'react-router-dom';
import { Toaster } from 'sonner';

import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BackButtonHandler } from './components/BackButtonHandler';
import Layout from './components/Layout';

import { Home } from './pages/Home';
import { ServiceList } from './pages/ServiceList';
import { ServiceDetail } from './pages/ServiceDetail';
import { Profile } from './pages/Profile';
import { CommunityList } from './components/CommunityList';
import { CommunityChat } from './pages/CommunityChat';
import { Jobs } from './pages/Jobs';
import { JobDetails } from './pages/JobDetails';
import { Notifications } from './pages/Notifications';
import { ChatList } from './pages/ChatList';
import { ChatWindow } from './pages/ChatWindow';
import { Orders } from './pages/Orders';
import { CreateService } from './pages/CreateService';
import { Settings } from './pages/Settings';
import { EducationList } from './pages/EducationList';
import { AdminDashboard } from './pages/AdminDashboard';
import { LoginPage } from './pages/LoginPage';
import { Terms, Privacy, Contact } from './pages/Legal';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <Toaster position="top-center" richColors />
          <Router>
            <BackButtonHandler />
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/services" element={<ServiceList />} />
                <Route path="/service/:id" element={<ServiceDetail />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/:id" element={<Profile />} />
                <Route path="/communities" element={<CommunityList />} />
                <Route path="/communities/:communityId" element={<CommunityChat />} />
                <Route path="/jobs" element={<Jobs />} />
                <Route path="/jobs/:id" element={<JobDetails />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/chats" element={<ChatList />} />
                <Route path="/chats/:chatId" element={<ChatWindow />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/create" element={<CreateService />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/education" element={<EducationList />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Layout>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
