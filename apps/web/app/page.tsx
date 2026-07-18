import { redirect } from "next/navigation";

/** Client UI hidden — demo focuses on admin monitor. */
export default function Home() {
  redirect("/admin");
}
