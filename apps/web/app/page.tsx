import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function Home() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
