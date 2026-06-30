import LoginForm from '../features/auth/components/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#161C2D_0%,_transparent_50%)] opacity-50"></div>
      <LoginForm />
    </div>
  );
}
