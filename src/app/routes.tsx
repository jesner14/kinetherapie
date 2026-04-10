import { createBrowserRouter } from "react-router";
import { ClientLayout } from "./components/layouts/ClientLayout";
import { AdminLayout } from "./components/layouts/AdminLayout";
import { PatientLayout } from "./components/layouts/PatientLayout";
import { HomePage } from "./components/client/HomePage";
import { AboutPage } from "./components/client/AboutPage";
import { TeamPage } from "./components/client/TeamPage";
import { ContactPage } from "./components/client/ContactPage";
import { GalleryPage } from "./components/client/GalleryPage";
import { NotFoundPage } from "./components/common/NotFoundPage";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { AdminContent } from "./components/admin/AdminContent";
import { AdminGallery } from "./components/admin/AdminGallery";
import { AdminPatients } from "./components/admin/AdminPatients";
import { AdminCalendar } from "./components/admin/AdminCalendar";
import { AdminMessages } from "./components/admin/AdminMessages";
import { AdminReviews } from "./components/admin/AdminReviews";
import { AdminAppointments } from "./components/admin/AdminAppointments";
import { PatientDashboard } from "./components/patient/PatientDashboard";
import { PatientBooking } from "./components/patient/PatientBooking";
import { PatientMessages } from "./components/patient/PatientMessages";
import { LoginPage } from "./components/auth/LoginPage";
import { RegisterPage } from "./components/auth/RegisterPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: ClientLayout,
    children: [
      { index: true, Component: HomePage },
      { path: "about", Component: AboutPage },
      { path: "gallery", Component: GalleryPage },
      { path: "galerie", Component: GalleryPage },
      { path: "team", Component: TeamPage },
      { path: "contact", Component: ContactPage },
      { path: "*", Component: NotFoundPage },
    ],
  },
  {
    path: "/admin",
    Component: AdminLayout,
    children: [
      { index: true, Component: AdminDashboard },
      { path: "content", Component: AdminContent },
      { path: "gallery", Component: AdminGallery },
      { path: "galerie", Component: AdminGallery },
      { path: "patients", Component: AdminPatients },
      { path: "appointments", Component: AdminAppointments },
      { path: "calendar", Component: AdminCalendar },
      { path: "messages", Component: AdminMessages },
      { path: "reviews", Component: AdminReviews },
      { path: "*", Component: NotFoundPage },
    ],
  },
  {
    path: "/patient",
    Component: PatientLayout,
    children: [
      { index: true, Component: PatientDashboard },
      { path: "booking", Component: PatientBooking },
      { path: "messages", Component: PatientMessages },
      { path: "*", Component: NotFoundPage },
    ],
  },
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/register",
    Component: RegisterPage,
  },
]);
