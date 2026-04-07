import { CredentialsLoginForm } from "@/components/auth/credentials-login-form";
import { isSignupAvailable } from "@/lib/signup-gate";

export default function AdminLoginPage() {
  const signupEnabled = isSignupAvailable();
  return (
    <CredentialsLoginForm
      variant="admin"
      signupEnabled={signupEnabled}
      defaultCallbackUrl="/admin/dashboard"
      showDiagnose
    />
  );
}
