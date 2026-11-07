 "use client";
import { AuthProvider } from "./firebase";
export default function Providers({children}:{children:React.ReactNode}) {
  return <AuthProvider>{children}</AuthProvider>;
}
