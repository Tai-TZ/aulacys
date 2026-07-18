import type { Metadata } from "next";
import { AdminLoginPage } from "@/components/admin/admin-login-page";

export const metadata: Metadata = {
  title: "Đăng nhập Admin · Aulacys",
  description: "Cổng đăng nhập console thẩm định Digital Expert Admin.",
};

export default function AdminLoginRoute() {
  return <AdminLoginPage />;
}
