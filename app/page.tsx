import { redirect } from "next/navigation";
import PlatformApp, { type Viewer } from "@/app/_components/platform-app";
import { demoProject, type StudentProject } from "@/lib/projects";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const demoViewer: Viewer = {
  name: "Alex Lee",
  email: "alex@example.com",
  role: "student",
};

export default async function Home() {
  if (!isSupabaseConfigured()) {
    return <PlatformApp viewer={demoViewer} initialProjects={[demoProject]} />;
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
    id: claims.sub,
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

  const { data: projectRows } = await supabase
    .from("projects")
    .select(
      "id, owner_id, name, description, template, status, progress, created_at, updated_at",
    )
    .order("updated_at", { ascending: false });

  return (
    <PlatformApp
      viewer={viewer}
      initialProjects={(projectRows ?? []) as StudentProject[]}
    />
  );
}
