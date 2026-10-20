import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, ToastProvider, useAuth } from './hooks';
import { Shell, Workspace, Loading, Empty, ErrorState } from './components';
import { Home, Browse } from './pages/Discovery';
import { AuthPage } from './pages/Auth';
import { Report, ItemDetails } from './pages/Items';
import { Dashboard, MyItems, Claims, Notifications } from './pages/Workspace';
import { Admin } from './pages/Admin';
import './styles.css';
import { MotionConfig } from 'framer-motion';
import './creative/creative.css';
function Protected({ admin = false }: { admin?: boolean }) {
  const { user, loading, authError, retry } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (authError) return <ErrorState message={authError} retry={retry} />;
  if (!user)
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (admin && user.role !== 'ADMIN')
    return (
      <Empty
        title="This space is for administrators"
        text="Your student dashboard is available from the navigation."
      />
    );
  return <Outlet />;
}
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <ErrorState
        message="An unexpected display error occurred. Refresh the page to continue."
        retry={() => window.location.reload()}
      />
    ) : (
      this.props.children
    );
  }
}
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  React.useEffect(() => {
    if (hash)
      requestAnimationFrame(() =>
        document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'instant'
            : 'smooth',
        }),
      );
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <ErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <ToastProvider>
              <ScrollToTop />
              <Routes>
                <Route element={<Shell />}>
                  <Route index element={<Home />} />
                  <Route path="browse" element={<Browse />} />
                  <Route path="login" element={<AuthPage />} />
                  <Route path="register" element={<AuthPage registerMode />} />
                  <Route path="items/:id" element={<ItemDetails />} />
                  <Route element={<Protected />}>
                    <Route path="report/:type" element={<Report />} />
                    <Route path="items/:id/edit" element={<Report />} />
                    <Route element={<Workspace />}>
                      <Route path="dashboard" element={<Dashboard />} />
                      <Route path="my-items" element={<MyItems />} />
                      <Route path="claims" element={<Claims />} />
                      <Route path="notifications" element={<Notifications />} />
                      <Route element={<Protected admin />}>
                        <Route path="admin" element={<Admin />} />
                      </Route>
                    </Route>
                  </Route>
                  <Route
                    path="*"
                    element={
                      <Empty
                        title="Looks like this page got lost"
                        text="Head back to the homepage to find your way."
                        action={
                          <a className="button primary" href="/">
                            Go home
                          </a>
                        }
                      />
                    }
                  />
                </Route>
              </Routes>
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </MotionConfig>
  </React.StrictMode>,
);
