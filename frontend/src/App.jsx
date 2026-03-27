import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Navbar from "./components/Navbar";
import Explore from "./pages/Explore";
import Feed from "./pages/Feed";
import Create from "./pages/Create";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import Login from "./pages/Login";
import ProjectDetail from "./pages/ProjectDetail";
import ActivityFeed from "./pages/ActivityFeed";
import EditProject from "./pages/EditProject";
import SyncRequests from "./pages/SyncRequests";
import Search from "./pages/Search";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<Explore />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/activity" element={<ActivityFeed />} />
            <Route path="/create" element={<Create />} />
            <Route path="/profile/:id" element={<Profile />} />
            <Route path="/profile/:id/edit" element={<EditProfile />} />
            <Route path="/login" element={<Login />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/projects/:id/edit" element={<EditProject />} />
            <Route path="/projects/:id/sync-requests" element={<SyncRequests />} />
            <Route path="/search" element={<Search />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
