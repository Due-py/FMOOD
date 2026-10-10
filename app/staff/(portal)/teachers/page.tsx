import { redirect } from "next/navigation";

// Trang cũ, đã gộp vào Thành viên
export default function TeachersRedirect() {
  redirect("/staff/members");
}
