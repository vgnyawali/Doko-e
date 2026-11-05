import AdminDashboard from '@/admin/AdminDashboard';
import BrandLogo from '@/components/BrandLogo';
import { isAdmin } from '@/services/adminAuth';
import AdminLogin from '@/admin/AdminLogin';
export const dynamic = 'force-dynamic';
export default async function AdminPage() {
  if (!(await isAdmin()))
    return (
      <main className="admin-gate">
        <BrandLogo />
        <h1>Store administration</h1>
        <p>Sign in to manage the Doko store.</p>
        <AdminLogin />
        <a href="/">← Back to the store</a>
      </main>
    );
  return <AdminDashboard />;
}
