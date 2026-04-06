import { redirect } from "next/navigation";
import {
  inviteCodeRequired,
  isSignupAvailable,
} from "@/lib/signup-gate";
import { SignupClient } from "./signup-client";

export default function SignupPage() {
  if (!isSignupAvailable()) {
    redirect("/admin/login");
  }

  return <SignupClient inviteRequired={inviteCodeRequired()} />;
}
