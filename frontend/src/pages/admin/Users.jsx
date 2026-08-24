import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Users, Building, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import {
  useCreateCoordinator,
  useToggleUser,
  useUsers,
} from "../../data/useUsers";
import { useInstitutions } from "../../data/useInstitution";
import {
  Badge,
  Button,
  Card,
  Input,
  Modal,
  ModalFooter,
  Select,
  SkeletonCards,
} from "../../ui";
import {
  EmptyState,
  PageHeader,
  PageShell,
  Pagination,
  SearchInput,
} from "../../patterns";
import Money from "../../domain/Money";
import RoleBadge, { useRoleFilterOptions } from "../../domain/RoleBadge";

const LIMIT = 10;

const EMPTY_COORDINATOR = {
  name: "",
  email: "",
  password: "",
  institutionId: "",
};

function NewCoordinatorModal({ institutions, onClose }) {
  const { t } = useTranslation("admin");
  const [values, setValues] = useState(EMPTY_COORDINATOR);
  const create = useCreateCoordinator(onClose);

  const set = (key) => (event) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));

  const complete =
    values.name.trim().length > 1 &&
    /.+@.+\..+/.test(values.email) &&
    values.password.length >= 8 &&
    Boolean(values.institutionId);

  return (
    <Modal
      open
      onClose={onClose}
      title={t("coordinator.newTitle")}
      description={t("coordinator.newSubtitle")}
      size="sm"
    >
      <div className="space-y-4">
        <Input
          label={t("coordinator.name")}
          value={values.name}
          onChange={set("name")}
          required
        />
        <Input
          label={t("coordinator.email")}
          type="email"
          value={values.email}
          onChange={set("email")}
          required
        />
        <Select
          label={t("coordinator.institution")}
          placeholder={t("coordinator.pickInstitution")}
          value={values.institutionId}
          onChange={set("institutionId")}
          options={institutions.map((institution) => ({
            value: institution.id,
            label: institution.name,
          }))}
          required
        />
        <Input
          label={t("coordinator.password")}
          type="password"
          hint={t("coordinator.passwordHint")}
          value={values.password}
          onChange={set("password")}
          required
        />
      </div>

      <ModalFooter>
        <Button variant="secondary" block onClick={onClose}>
          {t("common:action.cancel")}
        </Button>
        <Button
          block
          disabled={!complete}
          loading={create.isPending}
          onClick={() =>
            create.mutate({
              name: values.name.trim(),
              email: values.email.trim(),
              password: values.password,
              institutionId: values.institutionId,
            })
          }
        >
          {t("coordinator.create")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default function AdminUsers() {
  const { t } = useTranslation("admin");
  const roleOptions = useRoleFilterOptions();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [institutionId, setInstitutionId] = useState("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);

  const { data: institutionsData } = useInstitutions({ limit: 100 });

  const institutions = institutionsData?.data || [];

  const institutionOptions = [
    { value: "", label: t("users.allInstitutions") },
    ...institutions.map((institution) => ({
      value: institution.id,
      label: institution.name,
    })),
  ];

  const { data, isLoading } = useUsers({
    search: search || undefined,
    role: role || undefined,
    institutionId: institutionId || undefined,
    page,
    limit: LIMIT,
  });

  const { mutate: toggleActive } = useToggleUser();

  const users = data?.data || [];

  const onFilterChange = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <PageShell>
      <PageHeader
        title={t("users.title")}
        subtitle={t("users.subtitle")}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} />
            {t("coordinator.new")}
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <SearchInput
          value={search}
          onChange={onFilterChange(setSearch)}
          placeholder={t("users.searchPlaceholder")}
          label={t("users.searchLabel")}
          className="flex-1"
        />
        <div className="sm:w-48 flex-shrink-0">
          <Select
            value={role}
            onChange={(event) => onFilterChange(setRole)(event.target.value)}
            options={roleOptions}
            className="py-3 rounded-xl"
            aria-label={t("users.filterByRole")}
          />
        </div>
        <div className="sm:w-64 flex-shrink-0">
          <Select
            value={institutionId}
            onChange={(event) =>
              onFilterChange(setInstitutionId)(event.target.value)
            }
            options={institutionOptions}
            className="py-3 rounded-xl"
            aria-label={t("users.filterByInstitution")}
          />
        </div>
      </div>

      {isLoading ? (
        <SkeletonCards count={5} />
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t("users.emptyTitle")}
          description={t("users.emptyBody")}
        />
      ) : (
        <>
          <div className="space-y-3">
            {users.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card
                  className={`p-4 sm:p-5 ${
                    user.isActive ? "" : "border-danger-line opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <span
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${
                        user.isActive
                          ? "bg-surface-sunken text-content-secondary"
                          : "bg-danger-surface text-danger-content"
                      }`}
                    >
                      {user.name.charAt(0)}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <h3 className="font-medium text-content-primary truncate">
                          {user.name}
                        </h3>
                        <RoleBadge role={user.role} />
                        {!user.isActive && <Badge tone="danger">{t("users.inactive")}</Badge>}
                      </div>

                      <p className="text-sm text-content-secondary truncate">{user.email}</p>

                      {(user.institution || user.academicUnit) && (
                        <span className="flex items-center gap-1 mt-0.5 text-xs text-content-muted">
                          <Building size={11} className="flex-shrink-0" />
                          <span className="truncate">
                            {[user.institution?.name, user.academicUnit?.name]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                      {user.role === "student" && (
                        <div className="text-right hidden sm:block">
                          <Money
                            value={user.wallet?.balance}
                            currency={user.wallet?.currency}
                            className="block font-semibold text-brand"
                          />
                          <p className="text-xs text-content-muted">{t("users.balance")}</p>
                        </div>
                      )}

                      {user.role === "tutor" && (
                        <div className="text-right hidden sm:block">
                          <p className="font-semibold text-positive-content">
                            {Number(user.tutorProfile?.averageRating || 0).toFixed(1)}
                          </p>
                          <p className="text-xs text-content-muted">{t("users.rating")}</p>
                        </div>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleActive(user.id)}
                        aria-label={
                          user.isActive ? t("users.deactivate") : t("users.activate")
                        }
                        className={
                          user.isActive
                            ? "text-positive-content hover:text-danger-content"
                            : "text-danger-content hover:text-positive-content"
                        }
                      >
                        {user.isActive ? (
                          <ToggleRight size={24} />
                        ) : (
                          <ToggleLeft size={24} />
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          <Pagination
            page={page}
            totalPages={data?.totalPages || 1}
            total={data?.total || 0}
            limit={LIMIT}
            onChange={setPage}
            noun={t("users.noun")}
          />
        </>
      )}

      {creating && (
        <NewCoordinatorModal
          institutions={institutions}
          onClose={() => setCreating(false)}
        />
      )}
    </PageShell>
  );
}
