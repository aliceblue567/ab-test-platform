import { CredentialsLoginForm } from "@/components/auth/credentials-login-form";
import { isSignupAvailable } from "@/lib/signup-gate";

export default function WorkspaceLoginPage() {
  const signupEnabled = isSignupAvailable();
  return (
    <CredentialsLoginForm
      variant="workspace"
      signupEnabled={signupEnabled}
      defaultCallbackUrl="/workspace/dashboard"
      showDiagnose={false}
    />
  );
}
