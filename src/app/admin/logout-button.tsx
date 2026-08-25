"use client";

export default function LogoutButton() {
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };
  return (
    <button onClick={logout} className="chip px-3 py-1.5 text-sm">
      Log out
    </button>
  );
}
