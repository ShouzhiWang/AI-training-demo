import { redirect } from "next/navigation";
import PlatformApp, { type Viewer } from "@/app/_components/platform-app";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const demoViewer: Viewer = {
  name: "Alex Lee",
  email: "alex@example.com",
  role: "student",
};

export default async function Home() {
  if (!isSupabaseConfigured()) {
    return <PlatformApp viewer={demoViewer} />;
  }

  const supabase = await createClient();
  const { data: verifiedToken } = await supabase.auth.getClaims();
  const claims = verifiedToken?.claims;

  if (!claims?.sub) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("email, name, role")
    .eq("id", claims.sub)
    .maybeSingle();

  const metadata = claims.user_metadata as
    | { full_name?: string; name?: string }
    | undefined;
  const viewer: Viewer = {
    name:
      profile?.name ??
      metadata?.full_name ??
      metadata?.name ??
      (typeof claims.email === "string" ? claims.email.split("@")[0] : "Student"),
    email:
      profile?.email ??
      (typeof claims.email === "string" ? claims.email : ""),
    role:
      profile?.role === "teacher" || profile?.role === "admin"
        ? profile.role
        : "student",
  };

  return <PlatformApp viewer={viewer} />;
}
