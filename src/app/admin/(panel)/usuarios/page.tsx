import { UsersStudio } from "@/components/admin/usuarios-form";
import { requirePermission } from "@/lib/auth";
import { isRole } from "@/lib/permissions";
import { listAdminUsers } from "@/lib/store";
import type { UserCard } from "@/lib/users";

export default async function UsersPage() {
  const actor = await requirePermission("users", "manage");
  const rows = await listAdminUsers();
  if (!rows) return <p>No hay base de datos.</p>;
  const users: UserCard[] = rows.flatMap((user) => {
    if (!isRole(user.role)) return [];
    return [{
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      mine: user.id === actor.id,
    }];
  });
  return <UsersStudio users={users} currentUserId={actor.id} />;
}
