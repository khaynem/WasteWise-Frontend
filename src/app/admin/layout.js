// Admin layout - works within the root layout but without navbar/footer/chatbot
export default function AdminLayout({ children }) {
  return (
    <div style={{ minHeight: '100vh' }}>
      {children}
    </div>
  );
}