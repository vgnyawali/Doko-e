import AdminDashboard from '@/admin/AdminDashboard';
import BrandLogo from '@/components/BrandLogo';
import { getChatGPTUser, chatGPTSignInPath } from '@/app/chatgpt-auth';
import { isAdmin } from '@/services/adminAuth';
import AdminLogin from '@/admin/AdminLogin';
export const dynamic = 'force-dynamic';
export default async function AdminPage() {
  const user = await getChatGPTUser();
  if (!(await isAdmin()))
    return (
      <main className="admin-gate">
        <BrandLogo />
        <h1>Store administration</h1>
        {user ? (
          <>
            <p>
              Your account needs admin access. Add your Site user ID to the
              ADMIN_USER_IDS server setting.
            </p>
            <code>{user.userId}</code>
            <p>
              This protects products and settings from unauthorized changes.
            </p>
          </>
        ) : (
          <>
            <p>Sign in to manage the Doko store.</p>
            <a
              className="primary-button"
              href={chatGPTSignInPath('/admin')}
              target="_top"
            >
              Sign in with ChatGPT
            </a>
            <AdminLogin />
          </>
        )}
        <a href="/">← Back to the store</a>
      </main>
    );
  return <AdminDashboard />;
}
