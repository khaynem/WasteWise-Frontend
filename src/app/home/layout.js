import "./landing.module.css";
import ToastProvider from "../components/ToastProvider";

export const metadata = {
  title: "WasteWise - Smart Waste Management",
  description: "Optimize waste collection, report violations, and locate recycling centers."
};

export const dynamic = "force-static";

export default function LandingLayout({ children }) {
  return (
    <>
      {children}
    </>
  );
}