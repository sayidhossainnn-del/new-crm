import "./globals.css";

export const metadata = {
  title: "Flinza Works CRM",
  description: "Prospect pipeline CRM for Flinza Works — Meta ad creative agency.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
