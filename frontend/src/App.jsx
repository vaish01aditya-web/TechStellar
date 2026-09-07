import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Inspections from './pages/Inspections';
import NewInspection from './pages/NewInspection';
import InspectionDetail from './pages/InspectionDetail';
import RuleManagement from './pages/RuleManagement';
import UserManagement from './pages/UserManagement';
import NotFound from './pages/NotFound';

function Protected({ children, roles }) {
  return (
    <ProtectedRoute roles={roles}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/inspections" element={<Protected><Inspections /></Protected>} />
      <Route
        path="/inspections/new"
        element={<Protected roles={['OFFICER', 'ADMIN']}><NewInspection /></Protected>}
      />
      <Route path="/inspections/:id" element={<Protected><InspectionDetail /></Protected>} />
      <Route path="/rules" element={<Protected roles={['ADMIN']}><RuleManagement /></Protected>} />
      <Route path="/users" element={<Protected roles={['ADMIN']}><UserManagement /></Protected>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
