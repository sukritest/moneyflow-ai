"use client";

import * as React from "react";
import { Users, UserPlus, Crown, Trash2, Wallet as WalletIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateGroupForm, InviteMemberForm } from "@/components/family/family-forms";
import { useLocale } from "@/lib/i18n/locale-provider";
import { formatCurrency, getInitials } from "@/lib/utils";
import type { FamilyGroup, FamilyMember, Wallet, User } from "@prisma/client";

type MemberWithUser = FamilyMember & {
  user: Pick<User, "id" | "name" | "email" | "avatarUrl">;
};
type GroupWithRelations = FamilyGroup & {
  members: MemberWithUser[];
  wallets: Wallet[];
};

type FamilyViewProps = {
  initialGroup: GroupWithRelations | null;
  currentUserId: string;
  myWallets: Wallet[];
  currency: string;
};

const ROLE_STYLES: Record<string, string> = {
  owner: "bg-primary/15 text-primary",
  partner: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  member: "bg-muted text-muted-foreground",
  child: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

export function FamilyView({ initialGroup, currentUserId, myWallets, currency }: FamilyViewProps) {
  const { t } = useLocale();
  const [group, setGroup] = React.useState(initialGroup);
  const [wallets, setWallets] = React.useState(myWallets);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [inviteOpen, setInviteOpen] = React.useState(false);

  const isOwner = group?.ownerId === currentUserId;

  async function refresh() {
    const res = await fetch("/api/family");
    if (res.ok) {
      const data = await res.json();
      setGroup(data.group);
    }
  }

  async function handleRoleChange(memberId: string, role: string) {
    const res = await fetch(`/api/family/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) refresh();
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm(t("family.removeConfirm"))) return;
    await fetch(`/api/family/members/${memberId}`, { method: "DELETE" });
    refresh();
  }

  async function handleDeleteGroup() {
    if (!confirm(t("family.deleteGroupConfirm"))) return;
    await fetch("/api/family", { method: "DELETE" });
    setGroup(null);
  }

  async function toggleWalletShare(walletId: string, shared: boolean) {
    const res = await fetch(`/api/family/wallets/${walletId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shared }),
    });
    if (res.ok) {
      const data = await res.json();
      setWallets((prev) => prev.map((w) => (w.id === walletId ? data.wallet : w)));
      refresh();
    }
  }

  if (!group) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("family.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("family.subtitle")}</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">{t("family.empty")}</p>
              <p className="text-sm text-muted-foreground">{t("family.emptyHint")}</p>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Users className="mr-2 h-4 w-4" />
              {t("family.createGroup")}
            </Button>
          </CardContent>
        </Card>
        <CreateGroupForm open={createOpen} onOpenChange={setCreateOpen} onSaved={refresh} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{group.name}</h1>
          <p className="text-sm text-muted-foreground">{t("family.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              {t("family.inviteMember")}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("family.members")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {group.members.map((member) => (
            <div key={member.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={member.user.avatarUrl ?? undefined} alt={member.user.name ?? member.user.email} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {getInitials(member.user.name ?? member.user.email)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {member.user.name ?? member.user.email}
                    {member.userId === currentUserId && (
                      <span className="ml-1 text-xs text-muted-foreground">({t("family.you")})</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{member.user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {member.role === "owner" ? (
                  <Badge className={ROLE_STYLES.owner}>
                    <Crown className="mr-1 h-3 w-3" />
                    {t("family.roles.owner")}
                  </Badge>
                ) : isOwner ? (
                  <Select value={member.role} onValueChange={(value) => handleRoleChange(member.id, value)}>
                    <SelectTrigger className="h-8 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="partner">{t("family.roles.partner")}</SelectItem>
                      <SelectItem value="member">{t("family.roles.member")}</SelectItem>
                      <SelectItem value="child">{t("family.roles.child")}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={ROLE_STYLES[member.role] ?? ROLE_STYLES.member}>
                    {t(`family.roles.${member.role}`)}
                  </Badge>
                )}
                {member.role !== "owner" && (isOwner || member.userId === currentUserId) && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveMember(member.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("family.sharedWallets")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("family.sharedWalletsHint")}</p>
          {wallets.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("family.noWallets")}</p>
          ) : (
            wallets.map((wallet) => (
              <div key={wallet.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                    <WalletIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{wallet.name}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(wallet.balance, currency)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{t("family.shareWithFamily")}</span>
                  <Switch
                    checked={wallet.familyGroupId === group.id}
                    onCheckedChange={(checked) => toggleWalletShare(wallet.id, checked)}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {isOwner && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base text-destructive">{t("family.dangerZone")}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{t("family.deleteGroupHint")}</p>
            <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10" onClick={handleDeleteGroup}>
              <Trash2 className="mr-2 h-4 w-4" />
              {t("family.deleteGroup")}
            </Button>
          </CardContent>
        </Card>
      )}

      <InviteMemberForm open={inviteOpen} onOpenChange={setInviteOpen} onSaved={refresh} />
    </div>
  );
}
